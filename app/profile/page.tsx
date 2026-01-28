'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import S3Image from '@/components/common/S3Image';

// basePath 처리 (production에서는 /new 추가)
const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

interface ProfileData {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  };
  clinic: {
    id: string;
    clinicName: string;
    clinicCode: string;
    address: string | null;
    phone: string | null;
    licenseNumber: string | null;
    logoUrl: string | null;
  } | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 프로필 데이터
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // 편집용 상태
  const [editUsername, setEditUsername] = useState('');
  const [editClinicName, setEditClinicName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // 로고 미리보기
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${basePath}/api/profile`);
      console.log('Profile response status:', response.status);
      const responseText = await response.text();
      console.log('Profile response text:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('Profile data:', data);
        setProfileData(data);
        setEditUsername(data.user?.username || '');
        setEditClinicName(data.clinic?.clinicName || '');
        setEditAddress(data.clinic?.address || '');
        setEditPhone(data.clinic?.phone || '');
        // 로고는 S3Image 컴포넌트가 자동으로 처리하므로 별도 변환 불필요
        setLogoPreview(null); // 새 업로드 시에만 사용
      } else {
        console.error('Profile fetch error:', responseText);
        try {
          const errorData = JSON.parse(responseText);
          console.error('Error details:', errorData.details);
          toast.error(`프로필 로드 실패: ${errorData.details || errorData.error || response.status}`);
        } catch {
          toast.error(`프로필 로드 실패: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('프로필을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${basePath}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername,
          clinic: {
            clinicName: editClinicName,
            address: editAddress,
            phone: editPhone,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setIsEditing(false);
        toast.success('프로필이 저장되었습니다');
      } else {
        toast.error('프로필 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('프로필 저장 중 오류가 발생했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const processLogoFile = async (file: File) => {
    // 파일 크기 체크 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('파일 크기는 2MB 이하여야 합니다');
      return;
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다');
      return;
    }

    // 미리보기 설정
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // S3 업로드
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${basePath}/api/profile/upload-logo`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLogoPreview(data.logoUrl);
        toast.success('로고가 업로드되었습니다');
        fetchProfile();
      } else {
        const error = await response.json();
        toast.error(error.error || '로고 업로드에 실패했습니다');
        setLogoPreview(profileData?.clinic?.logoUrl || null);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('로고 업로드 중 오류가 발생했습니다');
      setLogoPreview(profileData?.clinic?.logoUrl || null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processLogoFile(file);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
                KOCO
              </Link>
              <span className="ml-4 text-lg text-gray-600">내 프로필</span>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>대시보드로 돌아가기</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* 프로필 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12">
            <div className="flex items-center space-x-6">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center text-blue-600 text-3xl font-bold">
                  {(profileData?.user?.username || session?.user?.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="text-white">
                <h1 className="text-3xl font-bold">
                  {profileData?.user?.username || '사용자'}
                </h1>
                <p className="text-blue-100 mt-1">{profileData?.user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                  {profileData?.user?.role === 'admin' ? '관리자' :
                   profileData?.user?.role === 'doctor' ? '의사' : '스태프'}
                </span>
              </div>
            </div>
          </div>

          {/* 사용자 정보 */}
          <div className="px-8 py-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">계정 정보</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  수정
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* 이름 */}
              <div className="py-3 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-500">이름</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 mt-1">{profileData?.user?.username || '-'}</p>
                )}
              </div>

              {/* 이메일 */}
              <div className="py-3 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-500">이메일</label>
                <p className="text-gray-900 mt-1">{profileData?.user?.email}</p>
              </div>

              {/* 역할 */}
              <div className="py-3">
                <label className="block text-sm font-medium text-gray-500">역할</label>
                <p className="text-gray-900 mt-1">
                  {profileData?.user?.role === 'admin' ? '관리자' :
                   profileData?.user?.role === 'doctor' ? '의사' : '스태프'}
                </p>
              </div>
            </div>
          </div>

          {/* 클리닉 정보 */}
          {profileData?.clinic && (
            <div className="px-8 py-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">클리닉 정보</h2>

              <div className="space-y-4">
                {/* 클리닉 로고 */}
                <div className="py-3 border-b border-gray-100">
                  <label className="block text-sm font-medium text-gray-500 mb-2">클리닉 로고</label>
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50 scale-105'
                          : 'border-gray-300 bg-gray-50 hover:border-blue-500'
                      }`}
                      onClick={() => logoInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {isUploadingLogo ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      ) : logoPreview ? (
                        // 새로 업로드한 이미지 (blob URL)
                        <img src={logoPreview} alt="Clinic Logo" className="w-full h-full object-contain" />
                      ) : profileData?.clinic?.logoUrl ? (
                        // 기존 S3 이미지 - S3Image 컴포넌트가 자동으로 presigned URL 변환
                        <S3Image
                          src={profileData.clinic.logoUrl}
                          alt="Clinic Logo"
                          className="w-full h-full object-contain"
                          showLoading={true}
                        />
                      ) : (
                        <div className="text-center p-2">
                          <svg className={`w-10 h-10 mx-auto ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className={`text-xs mt-1 block ${isDragging ? 'text-blue-500 font-medium' : 'text-gray-500'}`}>
                            {isDragging ? '여기에 놓으세요' : '클릭 또는 드래그'}
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="text-sm text-gray-500">
                      <p>권장 크기: 200x200px</p>
                      <p>최대 파일 크기: 2MB</p>
                      <p>지원 형식: PNG, JPG, GIF</p>
                      <p className="text-blue-500 mt-1">드래그 앤 드롭 지원</p>
                    </div>
                  </div>
                </div>

                {/* 클리닉 이름 */}
                <div className="py-3 border-b border-gray-100">
                  <label className="block text-sm font-medium text-gray-500">클리닉 이름</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editClinicName}
                      onChange={(e) => setEditClinicName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 mt-1">{profileData.clinic.clinicName}</p>
                  )}
                </div>

                {/* 클리닉 코드 */}
                <div className="py-3 border-b border-gray-100">
                  <label className="block text-sm font-medium text-gray-500">클리닉 코드</label>
                  <p className="text-gray-900 mt-1">{profileData.clinic.clinicCode}</p>
                </div>

                {/* 주소 */}
                <div className="py-3 border-b border-gray-100">
                  <label className="block text-sm font-medium text-gray-500">주소</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="주소를 입력하세요"
                    />
                  ) : (
                    <p className="text-gray-900 mt-1">{profileData.clinic.address || '-'}</p>
                  )}
                </div>

                {/* 전화번호 */}
                <div className="py-3">
                  <label className="block text-sm font-medium text-gray-500">전화번호</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="전화번호를 입력하세요"
                    />
                  ) : (
                    <p className="text-gray-900 mt-1">{profileData.clinic.phone || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 수정 버튼 */}
          {isEditing && (
            <div className="px-8 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditUsername(profileData?.user?.username || '');
                  setEditClinicName(profileData?.clinic?.clinicName || '');
                  setEditAddress(profileData?.clinic?.address || '');
                  setEditPhone(profileData?.clinic?.phone || '');
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}

          {/* 계정 관리 */}
          <div className="px-8 py-6 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">계정 관리</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700">로그아웃</p>
                <p className="text-sm text-gray-500">현재 세션에서 로그아웃합니다.</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
