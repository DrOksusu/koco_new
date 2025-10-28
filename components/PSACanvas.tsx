'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { imageCache } from '@/lib/imageCache';

interface PSACanvasProps {
  imageUrl: string;
  landmarks: Record<string, { x: number; y: number }>;
  currentIndex: number;
  onAddLandmark: (x: number, y: number) => void;
  onDeleteLandmark: (name: string) => void;
  onUpdateLandmark: (name: string, x: number, y: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onCanvasMouseMove: (x: number, y: number) => void;
  psaLandmarks: string[];
  showGeometry: boolean;
}

export default function PSACanvas({
  imageUrl,
  landmarks,
  currentIndex,
  onAddLandmark,
  onDeleteLandmark,
  onUpdateLandmark,
  onMouseMove,
  onCanvasMouseMove,
  psaLandmarks,
  showGeometry
}: PSACanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedLandmark, setDraggedLandmark] = useState<string | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // 기하학적 계산 함수들
  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const calculatePerpendicular = (
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number },
    point: { x: number; y: number }
  ): { x: number; y: number } => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lineLengthSq = dx * dx + dy * dy;

    if (lineLengthSq === 0) return point;

    const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq));

    return {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy
    };
  };

  // 이미지 로드 (최적화: imageCache 사용)
  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      // 빈 URL인 경우 로드하지 않음
      if (!imageUrl || imageUrl.trim() === '') {
        return;
      }

      try {
        console.log('PSACanvas - Loading image via cache:', imageUrl.substring(0, 50));

        // imageCache를 통해 이미지 로드 (중복 방지, 자동 캐싱)
        const blobUrl = await imageCache.getOrLoadImage(imageUrl);

        if (!mounted || !blobUrl) return;

        // 이미지 객체 생성 및 로드
        const img = new Image();

        img.onload = () => {
          if (!mounted) return;

          imageRef.current = img;
          setImageLoaded(true);

          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const parent = canvas.parentElement;
            if (parent) {
              const maxWidth = parent.clientWidth;
              const maxHeight = parent.clientHeight - 100;
              const imgAspect = img.width / img.height;
              const containerAspect = maxWidth / maxHeight;

              let newScale;
              if (imgAspect > containerAspect) {
                newScale = maxWidth / img.width;
              } else {
                newScale = maxHeight / img.height;
              }
              setScale(newScale * 0.9);
            }
          }
        };

        img.onerror = (error) => {
          console.error('PSACanvas - Image element load failed:', error);
        };

        img.src = blobUrl;
      } catch (error) {
        console.error('PSACanvas - Failed to load image via cache:', error);
      }
    };

    loadImage();

    // cleanup
    return () => {
      mounted = false;
    };
  }, [imageUrl]);

  // 캔버스 그리기
  const draw = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    console.log('PSACanvas draw() - landmarks:', Object.keys(landmarks), 'count:', Object.keys(landmarks).length);
    console.log('PSACanvas draw() - landmarks detail:', landmarks);

    // 정규화된 좌표를 실제 픽셀 좌표로 변환하는 헬퍼 함수
    const normalizeCoord = (pos: { x: number; y: number }) => {
      if (pos.x < 2 && pos.y < 2) {
        return { x: pos.x * img.width, y: pos.y * img.height };
      }
      return pos;
    };

    // 기하학적 요소 그리기 (showGeometry가 true일 때 점진적으로 그리기)
    if (showGeometry) {
      const porion = landmarks['Porion'] ? normalizeCoord(landmarks['Porion']) : null;
      const orbitale = landmarks['Orbitale'] ? normalizeCoord(landmarks['Orbitale']) : null;
      const hingePoint = landmarks['Hinge Point'] ? normalizeCoord(landmarks['Hinge Point']) : null;
      const mn1Cr = landmarks['Mn.1 cr'] ? normalizeCoord(landmarks['Mn.1 cr']) : null;
      const mn6Distal = landmarks['Mn.6 distal'] ? normalizeCoord(landmarks['Mn.6 distal']) : null;
      const symphysisLingual = landmarks['Symphysis Lingual'] ? normalizeCoord(landmarks['Symphysis Lingual']) : null;

      // 1. Porion과 Orbitale이 있으면 FH Line 그리기 - 검정색
      if (porion && orbitale) {
        // Porion-Orbitale 거리 계산
        const dx = orbitale.x - porion.x;
        const dy = orbitale.y - porion.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 방향 벡터 정규화
        const unitX = dx / distance;
        const unitY = dy / distance;

        // Porion 방향으로 30% 연장된 점 계산
        const extendedX = porion.x - (unitX * distance * 0.3);
        const extendedY = porion.y - (unitY * distance * 0.3);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(extendedX * scale, extendedY * scale);
        ctx.lineTo(orbitale.x * scale, orbitale.y * scale);
        ctx.stroke();

        // Orbitale을 중심으로 반시계방향 6.5도 회전한 선 그리기
        const angleRad = -6.5 * Math.PI / 180; // 반시계방향이므로 음수

        // 연장된 점을 Orbitale 중심으로 회전
        const relativeX = extendedX - orbitale.x;
        const relativeY = extendedY - orbitale.y;

        // 회전 변환
        const rotatedX = relativeX * Math.cos(angleRad) - relativeY * Math.sin(angleRad);
        const rotatedY = relativeX * Math.sin(angleRad) + relativeY * Math.cos(angleRad);

        // Orbitale 기준으로 다시 절대 좌표로 변환
        const rotatedEndX = rotatedX + orbitale.x;
        const rotatedEndY = rotatedY + orbitale.y;

        // 회전된 선 그리기 (점선)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(rotatedEndX * scale, rotatedEndY * scale);
        ctx.lineTo(orbitale.x * scale, orbitale.y * scale);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Hinge Point가 있으면 (수직선 제거됨)

        // 4. Mn.1 Crown이 있으면 Hinge Point와 연결 - 초록색
        if (mn1Cr && hingePoint) {
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hingePoint.x * scale, hingePoint.y * scale);
          ctx.lineTo(mn1Cr.x * scale, mn1Cr.y * scale);
          ctx.stroke();
        }

        // 5. Mn.6 Distal이 있으면 Mn.1 Crown과 연결 - 빨간색 (Mn.6 Distal 방향으로 2배 연장)
        if (mn6Distal && mn1Cr) {
          // Mn.1 Crown에서 Mn.6 Distal까지의 벡터 계산
          const dx = mn6Distal.x - mn1Cr.x;
          const dy = mn6Distal.y - mn1Cr.y;

          // Mn.6 Distal 방향으로 2배 연장된 끝점
          const extendedX = mn1Cr.x + (dx * 2);
          const extendedY = mn1Cr.y + (dy * 2);

          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mn1Cr.x * scale, mn1Cr.y * scale);
          ctx.lineTo(extendedX * scale, extendedY * scale);
          ctx.stroke();

          // 6. Symphysis Lingual이 있으면 빨간색 선까지 수선 - 파란색
          if (symphysisLingual) {
            const perpPoint = calculatePerpendicular(
              mn1Cr,
              { x: extendedX, y: extendedY },
              symphysisLingual
            );
            ctx.strokeStyle = '#0000FF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(symphysisLingual.x * scale, symphysisLingual.y * scale);
            ctx.lineTo(perpPoint.x * scale, perpPoint.y * scale);
            ctx.stroke();

            // 7. 정삼각형의 세 번째 꼭지점 계산 및 노란색 원 그리기
            if (hingePoint) {
              // Hinge Point와 Mn.1 Crown 사이의 중점
              const midX = (hingePoint.x + mn1Cr.x) / 2;
              const midY = (hingePoint.y + mn1Cr.y) / 2;

              // 벡터 계산
              const dx = mn1Cr.x - hingePoint.x;
              const dy = mn1Cr.y - hingePoint.y;

              // 정삼각형의 높이 계산 (변의 길이 * sqrt(3)/2)
              const sideLength = Math.sqrt(dx * dx + dy * dy);
              const height = sideLength * Math.sqrt(3) / 2;

              // 수직 벡터 (시계방향과 반시계방향)
              const perpX = -dy / sideLength;
              const perpY = dx / sideLength;

              // 두 개의 가능한 점 계산
              const point1 = {
                x: midX + perpX * height,
                y: midY + perpY * height
              };
              const point2 = {
                x: midX - perpX * height,
                y: midY - perpY * height
              };

              // X 좌표가 더 큰 점 선택
              const centerPoint = point1.x > point2.x ? point1 : point2;

              // 노란색 원 그리기 (반지름은 초록색선의 길이 = Hinge Point와 Mn.1 Crown 사이 거리)
              const radius = sideLength * scale;
              ctx.strokeStyle = '#FFFF00';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(centerPoint.x * scale, centerPoint.y * scale, radius, 0, 2 * Math.PI);
              ctx.stroke();
            }
          }
        }
      }


    }

    // 랜드마크 그리기
    console.log('Drawing landmarks...');
    Object.entries(landmarks).forEach(([name, pos]) => {
      // 정규화된 좌표(0~1)를 실제 픽셀 좌표로 변환
      // pos.x < 2 인 경우 정규화된 좌표로 판단
      const actualX = pos.x < 2 ? pos.x * img.width : pos.x;
      const actualY = pos.y < 2 ? pos.y * img.height : pos.y;

      console.log(`Drawing landmark: ${name} at normalized (${pos.x}, ${pos.y}), actual (${actualX}, ${actualY}), scaled: (${actualX * scale}, ${actualY * scale})`);

      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(actualX * scale, actualY * scale, 5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(actualX * scale, actualY * scale, 5, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 12px Arial';
      const textX = actualX * scale + 8;
      const textY = actualY * scale - 8;
      ctx.strokeText(name, textX, textY);
      ctx.fillText(name, textX, textY);
    });
    console.log('Finished drawing landmarks');

    // 현재 위치 미리보기
    if (currentIndex < psaLandmarks.length) {
      const nextLandmark = psaLandmarks[currentIndex];
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`다음: ${nextLandmark}`, 10, 30);
    }
  }, [imageLoaded, scale, landmarks, currentIndex, psaLandmarks, showGeometry]);

  // 그리기 실행
  useEffect(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    animationFrameId.current = requestAnimationFrame(draw);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [draw]);

  // 캔버스 클릭 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isDragging) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // 기존 랜드마크 클릭 확인
    for (const [name, pos] of Object.entries(landmarks)) {
      const distance = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      if (distance < 10) {
        onDeleteLandmark(name);
        return;
      }
    }

    // 새 랜드마크 추가
    if (currentIndex < psaLandmarks.length) {
      onAddLandmark(x, y);
    }
  };

  // 마우스 이동 핸들러
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onMouseMove(x, y);

    const canvasX = x / scale;
    const canvasY = y / scale;
    onCanvasMouseMove(canvasX, canvasY);

    if (isDragging && draggedLandmark) {
      onUpdateLandmark(draggedLandmark, canvasX, canvasY);
    }
  };

  // 마우스 다운 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    for (const [name, pos] of Object.entries(landmarks)) {
      const distance = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      if (distance < 10) {
        setIsDragging(true);
        setDraggedLandmark(name);
        return;
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedLandmark(null);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        id="psaCanvas"
        ref={canvasRef}
        className="border border-gray-300 cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}