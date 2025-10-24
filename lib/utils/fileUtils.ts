/**
 * S3 URL을 File 객체로 변환하는 유틸리티 함수
 */

/**
 * S3 signed URL을 갱신하는 함수
 * @param imageUrl - 기존 S3 URL
 * @returns 갱신된 signed URL 또는 원본 URL
 */
async function refreshS3SignedUrl(imageUrl: string): Promise<string> {
  // S3 URL이 아니면 그대로 반환
  if (!imageUrl.includes('s3.amazonaws.com') && !imageUrl.includes('s3.ap-northeast-2.amazonaws.com')) {
    return imageUrl;
  }

  try {
    console.log('🔄 Refreshing S3 signed URL...');

    // 캐시 방지를 위한 강력한 설정
    const response = await fetch('/api/s3/get-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({
        imageUrl,
        _timestamp: Date.now() // 매 요청마다 고유하게 만들기
      }),
      cache: 'no-store', // 더 강력한 캐시 방지
    });

    if (!response.ok) {
      console.warn('Failed to refresh signed URL, using original URL');
      return imageUrl;
    }

    const result = await response.json();

    // /api/s3/get-image returns 'presignedUrl'
    const newUrl = result.presignedUrl || result.signedUrl;

    if (result.success && newUrl) {
      console.log('✅ Signed URL refreshed successfully');
      console.log('🔍 New URL has query params?', newUrl.includes('X-Amz-'));
      console.log('🔍 New URL (first 200 chars):', newUrl.substring(0, 200));
      return newUrl;
    }

    console.warn('⚠️ API returned success but no signedUrl:', result);
    return imageUrl;
  } catch (error) {
    console.warn('Error refreshing signed URL:', error);
    return imageUrl;
  }
}

/**
 * URL에서 이미지를 fetch하여 File 객체로 변환
 * @param url - S3 URL 또는 이미지 URL
 * @param filename - 저장할 파일명
 * @returns File 객체 또는 null (실패 시)
 */
export async function urlToFile(url: string, filename: string): Promise<File | null> {
  try {
    console.log(`🔵 Original URL: ${url.substring(0, 150)}`);

    // S3 URL인 경우 signed URL 갱신
    const fetchUrl = await refreshS3SignedUrl(url);

    console.log(`🟢 Fetching with URL: ${fetchUrl.substring(0, 150)}`);
    console.log(`🟢 URL has signature?`, fetchUrl.includes('X-Amz-Signature'));

    const response = await fetch(fetchUrl);

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }

    const blob = await response.blob();

    // Blob을 File 객체로 변환
    const file = new File([blob], filename, { type: blob.type });

    console.log(`✅ Successfully converted URL to File: ${filename} (${blob.type}, ${blob.size} bytes)`);

    return file;
  } catch (error) {
    console.error(`Error converting URL to File:`, error);
    return null;
  }
}

/**
 * 여러 이미지 URL을 File 객체로 변환
 * @param imageUrls - URL과 파일명 매핑 객체
 * @returns 성공한 File 객체들의 배열
 */
export async function urlsToFiles(
  imageUrls: Array<{ url: string | null; filename: string; label: string }>
): Promise<Array<{ file: File; label: string }>> {
  const results: Array<{ file: File; label: string }> = [];

  for (const item of imageUrls) {
    if (!item.url) {
      console.log(`⏭️ Skipping ${item.label}: URL is null`);
      continue;
    }

    const file = await urlToFile(item.url, item.filename);

    if (file) {
      results.push({ file, label: item.label });
    } else {
      console.warn(`⚠️ Failed to convert ${item.label} to file`);
    }
  }

  return results;
}

/**
 * Blob을 다운로드하는 유틸리티 함수
 * @param blob - 다운로드할 Blob
 * @param filename - 저장할 파일명
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 메모리 해제
  setTimeout(() => URL.revokeObjectURL(url), 100);

  console.log(`✅ Downloaded file: ${filename}`);
}

/**
 * 파일명 생성 유틸리티
 * @param patientName - 환자 이름
 * @param analysisCode - 분석 코드
 * @param extension - 파일 확장자 ('pptx' | 'pdf')
 * @returns 생성된 파일명
 */
export function generateFileName(
  patientName: string,
  analysisCode: string,
  extension: 'pptx' | 'pdf'
): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const safeName = patientName
    ? patientName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
    : 'analysis';
  const safeCode = analysisCode || 'report';
  return `${safeName}_${safeCode}_${date}.${extension}`;
}
