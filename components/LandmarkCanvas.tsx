'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { getLandmarkColor, LANDMARKS } from '@/lib/landmarks';

interface LandmarkCanvasProps {
  imageUrl: string;
  landmarks: Record<string, { x: number; y: number }>;
  onAddLandmark: (x: number, y: number) => void;
  onDeleteLandmark: (name: string) => void;
  onMouseMove: (pos: { x: number; y: number; screenX?: number; screenY?: number; isInBounds?: boolean }) => void;
  currentIndex?: number;
}

export default function LandmarkCanvas({
  imageUrl,
  landmarks,
  onAddLandmark,
  onDeleteLandmark,
  onMouseMove,
  currentIndex = 0
}: LandmarkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // 컨테이너 크기에 맞춰 캔버스 크기를 설정
  const setCanvasSizeFromContainer = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const parent = containerRef.current;
    const maxWidth = parent.clientWidth;
    const maxHeight = Math.max(0, parent.clientHeight - 100);
    if (maxWidth > 0 && maxHeight > 0) {
      canvas.width = maxWidth;
      canvas.height = maxHeight;
    }
  };

  // 이미지 로드 및 캔버스 초기화
  useEffect(() => {
    console.log('LandmarkCanvas useEffect - imageUrl:', imageUrl);
    if (!imageUrl) {
      console.log('No imageUrl provided');
      return;
    }

    if (!canvasRef.current) {
      console.log('Canvas ref not ready yet');
      return;
    }

    // 이미지 로드 상태 리셋
    setImageLoaded(false);

    let blobUrlToCleanup: string | null = null;
    let hasRegeneratedOnce = false;
    const loadImage = async () => {
      const img = new Image();
      let finalImageUrl = imageUrl;

      console.log('Checking imageUrl:', imageUrl);

      // S3 URL인지 확인하고 pre-signed URL 생성 (PSA와 동일한 로직)
      const isS3URL = imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('s3.ap-northeast-2.amazonaws.com');
      const isPreSignedUrl = imageUrl.includes('X-Amz-Signature');

      if (isS3URL && !isPreSignedUrl) {
        console.log('LandmarkCanvas - S3 이미지를 위한 pre-signed URL 생성 중...');
        try {
          const response = await fetch('/api/s3/get-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl: imageUrl }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.presignedUrl) {
              finalImageUrl = data.presignedUrl;
              console.log('LandmarkCanvas - Pre-signed URL 생성 완료');
            } else {
              console.error('LandmarkCanvas - Pre-signed URL 생성 실패, 직접 접근 시도');
              finalImageUrl = imageUrl;
            }
          } else {
            console.error('LandmarkCanvas - Pre-signed URL 생성 실패, 직접 접근 시도');
            finalImageUrl = imageUrl;
          }
        } catch (error) {
          console.error('LandmarkCanvas - Pre-signed URL 생성 중 오류:', error);
          finalImageUrl = imageUrl;
        }
      }

      // CORS 설정 - Canvas export를 위해 필수 (PSA와 동일)
      if (!imageUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onerror = async (error) => {
        console.error('LandmarkCanvas 이미지 로드 실패:', error);
        console.error('Failed URL:', finalImageUrl);
        console.error('Original URL:', imageUrl);

        const isPreSigned = finalImageUrl.includes('X-Amz-Signature');

        // CORS 에러로 추정되는 경우 한 번 더 시도
        if (img.crossOrigin) {
          console.log('CORS 에러로 추정, 재시도 중...');
          img.crossOrigin = null;
          // pre-signed URL은 쿼리 파라미터 변경 시 서명이 무효화되므로 그대로 재시도
          if (isPreSigned) {
            img.src = finalImageUrl; // 그대로 재시도
          } else {
            img.src = finalImageUrl + (finalImageUrl.includes('?') ? '&' : '?') + 'retry=' + Date.now();
          }
        } else {
          // pre-signed URL이 만료되었을 수 있으므로, 1회에 한해 재서명 시도
          if (isPreSigned && !hasRegeneratedOnce) {
            try {
              hasRegeneratedOnce = true;
              const baseUrl = finalImageUrl.split('?')[0];
              console.log('Pre-signed 만료 추정, 재서명 요청:', baseUrl);
              const resp = await fetch('/api/s3/get-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: baseUrl })
              });
              if (resp.ok) {
                const data = await resp.json();
                if (data.success && data.presignedUrl) {
                  const renewed = data.presignedUrl;
                  console.log('재서명 완료, 프록시 경유 재시도');
                  const proxied = `/api/image-proxy?url=${encodeURIComponent(renewed)}`;
                  try {
                    const pr = await fetch(proxied, { cache: 'no-store' });
                    if (pr.ok) {
                      const blob = await pr.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      if (blobUrlToCleanup) URL.revokeObjectURL(blobUrlToCleanup);
                      blobUrlToCleanup = blobUrl;
                      img.src = blobUrl;
                      return;
                    }
                  } catch {}
                  img.src = proxied;
                  return;
                }
              }
            } catch (e) {
              console.error('재서명 중 오류:', e);
            }
          }
          console.error('LandmarkCanvas 이미지 로드 최종 실패');
        }
      };

      img.onload = () => {
        imageRef.current = img;

        // DOM이 완전히 렌더링된 후 캔버스 초기화
        requestAnimationFrame(() => {
          if (!canvasRef.current || !containerRef.current) {
            console.warn('Canvas or container not ready');
            return;
          }

          const canvas = canvasRef.current;
          const container = containerRef.current;
          const containerWidth = container.clientWidth;
          const containerHeight = Math.max(0, container.clientHeight - 100);

          console.log('Container size:', { containerWidth, containerHeight });
          console.log('Image size:', { width: img.width, height: img.height });

          if (containerWidth > 0 && containerHeight > 0) {
            // 이미지 비율에 맞춰 캔버스 크기 계산
            const imgAspect = img.width / img.height;
            const containerAspect = containerWidth / containerHeight;

            let canvasWidth, canvasHeight;

            if (imgAspect > containerAspect) {
              // 이미지가 더 넓은 경우
              canvasWidth = containerWidth * 0.9;
              canvasHeight = canvasWidth / imgAspect;
            } else {
              // 이미지가 더 높은 경우
              canvasHeight = containerHeight * 0.9;
              canvasWidth = canvasHeight * imgAspect;
            }

            // 캔버스 크기 설정
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            // 캔버스를 중앙에 배치
            canvas.style.position = 'absolute';
            canvas.style.left = `${(containerWidth - canvasWidth) / 2}px`;
            canvas.style.top = `${(containerHeight - canvasHeight) / 2}px`;

            console.log('Canvas initialized:', { width: canvasWidth, height: canvasHeight });

            // 스케일 계산
            const newScale = canvasWidth / img.width;
            setScale(newScale);
            setImageSize({ width: canvasWidth, height: canvasHeight });
            setImageLoaded(true);
          } else {
            // 컨테이너 크기가 0이면 다시 시도
            console.warn('Container size is 0, retrying...');
            setTimeout(() => {
              // 재귀적으로 다시 시도
              const event = new Event('load');
              img.dispatchEvent(event);
            }, 100);
          }
        });
      };

      // 최종 URL 설정
      const isPreSignedFinal = finalImageUrl.includes('X-Amz-Signature');
      if (isPreSignedFinal) {
        try {
          // 프록시를 통해 동일 출처로 가져와 Blob URL로 변환 (보다 안정적)
          console.log('Using proxy (prefetch) for pre-signed URL');
          const proxied = `/api/image-proxy?url=${encodeURIComponent(finalImageUrl)}`;
          const resp = await fetch(proxied, { cache: 'no-store' });
          if (!resp.ok) {
            console.error('Proxy fetch failed with status:', resp.status);
            img.src = proxied; // 그래도 직접 시도
          } else {
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            blobUrlToCleanup = blobUrl;
            img.crossOrigin = undefined as unknown as any; // 동일 출처
            img.src = blobUrl;
          }
        } catch (e) {
          console.error('Proxy prefetch error:', e);
          const proxied = `/api/image-proxy?url=${encodeURIComponent(finalImageUrl)}`;
          img.src = proxied;
        }
      } else {
        img.src = finalImageUrl;
      }
    };

    loadImage();
    return () => {
      if (blobUrlToCleanup) {
        URL.revokeObjectURL(blobUrlToCleanup);
      }
    };
  }, [imageUrl]);

  // 컨테이너 리사이즈 대응: 이미지가 로드된 이후에도 크기 변화를 반영
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      // 이미지가 로드된 상태에서만 캔버스/스케일 갱신
      if (!imageRef.current || !canvasRef.current || !containerRef.current) return;

      const img = imageRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = Math.max(0, container.clientHeight - 100);

      if (containerWidth > 0 && containerHeight > 0) {
        // 이미지 비율에 맞춰 캔버스 크기 재계산
        const imgAspect = img.width / img.height;
        const containerAspect = containerWidth / containerHeight;

        let canvasWidth, canvasHeight;

        if (imgAspect > containerAspect) {
          canvasWidth = containerWidth * 0.9;
          canvasHeight = canvasWidth / imgAspect;
        } else {
          canvasHeight = containerHeight * 0.9;
          canvasWidth = canvasHeight * imgAspect;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 캔버스를 중앙에 배치
        canvas.style.position = 'absolute';
        canvas.style.left = `${(containerWidth - canvasWidth) / 2}px`;
        canvas.style.top = `${(containerHeight - canvasHeight) / 2}px`;

        setScale(canvasWidth / img.width);
        setImageSize({ width: canvasWidth, height: canvasHeight });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 랜드마크 그리기를 위한 별도의 useEffect
  useEffect(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!ctx || !img) return;

    // 캔버스 크기가 0이면 그리기를 건너뜀
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn('Canvas size is 0, skipping draw');
      return;
    }

    console.log('Redrawing canvas with landmarks', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      imageWidth: img.width,
      imageHeight: img.height
    });

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 이미지를 캔버스 전체에 그리기 (캔버스가 이미 이미지 비율에 맞춰져 있음)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 랜드마크 그리기
    Object.entries(landmarks).forEach(([name, point], index) => {
      const color = getLandmarkColor(index);

      // 이미지 좌표를 캔버스 좌표로 변환
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;

      // 포인트 그리기
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 라벨 그리기
      ctx.fillStyle = color;
      ctx.font = '10px sans-serif';
      ctx.fillText(name, x + 4, y - 4);
    });

    // 현재 찍을 랜드마크 이름 표시
    if (currentIndex < LANDMARKS.length) {
      const currentLandmark = LANDMARKS[currentIndex];
      ctx.fillStyle = 'yellow';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`Next: ${currentLandmark}`, 10, 25);
    }
  }, [landmarks, currentIndex, imageSize, imageLoaded]); // 이미지 로드/크기 변경 시 다시 그리기

  // 윈도우 리사이즈 처리
  useEffect(() => {
    const handleResize = () => {
      if (!imageRef.current || !canvasRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      const img = imageRef.current;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // 이미지 비율 계산
      const imgAspect = img.width / img.height;
      const containerAspect = containerWidth / containerHeight;

      let canvasWidth, canvasHeight;

      if (imgAspect > containerAspect) {
        canvasWidth = containerWidth * 0.9;
        canvasHeight = canvasWidth / imgAspect;
      } else {
        canvasHeight = containerHeight * 0.9;
        canvasWidth = canvasHeight * imgAspect;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // 캔버스를 중앙에 배치
      canvas.style.position = 'absolute';
      canvas.style.left = `${(containerWidth - canvasWidth) / 2}px`;
      canvas.style.top = `${(containerHeight - canvasHeight) / 2}px`;

      setImageSize({ width: canvasWidth, height: canvasHeight });
      setScale(canvasWidth / img.width);

      // drawCanvas는 별도의 useEffect에서 imageSize 변경 감지하여 자동 호출됨
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 캔버스 그리기
  const drawCanvas = () => {
    console.log('drawCanvas called');
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img) {
      console.error('drawCanvas: missing requirements', { canvas: !!canvas, ctx: !!ctx, img: !!img });
      return;
    }

    console.log('Drawing image on canvas:', canvas.width, 'x', canvas.height);

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 이미지를 캔버스 전체에 그리기 (캔버스가 이미 이미지 비율에 맞춰져 있음)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 랜드마크 그리기
    Object.entries(landmarks).forEach(([name, point], index) => {
      const color = getLandmarkColor(index);

      // 이미지 좌표를 캔버스 좌표로 변환
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;

      // 포인트 그리기
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 라벨 그리기
      ctx.fillStyle = color;
      ctx.font = '10px sans-serif';
      ctx.fillText(name, x + 4, y - 4);
    });

    // 현재 찍을 랜드마크 이름 표시
    if (currentIndex < LANDMARKS.length) {
      const currentLandmark = LANDMARKS[currentIndex];
      const landmarkNumber = currentIndex + 1;

      // 배경 박스 그리기 (더 넓게)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(10, 10, 380, 45);

      // NEXT 텍스트
      ctx.fillStyle = '#FFD700'; // 금색
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('NEXT:', 20, 35);

      // 순번과 랜드마크 이름
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`${landmarkNumber}. ${currentLandmark}`, 75, 36);

      // 진행 상황 (작은 텍스트)
      ctx.fillStyle = '#88CCFF';
      ctx.font = '14px sans-serif';
      ctx.fillText(`(${landmarkNumber}/${LANDMARKS.length})`, 320, 35);
    }
  };

  // 랜드마크 업데이트 시 다시 그리기 - 이미 별도의 useEffect에서 처리됨
  // useEffect(() => {
  //   drawCanvas();
  // }, [landmarks, currentIndex]);

  // 캔버스 클릭 처리
  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 이미지 좌표계로 변환 (0-1 범위)
    const x = clickX / canvas.width;
    const y = clickY / canvas.height;

    // 기존 랜드마크 클릭 확인 (삭제용)
    for (const [name, point] of Object.entries(landmarks)) {
      const landmarkX = point.x * canvas.width;
      const landmarkY = point.y * canvas.height;
      const distance = Math.sqrt(
        Math.pow(clickX - landmarkX, 2) +
        Math.pow(clickY - landmarkY, 2)
      );
      if (distance < 10) {
        onDeleteLandmark(name);
        return;
      }
    }

    // 새 랜드마크 추가
    onAddLandmark(x, y);
  };

  // 마우스 이동 처리
  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 마우스가 캔버스 영역 안에 있는지 확인
    const isInBounds = mouseX >= 0 && mouseX <= canvas.width &&
                      mouseY >= 0 && mouseY <= canvas.height;

    // 이미지 좌표계로 변환 (0-1 범위)
    const x = mouseX / canvas.width;
    const y = mouseY / canvas.height;

    // 화면상의 실제 픽셀 좌표와 영역 내 여부 전달
    onMouseMove({
      x,
      y,
      screenX: e.clientX,
      screenY: e.clientY,
      isInBounds
    });
  };

  // 마우스가 캔버스를 떠날 때 처리
  const handleMouseLeave = () => {
    // 마우스가 캔버스 밖으로 나갔음을 알림
    onMouseMove({
      x: -1,
      y: -1,
      screenX: -1,
      screenY: -1,
      isInBounds: false
    });
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 relative">
      <style jsx>{`
        canvas:hover {
          cursor: crosshair !important;
        }
      `}</style>
      <canvas
        id="landmarkCanvas"
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
      />
    </div>
  );
}