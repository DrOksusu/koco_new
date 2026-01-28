'use client';

import { useState, useEffect, memo, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MeasurementDashboard from '@/components/MeasurementDashboard';
import Link from 'next/link';
import { useMeasurementStore } from '@/store/measurementStore';
import { imageCache } from '@/lib/imageCache';
import { generatePowerPoint, canGeneratePowerPoint } from '@/lib/services/powerpointService';
import toast, { Toaster } from 'react-hot-toast';

// S3 이미지 컴포넌트
const S3Image = memo(function S3Image({
  src,
  alt = 'Image',
  className = '',
}: {
  src: string;
  alt?: string;
  className?: string;
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
        const blobUrl = await imageCache.getOrLoadImage(src);
        if (mounted) {
          setDisplayUrl(blobUrl);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    loadImage();
    return () => { mounted = false; };
  }, [src]);

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 flex items-center justify-center ${className}`}><span className="text-gray-400 text-xs">Loading...</span></div>;
  }
  if (error || !displayUrl) {
    return <div className={`bg-gray-100 flex items-center justify-center ${className}`}><span className="text-gray-400 text-xs">Error</span></div>;
  }
  return <img src={displayUrl} alt={alt} className={className} />;
});

// 이미지 업로드 박스 컴포넌트 (클릭 + 드래그앤드롭 지원)
const ImageUploadBox = memo(function ImageUploadBox({
  label,
  image,
  onUpload,
  onRemove,
  aspectRatio = '4/3',
  labelColor = 'bg-yellow-400',
  placeholder,
}: {
  label: string;
  image: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  aspectRatio?: string;
  labelColor?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    if (!image) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!image) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (image) return; // 이미 이미지가 있으면 무시

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onUpload(file);
      } else {
        toast.error('이미지 파일만 업로드 가능합니다');
      }
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border rounded cursor-pointer transition-all bg-gray-100 overflow-hidden
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400'}
          ${image ? 'border-gray-300' : ''}`}
        style={{ aspectRatio }}
      >
        {image ? (
          <>
            {/* S3 URL인 경우 S3Image 사용, 아니면 일반 img 사용 */}
            {image.includes('s3') && image.includes('amazonaws.com') ? (
              <S3Image src={image} alt={label} className="w-full h-full object-cover" />
            ) : (
              <img src={image} alt={label} className="w-full h-full object-cover" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 shadow z-10"
            >
              ×
            </button>
          </>
        ) : placeholder ? (
          <div className="absolute inset-0">
            <img src={placeholder} alt={label} className="w-full h-full object-cover opacity-40" />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-100/80">
                <span className="text-blue-600 font-medium text-sm">놓기</span>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <svg className={`w-6 h-6 ${isDragging ? 'text-blue-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isDragging && <span className="text-blue-500 text-xs">놓기</span>}
          </div>
        )}
        {/* 라벨 - 이미지가 없을 때만 표시 */}
        {!image && (
          <div className={`absolute bottom-0 left-0 right-0 ${labelColor}/90 text-black text-[10px] font-medium px-1 py-1 truncate text-center backdrop-blur-sm z-10`}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
});

// 분석 결과 이미지 박스 컴포넌트
const ResultImageBox = memo(function ResultImageBox({
  label,
  image,
  placeholder,
  labelColor = 'bg-yellow-400',
}: {
  label: string;
  image: string | null;
  placeholder?: string;
  labelColor?: string;
}) {
  return (
    <div className="relative">
      <div className="relative border border-gray-300 rounded bg-gray-100 overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {image ? (
          <S3Image src={image} alt={label} className="w-full h-full object-contain" />
        ) : placeholder ? (
          <img src={placeholder} alt={label} className="w-full h-full object-contain opacity-30" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            분석 대기
          </div>
        )}
        {image && (
          <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded z-10">✓</div>
        )}
        {/* 라벨 - 이미지가 없을 때만 표시 */}
        {!image && (
          <div className={`absolute bottom-0 left-0 right-0 ${labelColor}/90 text-black text-[10px] font-medium px-1 py-1 truncate text-center backdrop-blur-sm z-10`}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
});

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { clearAll } = useMeasurementStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

  // 엑스레이 이미지 상태 (3개 입력)
  const [panoramaImage, setPanoramaImage] = useState<string | null>(null);
  const [lateralCephImage, setLateralCephImage] = useState<string | null>(null);
  const [frontalCephImage, setFrontalCephImage] = useState<string | null>(null);

  // 분석 결과 이미지 (4개)
  const [landmarkResult, setLandmarkResult] = useState<string | null>(null);
  const [psaResult, setPsaResult] = useState<string | null>(null);
  const [psoResult, setPsoResult] = useState<string | null>(null);
  const [frontalAxResult, setFrontalAxResult] = useState<string | null>(null);

  // 구외포토 (8개)
  const [extraoralPhotos, setExtraoralPhotos] = useState<(string | null)[]>(Array(8).fill(null));
  const extraoralLabels = ['정면(편하게)', '정면(자세정렬)', '45도 안모', '좌우180도 안모', '정면스마일', '정면스마일(자세정렬)', '45도 스마일', '90도 스마일'];

  // 구내포토 (5개)
  const [intraoralPhotos, setIntraoralPhotos] = useState<(string | null)[]>(Array(5).fill(null));
  const intraoralLabels = ['상악 교합면', '하악 교합면', '우측 측면', '정면 구강', '좌측 측면'];

  // 자세포토 (4개)
  const [posturePhotos, setPosturePhotos] = useState<(string | null)[]>(Array(4).fill(null));
  const postureLabels = ['노드포워드, CR', '노립포워드, CO', '노드백워드, CR', '노립백워드, CO'];

  // 추가자세포토 (4개)
  const [additionalPosturePhotos, setAdditionalPosturePhotos] = useState<(string | null)[]>(Array(4).fill(null));
  const additionalPostureLabels = ['노드포워드, 풀페이스', '노립포워드, 풀페이스', '노드백워드, 풀페이스', '노립백워드, 풀페이스'];

  // 기타 상태
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [chartNumber, setChartNumber] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'pptx' | 'pdf'>('pptx');
  const [isGeneratingFile, setIsGeneratingFile] = useState(false);

  // 클리닉 정보 상태
  const [clinicName, setClinicName] = useState<string>('');
  const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(null);

  // 프로필 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 페이지 이탈 시 빈 분석 레코드 삭제를 위한 ref (최신 상태 참조용)
  const analysisStateRef = useRef({
    analysisId: null as string | null,
    patientName: '',
    hasImages: false,
    hasResults: false,
  });

  // 상태 변경 시 ref 업데이트
  useEffect(() => {
    const hasImages = !!(panoramaImage || lateralCephImage || frontalCephImage ||
      extraoralPhotos.some(p => p) || intraoralPhotos.some(p => p) ||
      posturePhotos.some(p => p) || additionalPosturePhotos.some(p => p));
    const hasResults = !!(landmarkResult || psaResult || psoResult || frontalAxResult);

    analysisStateRef.current = {
      analysisId,
      patientName,
      hasImages,
      hasResults,
    };
  }, [analysisId, patientName, panoramaImage, lateralCephImage, frontalCephImage,
      extraoralPhotos, intraoralPhotos, posturePhotos, additionalPosturePhotos,
      landmarkResult, psaResult, psoResult, frontalAxResult]);

  // 페이지 이탈 시 빈 분석 레코드 자동 삭제
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { analysisId, patientName, hasImages, hasResults } = analysisStateRef.current;

      // 삭제 조건: analysisId가 있고, 유의미한 데이터가 없는 경우
      if (analysisId && !patientName.trim() && !hasImages && !hasResults) {
        console.log('🗑️ Page unload: deleting empty analysis', analysisId);

        // sendBeacon으로 삭제 요청 (페이지 이탈 시에도 전송 보장)
        const blob = new Blob([JSON.stringify({ analysisId })], { type: 'application/json' });
        navigator.sendBeacon(`${basePath}/api/analysis/delete`, blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [basePath]);

  // 이력에서 "이어서 분석하기" 클릭 시 데이터 복원
  useEffect(() => {
    const savedAnalysisData = sessionStorage.getItem('analysisData');
    if (savedAnalysisData) {
      try {
        const data = JSON.parse(savedAnalysisData);
        console.log('📥 Loading analysis data from history:', data);

        // 기본 정보 복원
        if (data.analysisId) setAnalysisId(data.analysisId.toString());
        if (data.chartNumber) setChartNumber(data.chartNumber);
        if (data.patientName) setPatientName(data.patientName);
        if (data.patientBirthDate) {
          const dateStr = new Date(data.patientBirthDate).toISOString().split('T')[0];
          setPatientBirthDate(dateStr);
        }

        // 엑스레이 이미지 복원
        if (data.originalImageUrl || data.imageUrl) {
          setLateralCephImage(data.originalImageUrl || data.imageUrl);
        }
        if (data.panoramaImageUrl) {
          setPanoramaImage(data.panoramaImageUrl);
        }
        if (data.frontalOriginalImageUrl) {
          setFrontalCephImage(data.frontalOriginalImageUrl);
        }

        // 분석 결과 이미지 복원
        if (data.landmarkImageUrl) setLandmarkResult(data.landmarkImageUrl);
        if (data.psaImageUrl) setPsaResult(data.psaImageUrl);
        if (data.psoImageUrl) setPsoResult(data.psoImageUrl);
        if (data.frontalImageUrl) setFrontalAxResult(data.frontalImageUrl);

        // 사진 데이터 복원
        if (data.photosData) {
          const photos = data.photosData;
          if (photos.extraoral && Array.isArray(photos.extraoral)) {
            const extraoral = Array(8).fill(null);
            photos.extraoral.forEach((url: string, idx: number) => {
              if (idx < 8) extraoral[idx] = url;
            });
            setExtraoralPhotos(extraoral);
          }
          if (photos.intraoral && Array.isArray(photos.intraoral)) {
            const intraoral = Array(5).fill(null);
            photos.intraoral.forEach((url: string, idx: number) => {
              if (idx < 5) intraoral[idx] = url;
            });
            setIntraoralPhotos(intraoral);
          }
          if (photos.posture && Array.isArray(photos.posture)) {
            const posture = Array(4).fill(null);
            photos.posture.forEach((url: string, idx: number) => {
              if (idx < 4) posture[idx] = url;
            });
            setPosturePhotos(posture);
          }
          if (photos.additionalPosture && Array.isArray(photos.additionalPosture)) {
            const additionalPosture = Array(4).fill(null);
            photos.additionalPosture.forEach((url: string, idx: number) => {
              if (idx < 4) additionalPosture[idx] = url;
            });
            setAdditionalPosturePhotos(additionalPosture);
          }
        }

        // 분석 데이터 복원 (angles, landmarks)
        setAnalysisData(data);

        toast.success('이전 분석 데이터를 불러왔습니다');
        // 사용 후 sessionStorage에서 제거
        sessionStorage.removeItem('analysisData');
      } catch (error) {
        console.error('Error loading analysis data:', error);
      }
    }
  }, []);

  // 메시지 수신 (분석 결과)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LANDMARK_ANALYSIS_COMPLETE') {
        setAnalysisData(event.data.data);
        if (event.data.data.annotatedImageUrl) {
          setLandmarkResult(event.data.data.annotatedImageUrl);
        }
        if (event.data.data.chartNumber) {
          setChartNumber(event.data.data.chartNumber);
        }
        if (event.data.data.analysisId) {
          setAnalysisId(event.data.data.analysisId.toString());
          // 분석 ID가 생성되면 사진 데이터도 저장
          savePhotosToAnalysis(event.data.data.analysisId.toString());
        }
      } else if (event.data.type === 'PSA_ANALYSIS_COMPLETE') {
        if (event.data.data.annotatedImageUrl) {
          setPsaResult(event.data.data.annotatedImageUrl);
        }
      } else if (event.data.type === 'PSO_ANALYSIS_COMPLETE') {
        if (event.data.data.annotatedImageUrl) {
          setPsoResult(event.data.data.annotatedImageUrl);
        }
      } else if (event.data.type === 'FRONTAL_ANALYSIS_COMPLETE') {
        if (event.data.data.annotatedImageUrl) {
          setFrontalAxResult(event.data.data.annotatedImageUrl);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [panoramaImage, extraoralPhotos, intraoralPhotos, posturePhotos, additionalPosturePhotos]);

  // 사진 데이터와 환자 정보를 분석에 저장
  const savePhotosToAnalysis = async (currentAnalysisId: string, includePatientInfo: boolean = false) => {
    if (!currentAnalysisId) return;

    const photosData = {
      // 인덱스 정보를 유지하기 위해 filter 대신 map 사용 (null 값 유지)
      extraoral: extraoralPhotos.map(p => (p && !p.startsWith('blob:')) ? p : null),
      intraoral: intraoralPhotos.map(p => (p && !p.startsWith('blob:')) ? p : null),
      posture: posturePhotos.map(p => (p && !p.startsWith('blob:')) ? p : null),
      additionalPosture: additionalPosturePhotos.map(p => (p && !p.startsWith('blob:')) ? p : null),
    };

    // S3 URL만 있는 것들만 저장 (blob: URL은 제외)
    const panoramaUrl = panoramaImage && !panoramaImage.startsWith('blob:') ? panoramaImage : null;

    // 요청 데이터 구성
    const requestData: any = {
      analysisId: currentAnalysisId,
      panoramaImageUrl: panoramaUrl,
      photosData,
    };

    // 환자 정보도 포함하는 경우
    if (includePatientInfo) {
      requestData.patientName = patientName;
      requestData.patientBirthDate = patientBirthDate;
    }

    try {
      const response = await fetch(`${basePath}/api/analysis/update-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        console.log('✅ Analysis data saved');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save analysis data:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error saving analysis data:', error);
    }
  };

  // 사진 변경 시 자동 저장 (디바운스 2초)
  useEffect(() => {
    if (!analysisId) return;

    // S3 URL이 있는 사진만 카운트 (blob: URL 제외)
    const hasS3Photos =
      extraoralPhotos.some(p => p && !p.startsWith('blob:')) ||
      intraoralPhotos.some(p => p && !p.startsWith('blob:')) ||
      posturePhotos.some(p => p && !p.startsWith('blob:')) ||
      additionalPosturePhotos.some(p => p && !p.startsWith('blob:')) ||
      (panoramaImage && !panoramaImage.startsWith('blob:'));

    if (!hasS3Photos) return;

    const timeoutId = setTimeout(() => {
      console.log('📸 Auto-saving photos data...');
      savePhotosToAnalysis(analysisId);
    }, 2000); // 2초 디바운스

    return () => clearTimeout(timeoutId);
  }, [analysisId, panoramaImage, extraoralPhotos, intraoralPhotos, posturePhotos, additionalPosturePhotos]);

  // 환자 정보 변경 시 자동 저장 (디바운스 2초)
  useEffect(() => {
    if (!analysisId) return;

    const timeoutId = setTimeout(() => {
      console.log('👤 Auto-saving patient info...');
      savePhotosToAnalysis(analysisId, true);
    }, 2000); // 2초 디바운스

    return () => clearTimeout(timeoutId);
  }, [analysisId, patientName, patientBirthDate]);

  // 로그인 체크
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signup');
    }
  }, [status, router]);

  // 클리닉 정보 가져오기
  useEffect(() => {
    const fetchClinicInfo = async () => {
      try {
        const response = await fetch(`${basePath}/api/profile`);
        if (response.ok) {
          const data = await response.json();
          if (data.clinic) {
            setClinicName(data.clinic.clinicName || '');
            setClinicLogoUrl(data.clinic.logoUrl || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch clinic info:', error);
      }
    };

    if (status === 'authenticated') {
      fetchClinicInfo();
    }
  }, [status, basePath]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }
  if (status === 'unauthenticated') return null;

  // 파일 용량 제한 (바이트)
  const FILE_SIZE_LIMITS = {
    xray: 10 * 1024 * 1024,      // X-ray: 10MB
    photo: 5 * 1024 * 1024,      // 일반 사진: 5MB
  };

  // 파일 타입별 용량 제한 가져오기
  const getFileSizeLimit = (type: string): number => {
    const xrayTypes = ['panorama', 'lateral_ceph', 'frontal_ceph'];
    return xrayTypes.includes(type) ? FILE_SIZE_LIMITS.xray : FILE_SIZE_LIMITS.photo;
  };

  // 파일 크기를 읽기 쉬운 형식으로 변환
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 파일 용량 검증
  const validateFileSize = (file: File, type: string): { valid: boolean; message?: string } => {
    const limit = getFileSizeLimit(type);
    if (file.size > limit) {
      const xrayTypes = ['panorama', 'lateral_ceph', 'frontal_ceph'];
      const limitType = xrayTypes.includes(type) ? 'X-ray' : '사진';
      return {
        valid: false,
        message: `파일 크기가 너무 큽니다.\n현재: ${formatFileSize(file.size)}\n${limitType} 최대: ${formatFileSize(limit)}`
      };
    }
    return { valid: true };
  };

  // S3 파일 업로드 함수
  const uploadToS3 = async (file: File, type: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', session?.user?.email || 'anonymous');
      formData.append('type', type);

      const response = await fetch(`${basePath}/api/upload/file`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${type} uploaded to S3:`, result.s3Url);
        return result.s3Url;
      } else {
        const error = await response.text();
        console.error(`❌ S3 upload failed for ${type}:`, error);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error uploading ${type}:`, error);
      return null;
    }
  };

  // 파일 업로드 핸들러 (S3 업로드)
  const handleFileUpload = async (file: File, setter: (url: string | null) => void, type: string) => {
    // 파일 용량 검증
    const validation = validateFileSize(file, type);
    if (!validation.valid) {
      toast.error(validation.message || '파일이 너무 큽니다');
      return;
    }

    // 먼저 로컬 미리보기 표시
    const localUrl = URL.createObjectURL(file);
    setter(localUrl);

    // S3에 업로드
    setIsUploading(true);
    const s3Url = await uploadToS3(file, type);
    setIsUploading(false);

    if (s3Url) {
      // 로컬 URL을 S3 URL로 교체
      URL.revokeObjectURL(localUrl);
      setter(s3Url);
      toast.success(`${type} 이미지가 업로드되었습니다`);

      // X-ray 이미지는 분석 페이지에서 사용하므로 미리 캐싱 (로딩 속도 개선)
      if (type === 'lateral_ceph' || type === 'frontal_ceph') {
        console.log(`🚀 Pre-caching ${type} image for faster analysis page loading...`);
        imageCache.getOrLoadImage(s3Url).then(() => {
          console.log(`✅ ${type} image pre-cached successfully`);
        }).catch((err) => {
          console.warn(`⚠️ ${type} pre-caching failed (will retry on analysis page):`, err);
        });
      }

      // lateral_ceph 업로드 시 분석 레코드 처리
      if (type === 'lateral_ceph') {
        if (!chartNumber) {
          // 새 분석: 차트번호 자동 생성
          try {
            const response = await fetch(`${basePath}/api/analysis/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                patientName: patientName || '',
                patientBirthDate: patientBirthDate || '',
                originalImageUrl: s3Url // 원본 이미지 URL 저장
              })
            });

            if (response.ok) {
              const result = await response.json();
              console.log('✅ New analysis created with chart number:', result.chartNumber);
              setChartNumber(result.chartNumber);
              setAnalysisId(result.analysisId);
              setAnalysisData((prev: any) => ({
                ...prev,
                analysisId: result.analysisId,
                analysisCode: result.analysisCode,
                chartNumber: result.chartNumber
              }));
              // sessionStorage에도 저장 (landmark/psa/pso에서 사용)
              sessionStorage.setItem('analysisId', result.analysisId);
              toast.success(`차트번호 ${result.chartNumber} 생성됨`);
            } else {
              console.error('Failed to create analysis:', await response.text());
            }
          } catch (error) {
            console.error('Error creating analysis:', error);
          }
        } else if (analysisId) {
          // 기존 분석: originalImageUrl만 업데이트
          try {
            const response = await fetch(`${basePath}/api/analysis/update-photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                analysisId,
                originalImageUrl: s3Url
              })
            });

            if (response.ok) {
              console.log('✅ Original image URL updated for existing analysis');
            } else {
              console.error('Failed to update original image URL:', await response.text());
            }
          } catch (error) {
            console.error('Error updating original image URL:', error);
          }
        }
      }
    } else {
      toast.error(`${type} 업로드 실패`);
      // 실패해도 로컬 미리보기는 유지
    }
  };

  const handleArrayPhotoUpload = async (file: File, index: number, photos: (string | null)[], setPhotos: (photos: (string | null)[]) => void, type: string) => {
    // 파일 용량 검증
    const validation = validateFileSize(file, type);
    if (!validation.valid) {
      toast.error(validation.message || '파일이 너무 큽니다');
      return;
    }

    // 먼저 로컬 미리보기 표시
    const localUrl = URL.createObjectURL(file);
    const newPhotos = [...photos];
    newPhotos[index] = localUrl;
    setPhotos(newPhotos);

    // S3에 업로드
    setIsUploading(true);
    const s3Url = await uploadToS3(file, `${type}_${index + 1}`);
    setIsUploading(false);

    if (s3Url) {
      // 로컬 URL을 S3 URL로 교체
      URL.revokeObjectURL(localUrl);
      const updatedPhotos = [...newPhotos];
      updatedPhotos[index] = s3Url;
      setPhotos(updatedPhotos);
    }
  };

  const handleArrayPhotoRemove = (index: number, photos: (string | null)[], setPhotos: (photos: (string | null)[]) => void) => {
    const newPhotos = [...photos];
    if (newPhotos[index] && newPhotos[index]!.startsWith('blob:')) {
      URL.revokeObjectURL(newPhotos[index]!);
    }
    newPhotos[index] = null;
    setPhotos(newPhotos);
  };

  // S3 URL을 pre-signed URL로 변환 (캐싱하여 분석 페이지에서 재사용)
  const getPresignedUrl = async (s3Url: string): Promise<string> => {
    // 이미 pre-signed URL이거나 S3 URL이 아니면 그대로 반환
    if (!s3Url.includes('s3.amazonaws.com') && !s3Url.includes('.s3.')) {
      return s3Url;
    }
    if (s3Url.includes('X-Amz-Signature')) {
      return s3Url;
    }

    try {
      const response = await fetch(`${basePath}/api/s3/get-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: s3Url })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.presignedUrl) {
          console.log('✅ Pre-signed URL obtained for analysis page');
          return data.presignedUrl;
        }
      }
    } catch (error) {
      console.error('Failed to get pre-signed URL:', error);
    }

    return s3Url; // 실패 시 원본 URL 반환
  };

  // 분석 시작 핸들러
  const handleStartAnalysis = async (type: 'LANDMARK' | 'PSA' | 'PSO' | 'FRONTAL') => {
    const imageUrl = type === 'FRONTAL' ? frontalCephImage : lateralCephImage;
    if (!imageUrl) {
      toast.error(type === 'FRONTAL' ? 'Frontal Ceph 이미지를 먼저 업로드해주세요' : 'Lateral Ceph 이미지를 먼저 업로드해주세요');
      return;
    }

    setIsProcessing(true);

    // S3 URL인 경우 pre-signed URL로 변환 (분석 페이지에서 API 호출 생략)
    const presignedUrl = await getPresignedUrl(imageUrl);

    if (type === 'FRONTAL') {
      sessionStorage.setItem('frontalImage', presignedUrl);
      sessionStorage.setItem('frontalFileName', 'Frontal_Ceph.jpg');
      sessionStorage.setItem('patientName', patientName);
      sessionStorage.setItem('patientBirthDate', patientBirthDate);
    } else {
      sessionStorage.setItem('xrayImage', presignedUrl);
      sessionStorage.setItem('xrayFileName', 'Lateral_Ceph.jpg');
      sessionStorage.setItem('patientName', patientName);
      sessionStorage.setItem('patientBirthDate', patientBirthDate);
    }

    const urls: Record<string, string> = {
      LANDMARK: `${basePath}/landmark`,
      PSA: `${basePath}/psa`,
      PSO: `${basePath}/pso`,
      FRONTAL: `${basePath}/frontal`,
    };

    const newWindow = window.open(urls[type], '_blank', 'width=1400,height=900');
    if (newWindow) newWindow.focus();
    else toast.error('팝업이 차단되었습니다');

    setIsProcessing(false);
  };

  // 새 분석 시작
  const handleNewAnalysis = async () => {
    // 기존 빈 분석 레코드가 있으면 먼저 삭제 (차트번호 낭비 방지)
    const currentAnalysisId = analysisId;
    const hasImages = !!(panoramaImage || lateralCephImage || frontalCephImage ||
      extraoralPhotos.some(p => p) || intraoralPhotos.some(p => p) ||
      posturePhotos.some(p => p) || additionalPosturePhotos.some(p => p));
    const hasResults = !!(landmarkResult || psaResult || psoResult || frontalAxResult);

    if (currentAnalysisId && !patientName.trim() && !hasImages && !hasResults) {
      try {
        console.log('🗑️ Deleting empty analysis before creating new one:', currentAnalysisId);
        await fetch(`${basePath}/api/analysis/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysisId: currentAnalysisId })
        });
      } catch (error) {
        console.error('Error deleting empty analysis:', error);
      }
    }

    // 상태 초기화
    clearAll();
    setPanoramaImage(null);
    setLateralCephImage(null);
    setFrontalCephImage(null);
    setLandmarkResult(null);
    setPsaResult(null);
    setPsoResult(null);
    setFrontalAxResult(null);
    setExtraoralPhotos(Array(8).fill(null));
    setIntraoralPhotos(Array(5).fill(null));
    setPosturePhotos(Array(4).fill(null));
    setAdditionalPosturePhotos(Array(4).fill(null));
    setPatientName('');
    setPatientBirthDate('');
    setChartNumber(null);
    setAnalysisId(null);
    setAnalysisData(null);
    sessionStorage.removeItem('analysisData');
    sessionStorage.removeItem('analysisId');

    // 새 분석 레코드 생성 및 차트번호 할당
    try {
      const response = await fetch(`${basePath}/api/analysis/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'New Analysis',
          patientName: '',
          patientBirthDate: ''
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ New analysis created:', result.chartNumber);
        setChartNumber(result.chartNumber);
        setAnalysisId(result.analysisId);
        sessionStorage.setItem('analysisId', result.analysisId);
        toast.success(`새 분석 시작 (${result.chartNumber})`);
      } else {
        console.error('Failed to create analysis:', await response.text());
        toast.success('새 분석을 시작합니다');
      }
    } catch (error) {
      console.error('Error creating analysis:', error);
      toast.success('새 분석을 시작합니다');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />

      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-blue-600">KOCO</Link>
            <span className="text-gray-600">자동화 진단</span>
            {chartNumber && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">{chartNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* 환자 정보 입력 */}
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="환자이름"
              className="px-2 py-1 text-sm border rounded w-24"
            />
            <input
              type="date"
              value={patientBirthDate}
              onChange={(e) => setPatientBirthDate(e.target.value)}
              className="px-2 py-1 text-sm border rounded"
            />
            <button onClick={handleNewAnalysis} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
              새 분석
            </button>
            <Link href="/history" className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
              이력
            </Link>

            {/* 프로필 */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  {(session?.user?.name || session?.user?.email || '?')[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-700 hidden sm:inline">{session?.user?.name || '사용자'}</span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded shadow-lg border py-1 z-50">
                  <div className="px-3 py-2 border-b text-sm">
                    <p className="font-medium text-gray-900">{session?.user?.name || '사용자'}</p>
                    <p className="text-gray-500 text-xs truncate">{session?.user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      프로필 설정
                    </span>
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      로그아웃
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 - 스크롤 가능 */}
      <main className="max-w-7xl mx-auto p-4 space-y-4">

        {/* 엑스레이 입력 섹션 */}
        <section className="bg-white rounded-lg shadow">
          <div className="bg-gray-200 px-4 py-2 rounded-t-lg">
            <h2 className="font-bold text-gray-800">엑스레이 입력</h2>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3 items-start">
              {/* PANORAMA */}
              <div className="w-32">
                <ImageUploadBox
                  label="PANORAMA"
                  image={panoramaImage}
                  onUpload={(f) => handleFileUpload(f, setPanoramaImage, 'panorama')}
                  onRemove={() => { if (panoramaImage?.startsWith('blob:')) URL.revokeObjectURL(panoramaImage); setPanoramaImage(null); }}
                  placeholder={`${basePath}/images/placeholders/sample_pano.jpg`}
                />
              </div>

              {/* Lateral Ceph */}
              <div className="w-32">
                <ImageUploadBox
                  label="Lateral_ceph"
                  image={lateralCephImage}
                  onUpload={(f) => handleFileUpload(f, setLateralCephImage, 'lateral_ceph')}
                  onRemove={() => { if (lateralCephImage?.startsWith('blob:')) URL.revokeObjectURL(lateralCephImage); setLateralCephImage(null); }}
                  placeholder={`${basePath}/images/placeholders/sample_lateral.jpg`}
                />
              </div>

              {/* 분석 버튼들 */}
              <div className="flex flex-col gap-1 justify-center py-2">
                <button
                  onClick={() => handleStartAnalysis('LANDMARK')}
                  disabled={isProcessing || !lateralCephImage}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  랜드마크 찍기
                </button>
                <button
                  onClick={() => handleStartAnalysis('PSA')}
                  disabled={isProcessing || !lateralCephImage}
                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  PSA 완성
                </button>
                <button
                  onClick={() => handleStartAnalysis('PSO')}
                  disabled={isProcessing || !lateralCephImage}
                  className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  PSO 완성
                </button>
                <button
                  onClick={() => handleStartAnalysis('FRONTAL')}
                  disabled={isProcessing || !frontalCephImage}
                  className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Frontal 분석
                </button>
              </div>

              {/* Frontal Ceph */}
              <div className="w-32">
                <ImageUploadBox
                  label="Frontal_ceph"
                  image={frontalCephImage}
                  onUpload={(f) => handleFileUpload(f, setFrontalCephImage, 'frontal_ceph')}
                  onRemove={() => { if (frontalCephImage?.startsWith('blob:')) URL.revokeObjectURL(frontalCephImage); setFrontalCephImage(null); }}
                  placeholder={`${basePath}/images/placeholders/sample_frontal.jpg`}
                />
              </div>

              {/* 분석 결과 이미지들 */}
              <div className="w-32">
                <ResultImageBox label="Landmarks" image={landmarkResult} labelColor="bg-green-400" placeholder={`${basePath}/images/placeholders/sample_lateral.jpg`} />
              </div>
              <div className="w-32">
                <ResultImageBox label="PSA" image={psaResult} labelColor="bg-green-400" placeholder={`${basePath}/images/placeholders/sample_psa.jpg`} />
              </div>
              <div className="w-32">
                <ResultImageBox label="PSO" image={psoResult} labelColor="bg-green-400" placeholder={`${basePath}/images/placeholders/sample_pso.jpg`} />
              </div>
              <div className="w-32">
                <ResultImageBox label="Frontal Ax." image={frontalAxResult} labelColor="bg-green-400" placeholder={`${basePath}/images/placeholders/sample_frontal.jpg`} />
              </div>
            </div>
          </div>
        </section>

        {/* 구외포토 입력 섹션 */}
        <section className="bg-white rounded-lg shadow">
          <div className="bg-gray-200 px-4 py-2 rounded-t-lg">
            <h2 className="font-bold text-gray-800">구외포토 입력 (최대 8개)</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {extraoralLabels.map((label, idx) => (
                <ImageUploadBox
                  key={idx}
                  label={label}
                  image={extraoralPhotos[idx]}
                  onUpload={(f) => handleArrayPhotoUpload(f, idx, extraoralPhotos, setExtraoralPhotos, 'extraoral')}
                  onRemove={() => handleArrayPhotoRemove(idx, extraoralPhotos, setExtraoralPhotos)}
                  labelColor="bg-yellow-400"
                  placeholder={`${basePath}/images/placeholders/sample_photo${idx + 1}.jpg`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 구내포토 입력 섹션 */}
        <section className="bg-white rounded-lg shadow">
          <div className="bg-gray-200 px-4 py-2 rounded-t-lg">
            <h2 className="font-bold text-gray-800">구내포토 입력 (최대 5개)</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {intraoralLabels.map((label, idx) => (
                <ImageUploadBox
                  key={idx}
                  label={label}
                  image={intraoralPhotos[idx]}
                  onUpload={(f) => handleArrayPhotoUpload(f, idx, intraoralPhotos, setIntraoralPhotos, 'intraoral')}
                  onRemove={() => handleArrayPhotoRemove(idx, intraoralPhotos, setIntraoralPhotos)}
                  labelColor="bg-yellow-400"
                  placeholder={`${basePath}/images/placeholders/sample_oral${idx + 1}.jpg`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 자세포토 입력 섹션 */}
        <section className="bg-white rounded-lg shadow">
          <div className="bg-gray-200 px-4 py-2 rounded-t-lg">
            <h2 className="font-bold text-gray-800">자세포토 입력 (최대 4개)</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {postureLabels.map((label, idx) => (
                <ImageUploadBox
                  key={idx}
                  label={label}
                  image={posturePhotos[idx]}
                  onUpload={(f) => handleArrayPhotoUpload(f, idx, posturePhotos, setPosturePhotos, 'posture')}
                  onRemove={() => handleArrayPhotoRemove(idx, posturePhotos, setPosturePhotos)}
                  labelColor="bg-yellow-400"
                  placeholder={`${basePath}/images/placeholders/sample_posture${idx + 1}.jpg`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 추가자세 포토 입력 섹션 (측문이 비대칭일때) */}
        <section className="bg-white rounded-lg shadow">
          <div className="bg-gray-200 px-4 py-2 rounded-t-lg">
            <h2 className="font-bold text-gray-800">측문이 비대칭일때 추가 검사</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {additionalPostureLabels.map((label, idx) => (
                <ImageUploadBox
                  key={idx}
                  label={label}
                  image={additionalPosturePhotos[idx]}
                  onUpload={(f) => handleArrayPhotoUpload(f, idx, additionalPosturePhotos, setAdditionalPosturePhotos, 'additional_posture')}
                  onRemove={() => handleArrayPhotoRemove(idx, additionalPosturePhotos, setAdditionalPosturePhotos)}
                  labelColor="bg-yellow-400"
                  placeholder={`${basePath}/images/placeholders/sample_posture${idx + 5}.jpg`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 계측값 분석 섹션 */}
        <section className="bg-white rounded-lg shadow">
          <MeasurementDashboard initialData={analysisData} />
        </section>

        {/* 파일 생성 섹션 */}
        <section className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-gray-800">반환 파일 형식</h3>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as 'pptx' | 'pdf')}
              className="px-3 py-2 border rounded"
            >
              <option value="pptx">PowerPoint (.pptx)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
            <button
              onClick={async () => {
                const checkResult = canGeneratePowerPoint({
                  patientName,
                  patientBirthDate,
                  lateralCephUrl: lateralCephImage,
                  psaResultUrl: psaResult,
                  psoResultUrl: psoResult,
                  measurements: analysisData?.angles || {}
                });
                if (!checkResult.canGenerate) {
                  toast.error(checkResult.reason || '파일 생성 조건을 만족하지 않습니다');
                  return;
                }
                setIsGeneratingFile(true);
                try {
                  const result = await generatePowerPoint({
                    lateralCephUrl: lateralCephImage,
                    psaResultUrl: psaResult,
                    psoResultUrl: psoResult,
                    landmarkResultUrl: landmarkResult,
                    frontalAxResultUrl: frontalAxResult,
                    panoramaUrl: panoramaImage,
                    extraoralPhotos: extraoralPhotos,
                    intraoralPhotos: intraoralPhotos,
                    posturePhotos: posturePhotos,
                    additionalPosturePhotos: additionalPosturePhotos,
                    patientName,
                    patientBirthDate,
                    clinicName,
                    clinicLogoUrl,
                    measurements: analysisData?.angles || {},
                    diagnosis: analysisData?.diagnosis,
                    fileType: outputFormat
                  }, () => {});
                  if (result.success) toast.success(`${outputFormat.toUpperCase()} 파일이 생성되었습니다!`);
                  else toast.error(`파일 생성 실패: ${result.error}`);
                } catch (error) {
                  toast.error('파일 생성 중 오류가 발생했습니다');
                }
                setIsGeneratingFile(false);
              }}
              disabled={isGeneratingFile}
              className={`px-4 py-2 ${isGeneratingFile ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded font-medium`}
            >
              {isGeneratingFile ? '생성 중...' : '파일 생성하기'}
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
