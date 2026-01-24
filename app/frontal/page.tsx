'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Frontal 랜드마크 정의 (11개)
const FRONTAL_LANDMARKS = [
  'Z-point Rt.',
  'Z-point Lt.',
  'Zygion Rt.',
  'Zygion Lt.',
  'Jugal Rt.',
  'Jugal Lt.',
  'Antegonial notch Rt.',
  'Antegonial notch Lt.',
  'Crista galli',
  'ANS',
  'Menton',
];

// 선을 그릴 포인트 쌍 인덱스
const LINE_PAIRS = [
  [0, 1], // Z-point Rt. - Z-point Lt.
  [2, 3], // Zygion Rt. - Zygion Lt.
  [4, 5], // Jugal Rt. - Jugal Lt.
  [6, 7], // Antegonial notch Rt. - Antegonial notch Lt.
];

export default function FrontalAnalysisPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientBirthDate, setPatientBirthDate] = useState<string>('');
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const [points, setPoints] = useState<{ name: string; x: number; y: number }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showReferenceImage, setShowReferenceImage] = useState(true);
  const [angles, setAngles] = useState<{ angle1: number; angle2: number; angle3: number; finalAngle: number } | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState({ x: 1, y: 1 });

  // basePath 처리 (production에서는 /new 추가)
  const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

  // 세션 스토리지에서 데이터 로드
  useEffect(() => {
    const storedImage = sessionStorage.getItem('frontalImage');
    const storedFileName = sessionStorage.getItem('frontalFileName');
    const storedPatientName = sessionStorage.getItem('patientName');
    const storedPatientBirthDate = sessionStorage.getItem('patientBirthDate');
    const storedAnalysisId = sessionStorage.getItem('analysisId');

    console.log('Frontal Page - SessionStorage data:', {
      hasImage: !!storedImage,
      fileName: storedFileName,
      patientName: storedPatientName,
      analysisId: storedAnalysisId,
    });

    if (storedImage) {
      setImageUrl(storedImage);
      setFileName(storedFileName || 'Frontal Ceph');
      setPatientName(storedPatientName || '');
      setPatientBirthDate(storedPatientBirthDate || '');
      if (storedAnalysisId) {
        setAnalysisId(storedAnalysisId);
        console.log('✅ Frontal: 기존 분석 업데이트 모드 (ID:', storedAnalysisId, ')');
      }
    } else {
      alert('Frontal Ceph 이미지를 찾을 수 없습니다.');
      window.close();
    }
  }, []);

  // 이미지 로드 및 캔버스 초기화
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;

      // 캔버스 크기 설정 (최대 800px 너비)
      const maxWidth = 800;
      const scaleRatio = maxWidth / img.naturalWidth;
      const newWidth = maxWidth;
      const newHeight = img.naturalHeight * scaleRatio;

      setCanvasSize({ width: newWidth, height: newHeight });
      setScale({ x: scaleRatio, y: scaleRatio });

      canvas.width = newWidth;
      canvas.height = newHeight;

      // 이미지 그리기
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // 첫 번째 랜드마크 음성 안내
      speakMessage(FRONTAL_LANDMARKS[0]);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 캔버스 다시 그리기
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // 이미지 다시 그리기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 점 그리기
    points.forEach((point, idx) => {
      const x = point.x * scale.x;
      const y = point.y * scale.y;

      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // 점 번호 표시
      ctx.fillStyle = 'yellow';
      ctx.font = 'bold 10px Arial';
      ctx.fillText(`${idx + 1}`, x + 6, y - 6);
    });

    // 선 그리기 (쌍으로)
    LINE_PAIRS.forEach(([startIdx, endIdx]) => {
      if (points.length > endIdx) {
        const p1 = points[startIdx];
        const p2 = points[endIdx];
        drawBlueLine(ctx, p1, p2);
      }
    });

    // 8개 점이 찍히면 각도 계산 및 표시
    if (points.length >= 8) {
      calculateAndDisplayAngles(ctx);
    }

    // 9개 점: 수직 점선 그리기
    if (points.length >= 9) {
      drawPerpendicularDashedLine(ctx);
    }

    // 10개 점: 녹색 연장선 그리기
    if (points.length >= 10) {
      drawExtendedGreenLine(ctx);
    }

    // 11개 점: 빨간 점선 및 최종 각도
    if (points.length >= 11) {
      drawFinalAnalysis(ctx);
    }
  }, [points, scale]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // 파란색 선 그리기
  const drawBlueLine = (ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p1.x * scale.x, p1.y * scale.y);
    ctx.lineTo(p2.x * scale.x, p2.y * scale.y);
    ctx.stroke();
  };

  // 두 선 사이의 각도 계산
  const calculateAngleBetweenLines = (p1Start: number[], p1End: number[], p2Start: number[], p2End: number[]): number => {
    const v1x = p1End[0] - p1Start[0];
    const v1y = p1End[1] - p1Start[1];
    const v2x = p2End[0] - p2Start[0];
    const v2y = p2End[1] - p2Start[1];

    const dotProduct = v1x * v2x + v1y * v2y;
    const magV1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const magV2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (magV1 === 0 || magV2 === 0) return 0;

    const cosTheta = dotProduct / (magV1 * magV2);
    const angleRadians = Math.acos(Math.min(Math.max(cosTheta, -1), 1));
    const angleDegrees = angleRadians * (180 / Math.PI);

    return angleDegrees;
  };

  // 수직 발 계산
  const getPerpendicularFoot = (p3: number[], p4: number[], p9: number[]): number[] => {
    const [x3, y3] = p3;
    const [x4, y4] = p4;
    const [x9, y9] = p9;

    const dx = x4 - x3;
    const dy = y4 - y3;
    const dx9 = x9 - x3;
    const dy9 = y9 - y3;

    const dot = dx * dx9 + dy * dy9;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return [x9, y9];

    const t = dot / lenSq;

    return [x3 + t * dx, y3 + t * dy];
  };

  // 각도 계산 및 표시
  const calculateAndDisplayAngles = (ctx: CanvasRenderingContext2D) => {
    const p0 = [points[0].x, points[0].y];
    const p1 = [points[1].x, points[1].y];
    const p2 = [points[2].x, points[2].y];
    const p3 = [points[3].x, points[3].y];
    const p4 = [points[4].x, points[4].y];
    const p5 = [points[5].x, points[5].y];
    const p6 = [points[6].x, points[6].y];
    const p7 = [points[7].x, points[7].y];

    // Zygion 선을 기준으로 각도 계산
    const angle1 = calculateAngleBetweenLines(p2, p3, p0, p1);
    const angle2 = calculateAngleBetweenLines(p2, p3, p4, p5);
    const angle3 = calculateAngleBetweenLines(p2, p3, p6, p7);

    // 각도 텍스트 표시
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = 'blue';

    ctx.fillText(`${angle1.toFixed(1)}°`, p1[0] * scale.x + 10, p1[1] * scale.y - 10);
    ctx.fillText(`${angle2.toFixed(1)}°`, p5[0] * scale.x + 10, p5[1] * scale.y - 10);
    ctx.fillText(`${angle3.toFixed(1)}°`, p7[0] * scale.x + 10, p7[1] * scale.y - 10);

    setAngles(prev => ({ ...prev!, angle1, angle2, angle3, finalAngle: prev?.finalAngle || 0 }));
  };

  // 수직 점선 그리기 (9번째 점)
  const drawPerpendicularDashedLine = (ctx: CanvasRenderingContext2D) => {
    const p3 = [points[2].x, points[2].y];
    const p4 = [points[3].x, points[3].y];
    const p9 = [points[8].x, points[8].y];

    const [xPerp, yPerp] = getPerpendicularFoot(p3, p4, p9);

    const xPerpCanvas = xPerp * scale.x;
    const yPerpCanvas = yPerp * scale.y;
    const x9Canvas = p9[0] * scale.x;
    const y9Canvas = p9[1] * scale.y;

    const dx = x9Canvas - xPerpCanvas;
    const dy = y9Canvas - yPerpCanvas;

    const extendedX = xPerpCanvas - dx * 2.7;
    const extendedY = yPerpCanvas - dy * 2.7;

    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(xPerpCanvas, yPerpCanvas);
    ctx.lineTo(x9Canvas, y9Canvas);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xPerpCanvas, yPerpCanvas);
    ctx.lineTo(extendedX, extendedY);
    ctx.stroke();

    ctx.setLineDash([]);
  };

  // 녹색 연장선 그리기 (10번째 점)
  const drawExtendedGreenLine = (ctx: CanvasRenderingContext2D) => {
    const p3 = [points[2].x, points[2].y];
    const p4 = [points[3].x, points[3].y];
    const p10 = [points[9].x, points[9].y];

    const [xPerp, yPerp] = getPerpendicularFoot(p3, p4, p10);

    const xPerpCanvas = xPerp * scale.x;
    const yPerpCanvas = yPerp * scale.y;
    const x10Canvas = p10[0] * scale.x;
    const y10Canvas = p10[1] * scale.y;

    const dx = x10Canvas - xPerpCanvas;
    const dy = y10Canvas - yPerpCanvas;

    const reverseX = xPerpCanvas - dx * 2.5;
    const reverseY = yPerpCanvas - dy * 2.5;
    const forwardX = xPerpCanvas + dx * 4.5;
    const forwardY = yPerpCanvas + dy * 4.5;

    ctx.strokeStyle = 'green';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(reverseX, reverseY);
    ctx.lineTo(forwardX, forwardY);
    ctx.stroke();

    ctx.setLineDash([]);
  };

  // 최종 분석 (11번째 점)
  const drawFinalAnalysis = (ctx: CanvasRenderingContext2D) => {
    const p3 = [points[2].x, points[2].y];
    const p4 = [points[3].x, points[3].y];
    const p10 = [points[9].x, points[9].y];
    const p11 = [points[10].x, points[10].y];

    const [x12, y12] = getPerpendicularFoot(p3, p4, p10);
    const p12 = [x12, y12];

    // 빨간 점선 그리기
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(x12 * scale.x, y12 * scale.y);
    ctx.lineTo(p11[0] * scale.x, p11[1] * scale.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // 최종 각도 계산
    const finalAngle = calculateAngleBetweenLines(p10, p12, p11, p12);

    // 하단에 각도 표시
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`ZA - Menton angle: ${finalAngle.toFixed(1)}°`, canvasSize.width / 2, canvasSize.height - 10);

    setAngles(prev => ({ ...prev!, finalAngle }));
    setIsComplete(true);
  };

  // 음성 안내
  const speakMessage = (message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 캔버스 클릭 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentIndex >= FRONTAL_LANDMARKS.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale.x;
    const y = (e.clientY - rect.top) / scale.y;

    const newPoint = {
      name: FRONTAL_LANDMARKS[currentIndex],
      x,
      y
    };

    setPoints(prev => [...prev, newPoint]);
    setCurrentIndex(prev => prev + 1);

    // 다음 랜드마크 음성 안내
    if (currentIndex + 1 < FRONTAL_LANDMARKS.length) {
      speakMessage(FRONTAL_LANDMARKS[currentIndex + 1]);
    } else {
      speakMessage('프론탈 분석 완료');
    }
  };

  // 이미지 저장
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `frontal_ceph_analysis_${fileName}.png`;
    link.click();
  };

  // 결과 삽입 (DB 저장 + 부모 창으로 전송)
  const handleInsert = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 캔버스에 "FRONTAL" 텍스트 추가
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.textAlign = 'left';
      ctx.fillText('FRONTAL', 10, 40);
    }

    // 랜드마크 데이터를 객체로 변환
    const landmarksObj: Record<string, { x: number; y: number }> = {};
    points.forEach(point => {
      landmarksObj[point.name] = { x: point.x, y: point.y };
    });

    // 1. 캔버스 이미지(분석결과)를 S3에 업로드
    let s3AnnotatedUrl = '';
    let s3OriginalUrl = imageUrl; // 기본값은 현재 imageUrl

    try {
      // 분석결과 이미지 업로드
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas to blob failed'));
        }, 'image/png');
      });

      const formData = new FormData();
      formData.append('file', blob, `frontal_${Date.now()}.png`);
      formData.append('type', 'frontal');

      console.log('📤 Uploading Frontal annotated image to S3...');
      const uploadResponse = await fetch(`${basePath}/api/upload/file`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        s3AnnotatedUrl = uploadResult.s3Url;
        console.log('✅ Frontal annotated image uploaded to S3:', s3AnnotatedUrl);
      } else {
        const error = await uploadResponse.text();
        console.error('❌ S3 upload failed:', error);
        throw new Error('S3 업로드 실패: ' + error);
      }

      // 원본 이미지가 blob URL이면 S3에 업로드
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        console.log('📤 Uploading Frontal original image to S3...');

        // blob URL을 Blob으로 변환
        const originalBlob = await fetch(imageUrl).then(r => r.blob());
        const originalFormData = new FormData();
        originalFormData.append('file', originalBlob, `frontal_original_${Date.now()}.png`);
        originalFormData.append('type', 'frontal-original');

        const originalUploadResponse = await fetch(`${basePath}/api/upload/file`, {
          method: 'POST',
          body: originalFormData,
        });

        if (originalUploadResponse.ok) {
          const originalUploadResult = await originalUploadResponse.json();
          s3OriginalUrl = originalUploadResult.s3Url;
          console.log('✅ Frontal original image uploaded to S3:', s3OriginalUrl);
        } else {
          console.warn('⚠️ Original image upload failed, using annotated URL');
          s3OriginalUrl = s3AnnotatedUrl; // 실패 시 분석결과 URL 사용
        }
      }
    } catch (error) {
      console.error('❌ Error uploading Frontal image:', error);
      alert('이미지 업로드 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
      return;
    }

    // 2. 분석 데이터 준비
    const analysisData = {
      analysisId, // 기존 분석 업데이트용 ID
      type: 'FRONTAL',
      patientName,
      patientBirthDate,
      fileName,
      landmarks: landmarksObj,
      angles: angles,
      annotatedImageUrl: s3AnnotatedUrl,
      originalImageUrl: s3OriginalUrl, // S3에 업로드된 원본 이미지 URL
      timestamp: new Date().toISOString()
    };

    console.log('💾 Saving Frontal analysis to DB:', {
      analysisId: analysisId || 'NEW',
      mode: analysisId ? 'UPDATE' : 'CREATE',
      landmarkCount: Object.keys(landmarksObj).length,
      angles
    });

    // 3. API로 DB에 저장
    try {
      const response = await fetch(`${basePath}/api/frontal/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Frontal 분석이 DB에 저장되었습니다:', result);

        // 4. DB 저장 성공 후 Dashboard로 데이터 전송
        const resultData = {
          ...analysisData,
          analysisId: result.analysisId,
          analysisCode: result.analysisCode
        };

        // localStorage에 결과 저장 (백업 - 대시보드에서 읽을 수 있도록)
        localStorage.setItem('frontalAnalysisResult', JSON.stringify({
          annotatedImageUrl: s3AnnotatedUrl,
          timestamp: Date.now()
        }));
        console.log('✅ Frontal 결과를 localStorage에 저장:', s3AnnotatedUrl);

        // postMessage로 전송 시도
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'FRONTAL_ANALYSIS_COMPLETE',
            data: resultData
          }, '*');
          console.log('✅ Dashboard에 Frontal 완료 메시지 전송');
        } else {
          console.log('⚠️ window.opener를 찾을 수 없음, localStorage 사용');
        }

        // 5. BroadcastChannel로 모든 탭에 알림 (분석이력 자동 새로고침 + Frontal 결과)
        const channel = new BroadcastChannel('analysis_updates');
        channel.postMessage({
          type: 'FRONTAL_ANALYSIS_COMPLETE',
          analysisType: 'FRONTAL',
          annotatedImageUrl: s3AnnotatedUrl
        });
        channel.close();
        console.log('✅ BroadcastChannel: 모든 탭에 Frontal 결과 전송');

        alert('Frontal 분석이 저장되었습니다.');
        window.close();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'DB 저장 실패');
      }
    } catch (error) {
      console.error('❌ Error saving Frontal analysis:', error);
      alert('저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // 리셋
  const handleReset = () => {
    setPoints([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setAngles(null);

    // 캔버스 다시 그리기
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (canvas && ctx && img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    speakMessage(FRONTAL_LANDMARKS[0]);
  };

  // 실행 취소 (마지막 점 제거)
  const handleUndo = () => {
    if (points.length === 0) return;

    setPoints(prev => prev.slice(0, -1));
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setIsComplete(false);

    if (points.length > 1) {
      speakMessage(FRONTAL_LANDMARKS[points.length - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">Frontal Ceph 분석</h1>
          <p className="text-sm text-gray-400">{fileName} | {patientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm bg-blue-600 px-2 py-1 rounded">
            {currentIndex < FRONTAL_LANDMARKS.length
              ? `${currentIndex + 1}/${FRONTAL_LANDMARKS.length}: ${FRONTAL_LANDMARKS[currentIndex]}`
              : '분석 완료'}
          </span>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex">
        {/* 캔버스 영역 */}
        <div className="flex-1 flex justify-center items-start p-4">
          <div className="relative">
            {/* 가이드 메시지 */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded z-10">
              {currentIndex < FRONTAL_LANDMARKS.length
                ? FRONTAL_LANDMARKS[currentIndex]
                : '프론탈 분석 완료'}
            </div>

            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onClick={handleCanvasClick}
              className="border-2 border-gray-600 cursor-crosshair"
            />
          </div>
        </div>

        {/* 사이드바 */}
        <div className="w-64 bg-gray-800 p-4 space-y-4">
          {/* 레퍼런스 이미지 */}
          {showReferenceImage && (
            <div>
              <h3 className="text-sm font-semibold mb-2">랜드마크 참조</h3>
              <img
                src={`${basePath}/images/placeholders/frontal_diagram.png`}
                alt="Frontal Diagram"
                className="w-full border border-gray-600 cursor-pointer"
                onClick={() => window.open(`${basePath}/images/placeholders/frontal_diagram.png`, '_blank')}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${basePath}/images/placeholders/sample_frontal.jpg`;
                }}
              />
            </div>
          )}

          {/* 랜드마크 목록 */}
          <div>
            <h3 className="text-sm font-semibold mb-2">랜드마크 ({points.length}/{FRONTAL_LANDMARKS.length})</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {FRONTAL_LANDMARKS.map((name, idx) => (
                <div
                  key={name}
                  className={`text-xs px-2 py-1 rounded ${
                    idx < points.length
                      ? 'bg-green-600'
                      : idx === currentIndex
                      ? 'bg-blue-600'
                      : 'bg-gray-700'
                  }`}
                >
                  {idx + 1}. {name}
                </div>
              ))}
            </div>
          </div>

          {/* 각도 결과 */}
          {angles && (
            <div className="bg-gray-700 p-3 rounded">
              <h3 className="text-sm font-semibold mb-2">측정 결과</h3>
              <div className="text-xs space-y-1">
                <p>Z-point vs Zygion: {angles.angle1?.toFixed(1)}°</p>
                <p>Jugal vs Zygion: {angles.angle2?.toFixed(1)}°</p>
                <p>Antegonial vs Zygion: {angles.angle3?.toFixed(1)}°</p>
                {angles.finalAngle > 0 && (
                  <p className="text-red-400 font-bold">ZA-Menton: {angles.finalAngle.toFixed(1)}°</p>
                )}
              </div>
            </div>
          )}

          {/* 버튼들 */}
          <div className="space-y-2">
            <button
              onClick={handleUndo}
              disabled={points.length === 0}
              className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded text-sm"
            >
              실행 취소
            </button>
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              처음부터 다시
            </button>
            <button
              onClick={handleSave}
              disabled={!isComplete}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
            >
              이미지 저장
            </button>
            <button
              onClick={handleInsert}
              disabled={!isComplete}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm"
            >
              결과 삽입
            </button>
            <button
              onClick={() => window.close()}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            >
              닫기
            </button>
          </div>

          {/* 옵션 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showReferenceImage}
                onChange={(e) => setShowReferenceImage(e.target.checked)}
                className="rounded"
              />
              레퍼런스 이미지 표시
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
