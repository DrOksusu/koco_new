'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MagnifierCanvas from '@/components/MagnifierCanvas';
import GuideMessage from '@/components/GuideMessage';
import { apiUrl } from '@/lib/api-client';

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
  const [showMagnifier, setShowMagnifier] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [angles, setAngles] = useState<{ angle1: number; angle2: number; angle3: number; finalAngle: number } | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasMousePos, setCanvasMousePos] = useState({ x: -1, y: -1 });
  const [isReferencePopup, setIsReferencePopup] = useState(false);
  const [magnifierMessage, setMagnifierMessage] = useState(false);

  // 이미지 경로용 basePath (production에서는 /new 추가)
  const imgBase = process.env.NODE_ENV === 'production' ? '/new' : '';

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

      // 첫 번째 랜드마크 음성 안내
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(FRONTAL_LANDMARKS[0]);
          utterance.lang = 'ko-KR';
          utterance.rate = 1.5;
          speechSynthesis.speak(utterance);
        }, 500);
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
    if (points.length >= 8 && showMeasurements) {
      calculateAndDisplayAngles(ctx);
    }

    // 9개 점: 수직 점선 그리기
    if (points.length >= 9 && showMeasurements) {
      drawPerpendicularDashedLine(ctx);
    }

    // 10개 점: 녹색 연장선 그리기
    if (points.length >= 10 && showMeasurements) {
      drawExtendedGreenLine(ctx);
    }

    // 11개 점: 빨간 점선 및 최종 각도
    if (points.length >= 11 && showMeasurements) {
      drawFinalAnalysis(ctx);
    }
  }, [points, scale, showMeasurements]);

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

  // 캔버스 마우스 이동 핸들러
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });
    setCanvasMousePos({ x, y });
  };

  const handleCanvasMouseLeave = () => {
    setCanvasMousePos({ x: -1, y: -1 });
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
      const uploadResponse = await fetch(apiUrl('/api/upload/file'), {
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

        const originalUploadResponse = await fetch(apiUrl('/api/upload/file'), {
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
      const response = await fetch(apiUrl('/api/frontal/save'), {
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

  // 랜드마크 객체 변환 (MagnifierCanvas용)
  const landmarksForMagnifier = points.reduce((acc, point) => {
    acc[point.name] = { x: point.x * scale.x, y: point.y * scale.y };
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <div className="bg-gray-800 border-b border-gray-700 p-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-bold">
              Frontal Ceph 분석
            </h1>
            <GuideMessage
              currentLandmark={FRONTAL_LANDMARKS[currentIndex]}
              currentIndex={currentIndex}
              totalLandmarks={FRONTAL_LANDMARKS.length}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowMagnifier(!showMagnifier);
                if (!showMagnifier) {
                  setMagnifierMessage(true);
                  setTimeout(() => setMagnifierMessage(false), 3000);
                }
              }}
              className={`px-3 py-1 rounded text-sm ${showMagnifier ? 'bg-blue-600' : 'bg-gray-600'} hover:opacity-80`}
            >
              돋보기 {showMagnifier ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowReferenceImage(!showReferenceImage)}
              className={`px-3 py-1 rounded text-sm ${showReferenceImage ? 'bg-blue-600' : 'bg-gray-600'} hover:opacity-80`}
            >
              참조 이미지 {showReferenceImage ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowMeasurements(!showMeasurements)}
              className={`px-3 py-1 rounded text-sm ${showMeasurements ? 'bg-purple-600' : 'bg-gray-600'} hover:opacity-80`}
            >
              측정값 표시 {showMeasurements ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex h-[calc(100vh-100px)]">
        {/* 참조 이미지 및 진행 상황 - 좌측 */}
        {showReferenceImage && (
          <div className="w-[20%] p-2 border-r border-gray-700 overflow-y-auto">
            <div className="space-y-3">
              {/* 참조 이미지 */}
              <div className="relative">
                <img
                  src={`${imgBase}/images/landmarks/frontal_diagram.png`}
                  alt="Frontal Reference"
                  className="w-full object-contain cursor-pointer"
                  onDoubleClick={() => setIsReferencePopup(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${imgBase}/images/placeholders/sample_frontal.jpg`;
                  }}
                />
                <p className="text-xs text-gray-400 mt-1 text-center">
                  더블클릭하여 확대
                </p>
              </div>

              {/* 랜드마크 리스트 */}
              <div className="bg-gray-800 rounded-lg p-3">
                <h3 className="text-sm font-bold mb-2 text-gray-300">랜드마크 진행 상황</h3>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {FRONTAL_LANDMARKS.map((landmark, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const landmarkNumber = index + 1;

                    return (
                      <div
                        key={landmark}
                        className={`flex items-center space-x-2 p-1.5 rounded text-xs transition-all ${
                          isCompleted
                            ? 'bg-green-900/30 text-green-400'
                            : isCurrent
                            ? 'bg-blue-600 text-white font-bold animate-pulse'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}
                      >
                        <span className="w-6 text-center font-mono">
                          {isCompleted ? '✓' : landmarkNumber}
                        </span>
                        <span className="flex-1">{landmark}</span>
                      </div>
                    );
                  })}
                </div>

                {/* 진행 요약 */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">완료: {currentIndex}개</span>
                    <span className="text-yellow-400">남음: {FRONTAL_LANDMARKS.length - currentIndex}개</span>
                  </div>
                  <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${(currentIndex / FRONTAL_LANDMARKS.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 분석 결과 */}
                {angles && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <h4 className="text-sm font-bold mb-2 text-yellow-400">분석 결과</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Z-point vs Zygion:</span>
                        <span className="text-blue-400 font-mono">{angles.angle1?.toFixed(1)}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Jugal vs Zygion:</span>
                        <span className="text-blue-400 font-mono">{angles.angle2?.toFixed(1)}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Antegonial vs Zygion:</span>
                        <span className="text-blue-400 font-mono">{angles.angle3?.toFixed(1)}°</span>
                      </div>
                      {angles.finalAngle > 0 && (
                        <div className="flex justify-between pt-1 border-t border-gray-600">
                          <span className="text-gray-300">ZA-Menton:</span>
                          <span className="text-red-400 font-bold">{angles.finalAngle.toFixed(1)}°</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Canvas 영역 */}
        <div className="flex-1 relative p-2 flex justify-center items-start">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            className="border-2 border-gray-600 cursor-crosshair"
          />

          {/* 돋보기 - 마우스가 캔버스 안에 있을 때만 표시 */}
          {showMagnifier && canvasMousePos.x >= 0 && canvasMousePos.y >= 0 && (
            <MagnifierCanvas
              imageUrl={imageUrl}
              mousePos={mousePos}
              landmarks={landmarksForMagnifier}
              zoomLevel={0.7}
            />
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bg-gray-800 border-t border-gray-700 p-2">
        <div className="flex justify-center space-x-3">
          <button
            onClick={handleUndo}
            disabled={currentIndex === 0}
            className="px-4 py-1.5 bg-yellow-600 rounded text-sm hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            한 칸 전으로
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 bg-red-600 rounded text-sm hover:bg-red-700"
          >
            처음부터 다시하기
          </button>
          <button
            onClick={handleInsert}
            disabled={!isComplete}
            className="px-4 py-1.5 bg-green-600 rounded text-sm hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            분석 완료
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-1.5 bg-gray-600 rounded text-sm hover:bg-gray-700"
          >
            닫기
          </button>
        </div>
      </div>

      {/* 돋보기 안내 메시지 */}
      {magnifierMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-yellow-400 text-black px-6 py-3 rounded-lg shadow-lg font-medium animate-pulse">
          돋보기 안에 있는 빨간색 십자가의 중심에 점이 찍힙니다
        </div>
      )}

      {/* 참조 이미지 팝업 */}
      {isReferencePopup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setIsReferencePopup(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={`${imgBase}/images/landmarks/frontal_diagram.png`}
              alt="Frontal Reference"
              className="w-full h-full object-contain"
              style={{ transform: 'scale(1.1)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `${imgBase}/images/placeholders/sample_frontal.jpg`;
              }}
            />
            <button
              onClick={() => setIsReferencePopup(false)}
              className="absolute top-4 right-4 text-white bg-red-600 rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
