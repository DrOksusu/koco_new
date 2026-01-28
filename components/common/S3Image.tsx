'use client';

import { useState, useEffect, memo } from 'react';
import { imageCache } from '@/lib/imageCache';

interface S3ImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  placeholder?: string;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

/**
 * S3 이미지를 자동으로 presigned URL로 변환하여 표시하는 공통 컴포넌트
 *
 * 사용 예시:
 * <S3Image src={s3Url} alt="이미지 설명" className="w-full h-full object-contain" />
 */
const S3Image = memo(function S3Image({
  src,
  alt,
  className = '',
  onClick,
  placeholder,
  fallback,
  showLoading = true,
}: S3ImageProps) {
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      // src가 없으면 에러 상태
      if (!src || src.trim() === '') {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        let finalUrl = src;

        // S3 URL인 경우 presigned URL로 변환
        if (src.includes('s3') && src.includes('amazonaws.com') && !src.includes('X-Amz-Signature')) {
          // imageCache를 통해 이미지 로드 (중복 방지, 자동 캐싱)
          const blobUrl = await imageCache.getOrLoadImage(src);
          if (blobUrl) {
            finalUrl = blobUrl;
          }
        }

        if (mounted) {
          setDisplayUrl(finalUrl);
          setLoading(false);
        }
      } catch (err) {
        console.warn('S3Image load failed:', src?.substring(0, 50));
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [src]);

  // 로딩 중
  if (loading && showLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // 에러 또는 이미지 없음
  if (error || !displayUrl) {
    // 커스텀 fallback이 있으면 사용
    if (fallback) {
      return <>{fallback}</>;
    }

    // placeholder가 있으면 placeholder 이미지 표시
    if (placeholder) {
      return (
        <img
          src={placeholder}
          alt={alt}
          className={className}
          onClick={onClick}
        />
      );
    }

    // 기본 에러 UI
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-2">
          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-500 text-center">이미지 없음</span>
        </div>
      </div>
    );
  }

  // 정상 이미지 표시
  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
});

export default S3Image;
