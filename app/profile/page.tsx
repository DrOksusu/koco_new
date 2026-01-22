'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [status, router, session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: API 호출로 이름 변경 구현
    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
      alert('프로필 저장 기능은 준비 중입니다.');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                  {(session?.user?.name || session?.user?.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="text-white">
                <h1 className="text-3xl font-bold">
                  {session?.user?.name || '사용자'}
                </h1>
                <p className="text-blue-100 mt-1">{session?.user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                  {session?.user?.role === 'admin' ? '관리자' :
                   session?.user?.role === 'doctor' ? '의사' : '스태프'}
                </span>
              </div>
            </div>
          </div>

          {/* 프로필 정보 */}
          <div className="px-8 py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">계정 정보</h2>

            <div className="space-y-4">
              {/* 이름 */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-500">이름</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{session?.user?.name || '-'}</p>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    수정
                  </button>
                )}
              </div>

              {/* 이메일 */}
              <div className="py-3 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-500">이메일</label>
                <p className="text-gray-900">{session?.user?.email}</p>
              </div>

              {/* 역할 */}
              <div className="py-3 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-500">역할</label>
                <p className="text-gray-900">
                  {session?.user?.role === 'admin' ? '관리자' :
                   session?.user?.role === 'doctor' ? '의사' : '스태프'}
                </p>
              </div>

              {/* 로그인 방식 */}
              <div className="py-3">
                <label className="block text-sm font-medium text-gray-500">로그인 방식</label>
                <div className="flex items-center mt-1">
                  {session?.user?.image?.includes('google') ? (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-gray-900">Google 계정</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-900">이메일 계정</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 수정 버튼 */}
            {isEditing && (
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(session?.user?.name || '');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            )}
          </div>

          {/* 위험 영역 */}
          <div className="px-8 py-6 bg-gray-50 border-t">
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
