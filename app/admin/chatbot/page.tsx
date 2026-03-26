'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { apiUrl } from '@/lib/api-client';

interface ChatMedia {
  id: string;
  title: string;
  description?: string;
  mediaType: 'image' | 'video' | 'file';
  url: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

interface ChatRule {
  id: string;
  keywords: string;
  response: string;
  category?: string;
  priority: number;
  isActive: boolean;
  media?: { id: string; title: string; mediaType: string } | null;
  createdAt: string;
}

export default function ChatbotAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rules' | 'media'>('rules');

  // 룰 관련 상태
  const [rules, setRules] = useState<ChatRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [editingRule, setEditingRule] = useState<ChatRule | null>(null);
  const [newRule, setNewRule] = useState({
    keywords: '',
    response: '',
    category: '',
    priority: 0,
    mediaId: '',
    isActive: true
  });

  // 미디어 관련 상태
  const [mediaList, setMediaList] = useState<ChatMedia[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [newMedia, setNewMedia] = useState({
    title: '',
    description: '',
    mediaType: 'image' as 'image' | 'video' | 'file',
    file: null as File | null
  });

  // 로그인 체크
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // 룰 목록 로드
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch(apiUrl('/api/chat/rules'));
        if (response.ok) {
          const data = await response.json();
          setRules(data.rules);
        }
      } catch (error) {
        console.error('Failed to fetch rules:', error);
      } finally {
        setIsLoadingRules(false);
      }
    };

    fetchRules();
  }, []);

  // 미디어 목록 로드
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await fetch(apiUrl('/api/chat/media'));
        if (response.ok) {
          const data = await response.json();
          setMediaList(data.media);
        }
      } catch (error) {
        console.error('Failed to fetch media:', error);
      } finally {
        setIsLoadingMedia(false);
      }
    };

    fetchMedia();
  }, []);

  // 룰 생성
  const handleCreateRule = async () => {
    if (!newRule.keywords || !newRule.response) {
      toast.error('키워드와 응답을 입력해주세요');
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/chat/rules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });

      if (response.ok) {
        const data = await response.json();
        setRules([data.rule, ...rules]);
        setNewRule({
          keywords: '',
          response: '',
          category: '',
          priority: 0,
          mediaId: '',
          isActive: true
        });
        toast.success('룰이 생성되었습니다');
      } else {
        toast.error('룰 생성 실패');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다');
    }
  };

  // 룰 삭제
  const handleDeleteRule = async (id: string) => {
    if (!confirm('이 룰을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(apiUrl(`/api/chat/rules?id=${id}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        setRules(rules.filter(r => r.id !== id));
        toast.success('룰이 삭제되었습니다');
      } else {
        toast.error('삭제 실패');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다');
    }
  };

  // 룰 활성화/비활성화 토글
  const handleToggleRule = async (rule: ChatRule) => {
    try {
      const response = await fetch(apiUrl('/api/chat/rules'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          isActive: !rule.isActive
        })
      });

      if (response.ok) {
        setRules(rules.map(r =>
          r.id === rule.id ? { ...r, isActive: !r.isActive } : r
        ));
      }
    } catch (error) {
      toast.error('오류가 발생했습니다');
    }
  };

  // 미디어 업로드
  const handleUploadMedia = async () => {
    if (!newMedia.title || !newMedia.file) {
      toast.error('제목과 파일을 입력해주세요');
      return;
    }

    setUploadingMedia(true);

    try {
      const formData = new FormData();
      formData.append('file', newMedia.file);
      formData.append('title', newMedia.title);
      formData.append('description', newMedia.description);
      formData.append('mediaType', newMedia.mediaType);

      const response = await fetch(apiUrl('/api/chat/media'), {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMediaList([data.media, ...mediaList]);
        setNewMedia({
          title: '',
          description: '',
          mediaType: 'image',
          file: null
        });
        toast.success('미디어가 업로드되었습니다');
      } else {
        const error = await response.json();
        toast.error(error.error || '업로드 실패');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다');
    } finally {
      setUploadingMedia(false);
    }
  };

  // 미디어 삭제
  const handleDeleteMedia = async (id: string) => {
    if (!confirm('이 미디어를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(apiUrl(`/api/chat/media?id=${id}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        setMediaList(mediaList.filter(m => m.id !== id));
        toast.success('미디어가 삭제되었습니다');
      } else {
        const error = await response.json();
        toast.error(error.error || '삭제 실패');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />

      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              ← 대시보드로
            </Link>
            <h1 className="text-xl font-bold text-gray-800">챗봇 관리</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'rules'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            응답 룰 관리
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'media'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            미디어 관리
          </button>
        </div>

        {/* 룰 관리 탭 */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {/* 새 룰 추가 폼 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-gray-800 mb-4">새 응답 룰 추가</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    키워드 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={newRule.keywords}
                    onChange={(e) => setNewRule({ ...newRule, keywords: e.target.value })}
                    placeholder="PSA,PSA분석,프로필분석"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <input
                    type="text"
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    placeholder="분석방법, FAQ 등"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    응답 메시지
                  </label>
                  <textarea
                    value={newRule.response}
                    onChange={(e) => setNewRule({ ...newRule, response: e.target.value })}
                    placeholder="응답 내용을 입력하세요..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    첨부 미디어
                  </label>
                  <select
                    value={newRule.mediaId}
                    onChange={(e) => setNewRule({ ...newRule, mediaId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">미디어 없음</option>
                    {mediaList.map(media => (
                      <option key={media.id} value={media.id}>
                        [{media.mediaType}] {media.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    우선순위 (높을수록 먼저 매칭)
                  </label>
                  <input
                    type="number"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateRule}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                룰 추가
              </button>
            </div>

            {/* 룰 목록 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-bold text-gray-800">등록된 응답 룰 ({rules.length}개)</h2>
              </div>
              {isLoadingRules ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : rules.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  등록된 룰이 없습니다
                </div>
              ) : (
                <div className="divide-y">
                  {rules.map(rule => (
                    <div key={rule.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {rule.isActive ? '활성' : '비활성'}
                            </span>
                            {rule.category && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                {rule.category}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">우선순위: {rule.priority}</span>
                          </div>
                          <p className="font-medium text-gray-800 mb-1">
                            키워드: {rule.keywords}
                          </p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {rule.response.length > 200
                              ? rule.response.substring(0, 200) + '...'
                              : rule.response}
                          </p>
                          {rule.media && (
                            <p className="text-xs text-blue-600 mt-1">
                              📎 첨부: [{rule.media.mediaType}] {rule.media.title}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleToggleRule(rule)}
                            className={`px-3 py-1 rounded text-sm ${
                              rule.isActive
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {rule.isActive ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 미디어 관리 탭 */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            {/* 미디어 업로드 폼 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-gray-800 mb-4">미디어 업로드</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={newMedia.title}
                    onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    placeholder="PSA 분석 가이드"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    미디어 타입 *
                  </label>
                  <select
                    value={newMedia.mediaType}
                    onChange={(e) => setNewMedia({ ...newMedia, mediaType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="image">이미지</option>
                    <option value="video">동영상</option>
                    <option value="file">파일</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <input
                    type="text"
                    value={newMedia.description}
                    onChange={(e) => setNewMedia({ ...newMedia, description: e.target.value })}
                    placeholder="미디어에 대한 설명"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    파일 *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setNewMedia({ ...newMedia, file: e.target.files?.[0] || null })}
                    accept={
                      newMedia.mediaType === 'image' ? 'image/*' :
                      newMedia.mediaType === 'video' ? 'video/*' : '*'
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newMedia.mediaType === 'image' && '최대 10MB'}
                    {newMedia.mediaType === 'video' && '최대 100MB'}
                    {newMedia.mediaType === 'file' && '최대 50MB'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleUploadMedia}
                disabled={uploadingMedia}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {uploadingMedia ? '업로드 중...' : '업로드'}
              </button>
            </div>

            {/* 미디어 목록 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-bold text-gray-800">등록된 미디어 ({mediaList.length}개)</h2>
              </div>
              {isLoadingMedia ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : mediaList.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  등록된 미디어가 없습니다
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {mediaList.map(media => (
                    <div key={media.id} className="border rounded-lg overflow-hidden">
                      {/* 미디어 미리보기 */}
                      <div className="h-40 bg-gray-100 flex items-center justify-center">
                        {media.mediaType === 'image' ? (
                          <img
                            src={media.url}
                            alt={media.title}
                            className="w-full h-full object-cover"
                          />
                        ) : media.mediaType === 'video' ? (
                          <video
                            src={media.url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-gray-500 mt-1">{media.fileName}</p>
                          </div>
                        )}
                      </div>
                      {/* 미디어 정보 */}
                      <div className="p-3">
                        <p className="font-medium text-gray-800 truncate">{media.title}</p>
                        <p className="text-xs text-gray-500">
                          {media.mediaType} • {media.fileSize ? `${(media.fileSize / 1024).toFixed(1)}KB` : ''}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            열기
                          </a>
                          <button
                            onClick={() => handleDeleteMedia(media.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
