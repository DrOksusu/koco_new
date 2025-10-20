'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PSACanvas from '@/components/PSACanvas';
import MagnifierCanvas from '@/components/MagnifierCanvas';
import GuideMessage from '@/components/GuideMessage';

// PSA 랜드마크 정의 (6개)
const PSA_LANDMARKS = [
  'Porion',
  'Orbitale',
  'Hinge Point',
  'Mn.1 Crown',
  'Mn.6 Distal',
  'Symphysis Lingual'
];

export default function PSAAnalysisPage() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientBirthDate, setPatientBirthDate] = useState<string>('');

  const [landmarks, setLandmarks] = useState<Record<string, { x: number; y: number }>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMagnifier, setShowMagnifier] = useState(true);
  const [showReferenceImage, setShowReferenceImage] = useState(true);
  const [showGeometry, setShowGeometry] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasMousePos, setCanvasMousePos] = useState({ x: -1, y: -1 });
  const [isReferencePopup, setIsReferencePopup] = useState(false);
  const [magnifierMessage, setMagnifierMessage] = useState(false);

  const [guideZone, setGuideZone] = useState<number | null>(null);
  const [bufferZone, setBufferZone] = useState<number | null>(null);

  // 세션 스토리지에서 데이터 로드
  useEffect(() => {
    const storedImage = sessionStorage.getItem('xrayImage');
    const storedFileName = sessionStorage.getItem('xrayFileName');
    const storedPatientName = sessionStorage.getItem('patientName');
    const storedPatientBirthDate = sessionStorage.getItem('patientBirthDate');
    const storedLandmarkData = sessionStorage.getItem('landmarkData');

    console.log('PSA Page - SessionStorage data:', {
      hasImage: !!storedImage,
      imageLength: storedImage?.length,
      fileName: storedFileName,
      patientName: storedPatientName,
      patientBirthDate: storedPatientBirthDate,
      hasLandmarkData: !!storedLandmarkData
    });

    if (storedImage) {
      setImageUrl(storedImage);
      setFileName(storedFileName || 'Lateral Ceph');
      setPatientName(storedPatientName || '');
      setPatientBirthDate(storedPatientBirthDate || '');

      // 기존 랜드마크 데이터 로드
      if (storedLandmarkData) {
        try {
          const landmarkData = JSON.parse(storedLandmarkData);
          console.log('PSA Page - Loading existing landmarks:', landmarkData);
          setLandmarks(landmarkData);

          // 랜드마크가 모두 있으면 currentIndex를 마지막으로 설정
          if (Object.keys(landmarkData).length === PSA_LANDMARKS.length) {
            setCurrentIndex(PSA_LANDMARKS.length);
          } else {
            // 일부만 있으면 다음 입력할 인덱스로 설정
            setCurrentIndex(Object.keys(landmarkData).length);
          }
        } catch (error) {
          console.error('Failed to parse landmark data:', error);
        }
      }

      // 첫 번째 랜드마크 음성 안내 (기존 랜드마크가 없을 때만)
      if (!storedLandmarkData && 'speechSynthesis' in window) {
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(PSA_LANDMARKS[0]);
          utterance.lang = 'ko-KR';
          utterance.rate = 1.5;
          speechSynthesis.speak(utterance);
        }, 500);
      }
    } else {
      alert('이미지를 찾을 수 없습니다. Dashboard로 돌아갑니다.');
      window.close();
    }
  }, []);

  // 기하학적 분석 수행
  useEffect(() => {
    if (Object.keys(landmarks).length === PSA_LANDMARKS.length) {
      performGeometricAnalysis();
    }
  }, [landmarks]);

  const performGeometricAnalysis = () => {
    const porion = landmarks['Porion'];
    const orbitale = landmarks['Orbitale'];
    const hingePoint = landmarks['Hinge Point'];
    const mn1Cr = landmarks['Mn.1 Crown'];
    const mn6Distal = landmarks['Mn.6 Distal'];
    const symphysisLingual = landmarks['Symphysis Lingual'];

    if (!porion || !orbitale || !hingePoint || !mn1Cr || !mn6Distal || !symphysisLingual) return;

    // Guide Zone (D1) 계산
    const fhPerpFromHinge = calculatePerpendicular(porion, orbitale, hingePoint);
    const fhPerpFromMn1 = calculatePerpendicular(porion, orbitale, mn1Cr);
    const d1 = calculateDistance(fhPerpFromHinge, fhPerpFromMn1);
    setGuideZone(d1);

    // Buffer Zone (D2) 계산
    const occPerpFromSymph = calculatePerpendicular(mn1Cr, mn6Distal, symphysisLingual);
    const d2 = calculateDistance(occPerpFromSymph, mn1Cr);
    setBufferZone(d2);
  };

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

  // 랜드마크 추가
  const handleAddLandmark = (x: number, y: number) => {
    if (currentIndex >= PSA_LANDMARKS.length) return;

    const landmarkName = PSA_LANDMARKS[currentIndex];
    setLandmarks(prev => ({
      ...prev,
      [landmarkName]: { x, y }
    }));
    setCurrentIndex(prev => prev + 1);

    // 음성 안내
    speakGuide(currentIndex + 1);
  };

  // 음성 안내 함수
  const speakGuide = (nextIndex: number) => {
    if (nextIndex < PSA_LANDMARKS.length && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(PSA_LANDMARKS[nextIndex]);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  // 랜드마크 삭제
  const handleDeleteLandmark = (landmarkName: string) => {
    const index = PSA_LANDMARKS.indexOf(landmarkName);
    if (index === -1) return;

    // 삭제 확인
    if (!confirm(`${landmarkName} 포인트를 삭제하시겠습니까?`)) return;

    // 해당 랜드마크와 그 이후 랜드마크들 모두 삭제
    const newLandmarks: Record<string, { x: number; y: number }> = {};
    for (let i = 0; i < index; i++) {
      const name = PSA_LANDMARKS[i];
      if (landmarks[name]) {
        newLandmarks[name] = landmarks[name];
      }
    }
    setLandmarks(newLandmarks);
    setCurrentIndex(index);

    // 음성 안내
    speakGuide(index);
  };

  // 랜드마크 업데이트
  const handleUpdateLandmark = (name: string, x: number, y: number) => {
    setLandmarks(prev => ({
      ...prev,
      [name]: { x, y }
    }));
  };

  // 다시 시작
  const handleReset = () => {
    setLandmarks({});
    setCurrentIndex(0);
    setGuideZone(null);
    setBufferZone(null);
    speakGuide(0);
  };

  // 뒤로 가기
  const handleUndo = () => {
    if (currentIndex > 0) {
      const lastLandmark = PSA_LANDMARKS[currentIndex - 1];
      const newLandmarks = { ...landmarks };
      delete newLandmarks[lastLandmark];
      setLandmarks(newLandmarks);
      setCurrentIndex(currentIndex - 1);
      speakGuide(currentIndex - 1);
    }
  };

  // 분석 완료 및 저장
  const completeAnalysis = async () => {
    if (Object.keys(landmarks).length < PSA_LANDMARKS.length) {
      alert('모든 랜드마크를 설정해주세요.');
      return;
    }

    // Canvas에서 PSA 분석 이미지 생성
    const canvas = document.getElementById('psaCanvas') as HTMLCanvasElement;
    let imageDataUrl = '';
    let s3AnnotatedUrl = '';

    if (canvas) {
      imageDataUrl = canvas.toDataURL('image/png');
      console.log('Generated canvas Data URL for PSA image');
    } else {
      throw new Error('Canvas를 찾을 수 없습니다.');
    }

    // S3에 PSA 이미지 업로드
    if (imageDataUrl) {
      try {
        const uploadResponse = await fetch('/api/psa/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: imageDataUrl,
            fileName: fileName || 'psa_analysis.png',
            type: 'psa'
          }),
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          s3AnnotatedUrl = uploadResult.s3Url;
          console.log('PSA image uploaded to S3:', s3AnnotatedUrl);
        } else {
          const errorResult = await uploadResponse.json();
          console.error('Failed to upload PSA image to S3:', errorResult);
          throw new Error(`PSA 이미지 업로드 실패: ${errorResult.message || '알 수 없는 오류'}`);
        }
      } catch (error) {
        console.error('Error uploading PSA image to S3:', error);
        throw error;
      }
    } else {
      throw new Error('Canvas 이미지를 생성할 수 없습니다.');
    }

    const analysisData = {
      type: 'PSA',
      patientName,
      patientBirthDate,
      fileName,
      landmarks,
      geometry: {
        guideZone,
        bufferZone
      },
      annotatedImageUrl: s3AnnotatedUrl, // S3 URL 전송
      originalImageUrl: imageUrl,
      timestamp: new Date().toISOString()
    };

    // Dashboard로 데이터 전송
    if (window.opener) {
      window.opener.postMessage({
        type: 'PSA_ANALYSIS_COMPLETE',
        data: analysisData
      }, '*');
    }

    // API로 저장
    try {
      const response = await fetch('/api/psa/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
      });

      if (response.ok) {
        alert('PSA 분석이 저장되었습니다.');
        window.close();
      }
    } catch (error) {
      console.error('Error saving PSA analysis:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <div className="bg-gray-800 border-b border-gray-700 p-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-bold">
              PSA 분석 설정
            </h1>
            <GuideMessage
              currentLandmark={PSA_LANDMARKS[currentIndex]}
              currentIndex={currentIndex}
              totalLandmarks={PSA_LANDMARKS.length}
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
              onClick={() => setShowGeometry(!showGeometry)}
              className={`px-3 py-1 rounded text-sm ${showGeometry ? 'bg-purple-600' : 'bg-gray-600'} hover:opacity-80`}
            >
              기하학 분석 {showGeometry ? 'ON' : 'OFF'}
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
                  src="/images/landmarks/psa_diagram.png"
                  alt="PSA Reference"
                  className="w-full object-contain cursor-pointer"
                  onDoubleClick={() => setIsReferencePopup(true)}
                />
                <p className="text-xs text-gray-400 mt-1 text-center">
                  더블클릭하여 확대
                </p>
              </div>

              {/* 랜드마크 리스트 */}
              <div className="bg-gray-800 rounded-lg p-3">
                <h3 className="text-sm font-bold mb-2 text-gray-300">랜드마크 진행 상황</h3>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {PSA_LANDMARKS.map((landmark, index) => {
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
                    <span className="text-yellow-400">남음: {PSA_LANDMARKS.length - currentIndex}개</span>
                  </div>
                  <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${(currentIndex / PSA_LANDMARKS.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 분석 결과 */}
                {Object.keys(landmarks).length === PSA_LANDMARKS.length && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <h4 className="text-sm font-bold mb-2 text-yellow-400">분석 결과</h4>
                    <div className="space-y-1 text-xs">
                      {guideZone !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-300">Guide Zone (D1):</span>
                          <span className="text-green-400 font-mono">{guideZone.toFixed(2)} px</span>
                        </div>
                      )}
                      {bufferZone !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-300">Buffer Zone (D2):</span>
                          <span className="text-blue-400 font-mono">{bufferZone.toFixed(2)} px</span>
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
        <div className="flex-1 relative p-2">
          <PSACanvas
            imageUrl={imageUrl}
            landmarks={landmarks}
            currentIndex={currentIndex}
            onAddLandmark={handleAddLandmark}
            onDeleteLandmark={handleDeleteLandmark}
            onUpdateLandmark={handleUpdateLandmark}
            onMouseMove={(pos) => {
              setMousePos(pos);
              // 마우스가 캔버스 밖으로 나가면 canvasMousePos를 초기화
              if (pos.isInBounds === false) {
                setCanvasMousePos({ x: -1, y: -1 });
              } else {
                setCanvasMousePos(pos);
              }
            }}
            onCanvasMouseMove={setCanvasMousePos}
            psaLandmarks={PSA_LANDMARKS}
            showGeometry={showGeometry}
          />

          {/* 돋보기 - 마우스가 캔버스 안에 있을 때만 표시 */}
          {showMagnifier && canvasMousePos.x >= 0 && canvasMousePos.y >= 0 && (
            <MagnifierCanvas
              imageUrl={imageUrl}
              mousePos={mousePos}
              landmarks={landmarks}
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
            onClick={completeAnalysis}
            disabled={Object.keys(landmarks).length < PSA_LANDMARKS.length}
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
              src="/images/landmarks/psa_diagram.png"
              alt="PSA Reference"
              className="w-full h-full object-contain"
              style={{ transform: 'scale(1.1)' }}
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