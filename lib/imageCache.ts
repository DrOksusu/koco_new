// S3 이미지 URL 캐싱 시스템
// Pre-signed URL과 Blob URL을 메모리에 캐싱하여 중복 요청 방지

interface CacheEntry {
  blobUrl: string;
  timestamp: number;
  expiresAt: number;
}

class ImageCache {
  private cache: Map<string, CacheEntry> = new Map();
  private loadingPromises: Map<string, Promise<string>> = new Map();

  // 캐시 TTL (Time To Live): 50분 (Pre-signed URL은 1시간 유효)
  private readonly TTL = 50 * 60 * 1000;

  /**
   * 이미지 URL을 Blob URL로 변환하여 캐싱
   * 동일한 URL에 대한 중복 요청은 대기 중인 Promise를 재사용
   */
  async getOrLoadImage(originalUrl: string): Promise<string> {
    // 0. 빈 URL 체크
    if (!originalUrl || originalUrl.trim() === '') {
      console.warn('⚠️ ImageCache: Empty URL provided, skipping load');
      return '';
    }

    // 1. 캐시에서 확인
    const cached = this.cache.get(originalUrl);
    if (cached && Date.now() < cached.expiresAt) {
      console.log('📦 ImageCache HIT:', originalUrl.substring(0, 50));
      return cached.blobUrl;
    }

    // 2. 이미 로딩 중인지 확인 (중복 요청 방지)
    const loadingPromise = this.loadingPromises.get(originalUrl);
    if (loadingPromise) {
      console.log('⏳ ImageCache WAITING for ongoing load:', originalUrl.substring(0, 50));
      return loadingPromise;
    }

    // 3. 새로운 로드 시작
    console.log('🔄 ImageCache MISS, loading:', originalUrl.substring(0, 50));
    const promise = this.loadImage(originalUrl);
    this.loadingPromises.set(originalUrl, promise);

    try {
      const blobUrl = await promise;

      // 캐시에 저장
      this.cache.set(originalUrl, {
        blobUrl,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.TTL
      });

      return blobUrl;
    } finally {
      // 로딩 완료 후 Promise 제거
      this.loadingPromises.delete(originalUrl);
    }
  }

  /**
   * 실제 이미지 로드 로직
   */
  private async loadImage(imageUrl: string): Promise<string> {
    let finalUrl = imageUrl;

    // Data URL인 경우 Blob URL로 변환
    if (imageUrl.startsWith('data:')) {
      return this.convertDataUrlToBlob(imageUrl);
    }

    // Blob URL인 경우 그대로 반환
    if (imageUrl.startsWith('blob:')) {
      return imageUrl;
    }

    // S3 URL인지 확인
    const isS3URL = imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('.s3.');
    const isPreSignedUrl = imageUrl.includes('X-Amz-Signature');

    // S3 URL이지만 pre-signed가 아닌 경우, pre-signed URL 생성 (인증 필요)
    if (isS3URL && !isPreSignedUrl) {
      try {
        console.log('🔑 Getting pre-signed URL for private S3 bucket...');
        const response = await fetch('/api/s3/get-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.presignedUrl) {
            finalUrl = data.presignedUrl;
            console.log('✅ Pre-signed URL obtained');
          }
        } else {
          console.error('❌ Failed to get pre-signed URL:', response.status);
        }
      } catch (error) {
        console.error('❌ Error getting pre-signed URL:', error);
      }
    }

    // S3/Pre-signed URL은 프록시를 통해 Blob으로 변환
    const shouldUseProxy = finalUrl.includes('s3.amazonaws.com') ||
                          finalUrl.includes('.s3.') ||
                          finalUrl.includes('X-Amz-Signature');

    if (shouldUseProxy) {
      try {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(finalUrl)}`;
        console.log('🌐 Loading via proxy...');
        const response = await fetch(proxyUrl);

        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          console.log('✅ Proxy load successful, blob size:', blob.size);
          return blobUrl;
        } else {
          console.error('❌ Proxy response not OK:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Proxy load failed:', error);
      }
    }

    // 그 외의 경우 원본 URL 반환
    return finalUrl;
  }

  /**
   * Data URL을 Blob URL로 변환
   */
  private convertDataUrlToBlob(dataUrl: string): string {
    try {
      // 짧은 Data URL은 그대로 반환
      if (dataUrl.length < 65000) {
        return dataUrl;
      }

      // 긴 Data URL은 Blob으로 변환
      const commaIndex = dataUrl.indexOf(',');
      const header = dataUrl.substring(0, commaIndex);
      const base64 = dataUrl.substring(commaIndex + 1);

      const mimeMatch = header.match(/^data:(.*?);base64$/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mime });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to convert Data URL to Blob:', error);
      return dataUrl;
    }
  }

  /**
   * 캐시 정리 (만료된 항목 삭제)
   */
  cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now >= entry.expiresAt) {
        URL.revokeObjectURL(entry.blobUrl);
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.cache.delete(key));

    if (toDelete.length > 0) {
      console.log(`🧹 ImageCache cleaned up ${toDelete.length} expired entries`);
    }
  }

  /**
   * 특정 URL의 캐시 삭제
   */
  revoke(originalUrl: string) {
    const entry = this.cache.get(originalUrl);
    if (entry) {
      URL.revokeObjectURL(entry.blobUrl);
      this.cache.delete(originalUrl);
    }
  }

  /**
   * 전체 캐시 삭제
   */
  clear() {
    this.cache.forEach(entry => {
      URL.revokeObjectURL(entry.blobUrl);
    });
    this.cache.clear();
    this.loadingPromises.clear();
    console.log('🗑️ ImageCache cleared');
  }
}

// 싱글톤 인스턴스
export const imageCache = new ImageCache();

// 주기적으로 캐시 정리 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    imageCache.cleanup();
  }, 5 * 60 * 1000);
}
