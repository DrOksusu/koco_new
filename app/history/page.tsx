'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// basePath 처리 (production에서는 /new 추가)
const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

interface DiagnosisRecord {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  result: any;
  createdAt: string;
}

// S3 이미지를 위한 컴포넌트
// 전역 캐시로 중복 요청 방지 (dashboard와 동일한 캐시 사용)
const presignedUrlCache = new Map<string, { url: string; timestamp: number }>();
const pendingRequests = new Set<string>(); // 진행 중인 요청 추적
const CACHE_DURATION = 5 * 60 * 1000; // 5분

function ImageWithPresignedUrl({
  imageUrl,
  alt,
  className,
  onClick
}: {
  imageUrl: string;
  alt: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  // S3 URL인 경우 초기값을 빈 문자열로 설정하여 403 오류 방지
  const isS3 = imageUrl && imageUrl.includes('s3') && imageUrl.includes('amazonaws.com');
  const isPreSigned = imageUrl && imageUrl.includes('X-Amz-Signature');

  const [presignedUrl, setPresignedUrl] = useState<string>(
    isS3 && !isPreSigned ? '' : imageUrl
  );
  const [loading, setLoading] = useState(isS3 && !isPreSigned);
  const [error, setError] = useState(false);

  useEffect(() => {
    const generatePresignedUrl = async () => {
      // S3 URL에서 쿼리 파라미터 제거 (원본 S3 경로만 사용)
      const cleanUrl = imageUrl.split('?')[0];
      
      // 이미 진행 중인 요청이 있는지 확인
      if (pendingRequests.has(cleanUrl)) {
        console.log('Request already in progress, skipping duplicate');
        return;
      }
      
      // 캐시 확인
      const cached = presignedUrlCache.get(cleanUrl);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Using cached pre-signed URL');
        setPresignedUrl(cached.url);
        setLoading(false);
        return;
      }

      setLoading(true);
      setPresignedUrl(''); // 명시적으로 빈 문자열 설정하여 403 방지

      // 진행 중인 요청으로 표시
      pendingRequests.add(cleanUrl);

      try {
        const response = await fetch(`${basePath}/api/s3/get-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl: cleanUrl }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.presignedUrl) {
          setPresignedUrl(data.presignedUrl);
          
          // 캐시에 저장
          presignedUrlCache.set(cleanUrl, {
            url: data.presignedUrl,
            timestamp: Date.now()
          });
        } else {
          console.error('No presignedUrl in response:', data);
          setError(true);
        }
      } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        setError(true);
      } finally {
        setLoading(false);
        // 진행 중인 요청에서 제거
        pendingRequests.delete(cleanUrl);
      }
    };

    // S3 URL이면 항상 새로운 pre-signed URL 생성
    if (isS3 && !isPreSigned) {
      generatePresignedUrl();
    } else if (isPreSigned) {
      // 이미 pre-signed URL인 경우 바로 사용
      setPresignedUrl(imageUrl);
      setLoading(false);
    } else {
      // S3 URL이 아닌 경우 (data URL 등)
      setPresignedUrl(imageUrl);
      setLoading(false);
    }
  }, [imageUrl, isS3, isPreSigned]);

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-2">
          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-500 text-center">이미지 로드 실패</span>
          <span className="text-xs text-gray-400 text-center mt-1">S3 파일 확인 필요</span>
        </div>
      </div>
    );
  }

  // presignedUrl이 준비되지 않은 경우 로딩 표시
  if (!presignedUrl) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={presignedUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      loading="lazy"
      onError={(e) => {
        // 테스트 URL은 무시
        if (presignedUrl.includes('example.com')) {
          setError(true);
          return;
        }

        console.error('Image load error - 403 Forbidden');
        console.error('This may indicate:');
        console.error('1. AWS credentials lack GetObject permission');
        console.error('2. File does not exist in S3');
        console.error('3. S3 bucket policy blocks access');
        console.error('URL (first 100 chars):', presignedUrl.substring(0, 100));
        
        // 재시도 로직 추가
        const img = e.currentTarget as HTMLImageElement;
        if (img.crossOrigin) {
          console.log('Retrying without CORS...');
          img.crossOrigin = null;
          img.src = presignedUrl + (presignedUrl.includes('?') ? '&' : '?') + 'retry=' + Date.now();
        } else {
          setError(true);
        }
      }}
    />
  );
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [filteredDiagnoses, setFilteredDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchHistory();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }

    // BroadcastChannel로 다른 탭/창과 통신 (크로스 탭 자동 새로고침)
    const channel = new BroadcastChannel('analysis_updates');

    channel.onmessage = (event) => {
      if (event.data.type === 'ANALYSIS_SAVED') {
        console.log('✅ BroadcastChannel: 분석 저장 완료, 이력 새로고침');

        // 1초 후 새로고침 (DB 저장 완료 대기)
        setTimeout(() => {
          fetchHistory();
        }, 1000);
      }
    };

    // postMessage 리스너 추가 (PSA/PSO/Frontal/Landmark 완료 시 자동 새로고침)
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LANDMARK_ANALYSIS_COMPLETE' ||
          event.data.type === 'PSA_ANALYSIS_COMPLETE' ||
          event.data.type === 'PSO_ANALYSIS_COMPLETE' ||
          event.data.type === 'FRONTAL_ANALYSIS_COMPLETE') {
        console.log('✅ postMessage: 분석 완료 메시지 수신, 이력 새로고침:', event.data.type);

        // 1초 후 새로고침 (DB 저장 완료 대기)
        setTimeout(() => {
          fetchHistory();
        }, 1000);
      }
    };

    window.addEventListener('message', handleMessage);

    // 페이지 포커스 시 자동 새로고침 (다른 탭에서 돌아올 때)
    const handleFocus = () => {
      console.log('✅ 페이지 포커스, 이력 새로고침');
      fetchHistory();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      channel.close();
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, status]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${basePath}/api/landmark/history`);
      if (response.ok) {
        const data = await response.json();
        setDiagnoses(data.diagnoses || []);
        setFilteredDiagnoses(data.diagnoses || []);
      } else {
        console.error('Failed to fetch history:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      // 네트워크 에러인 경우 사용자에게 알림
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Network error - API might not be ready yet. This is normal on initial load.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 검색 및 정렬 처리
  useEffect(() => {
    let filtered = [...diagnoses];

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(d => {
        const patientName = d.result?.patientName || '';
        const fileName = d.title || d.result?.fileName || '';
        const analysisCode = d.result?.analysisCode || '';

        return patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               analysisCode.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'name') {
        const nameA = a.result?.patientName || '';
        const nameB = b.result?.patientName || '';
        return nameA.localeCompare(nameB, 'ko-KR');
      }
      return 0;
    });

    setFilteredDiagnoses(filtered);
  }, [searchTerm, sortBy, diagnoses]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 분석 데이터를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/landmark/history/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDiagnoses(diagnoses.filter(d => d.id !== id));
        alert('삭제되었습니다.');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDownloadExcel = async (diagnosis: DiagnosisRecord) => {
    const { generateExcelFile } = await import('@/lib/excel-generator');
    const result = diagnosis.result;
    generateExcelFile(
      result.fileName || 'analysis',
      result.landmarks || {},
      result.angles || {}
    );
  };

  const handleReEditLandmark = async (diagnosis: DiagnosisRecord) => {
    // 기존 분석 데이터를 sessionStorage에 저장
    const analysisData = {
      analysisId: diagnosis.id,
      analysisCode: diagnosis.result.analysisCode,
      landmarks: diagnosis.result.landmarks || {},
      imageUrl: diagnosis.result.annotatedImageUrl || diagnosis.result.imageUrl || '', // 랜드마크가 그려진 이미지
      originalImageUrl: diagnosis.result.originalImageUrl || diagnosis.result.imageUrl || '', // 원본 이미지
      fileName: diagnosis.title || diagnosis.result.fileName || 'analysis',
      patientName: diagnosis.result.patientName || '',
      patientBirthDate: diagnosis.result.patientBirthDate || '',
      diagnosisDate: diagnosis.result.diagnosisDate || ''
    };

    console.log('Re-edit analysis data:', analysisData);
    sessionStorage.setItem('reEditAnalysis', JSON.stringify(analysisData));

    // 환자 정보도 세션 스토리지에 저장
    if (diagnosis.result.patientName) {
      sessionStorage.setItem('patientName', diagnosis.result.patientName);
    }
    if (diagnosis.result.patientBirthDate) {
      sessionStorage.setItem('patientBirthDate', diagnosis.result.patientBirthDate);
    }
    if (diagnosis.result.diagnosisDate) {
      sessionStorage.setItem('diagnosisDate', diagnosis.result.diagnosisDate);
    }

    // 새 창에서 랜드마크 페이지 열기
    const newWindow = window.open('/landmark?reEdit=true', '_blank',
      'width=1400,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');

    if (newWindow) {
      newWindow.focus();
    } else {
      alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                KOCO
              </Link>
              <span className="ml-4 text-lg text-gray-600">분석 이력</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                새 분석 시작
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">분석 이력</h1>

        {/* 검색 및 정렬 바 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="환자 이름, 파일명, 분석 코드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">최신순</option>
              <option value="name">이름순</option>
            </select>
          </div>
        </div>

        {diagnoses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">저장된 분석 데이터가 없습니다.</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              첫 분석 시작하기
            </Link>
          </div>
        ) : filteredDiagnoses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">검색 결과가 없습니다.</p>
            <button
              onClick={() => setSearchTerm('')}
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              검색 초기화
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              총 {filteredDiagnoses.length}개의 분석 결과
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDiagnoses.map((diagnosis) => (
              <div
                key={diagnosis.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedDiagnosis(diagnosis)}
              >
                {/* 원본 이미지 썸네일 표시 */}
                {diagnosis.result?.imageUrl && (
                  <div className="h-48 bg-gray-100">
                    <ImageWithPresignedUrl
                      imageUrl={diagnosis.result.imageUrl}
                      alt="Lateral Ceph"
                      className="w-full h-full object-contain"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                          {diagnosis.type}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            diagnosis.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {diagnosis.status}
                        </span>
                      </div>

                      {/* 환자 정보 표시 */}
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {diagnosis.result?.patientName || '환자 이름 미등록'}
                      </h3>

                      {diagnosis.result?.patientBirthDate && (
                        <p className="text-sm text-gray-600 mb-1">
                          생년월일: {new Date(diagnosis.result.patientBirthDate).toLocaleDateString('ko-KR')}
                        </p>
                      )}

                      {diagnosis.result?.diagnosisDate && (
                        <p className="text-sm text-gray-600 mb-1">
                          진단월일: {new Date(diagnosis.result.diagnosisDate).toLocaleDateString('ko-KR')}
                        </p>
                      )}

                      {/* 분석 코드 */}
                      {diagnosis.result?.analysisCode && (
                        <p className="text-xs text-gray-500 mb-2">
                          분석 코드: {diagnosis.result.analysisCode}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 파일명 */}
                  <p className="text-sm text-gray-600 mb-2">
                    파일: {diagnosis.title || diagnosis.result?.fileName || 'Unknown'}
                  </p>

                  {/* 분석 날짜 */}
                  <div className="text-xs text-gray-400 border-t pt-2">
                    분석 날짜: {new Date(diagnosis.createdAt).toLocaleString('ko-KR')}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();

                        // 원본 이미지 URL 사용 (원본이 없으면 imageUrl 사용)
                        let imageUrl = diagnosis.result?.originalImageUrl || diagnosis.result?.imageUrl;

                        // S3 URL이면 pre-signed URL 생성
                        if (imageUrl && imageUrl.includes('s3') && imageUrl.includes('amazonaws.com')) {
                          try {
                            const response = await fetch(`${basePath}/api/s3/get-image`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ imageUrl }),
                            });

                            if (response.ok) {
                              const data = await response.json();
                              imageUrl = data.presignedUrl;
                              console.log('Generated pre-signed URL for original image:', imageUrl);
                            }
                          } catch (error) {
                            console.error('Error generating pre-signed URL:', error);
                          }
                        }

                        // Dashboard로 이동하면서 데이터와 원본 이미지 전달
                        const dataToSend = {
                          analysisId: diagnosis.id, // 자동 저장을 위한 ID 추가
                          ...diagnosis.result,
                          imageUrl: imageUrl, // 원본 이미지 URL 사용
                          fileName: diagnosis.title || diagnosis.result?.fileName || 'analysis.jpg'
                        };
                        console.log('Sending to dashboard with analysisId:', diagnosis.id);
                        sessionStorage.setItem('analysisData', JSON.stringify(dataToSend));
                        router.push('/dashboard');
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      계측값 보기
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReEditLandmark(diagnosis);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      랜드마크 수정
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadExcel(diagnosis);
                      }}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      엑셀
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(diagnosis.id);
                      }}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
              ))}
            </div>
          </div>
        )}

        {/* 상세 보기 모달 */}
        {selectedDiagnosis && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setSelectedDiagnosis(null)}
          >
            <div
              className="bg-white rounded-lg p-8 max-w-4xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4">
                {selectedDiagnosis.title}
              </h2>

              <div className="grid grid-cols-2 gap-6">
                {/* 랜드마크 정보 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">랜드마크 좌표</h3>
                  <div className="max-h-60 overflow-y-auto bg-gray-50 p-3 rounded">
                    {selectedDiagnosis.result?.landmarks &&
                      Object.entries(selectedDiagnosis.result.landmarks).map(
                        ([name, coords]: [string, any]) => (
                          <div key={name} className="text-sm py-1 border-b">
                            <span className="font-medium">{name}:</span>
                            <span className="ml-2">
                              X: {coords.x.toFixed(3)}, Y: {coords.y.toFixed(3)}
                            </span>
                          </div>
                        )
                      )}
                  </div>
                </div>

                {/* 각도 정보 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">측정 각도</h3>
                  <div className="max-h-60 overflow-y-auto bg-gray-50 p-3 rounded">
                    {selectedDiagnosis.result?.angles &&
                      Object.entries(selectedDiagnosis.result.angles).map(
                        ([name, value]: [string, any]) => (
                          <div key={name} className="text-sm py-1 border-b">
                            <span className="font-medium">{name}:</span>
                            <span className="ml-2">
                              {value?.toFixed(2) || 'N/A'}°
                            </span>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </div>

              {/* 이미지 */}
              {selectedDiagnosis.result?.imageUrl && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">분석 이미지</h3>
                  <ImageWithPresignedUrl
                    imageUrl={selectedDiagnosis.result.imageUrl}
                    alt="Landmark Analysis"
                    className="w-full rounded border"
                  />
                </div>
              )}

              <button
                onClick={() => setSelectedDiagnosis(null)}
                className="mt-6 px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}