'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LandmarkCanvas from '@/components/LandmarkCanvas';
import MagnifierCanvas from '@/components/MagnifierCanvas';
import GuideMessage from '@/components/GuideMessage';
import { LANDMARKS } from '@/lib/landmarks';
import { generateExcelFile } from '@/lib/excel-generator';
import { useLandmarkData } from '@/lib/hooks/useLandmarkData';
import { addCalculatedLandmarks } from '@/lib/calculations/intersectionCalculations';
import { calculateAllAngles } from '@/lib/calculations/angleCalculations';
import { calculateAllDistances } from '@/lib/calculations/distanceCalculations';

export default function LandmarkPage() {
  const router = useRouter();
  const { sendMeasurementData } = useLandmarkData();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [originalImageUrl, setOriginalImageUrl] = useState<string>(''); // 원본 이미지 URL 저장
  const [fileName, setFileName] = useState<string>('');
  const [landmarks, setLandmarks] = useState<Record<string, { x: number; y: number }>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMagnifier, setShowMagnifier] = useState(true);
  const [showReferenceImage, setShowReferenceImage] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasMousePos, setCanvasMousePos] = useState({ x: 0, y: 0 });
  const [isReferencePopup, setIsReferencePopup] = useState(false);
  const [magnifierMessage, setMagnifierMessage] = useState(false);
  const [isReEditMode, setIsReEditMode] = useState(false);
  const [analysisId, setAnalysisId] = useState<string>('');
  const currentLandmarkRef = useRef<HTMLDivElement>(null);

  // basePath 처리 (production에서는 /new 추가)
  const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

  // 페이지 로드 시 데이터 가져오기
  useEffect(() => {
    // URL 파라미터 체크 (재편집 모드)
    const urlParams = new URLSearchParams(window.location.search);
    const isReEdit = urlParams.get('reEdit') === 'true';

    if (isReEdit) {
      // 재편집 모드: 기존 분석 데이터 가져오기
      // 새 창에서는 opener의 sessionStorage를 확인
      let reEditData = sessionStorage.getItem('reEditAnalysis');

      // 새 창에서 열렸을 때 opener의 sessionStorage 확인
      if (!reEditData && window.opener) {
        try {
          reEditData = window.opener.sessionStorage.getItem('reEditAnalysis');
        } catch (e) {
          console.error('Cannot access opener sessionStorage:', e);
        }
      }

      if (reEditData) {
        const data = JSON.parse(reEditData);
        console.log('Loading re-edit data:', data);
        console.log('Analysis ID:', data.analysisId);
        console.log('Image URL:', data.imageUrl);

        setIsReEditMode(true);
        setAnalysisId(data.analysisId);
        setFileName(data.fileName);
        setLandmarks(data.landmarks || {});
        setCurrentIndex(LANDMARKS.length); // 모든 랜드마크가 이미 설정됨

        // 원본 이미지 URL 저장 (재편집 모드에서는 이미 랜드마크가 그려진 이미지를 사용)
        setOriginalImageUrl(data.originalImageUrl || data.imageUrl);

        // 환자 정보 복원
        if (data.patientName) {
          sessionStorage.setItem('patientName', data.patientName);
        }
        if (data.patientBirthDate) {
          sessionStorage.setItem('patientBirthDate', data.patientBirthDate);
        }

        // 이미지 설정 - S3 URL에 대해 서명된 URL 가져오기
        if (data.imageUrl) {
          console.log('Checking image URL:', data.imageUrl);

          // S3 URL인 경우 서명된 URL 가져오기 (이미지 설정 전에!)
          if (data.imageUrl.includes('.s3.') || data.imageUrl.includes('s3.amazonaws.com')) {
            console.log('S3 URL detected, getting signed URL...');
            // S3 URL은 서명된 URL을 받을 때까지 기다림
            fetch(`${basePath}/api/landmark/signed-url`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: data.imageUrl })
            })
              .then(res => res.json())
              .then(result => {
                if (result.success && result.signedUrl) {
                  console.log('Got signed URL, setting image');
                  setImageUrl(result.signedUrl);
                } else {
                  console.error('Failed to get signed URL:', result.error);
                  // Fallback은 사용하지 않음 (403 에러 방지)
                  alert('이미지를 불러올 수 없습니다. AWS 설정을 확인해주세요.');
                }
              })
              .catch(error => {
                console.error('Error getting signed URL:', error);
                alert('이미지를 불러올 수 없습니다: ' + error.message);
              });
          } else {
            // S3가 아닌 경우 직접 사용
            console.log('Non-S3 URL, using directly');
            setImageUrl(data.imageUrl);
          }
        } else if (data.analysisId) {
          // imageUrl이 없는 경우에만 API를 통해 가져오기
          console.log('No imageUrl, fetching from API with ID:', data.analysisId);
          fetch(`/api/landmark/image/${data.analysisId}`)
            .then(res => {
              console.log('API Response status:', res.status);
              return res.json();
            })
            .then(result => {
              console.log('API Result:', result);
              if (result.success && result.imageData) {
                console.log('Image loaded successfully from API');
                setImageUrl(result.imageData);
              } else {
                console.error('Failed to load image from API:', result.error);
              }
            })
            .catch(error => {
              console.error('Error loading image:', error);
            });
        }

        // sessionStorage 정리 - opener와 현재 창 모두
        sessionStorage.removeItem('reEditAnalysis');
        if (window.opener) {
          try {
            window.opener.sessionStorage.removeItem('reEditAnalysis');
          } catch (e) {
            console.error('Cannot clear opener sessionStorage:', e);
          }
        }
        return;
      } else {
        console.log('No reEditAnalysis data found in sessionStorage');
      }
    }

    // 일반 모드: 새 이미지 업로드 (새 창은 sessionStorage가 분리되므로 opener 폴백 지원)
    let savedImage = sessionStorage.getItem('xrayImage');
    let savedFileName = sessionStorage.getItem('xrayFileName');

    // 새 창에서 열렸고 현재 sessionStorage에 없으면 opener의 sessionStorage에서 폴백
    if ((!savedImage || !savedFileName) && window.opener) {
      try {
        const openerImage = window.opener.sessionStorage.getItem('xrayImage');
        const openerFileName = window.opener.sessionStorage.getItem('xrayFileName');
        if (openerImage && openerFileName) {
          savedImage = openerImage;
          savedFileName = openerFileName;
          // 현재 창 sessionStorage에도 복사하여 이후 흐름 간소화
          sessionStorage.setItem('xrayImage', savedImage);
          sessionStorage.setItem('xrayFileName', savedFileName);
        }
      } catch (e) {
        console.error('Cannot access opener sessionStorage in normal mode:', e);
      }
    }

    if (savedImage) {
      setImageUrl(savedImage);
      setOriginalImageUrl(savedImage); // 원본 이미지 URL 저장
      setFileName(savedFileName || 'Lateral_Ceph.jpg'); // 파일명 없으면 기본값 사용

      // 첫 번째 랜드마크 음성 안내
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(LANDMARKS[0]);
          utterance.lang = 'ko-KR';
          utterance.rate = 2.34;
          speechSynthesis.speak(utterance);
        }, 500);
      }
    } else {
      alert('이미지를 찾을 수 없습니다. 다시 업로드해주세요.');
      router.push('/dashboard');
    }
  }, [router]);

  // 현재 랜드마크로 자동 스크롤
  useEffect(() => {
    if (currentLandmarkRef.current) {
      currentLandmarkRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentIndex]);

  // 이미지 준비 전에는 캔버스 렌더를 지연하고 로딩 표시
  const isImageReady = Boolean(imageUrl && imageUrl.length > 0);

  // 랜드마크 추가
  const handleAddLandmark = (x: number, y: number) => {
    if (currentIndex >= LANDMARKS.length) return;

    const landmarkName = LANDMARKS[currentIndex];
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
    if (nextIndex < LANDMARKS.length && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(LANDMARKS[nextIndex]);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.4;
      speechSynthesis.speak(utterance);
    }
  };

  // 랜드마크 삭제
  const handleDeleteLandmark = (landmarkName: string) => {
    const index = LANDMARKS.indexOf(landmarkName);
    if (index === -1) return;

    // 삭제 확인
    if (!confirm(`${landmarkName} 포인트를 삭제하시겠습니까?`)) return;

    // 해당 랜드마크와 그 이후 랜드마크들 삭제
    const newLandmarks = { ...landmarks };
    for (let i = index; i < LANDMARKS.length; i++) {
      delete newLandmarks[LANDMARKS[i]];
    }
    setLandmarks(newLandmarks);
    setCurrentIndex(index);
  };

  // 한 칸 전으로
  const handleUndo = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const landmarkName = LANDMARKS[prevIndex];
      const newLandmarks = { ...landmarks };
      delete newLandmarks[landmarkName];
      setLandmarks(newLandmarks);
      setCurrentIndex(prevIndex);
    }
  };

  // 처음부터 다시하기
  const handleReset = () => {
    if (confirm('모든 랜드마크를 초기화하시겠습니까?')) {
      setLandmarks({});
      setCurrentIndex(0);

      // 첫 번째 랜드마크 음성 안내
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(LANDMARKS[0]);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.4;
        speechSynthesis.speak(utterance);
      }
    }
  };

  // 엑셀 데이터 생성
  const handleGenerateExcel = async () => {
    if (currentIndex < LANDMARKS.length) {
      alert(`아직 ${LANDMARKS.length - currentIndex}개의 랜드마크가 남았습니다.`);
      return;
    }

    // S3 URL들을 함수 최상단에 선언
    let s3OriginalUrl = '';
    let s3AnnotatedUrl = '';

    try {
      // 로딩 표시
      const loadingAlert = document.createElement('div');
      loadingAlert.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg';
      loadingAlert.textContent = '데이터 저장 중...';
      document.body.appendChild(loadingAlert);

      // Go, Gn 등 계산된 랜드마크 추가
      const extendedLandmarks = addCalculatedLandmarks(landmarks);

      // 확장된 랜드마크로 각도 계산 (전체 계산 함수 사용)
      const angles = calculateAllAngles(extendedLandmarks);
      console.log('Calculated angles count:', Object.keys(angles).length);

      // 거리 계측값 계산 (ACBL, MBL, AFH, PFH, E-line 등)
      const distances = calculateAllDistances(extendedLandmarks);
      console.log('Calculated distances count:', Object.keys(distances).length);

      // 각도와 거리 계측값 병합
      const allMeasurements = { ...angles, ...distances };
      console.log('Total measurements count:', Object.keys(allMeasurements).length);

      // 계측값 대시보드로 데이터 전송 (확장된 랜드마크 사용)
      const measurementResult = await sendMeasurementData(extendedLandmarks);

      // 1. Canvas에서 랜드마크가 그려진 이미지 생성
      const canvas = document.getElementById('landmarkCanvas') as HTMLCanvasElement;
      let imageDataUrl = '';
      let s3AnnotatedUrl = '';
      let s3OriginalUrl = '';

      if (canvas) {
        imageDataUrl = canvas.toDataURL('image/png');
        console.log('Generated canvas Data URL for landmark image');
      } else {
        throw new Error('Canvas를 찾을 수 없습니다.');
      }

      // S3 업로드가 완료된 후 메시지 전송을 위해 임시로 주석 처리
      // (S3 업로드 완료 후 아래에서 전송)

      // 2. S3에 랜드마크 이미지 업로드
      if (imageDataUrl) {
        const uploadResponse = await fetch(`${basePath}/api/landmark/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: imageDataUrl,
            fileName: fileName || 'landmark_analysis.png',
            type: 'landmark'
          }),
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          s3AnnotatedUrl = uploadResult.s3Url;
          console.log('Annotated image uploaded to S3:', s3AnnotatedUrl);
        } else {
          const errorResult = await uploadResponse.json();
          console.error('Failed to upload annotated image to S3:', errorResult);
          throw new Error(`랜드마크 이미지 업로드 실패: ${errorResult.message || '알 수 없는 오류'}`);
        }
      } else {
        throw new Error('Canvas 이미지를 생성할 수 없습니다.');
      }

      // 3. 원본 이미지 S3 URL 생성
      // 원본 이미지를 S3에 업로드 (data URL 또는 base64인 경우)
      if (originalImageUrl) {
        if (originalImageUrl.startsWith('data:') || originalImageUrl.startsWith('blob:')) {
          // data URL 또는 blob URL인 경우 업로드
          const uploadOriginalResponse = await fetch(`${basePath}/api/landmark/upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: originalImageUrl,
              fileName: fileName || 'lateral_ceph.jpg',
              type: 'original'
            }),
          });

          if (uploadOriginalResponse.ok) {
            const uploadOriginalResult = await uploadOriginalResponse.json();
            s3OriginalUrl = uploadOriginalResult.s3Url;
            console.log('Original image uploaded to S3:', s3OriginalUrl);
          } else {
            const errorResult = await uploadOriginalResponse.json();
            console.error('Failed to upload original image to S3:', errorResult);
            throw new Error(`원본 이미지 업로드 실패: ${errorResult.message || '알 수 없는 오류'}`);
          }
        } else if (originalImageUrl.includes('s3')) {
          // 이미 S3 URL인 경우 그대로 사용
          s3OriginalUrl = originalImageUrl;
          console.log('Using existing S3 URL for original:', s3OriginalUrl);
        } else {
          // 기타 URL인 경우 그대로 사용
          s3OriginalUrl = originalImageUrl;
        }
      } else {
        throw new Error('원본 이미지 URL이 없습니다.');
      }

      // 4. 데이터베이스에 저장
      console.log('Saving to database with data:', {
        fileName,
        landmarkCount: Object.keys(landmarks).length,
        angleCount: Object.keys(angles).length,
        distanceCount: Object.keys(distances).length,
        totalMeasurementCount: Object.keys(allMeasurements).length,
        originalImageUrl: s3OriginalUrl,
        annotatedImageUrl: s3AnnotatedUrl,
      });

      // 기존 분석 ID 가져오기 (있으면 업데이트, 없으면 생성)
      const existingAnalysisId = sessionStorage.getItem('analysisId');

      const saveResponse = await fetch(`${basePath}/api/landmark/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: existingAnalysisId || undefined, // 기존 분석 ID (업데이트용)
          fileName,
          landmarks: extendedLandmarks, // 확장된 랜드마크 저장
          angles: allMeasurements, // 각도 + 거리 계측값 모두 포함
          originalImageUrl: s3OriginalUrl,
          annotatedImageUrl: s3AnnotatedUrl,
          patientName: sessionStorage.getItem('patientName') || 'Unknown Patient',
          patientBirthDate: sessionStorage.getItem('patientBirthDate') || null,
        }),
      });

      console.log('Save response status:', saveResponse.status);

      if (saveResponse.ok) {
        const saveResult = await saveResponse.json();
        console.log('Save successful:', saveResult);
        
        // S3 업로드 완료 후 opener로 데이터 전송
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'LANDMARK_ANALYSIS_COMPLETE',
            data: {
              landmarks: extendedLandmarks, // 확장된 랜드마크 전송
              angles: allMeasurements, // 각도 + 거리 계측값 모두 포함
              measurements: measurementResult?.measurements || allMeasurements, // 계측값
              diagnosis: measurementResult?.diagnosis,
              fileName,
              timestamp: new Date().toISOString(),
              annotatedImageUrl: s3AnnotatedUrl, // S3 URL 전송
              originalImageUrl: s3OriginalUrl, // 원본 S3 URL 전송
              analysisId: saveResult.analysisId, // 분석 ID 전송
              chartNumber: saveResult.chartNumber, // 차트번호 전송
            }
          }, '*');

          console.log('Sent analysis data to opener window with S3 URLs:', {
            annotatedImageUrl: s3AnnotatedUrl,
            originalImageUrl: s3OriginalUrl,
            analysisId: saveResult.analysisId,
            chartNumber: saveResult.chartNumber
          });
        }

        // BroadcastChannel로 모든 탭에 알림 (분석이력 자동 새로고침)
        const channel = new BroadcastChannel('analysis_updates');
        channel.postMessage({ type: 'ANALYSIS_SAVED', analysisType: 'LANDMARK' });
        channel.close();
        console.log('✅ BroadcastChannel: 모든 탭에 Landmark 저장 알림');
        
        // 4. 엑셀 파일 생성 및 다운로드
        generateExcelFile(fileName || 'analysis', landmarks, angles);

        // 로딩 제거
        document.body.removeChild(loadingAlert);

        // 성공 메시지
        const successAlert = document.createElement('div');
        successAlert.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg';
        successAlert.innerHTML = `
          <div>✓ 데이터가 성공적으로 저장되었습니다!</div>
          <div class="text-sm mt-1">• 데이터베이스 저장 완료</div>
          <div class="text-sm">• S3 이미지 업로드 완료</div>
          <div class="text-sm">• 엑셀 파일 다운로드 완료</div>
        `;
        document.body.appendChild(successAlert);

        setTimeout(() => {
          document.body.removeChild(successAlert);

          // 재편집 모드인 경우 대시보드로 이동
          if (isReEditMode) {
            // 재편집 완료 데이터를 sessionStorage에 저장
            const patientName = sessionStorage.getItem('patientName') || '';
            const patientBirthDate = sessionStorage.getItem('patientBirthDate') || '';

            // Canvas에서 현재 이미지를 다시 가져오기 (setTimeout 내부에서 실행)
            const currentCanvas = document.querySelector('canvas') as HTMLCanvasElement;
            let currentImageDataUrl = '';
            if (currentCanvas) {
              currentImageDataUrl = currentCanvas.toDataURL('image/png');
              console.log('Current canvas data URL length:', currentImageDataUrl.length);
            }

            console.log('Saving dashboard data:', {
              patientName,
              patientBirthDate,
              hasImageDataUrl: !!imageDataUrl,
              hasCurrentImageDataUrl: !!currentImageDataUrl,
              hasS3AnnotatedUrl: !!s3AnnotatedUrl,
              imageDataUrlLength: imageDataUrl ? imageDataUrl.length : 0,
              currentImageDataUrlLength: currentImageDataUrl ? currentImageDataUrl.length : 0
            });

            // annotatedImageUrl 결정: S3 URL > 현재 Canvas > 이전 imageDataUrl
            const finalAnnotatedUrl = s3AnnotatedUrl || currentImageDataUrl || imageDataUrl;

            const dashboardData = {
              landmarks: extendedLandmarks,
              angles,
              measurements: measurementResult?.measurements,
              diagnosis: measurementResult?.diagnosis,
              fileName,
              timestamp: new Date().toISOString(),
              imageUrl: s3OriginalUrl || originalImageUrl, // S3 URL 우선 사용
              annotatedImageUrl: finalAnnotatedUrl, // 결정된 URL 사용
              patientName,
              patientBirthDate
            };

            sessionStorage.setItem('analysisData', JSON.stringify(dashboardData));

            // 재편집 완료 후에는 대시보드로 이동하여 진단 이어가기
            if (window.opener && !window.opener.closed) {
              // opener가 있는 경우 opener를 대시보드로 이동시키고 현재 창 닫기
              window.opener.location.href = '/dashboard';
              window.close();
            } else {
              // opener가 없는 경우 현재 창에서 대시보드로 이동
              router.push('/dashboard');
            }
          } else {
            // 일반 모드: 창 닫기 확인
            if (window.opener && !window.opener.closed) {
              if (confirm('분석이 완료되었습니다. 이 창을 닫고 원래 페이지에서 결과를 확인하시겠습니까?')) {
                window.close();
              }
            } else {
              // opener가 없는 경우 dashboard로 이동
              router.push('/dashboard');
            }
          }
        }, 3000);
      } else {
        // 서버 에러 메시지 가져오기
        const errorData = await saveResponse.json();
        throw new Error(errorData.details || errorData.error || 'Failed to save data');
      }
    } catch (error) {
      console.error('Error:', error);

      // 로딩 제거 (에러 시에도)
      const loadingAlert = document.querySelector('[class*="bg-blue-500"]');
      if (loadingAlert && loadingAlert.parentNode) {
        loadingAlert.parentNode.removeChild(loadingAlert);
      }

      // 에러 메시지 표시
      const errorAlert = document.createElement('div');
      errorAlert.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-md';
      errorAlert.innerHTML = `
        <div>❌ 데이터 저장 중 오류가 발생했습니다</div>
        <div class="text-sm mt-2">${error instanceof Error ? error.message : 'Unknown error'}</div>
      `;
      document.body.appendChild(errorAlert);

      setTimeout(() => {
        if (errorAlert.parentNode) {
          errorAlert.parentNode.removeChild(errorAlert);
        }
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <div className="bg-gray-800 border-b border-gray-700 p-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-bold">
              랜드마크 설정 {isReEditMode && <span className="text-yellow-400">(재편집 모드)</span>}
            </h1>
            <GuideMessage
              currentLandmark={LANDMARKS[currentIndex]}
              currentIndex={currentIndex}
              totalLandmarks={LANDMARKS.length}
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
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex h-[calc(100vh-100px)]">
        {/* 참조 이미지 및 진행 상황 */}
        {showReferenceImage && (
          <div className="w-[20%] p-2 border-r border-gray-700 overflow-y-auto">
            <div className="space-y-3">
              {/* 참조 이미지 */}
              <div className="relative">
                <img
                  src={`${basePath}/images/landmarks/landmark.png`}
                  alt="Landmark Reference"
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
                  {LANDMARKS.map((landmark, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const landmarkNumber = index + 1;

                    return (
                      <div
                        key={landmark}
                        ref={isCurrent ? currentLandmarkRef : null}
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
                    <span className="text-yellow-400">남음: {LANDMARKS.length - currentIndex}개</span>
                  </div>
                  <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${(currentIndex / LANDMARKS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas 영역 */}
        <div className="flex-1 relative p-2" style={{ minHeight: '60vh' }}>
          {isImageReady ? (
            <LandmarkCanvas
              imageUrl={imageUrl}
              landmarks={landmarks}
              onAddLandmark={handleAddLandmark}
              onDeleteLandmark={handleDeleteLandmark}
              onMouseMove={(pos) => {
                setMousePos(pos);
                // 마우스가 캔버스 밖으로 나가면 canvasMousePos를 초기화
                if (pos.isInBounds === false) {
                  setCanvasMousePos({ x: -1, y: -1 });
                } else {
                  setCanvasMousePos(pos);
                }
              }}
              currentIndex={currentIndex}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              이미지를 불러오는 중...
            </div>
          )}

          {/* 돋보기 - 마우스가 캔버스 안에 있을 때만 표시 */}
          {isImageReady && showMagnifier && canvasMousePos.x >= 0 && canvasMousePos.y >= 0 && (
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
            onClick={handleGenerateExcel}
            disabled={currentIndex < LANDMARKS.length}
            className="px-4 py-1.5 bg-green-600 rounded text-sm hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            엑셀 데이터 생성
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-1.5 bg-gray-600 rounded text-sm hover:bg-gray-700"
          >
            뒤로 가기
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
              src={`${basePath}/images/landmarks/landmark.png`}
              alt="Landmark Reference"
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