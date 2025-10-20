'use client';

import { useRef, useEffect } from 'react';
import { getLandmarkColor } from '@/lib/landmarks';

interface MagnifierCanvasProps {
  imageUrl: string;
  mousePos: { x: number; y: number; screenX?: number; screenY?: number };
  landmarks: Record<string, { x: number; y: number }>;
  zoomLevel?: number;
}

export default function MagnifierCanvas({
  imageUrl,
  mousePos,
  landmarks,
  zoomLevel = 0.7
}: MagnifierCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // 이미지 로드
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 돋보기 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageRef.current || !mousePos) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = imageRef.current;
    const magnifierSize = 200;
    const sourceSize = magnifierSize / (zoomLevel * 2); // 확대할 원본 영역 크기

    // 마우스 위치를 이미지 좌표로 변환
    const sourceX = (mousePos?.x || 0) * img.width - sourceSize / 2;
    const sourceY = (mousePos?.y || 0) * img.height - sourceSize / 2;

    // 원형 클리핑 마스크
    ctx.save();
    ctx.beginPath();
    ctx.arc(magnifierSize / 2, magnifierSize / 2, magnifierSize / 2, 0, 2 * Math.PI);
    ctx.clip();

    // 확대된 이미지 그리기
    ctx.drawImage(
      img,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      Math.min(sourceSize, img.width - sourceX),
      Math.min(sourceSize, img.height - sourceY),
      0,
      0,
      magnifierSize,
      magnifierSize
    );

    // 랜드마크 그리기
    Object.entries(landmarks).forEach(([name, point], index) => {
      // 랜드마크가 돋보기 범위 내에 있는지 확인
      const landmarkX = point.x * img.width;
      const landmarkY = point.y * img.height;

      if (
        landmarkX >= sourceX &&
        landmarkX <= sourceX + sourceSize &&
        landmarkY >= sourceY &&
        landmarkY <= sourceY + sourceSize
      ) {
        const relativeX = ((landmarkX - sourceX) / sourceSize) * magnifierSize;
        const relativeY = ((landmarkY - sourceY) / sourceSize) * magnifierSize;

        const color = getLandmarkColor(index);

        // 포인트 그리기
        ctx.beginPath();
        ctx.arc(relativeX, relativeY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 라벨 그리기
        ctx.fillStyle = color;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(name, relativeX + 5, relativeY - 5);
      }
    });

    ctx.restore();

    // 돋보기 테두리
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(magnifierSize / 2, magnifierSize / 2, magnifierSize / 2 - 1.5, 0, 2 * Math.PI);
    ctx.stroke();

    // 중앙 빨간색 십자선만 그리기
    ctx.strokeStyle = 'rgba(255, 0, 0, 1)'; // 빨간색 십자선
    ctx.lineWidth = 2;
    ctx.beginPath();
    // 수평선
    ctx.moveTo(magnifierSize / 2 - 20, magnifierSize / 2);
    ctx.lineTo(magnifierSize / 2 + 20, magnifierSize / 2);
    // 수직선
    ctx.moveTo(magnifierSize / 2, magnifierSize / 2 - 20);
    ctx.lineTo(magnifierSize / 2, magnifierSize / 2 + 20);
    ctx.stroke();

    // 중앙 점 그리기
    ctx.beginPath();
    ctx.arc(magnifierSize / 2, magnifierSize / 2, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 0, 0, 1)';
    ctx.fill();
  }, [mousePos, landmarks, zoomLevel]);

  // 마우스 위치 기반으로 돋보기 위치 계산
  const magnifierSize = 200;
  const magnifierRadius = magnifierSize / 2;

  // 화면 크기 가져오기
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // 실제 마우스 화면 좌표 사용 (screenX, screenY가 있으면 사용, 없으면 계산)
  const mouseScreenX = mousePos?.screenX || (mousePos?.x * screenWidth * 0.8) || 0;
  const mouseScreenY = mousePos?.screenY || (mousePos?.y * screenHeight * 0.8) || 0;

  // 돋보기를 마우스 커서 중심에 배치
  let magnifierX = mouseScreenX - magnifierRadius;
  let magnifierY = mouseScreenY - magnifierRadius;

  // 화면 경계 체크
  if (magnifierX < 0) magnifierX = 0;
  if (magnifierY < 0) magnifierY = 0;
  if (magnifierX + magnifierSize > screenWidth) {
    magnifierX = screenWidth - magnifierSize;
  }
  if (magnifierY + magnifierSize > screenHeight) {
    magnifierY = screenHeight - magnifierSize;
  }

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${magnifierX}px`,
        top: `${magnifierY}px`,
        mixBlendMode: 'normal'
      }}
    >
      {/* 돋보기 배경 (마우스 커서 가리기용) */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, transparent 0%, rgba(0,0,0,0.9) 100%)',
          pointerEvents: 'none'
        }}
      />
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="rounded-full shadow-2xl border-4 border-white relative"
        style={{
          boxShadow: '0 0 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.2)'
        }}
      />
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black bg-opacity-80 px-3 py-1 rounded-full whitespace-nowrap font-medium">
        {Math.round(zoomLevel * 200)}% 확대
      </div>
    </div>
  );
}