'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/FileUpload';
import MeasurementDashboard from '@/components/MeasurementDashboard';
import Link from 'next/link';
import { useMeasurementStore } from '@/store/measurementStore';
import { imageCache } from '@/lib/imageCache';
import { generatePowerPoint, canGeneratePowerPoint } from '@/lib/services/powerpointService';

// 최적화된 S3 이미지 컴포넌트 (imageCache 사용)
const S3Image = memo(function S3Image({
  src,
  alt = 'Image',
  className = '',
  onClick = undefined
}: {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}) {
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // imageCache를 통해 이미지 로드 (중복 방지, 자동 캐싱)
        const blobUrl = await imageCache.getOrLoadImage(src);

        if (mounted) {
          setDisplayUrl(blobUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('S3Image load error:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    // cleanup
    return () => {
      mounted = false;
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !displayUrl) {
    return (
      <div className={`bg-gray-100 ${className}`}>
        <div className="flex flex-col items-center justify-center h-full">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-gray-400 text-sm mt-2">이미지를 불러올 수 없습니다</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      onClick={onClick}
    />
  );
});

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { clearAll } = useMeasurementStore();

  // basePath for images (production: /new, development: '')
  const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [diagnosisType, setDiagnosisType] = useState<'LANDMARK' | 'PSA' | 'PSO'>('LANDMARK');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [landmarkResultImage, setLandmarkResultImage] = useState<string | null>(null);
  const [psaResultImage, setPsaResultImage] = useState<string | null>(null);
  const [psoResultImage, setPsoResultImage] = useState<string | null>(null);
  // 진단 완료 파일들 (원본, Landmark, PSA, PSO)
  const [originalResultImage, setOriginalResultImage] = useState<string | null>(null);
  const [uploadedLandmarkResult, setUploadedLandmarkResult] = useState<string | null>(null);
  const [uploadedPsaResult, setUploadedPsaResult] = useState<string | null>(null);
  const [uploadedPsoResult, setUploadedPsoResult] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'pptx' | 'pdf'>('pptx');
  const [isGeneratingFile, setIsGeneratingFile] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // 환자 정보 자동 저장 (debounced) - 분석 레코드가 있을 때만
  useEffect(() => {
    // analysisData가 없으면 저장 불가 (새 분석인 경우)
    if (!analysisData || !analysisData.analysisId) {
      return;
    }

    // 3초 debounce
    const timeoutId = setTimeout(async () => {
      try {
        setIsSaving(true);
        console.log('Auto-saving patient info:', {
          analysisId: analysisData.analysisId,
          patientName,
          patientBirthDate
        });

        const response = await fetch('/api/landmark/update-patient', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisId: analysisData.analysisId,
            patientName,
            patientBirthDate
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Patient info auto-saved successfully:', result);
        } else {
          const error = await response.json();
          console.error('Failed to auto-save patient info:', error);
        }
      } catch (error) {
        console.error('Error auto-saving patient info:', error);
      } finally {
        setIsSaving(false);
      }
    }, 3000);

    // cleanup: 3초 이내에 다시 변경되면 이전 타이머 취소
    return () => clearTimeout(timeoutId);
  }, [patientName, patientBirthDate, analysisData?.analysisId]);

  // 분석 이력에서 데이터 받기 및 랜드마크 창에서 데이터 받기
  useEffect(() => {
    // 랜드마크 창에서 메시지 받기
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LANDMARK_ANALYSIS_COMPLETE') {
        console.log('Received landmark analysis data:', event.data.data);
        console.log('=== Analysis Data Structure ===');
        console.log('Has angles:', !!event.data.data.angles);
        console.log('Has diagnosis:', !!event.data.data.diagnosis);
        console.log('Has measurements:', !!event.data.data.measurements);
        console.log('Keys:', Object.keys(event.data.data));
        setAnalysisData(event.data.data);

        // 랜드마크가 표시된 이미지 저장
        if (event.data.data.annotatedImageUrl) {
          setLandmarkResultImage(event.data.data.annotatedImageUrl);
          setUploadedLandmarkResult(event.data.data.annotatedImageUrl); // 진단 완료 섹션에도 표시
        }

        // 랜드마크 데이터를 sessionStorage에 저장 (PSA/PSO에서 Ruler 사용을 위해)
        if (event.data.data.landmarks) {
          sessionStorage.setItem('landmarkData', JSON.stringify(event.data.data.landmarks));
          console.log('✅ Saved landmarkData to sessionStorage for PSA/PSO scale factor:', {
            landmarkCount: Object.keys(event.data.data.landmarks).length,
            hasRulerStart: !!event.data.data.landmarks['Ruler Start'],
            hasRulerEnd: !!event.data.data.landmarks['Ruler End']
          });
        }

        // analysisId를 sessionStorage에 저장 (PSA/PSO 업데이트를 위해)
        if (event.data.data.analysisId) {
          sessionStorage.setItem('analysisId', event.data.data.analysisId);
          console.log('✅ Saved analysisId to sessionStorage:', event.data.data.analysisId);
        }

        // MeasurementDashboard가 업데이트되도록 트리거
        if (event.data.data.measurements) {
          localStorage.setItem('landmarkAnalysisData', JSON.stringify({
            measurements: event.data.data.measurements,
            diagnosis: event.data.data.diagnosis,
            timestamp: event.data.data.timestamp
          }));
        }
      } else if (event.data.type === 'PSA_ANALYSIS_COMPLETE') {
        console.log('Received PSA analysis data:', event.data.data);

        // PSA 분석 완료 이미지 저장
        if (event.data.data.annotatedImageUrl) {
          setPsaResultImage(event.data.data.annotatedImageUrl);
          setUploadedPsaResult(event.data.data.annotatedImageUrl); // 진단 완료 섹션에도 표시
        }

        // PSA 분석 데이터도 저장 (필요한 경우)
        if (event.data.data.landmarks) {
          localStorage.setItem('psaAnalysisData', JSON.stringify({
            landmarks: event.data.data.landmarks,
            lines: event.data.data.lines,
            timestamp: event.data.data.timestamp
          }));
        }
      } else if (event.data.type === 'PSO_ANALYSIS_COMPLETE') {
        console.log('Received PSO analysis data:', event.data.data);

        // PSO 분석 완료 이미지 저장
        if (event.data.data.annotatedImageUrl) {
          setPsoResultImage(event.data.data.annotatedImageUrl);
          setUploadedPsoResult(event.data.data.annotatedImageUrl); // 진단 완료 섹션에도 표시
        }

        // PSO 분석 데이터도 저장 (필요한 경우)
        if (event.data.data.landmarks) {
          localStorage.setItem('psoAnalysisData', JSON.stringify({
            landmarks: event.data.data.landmarks,
            lines: event.data.data.lines,
            timestamp: event.data.data.timestamp
          }));
        }
      }
    };

    window.addEventListener('message', handleMessage);

    const storedData = sessionStorage.getItem('analysisData');
    if (storedData) {
      console.log('Loading data from history/re-edit:', storedData);
      const data = JSON.parse(storedData);
      console.log('=== Analysis Data Debug ===');
      console.log('Data type:', data.type);
      console.log('Has annotatedImageUrl:', !!data.annotatedImageUrl);
      console.log('Has originalImageUrl:', !!data.originalImageUrl);
      setAnalysisData(data);

      // 환자 정보 복원
      if (data.patientName) {
        console.log('Setting patient name:', data.patientName);
        setPatientName(data.patientName);
      }
      if (data.patientBirthDate) {
        console.log('Setting patient birth date:', data.patientBirthDate);
        // ISO 날짜 형식을 yyyy-MM-dd로 변환
        const birthDate = data.patientBirthDate.split('T')[0];
        setPatientBirthDate(birthDate);
      }

      // 이미지 URL이 있으면 미리보기 URL로 설정
      if (data.imageUrl) {
        console.log('Setting image URL from history:', data.imageUrl);
        setIsFromHistory(true);

        // S3 URL인지 확인하고 서명된 URL 가져오기
        const processImageUrl = async (url: string) => {
          console.log('=== processImageUrl Debug ===');
          console.log('processImageUrl - input URL:', url.substring(0, 100) + '...');
          console.log('processImageUrl - URL length:', url.length);
          console.log('processImageUrl - URL type:', {
            isDataUrl: url.startsWith('data:'),
            isS3Url: url.includes('.s3.') || url.includes('s3.amazonaws.com'),
            isBlobUrl: url.startsWith('blob:'),
            isHttpUrl: url.startsWith('http')
          });

          // Data URL인 경우 그대로 반환 (S3Image에서 처리)
          if (url.startsWith('data:')) {
            console.log('processImageUrl - Data URL detected, returning as-is');
            return url;
          }

          if (url && (url.includes('.s3.') || url.includes('s3.amazonaws.com'))) {
            try {
              const response = await fetch('/api/landmark/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url })
              });
              const result = await response.json();
              console.log('processImageUrl - signed URL result:', result.success ? 'SUCCESS' : 'FAILED');
              return result.success ? result.signedUrl : url;
            } catch (error) {
              console.error('Error getting signed URL:', error);
              return url;
            }
          }
          console.log('processImageUrl - returning original URL (not S3)');
          return url;
        };

        // 가짜 File 객체 먼저 생성
        const fakeFile = new File([], data.fileName || 'analysis.jpg', {
          type: 'image/jpeg'
        });
        Object.defineProperty(fakeFile, 'isFromHistory', {
          value: true,
          writable: false,
          enumerable: true
        });
        setUploadedFiles([fakeFile]);
        console.log('Uploaded files set with history flag');

        // 원본 이미지 처리 및 previewUrls 설정
        processImageUrl(data.imageUrl).then(signedUrl => {
          console.log('=== Preview URLs Setting Debug ===');
          console.log('processImageUrl result:', signedUrl.substring(0, 100) + '...');
          console.log('processImageUrl result length:', signedUrl.length);
          console.log('processImageUrl result type:', {
            isDataUrl: signedUrl.startsWith('data:'),
            isS3Url: signedUrl.includes('.s3.') || signedUrl.includes('s3.amazonaws.com'),
            isBlobUrl: signedUrl.startsWith('blob:'),
            isHttpUrl: signedUrl.startsWith('http')
          });
          
          setPreviewUrls([signedUrl]);
          setOriginalResultImage(signedUrl); // 진단 완료 섹션에도 표시
          console.log('Preview URLs set to:', [signedUrl]);
        });

        // 랜드마크가 표시된 이미지 처리 (타입별 전용 URL 사용)
        console.log('📥 Processing analysis images:', {
          type: data.type,
          landmarkImageUrl: data.landmarkImageUrl,
          psaImageUrl: data.psaImageUrl,
          psoImageUrl: data.psoImageUrl,
          annotatedImageUrl: data.annotatedImageUrl // 호환성 체크용
        });

        // Landmark 이미지 설정
        if (data.landmarkImageUrl) {
          setLandmarkResultImage(data.landmarkImageUrl);
          setUploadedLandmarkResult(data.landmarkImageUrl);
          console.log('✅ Landmark image URL set:', data.landmarkImageUrl);
        }

        // PSA 이미지 설정
        if (data.psaImageUrl) {
          setPsaResultImage(data.psaImageUrl);
          setUploadedPsaResult(data.psaImageUrl);
          console.log('✅ PSA image URL set:', data.psaImageUrl);
        }

        // PSO 이미지 설정
        if (data.psoImageUrl) {
          setPsoResultImage(data.psoImageUrl);
          setUploadedPsoResult(data.psoImageUrl);
          console.log('✅ PSO image URL set:', data.psoImageUrl);
        }
      }

      // MeasurementDashboard 업데이트
      if (data.measurements) {
        localStorage.setItem('landmarkAnalysisData', JSON.stringify({
          measurements: data.measurements,
          diagnosis: data.diagnosis,
          timestamp: data.timestamp
        }));
      }

      sessionStorage.removeItem('analysisData'); // 사용 후 삭제
    }

    // cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 파일 업로드 시 미리보기 URL 생성 - Hook은 조건문 전에 위치해야 함
  useEffect(() => {
    // 분석 이력에서 온 파일은 이미 URL이 있으므로 건너뛰기
    if (isFromHistory) {
      console.log('Skipping URL generation for history file');
      return; // 이미 previewUrls이 설정되어 있음
    }

    // 새로운 파일 업로드인 경우만 URL 생성
    if (uploadedFiles.length > 0) {
      // isFromHistory 속성을 가진 파일은 건너뛰기
      const hasHistoryFile = uploadedFiles.some((file: any) => file.isFromHistory);
      if (hasHistoryFile) {
        console.log('File is from history, keeping existing URL');
        return;
      }

      const urls = uploadedFiles.map(file => {
        if (file.type.startsWith('image/')) {
          return URL.createObjectURL(file);
        }
        return '';
      });
      setPreviewUrls(urls);

      // 원본 이미지를 진단 완료 섹션에도 표시
      if (urls[0]) {
        setOriginalResultImage(urls[0]);
      }

      // 컴포넌트 언마운트 시 URL 정리
      return () => {
        urls.forEach(url => {
          if (url && !url.startsWith('http')) { // 외부 URL이 아닌 경우만 정리
            URL.revokeObjectURL(url);
          }
        });
      };
    }
  }, [uploadedFiles, isFromHistory]);

  // 로그인 리다이렉트를 useEffect로 처리
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signup');
    }
  }, [status, router]);

  // 로딩 상태 체크
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // useEffect에서 리다이렉트 처리
  }

  const handleFilesUploaded = (files: File[]) => {
    // 새 파일이 업로드되면 이전 측정값만 초기화 (환자 정보는 유지)
    clearAll();
    setUploadedFiles(prev => [...prev, ...files]);
    // 환자 정보는 초기화하지 않음 - 사용자가 이미 입력했을 수 있음
  };

  const handleRemoveFile = (index: number) => {
    // URL 정리 (이력에서 온 URL이 아닌 경우만)
    if (previewUrls[index] && !previewUrls[index].startsWith('http')) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartDiagnosis = async (type: 'LANDMARK' | 'PSA' | 'PSO') => {
    if (uploadedFiles.length === 0) {
      alert('파일을 먼저 업로드해주세요.');
      return;
    }

    setIsProcessing(true);

    // 랜드마크 설정인 경우 새 창으로 열기
    if (type === 'LANDMARK') {
      const file = uploadedFiles[0];

      // 이력에서 온 파일인 경우
      if ((file as any).isFromHistory && previewUrls[0]) {
        sessionStorage.setItem('xrayImage', previewUrls[0]);
        sessionStorage.setItem('xrayFileName', file.name);
        sessionStorage.setItem('patientName', patientName);
        sessionStorage.setItem('patientBirthDate', patientBirthDate);

        // 기존 분석 ID가 있으면 전달 (업데이트용)
        if (analysisData?.analysisId) {
          sessionStorage.setItem('analysisId', analysisData.analysisId);
          console.log('✅ Landmark: 기존 분석 업데이트 (ID:', analysisData.analysisId, ')');
        } else {
          sessionStorage.removeItem('analysisId');
          console.log('✅ Landmark: 새 분석 생성');
        }

        // 새 창으로 열기
        const newWindow = window.open('/landmark', '_blank',
          'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

        if (newWindow) {
          newWindow.focus();
        } else {
          alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
        }

        setIsProcessing(false);
      } else {
        // 일반 파일 업로드인 경우 - S3에 직접 업로드
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', 'ok4192ok@gmail.com'); // 실제로는 세션에서 가져와야 함

          const uploadResponse = await fetch('/api/upload/file', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            const s3Url = uploadResult.s3Url;

            console.log('Dashboard - Landmark file uploaded to S3:', {
              s3Url,
              fileName: file.name,
              patientName,
              patientBirthDate
            });

            // S3 URL을 sessionStorage에 저장 (Data URL 대신)
            sessionStorage.setItem('xrayImage', s3Url);
            sessionStorage.setItem('xrayFileName', file.name);
            sessionStorage.setItem('patientName', patientName);
            sessionStorage.setItem('patientBirthDate', patientBirthDate);

            // 기존 분석 ID가 있으면 전달 (업데이트용)
            if (analysisData?.analysisId) {
              sessionStorage.setItem('analysisId', analysisData.analysisId);
              console.log('✅ Landmark: 기존 분석 업데이트 (ID:', analysisData.analysisId, ')');
            } else {
              sessionStorage.removeItem('analysisId');
              console.log('✅ Landmark: 새 분석 생성');
            }

            // 새 창으로 열기
            const newWindow = window.open('/landmark', '_blank',
              'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

            if (newWindow) {
              newWindow.focus();
            } else {
              alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
            }
          } else {
            const errorData = await uploadResponse.json().catch(() => ({}));
            console.error('Failed to upload Landmark file to S3:', {
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              error: errorData
            });
            alert(`파일 업로드에 실패했습니다.\n상태: ${uploadResponse.status}\n${errorData.error || errorData.message || '알 수 없는 오류'}`);
          }
        } catch (error) {
          console.error('Error uploading Landmark file:', error);
          alert('파일 업로드 중 오류가 발생했습니다.');
        }

        setIsProcessing(false);
      }
    } else {
      // PSA 분석
      if (type === 'PSA') {
        const file = uploadedFiles[0];

        // 이력에서 온 파일인 경우
        if ((file as any).isFromHistory && previewUrls[0]) {
          sessionStorage.setItem('xrayImage', previewUrls[0]);
          sessionStorage.setItem('xrayFileName', file.name);
          sessionStorage.setItem('patientName', patientName);
          sessionStorage.setItem('patientBirthDate', patientBirthDate);

          // 기존 분석 ID가 있으면 전달 (업데이트용)
          if (analysisData?.analysisId) {
            sessionStorage.setItem('analysisId', analysisData.analysisId);
            console.log('✅ PSA: 기존 분석 업데이트 (ID:', analysisData.analysisId, ')');
          } else {
            sessionStorage.removeItem('analysisId');
            console.log('✅ PSA: 새 분석 생성');
          }

          // 새 PSA 분석을 위해 이전 PSA 데이터 삭제 (sessionStorage & localStorage)
          console.log('🧹 Clearing PSA data before opening window...');
          console.log('Before clear - sessionStorage keys:', Object.keys(sessionStorage));
          sessionStorage.removeItem('psaLandmarkData');
          sessionStorage.removeItem('psaReEdit');
          sessionStorage.removeItem('psaAnalysisData');
          // ⚠️ landmarkData는 PSA/PSO에서 Ruler 기반 스케일 팩터 계산에 필요하므로 삭제하지 않음
          // sessionStorage.removeItem('landmarkData');
          localStorage.removeItem('psaAnalysisData'); // localStorage도 삭제
          console.log('After clear - sessionStorage keys:', Object.keys(sessionStorage));
          console.log('🗑️ Cleared old PSA data for new analysis (keeping landmarkData for scale factor)');

          // 새 창으로 열기
          const newWindow = window.open('/psa', '_blank',
            'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

          if (newWindow) {
            newWindow.focus();
          } else {
            alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
          }

          setIsProcessing(false);
        } else {
          // 일반 파일 업로드인 경우 - S3에 직접 업로드
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', 'ok4192ok@gmail.com'); // 실제로는 세션에서 가져와야 함

            const uploadResponse = await fetch('/api/upload/file', {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              const s3Url = uploadResult.s3Url;
              
              console.log('Dashboard - File uploaded to S3:', {
                s3Url,
                fileName: file.name,
                patientName,
                patientBirthDate
              });

              // S3 URL을 sessionStorage에 저장 (Data URL 대신)
              sessionStorage.setItem('xrayImage', s3Url);
              sessionStorage.setItem('xrayFileName', file.name);
              sessionStorage.setItem('patientName', patientName);
              sessionStorage.setItem('patientBirthDate', patientBirthDate);

              // 기존 분석 ID가 있으면 전달 (업데이트용)
              if (analysisData?.analysisId) {
                sessionStorage.setItem('analysisId', analysisData.analysisId);
                console.log('✅ PSA: 기존 분석 업데이트 (ID:', analysisData.analysisId, ')');
              } else {
                sessionStorage.removeItem('analysisId');
                console.log('✅ PSA: 새 분석 생성');
              }

              // 새 PSA 분석을 위해 이전 PSA 데이터 삭제 (sessionStorage & localStorage)
              console.log('🧹 Clearing PSA data before opening window...');
              console.log('Before clear - sessionStorage keys:', Object.keys(sessionStorage));
              sessionStorage.removeItem('psaLandmarkData');
              sessionStorage.removeItem('psaReEdit');
              sessionStorage.removeItem('psaAnalysisData');
              // ⚠️ landmarkData는 PSA/PSO에서 Ruler 기반 스케일 팩터 계산에 필요하므로 삭제하지 않음
              // sessionStorage.removeItem('landmarkData');
              localStorage.removeItem('psaAnalysisData'); // localStorage도 삭제
              console.log('After clear - sessionStorage keys:', Object.keys(sessionStorage));
              console.log('🗑️ Cleared old PSA data for new analysis (keeping landmarkData for scale factor)');

              // 새 창으로 열기
              const newWindow = window.open('/psa', '_blank',
                'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

              if (newWindow) {
                newWindow.focus();
              } else {
                alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
              }
            } else {
              console.error('Failed to upload file to S3');
              alert('파일 업로드에 실패했습니다.');
            }
          } catch (error) {
            console.error('Error uploading file:', error);
            alert('파일 업로드 중 오류가 발생했습니다.');
          }

          setIsProcessing(false);
        }
      }
      // PSO 분석
      else if (type === 'PSO') {
        const file = uploadedFiles[0];

        // 이력에서 온 파일인 경우
        if ((file as any).isFromHistory && previewUrls[0]) {
          sessionStorage.setItem('xrayImage', previewUrls[0]);
          sessionStorage.setItem('xrayFileName', file.name);
          sessionStorage.setItem('patientName', patientName);
          sessionStorage.setItem('patientBirthDate', patientBirthDate);

          // 기존 분석 ID가 있으면 전달 (업데이트용)
          if (analysisData?.analysisId) {
            sessionStorage.setItem('analysisId', analysisData.analysisId);
            console.log('✅ PSO: 기존 분석 업데이트 (ID:', analysisData.analysisId, ')');
          } else {
            sessionStorage.removeItem('analysisId');
            console.log('✅ PSO: 새 분석 생성');
          }

          // 새 PSO 분석을 위해 이전 PSO 데이터 삭제 (sessionStorage & localStorage)
          console.log('🧹 Clearing PSO data before opening window...');
          console.log('Before clear - sessionStorage keys:', Object.keys(sessionStorage));
          sessionStorage.removeItem('psoLandmarkData');
          sessionStorage.removeItem('psoReEdit');
          sessionStorage.removeItem('psoAnalysisData');
          // ⚠️ landmarkData는 PSA/PSO에서 Ruler 기반 스케일 팩터 계산에 필요하므로 삭제하지 않음
          // sessionStorage.removeItem('landmarkData');
          localStorage.removeItem('psoAnalysisData'); // localStorage도 삭제
          console.log('After clear - sessionStorage keys:', Object.keys(sessionStorage));
          console.log('🗑️ Cleared old PSO data for new analysis (keeping landmarkData for scale factor)');

          // 새 창으로 열기
          const newWindow = window.open('/pso', '_blank',
            'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

          if (newWindow) {
            newWindow.focus();
          } else {
            alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
          }

          setIsProcessing(false);
        } else {
          // 일반 파일 업로드인 경우 - S3에 직접 업로드
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', 'ok4192ok@gmail.com'); // 실제로는 세션에서 가져와야 함

            const uploadResponse = await fetch('/api/upload/file', {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              const s3Url = uploadResult.s3Url;

              console.log('Dashboard - File uploaded to S3:', {
                s3Url,
                fileName: file.name,
                patientName,
                patientBirthDate
              });

              // S3 URL을 sessionStorage에 저장 (Data URL 대신)
              sessionStorage.setItem('xrayImage', s3Url);
              sessionStorage.setItem('xrayFileName', file.name);
              sessionStorage.setItem('patientName', patientName);
              sessionStorage.setItem('patientBirthDate', patientBirthDate);

              // 기존 분석 ID가 있으면 전달 (업데이트용)
              if (analysisData?.analysisId) {
                sessionStorage.setItem('analysisId', analysisData.analysisId);
                console.log('✅ PSO: 기존 분석 업데이트 (ID:', analysisData.analysisId, ')');
              } else {
                sessionStorage.removeItem('analysisId');
                console.log('✅ PSO: 새 분석 생성');
              }

              // 새 PSO 분석을 위해 이전 PSO 데이터 삭제 (sessionStorage & localStorage)
              console.log('🧹 Clearing PSO data before opening window...');
              console.log('Before clear - sessionStorage keys:', Object.keys(sessionStorage));
              sessionStorage.removeItem('psoLandmarkData');
              sessionStorage.removeItem('psoReEdit');
              sessionStorage.removeItem('psoAnalysisData');
              // ⚠️ landmarkData는 PSA/PSO에서 Ruler 기반 스케일 팩터 계산에 필요하므로 삭제하지 않음
              // sessionStorage.removeItem('landmarkData');
              localStorage.removeItem('psoAnalysisData'); // localStorage도 삭제
              console.log('After clear - sessionStorage keys:', Object.keys(sessionStorage));
              console.log('🗑️ Cleared old PSO data for new analysis (keeping landmarkData for scale factor)');

              // 새 창으로 열기
              const newWindow = window.open('/pso', '_blank',
                'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

              if (newWindow) {
                newWindow.focus();
              } else {
                alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
              }
            } else {
              console.error('Failed to upload file to S3');
              alert('파일 업로드에 실패했습니다.');
            }
          } catch (error) {
            console.error('Error uploading file:', error);
            alert('파일 업로드 중 오류가 발생했습니다.');
          } finally {
            setIsProcessing(false);
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - 전체 너비 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                KOCO
              </Link>
              <span className="ml-4 text-lg text-gray-600">자동화 진단</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/analysis/measurement"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                계측값 대시보드
              </Link>
              <Link
                href="/history"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                분석 이력
              </Link>
              <button
                onClick={() => {
                  // Zustand store 초기화
                  clearAll();

                  // localStorage 데이터도 삭제 (혹시 남아있을 수 있음)
                  localStorage.removeItem('landmarkAnalysisData');

                  // 상태 초기화
                  setUploadedFiles([]);
                  setPreviewUrls([]);
                  setPatientName('');
                  setPatientBirthDate('');
                  setAnalysisData(null);
                  setIsFromHistory(false);
                  setLandmarkResultImage(null);
                  setPsaResultImage(null);
                  setOriginalResultImage(null);
                  setUploadedLandmarkResult(null);
                  setUploadedPsaResult(null);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                새 분석 시작
              </button>
              <span className="text-gray-700">
                {session?.user?.name || session?.user?.email}
              </span>
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 환자 정보 컨테이너 - 독립적 */}
      <div className="absolute top-16 left-0 w-1/4 h-[140px] bg-white shadow-lg border border-gray-200 overflow-auto z-10">
        <div className="px-3 py-2">
          <div className="mb-2 flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-gray-900">환자 정보 입력</h1>
              <p className="text-xs text-gray-600">
                진단을 시작하기 전에 환자 정보를 입력해주세요.
              </p>
            </div>
            {/* 자동 저장 표시 */}
            {isSaving && (
              <div className="flex items-center text-xs text-blue-600">
                <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                저장중...
              </div>
            )}
            {!isSaving && analysisData?.analysisId && (
              <div className="text-xs text-green-600">✓ 자동저장</div>
            )}
          </div>

          {/* 환자 정보 입력 폼 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  환자 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  생년월일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={patientBirthDate}
                  onChange={(e) => setPatientBirthDate(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lateral_Ceph 업로드 컨테이너 - 독립적 */}
      <div className="absolute top-[210px] left-0 w-1/4 h-[calc(100vh-210px)] overflow-auto bg-white shadow-lg border border-gray-200">
        <main className="px-2 py-2">
          <div className="mb-2">
            <h1 className="text-lg font-bold text-gray-900">이미지 업로드</h1>
            <p className="text-xs text-gray-600">
              분석할 Lateral Ceph 이미지를 업로드해주세요.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {/* 왼쪽: Lateral_Ceph 업로드 영역 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded shadow-sm p-2">
                <h2 className="text-sm font-semibold mb-1 text-gray-800">
                  Lateral_Ceph 업로드
                </h2>

                {/* 파일 업로드 또는 미리보기 */}
                {uploadedFiles.length === 0 ? (
                  <div style={{ aspectRatio: '1706/1373' }} className="w-full">
                    <FileUpload
                      onFilesUploaded={handleFilesUploaded}
                      hasFiles={false}
                    />
                  </div>
                ) : (
                  <div style={{ aspectRatio: '1706/1373' }} className="w-full relative bg-gray-100 rounded overflow-hidden">
                  {/* 이미지 미리보기 */}
                  {previewUrls[0] ? (
                    <S3Image
                      src={previewUrls[0]}
                      alt="Lateral Ceph Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <span>이미지 로딩 중...</span>
                    </div>
                  )}

                    {/* 이미지 위 컨트롤 버튼 */}
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        onClick={() => handleRemoveFile(0)}
                        className="bg-red-500 hover:bg-red-600 text-white p-1 rounded shadow transition-colors"
                        title="이미지 삭제"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                      <button
                        onClick={() => {
                          handleRemoveFile(0);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded shadow transition-colors"
                        title="다른 이미지 선택"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>

                    {/* 파일 정보 오버레이 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                      <p className="text-white text-xs font-medium">{uploadedFiles[0].name}</p>
                      <p className="text-white/80 text-xs">
                        {(uploadedFiles[0].size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* 오른쪽: 진단 설정 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded shadow-sm p-2">
                <h2 className="text-sm font-semibold mb-1 text-gray-800">
                  진단 유형
                </h2>

                {/* 진단 유형 선택 */}
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    진단 유형 선택
                  </label>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setDiagnosisType('LANDMARK');
                        handleStartDiagnosis('LANDMARK');
                      }}
                      disabled={uploadedFiles.length === 0 || isProcessing}
                      className={`w-full flex items-center p-1 border rounded cursor-pointer text-xs transition-colors ${
                        uploadedFiles.length > 0 && !isProcessing
                          ? 'hover:bg-blue-50 border-gray-300'
                          : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                      } ${diagnosisType === 'LANDMARK' ? 'bg-blue-50 border-blue-400' : ''}`}
                    >
                      <div className="text-left">
                        <p className="font-medium">랜드마크 설정</p>
                        <p className="text-xs text-gray-500">
                          Cephalometric Landmark Detection
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setDiagnosisType('PSA');
                        handleStartDiagnosis('PSA');
                      }}
                      disabled={uploadedFiles.length === 0 || isProcessing}
                      className={`w-full flex items-center p-1 border rounded cursor-pointer text-xs transition-colors ${
                        uploadedFiles.length > 0 && !isProcessing
                          ? 'hover:bg-blue-50 border-gray-300'
                          : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                      } ${diagnosisType === 'PSA' ? 'bg-blue-50 border-blue-400' : ''}`}
                    >
                      <div className="text-left">
                        <p className="font-medium">PSA 분석</p>
                        <p className="text-xs text-gray-500">
                          Park's Schematic Analysis
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setDiagnosisType('PSO');
                        handleStartDiagnosis('PSO');
                      }}
                      disabled={uploadedFiles.length === 0 || isProcessing}
                      className={`w-full flex items-center p-1 border rounded cursor-pointer text-xs transition-colors ${
                        uploadedFiles.length > 0 && !isProcessing
                          ? 'hover:bg-blue-50 border-gray-300'
                          : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                      } ${diagnosisType === 'PSO' ? 'bg-blue-50 border-blue-400' : ''}`}
                    >
                      <div className="text-left">
                        <p className="font-medium">PSO 분석</p>
                        <p className="text-xs text-gray-500">
                          Park's Schematic Occlusion
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 처리 중 메시지 */}
                {isProcessing && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <span className="flex items-center justify-center text-xs text-yellow-800">
                      <svg
                        className="animate-spin h-3 w-3 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      진단 중...
                    </span>
                  </div>
                )}

                {/* 안내 메시지 - Hover로 표시 */}
                <div className="mt-2 relative group">
                  <div className="flex items-center text-xs text-gray-600 cursor-help">
                    <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-blue-600 font-medium">지원 파일 형식</span>
                  </div>
                  {/* Tooltip */}
                  <div className="invisible group-hover:visible absolute left-0 top-6 z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                    <div className="font-semibold mb-2">지원 파일 형식</div>
                    <ul className="space-y-1">
                      <li>• PDF, Word, Excel</li>
                      <li>• CSV, TXT</li>
                      <li>• 이미지 (PNG, JPG, JPEG)</li>
                      <li>• 최대 파일 크기: 50MB</li>
                    </ul>
                    {/* 화살표 */}
                    <div className="absolute -top-2 left-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 중앙: 진단 완료 파일 미리보기 */}
      <div className="absolute top-16 left-1/4 w-1/4 h-auto bg-white shadow-lg border border-gray-200">
        <div className="p-2">
          <h2 className="text-xs font-semibold text-gray-800 mb-2">진단 완료 자료</h2>
          <div className="flex gap-2">
            {/* 원본 이미지 */}
            <div className="flex-1">
              <h3 className="text-xs font-medium text-gray-700 mb-1">Lateral_ceph</h3>
              <div
                className="relative border border-gray-300 rounded overflow-hidden bg-gray-50"
                style={{ aspectRatio: '1706/1373', height: 'auto' }}
              >
                {originalResultImage ? (
                  <S3Image
                    src={originalResultImage}
                    alt="Original Image"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={`${basePath}/images/placeholders/sample_lateral.jpg`}
                    alt="Sample Lateral Ceph"
                    className="w-full h-full object-contain opacity-40"
                  />
                )}
              </div>
            </div>

            {/* Landmark 분석 결과 */}
            <div className="flex-1">
              <h3 className="text-xs font-medium text-gray-700 mb-1">
                Landmark
                <span className="ml-2 text-xs text-blue-600">
                  {uploadedLandmarkResult ? '(더블클릭하여 수정)' : '(비었음)'}
                </span>
              </h3>
              <div
                className="relative border border-gray-300 rounded overflow-hidden bg-gray-50"
                style={{ aspectRatio: '1706/1373', height: 'auto' }}
              >
                {uploadedLandmarkResult ? (
                  <S3Image
                    src={uploadedLandmarkResult}
                    alt="Landmark Result"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={`${basePath}/images/placeholders/sample_lateral.jpg`}
                    alt="Sample Landmark"
                    className="w-full h-full object-contain opacity-40"
                  />
                )}

                {/* 수정 버튼 오버레이 */}
                {uploadedLandmarkResult && (
                  <div className="absolute inset-0 group">
                    {/* 호버 시 반투명 배경 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200" />

                    {/* 수정 버튼 */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          console.log('=== EDIT BUTTON CLICKED ===');
                          console.log('uploadedLandmarkResult:', uploadedLandmarkResult);
                          console.log('analysisData:', analysisData);

                          if (!analysisData) {
                            alert('분석 데이터가 없습니다.');
                            return;
                          }

                          // landmarks 또는 measurements 필드에서 데이터 찾기
                          const landmarksData = analysisData.landmarks || analysisData.measurements || {};

                          console.log('Extracted landmarks data:', landmarksData);
                          console.log('Landmarks count:', Object.keys(landmarksData).length);

                          if (Object.keys(landmarksData).length === 0) {
                            alert('랜드마크 데이터가 없습니다. 먼저 랜드마크를 설정해주세요.');
                            return;
                          }

                          // 재편집을 위한 데이터 준비
                          const reEditData = {
                            analysisId: analysisData.analysisId || analysisData.id || '',
                            analysisCode: analysisData.analysisCode || '',
                            fileName: analysisData.fileName || uploadedFiles[0]?.name || 'analysis.jpg',
                            landmarks: landmarksData,
                            imageUrl: originalResultImage,
                            originalImageUrl: originalResultImage,
                            annotatedImageUrl: uploadedLandmarkResult,
                            patientName: patientName,
                            patientBirthDate: patientBirthDate
                          };

                          console.log('Preparing re-edit data:', reEditData);

                          // 재편집 데이터를 sessionStorage에 저장
                          sessionStorage.setItem('reEditAnalysis', JSON.stringify(reEditData));

                          // 환자 정보도 sessionStorage에 저장
                          if (patientName) {
                            sessionStorage.setItem('patientName', patientName);
                          }
                          if (patientBirthDate) {
                            sessionStorage.setItem('patientBirthDate', patientBirthDate);
                          }

                          // 랜드마크 설정 페이지를 재편집 모드로 열기
                          const newWindow = window.open('/landmark?reEdit=true', '_blank',
                            'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

                          if (newWindow) {
                            newWindow.focus();
                          } else {
                            alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>랜드마크 수정</span>
                        </div>
                      </button>
                    </div>

                    {/* 상단 우측 표시 */}
                    <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none">
                      ✓ 분석 완료
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PSA 분석 결과 */}
            <div className="flex-1">
              <h3 className="text-xs font-medium text-gray-700 mb-1">
                PSA
                <span className="ml-2 text-xs text-blue-600">
                  {uploadedPsaResult ? '(더블클릭하여 수정)' : '(비었음)'}
                </span>
              </h3>
              <div
                className="relative border border-gray-300 rounded overflow-hidden bg-gray-50 cursor-pointer"
                style={{ aspectRatio: '1706/1373', height: 'auto' }}
                onDoubleClick={async () => {
                  if (!uploadedPsaResult) return;

                  console.log('=== PSA DOUBLE CLICKED ===');
                  console.log('uploadedPsaResult:', uploadedPsaResult);
                  console.log('originalResultImage:', originalResultImage);

                  // S3 URL인 경우 새로운 서명된 URL 가져오기
                  let imageUrlToUse = originalResultImage;
                  if (originalResultImage && (originalResultImage.includes('.s3.') || originalResultImage.includes('s3.amazonaws.com'))) {
                    try {
                      const response = await fetch('/api/landmark/signed-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrl: originalResultImage })
                      });
                      const result = await response.json();
                      if (result.success) {
                        imageUrlToUse = result.signedUrl;
                        console.log('✅ Got fresh signed URL for PSA');
                      }
                    } catch (error) {
                      console.error('Failed to get signed URL:', error);
                    }
                  }

                  // 원본 이미지와 환자 정보를 sessionStorage에 저장
                  if (imageUrlToUse) {
                    sessionStorage.setItem('xrayImage', imageUrlToUse);
                  }
                  if (uploadedFiles[0]) {
                    sessionStorage.setItem('xrayFileName', uploadedFiles[0].name);
                  }
                  sessionStorage.setItem('patientName', patientName);
                  sessionStorage.setItem('patientBirthDate', patientBirthDate);

                  // PSA 분석 데이터를 analysisData에서 가져오기
                  console.log('PSA re-edit - analysisData:', analysisData);

                  if (analysisData && analysisData.landmarks) {
                    const landmarksData = analysisData.landmarks;

                    // PSA_ 접두사가 있는 랜드마크만 필터링
                    const psaLandmarks: Record<string, { x: number; y: number }> = {};
                    Object.entries(landmarksData).forEach(([key, value]) => {
                      if (key.startsWith('PSA_') || [
                        'Porion', 'Orbitale', 'Hinge Point',
                        'Mn.1 Crown', 'Mn.6 Distal', 'Symphysis Lingual'
                      ].includes(key)) {
                        psaLandmarks[key] = value as { x: number; y: number };
                      }
                    });

                    console.log('Filtered PSA landmarks:', psaLandmarks);
                    console.log('PSA landmarks count:', Object.keys(psaLandmarks).length);

                    // PSA 전용 랜드마크 데이터 저장
                    if (Object.keys(psaLandmarks).length > 0) {
                      sessionStorage.setItem('psaLandmarkData', JSON.stringify(psaLandmarks));
                      console.log('✅ PSA landmarks saved to sessionStorage');
                    }
                  } else {
                    console.warn('⚠️ No PSA landmarks found in analysisData');
                  }

                  // PSA 재편집 플래그 설정
                  sessionStorage.setItem('psaReEdit', 'true');

                  // PSA 페이지를 새 창으로 열기
                  const newWindow = window.open('/psa', '_blank',
                    'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

                  if (newWindow) {
                    newWindow.focus();
                  } else {
                    alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
                  }
                }}
              >
                {uploadedPsaResult ? (
                  <S3Image
                    src={uploadedPsaResult}
                    alt="PSA Result"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={`${basePath}/images/placeholders/sample_psa.jpg`}
                    alt="Sample PSA"
                    className="w-full h-full object-contain opacity-40"
                  />
                )}

                {/* 완료 표시 오버레이 */}
                {uploadedPsaResult && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none">
                    ✓ 분석 완료
                  </div>
                )}
              </div>
            </div>

            {/* PSO 분석 결과 */}
            <div className="flex-1">
              <h3 className="text-xs font-medium text-gray-700 mb-1">
                PSO
                <span className="ml-2 text-xs text-blue-600">
                  {uploadedPsoResult ? '(더블클릭하여 수정)' : '(비었음)'}
                </span>
              </h3>
              <div
                className="relative border border-gray-300 rounded overflow-hidden bg-gray-50 cursor-pointer"
                style={{ aspectRatio: '1706/1373', height: 'auto' }}
                onDoubleClick={async () => {
                  if (!uploadedPsoResult) return;

                  console.log('=== PSO DOUBLE CLICKED ===');
                  console.log('uploadedPsoResult:', uploadedPsoResult);
                  console.log('originalResultImage:', originalResultImage);

                  // S3 URL인 경우 새로운 서명된 URL 가져오기
                  let imageUrlToUse = originalResultImage;
                  if (originalResultImage && (originalResultImage.includes('.s3.') || originalResultImage.includes('s3.amazonaws.com'))) {
                    try {
                      const response = await fetch('/api/landmark/signed-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrl: originalResultImage })
                      });
                      const result = await response.json();
                      if (result.success) {
                        imageUrlToUse = result.signedUrl;
                        console.log('✅ Got fresh signed URL for PSO');
                      }
                    } catch (error) {
                      console.error('Failed to get signed URL:', error);
                    }
                  }

                  // 원본 이미지와 환자 정보를 sessionStorage에 저장
                  if (imageUrlToUse) {
                    sessionStorage.setItem('xrayImage', imageUrlToUse);
                  }
                  if (uploadedFiles[0]) {
                    sessionStorage.setItem('xrayFileName', uploadedFiles[0].name);
                  }
                  sessionStorage.setItem('patientName', patientName);
                  sessionStorage.setItem('patientBirthDate', patientBirthDate);

                  // PSO 분석 데이터를 analysisData에서 가져오기
                  console.log('PSO re-edit - analysisData:', analysisData);

                  if (analysisData && analysisData.landmarks) {
                    const landmarksData = analysisData.landmarks;

                    // PSO_ 접두사가 있는 랜드마크만 필터링
                    const psoLandmarks: Record<string, { x: number; y: number }> = {};
                    Object.entries(landmarksData).forEach(([key, value]) => {
                      if (key.startsWith('PSO_') || [
                        'Porion', 'Orbitale', 'Hinge Point',
                        'Mn.1 Crown', 'Mn.6 Distal', 'Symphysis Lingual'
                      ].includes(key)) {
                        psoLandmarks[key] = value as { x: number; y: number };
                      }
                    });

                    console.log('Filtered PSO landmarks:', psoLandmarks);
                    console.log('PSO landmarks count:', Object.keys(psoLandmarks).length);

                    // PSO 전용 랜드마크 데이터 저장
                    if (Object.keys(psoLandmarks).length > 0) {
                      sessionStorage.setItem('psoLandmarkData', JSON.stringify(psoLandmarks));
                      console.log('✅ PSO landmarks saved to sessionStorage');
                    }
                  } else {
                    console.warn('⚠️ No PSO landmarks found in analysisData');
                  }

                  // PSO 재편집 플래그 설정
                  sessionStorage.setItem('psoReEdit', 'true');

                  // PSO 페이지를 새 창으로 열기
                  const newWindow = window.open('/pso', '_blank',
                    'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

                  if (newWindow) {
                    newWindow.focus();
                  } else {
                    alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
                  }
                }}
              >
                {uploadedPsoResult ? (
                  <S3Image
                    src={uploadedPsoResult}
                    alt="PSO Result"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={`${basePath}/images/placeholders/sample_psa.jpg`}
                    alt="Sample PSO"
                    className="w-full h-full object-contain opacity-40"
                  />
                )}

                {/* 완료 표시 오버레이 */}
                {uploadedPsoResult && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none">
                    ✓ 분석 완료
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 반환 파일 형식 선택 및 파일 생성 */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-800 mb-2">반환 파일 형식</h3>
            <div className="flex items-center gap-2">
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as 'pptx' | 'pdf')}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pptx">PowerPoint (.pptx)</option>
                <option value="pdf">PDF (.pdf)</option>
              </select>
              <button
                onClick={async () => {
                  // 유효성 검사
                  const checkResult = canGeneratePowerPoint({
                    patientName,
                    patientBirthDate,
                    lateralCephUrl: originalResultImage,
                    psaResultUrl: uploadedPsaResult,
                    psoResultUrl: uploadedPsoResult,
                    measurements: analysisData?.angles || {}
                  });

                  if (!checkResult.canGenerate) {
                    alert(checkResult.reason || '파일 생성 조건을 만족하지 않습니다.');
                    return;
                  }

                  // 경고사항이 있으면 사용자에게 확인
                  if (checkResult.warnings && checkResult.warnings.length > 0) {
                    const warningMessage = '⚠️ 다음 항목이 누락되었습니다:\n\n' +
                      checkResult.warnings.map(w => `• ${w}`).join('\n') +
                      '\n\n그래도 계속 진행하시겠습니까?';

                    if (!confirm(warningMessage)) {
                      return;
                    }
                  }

                  setIsGeneratingFile(true);
                  setGenerationProgress('시작 중...');

                  try {
                    const result = await generatePowerPoint(
                      {
                        lateralCephUrl: originalResultImage,
                        psaResultUrl: uploadedPsaResult,
                        psoResultUrl: uploadedPsoResult,
                        landmarkResultUrl: uploadedLandmarkResult,
                        patientName,
                        patientBirthDate,
                        measurements: analysisData?.angles || {},
                        diagnosis: analysisData?.diagnosis,
                        analysisCode: analysisData?.analysisCode,
                        fileType: outputFormat
                      },
                      (message) => setGenerationProgress(message)
                    );

                    if (result.success) {
                      alert(`✅ ${outputFormat.toUpperCase()} 파일이 생성되었습니다!\n\n파일명: ${result.filename}`);
                    } else {
                      alert(`❌ 파일 생성 실패\n\n${result.error}`);
                    }
                  } catch (error) {
                    console.error('File generation error:', error);
                    alert('파일 생성 중 오류가 발생했습니다.');
                  } finally {
                    setIsGeneratingFile(false);
                    setGenerationProgress('');
                  }
                }}
                disabled={isGeneratingFile}
                className={`px-4 py-2 ${
                  isGeneratingFile
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center gap-2`}
              >
                {isGeneratingFile ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{generationProgress || '생성 중...'}</span>
                  </>
                ) : (
                  '파일생성하기'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽: 계측값 대시보드 컨테이너 */}
      <div className="absolute top-16 right-0 w-1/2 h-[calc(100vh-4rem)] overflow-auto bg-white shadow-lg border border-gray-200">
        <MeasurementDashboard initialData={analysisData} />
      </div>
    </div>
  );
}