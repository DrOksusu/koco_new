'use client';

import { useEffect, useState } from 'react';
import { DiagnosisDefinition } from '@/types/diagnosisDefinition.types';
import toast, { Toaster } from 'react-hot-toast';

// basePath 처리 (production에서는 /new 추가)
const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

export default function DiagnosisAdminPage() {
  const [definitions, setDefinitions] = useState<DiagnosisDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DiagnosisDefinition>>({});

  // Fetch all definitions
  const fetchDefinitions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${basePath}/api/admin/diagnosis`);
      const data = await response.json();
      if (data.success) {
        setDefinitions(data.definitions);
        toast.success(`${data.count}개의 진단지표 정의를 불러왔습니다`);
      } else {
        toast.error('데이터 로드 실패');
      }
    } catch (error) {
      console.error('Error fetching definitions:', error);
      toast.error('데이터 로드 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefinitions();
  }, []);

  // Start editing
  const startEdit = (def: DiagnosisDefinition) => {
    setEditingId(def.id);
    setEditForm(def);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Save changes
  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const response = await fetch(`/api/admin/diagnosis/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('저장 완료!');
        await fetchDefinitions(); // Refresh list
        cancelEdit();
      } else {
        toast.error('저장 실패: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('저장 중 오류가 발생했습니다');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">진단지표 정의 관리</h2>
          <div className="text-sm text-gray-600">
            총 {definitions.length}개
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">한글명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">평균값</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">정상범위</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {definitions.map((def) => {
                const isEditing = editingId === def.id;

                return (
                  <tr key={def.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {def.name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.titleKo || ''}
                          onChange={(e) => setEditForm({ ...editForm, titleKo: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                        />
                      ) : (
                        def.titleKo || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.meanValue || ''}
                          onChange={(e) => setEditForm({ ...editForm, meanValue: parseFloat(e.target.value) || null })}
                          className="w-20 px-2 py-1 border rounded"
                        />
                      ) : (
                        `${def.meanValue || '-'}${def.unit}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <div className="flex space-x-1">
                          <input
                            type="number"
                            placeholder="최소"
                            value={editForm.normalRangeMin || ''}
                            onChange={(e) => setEditForm({ ...editForm, normalRangeMin: parseFloat(e.target.value) || null })}
                            className="w-16 px-2 py-1 border rounded"
                          />
                          <span>~</span>
                          <input
                            type="number"
                            placeholder="최대"
                            value={editForm.normalRangeMax || ''}
                            onChange={(e) => setEditForm({ ...editForm, normalRangeMax: parseFloat(e.target.value) || null })}
                            className="w-16 px-2 py-1 border rounded"
                          />
                        </div>
                      ) : (
                        def.normalRangeMin && def.normalRangeMax
                          ? `${def.normalRangeMin}~${def.normalRangeMax}${def.unit}`
                          : '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs">
                      {isEditing ? (
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                          rows={2}
                        />
                      ) : (
                        <div className="truncate" title={def.description || ''}>
                          {def.description || '-'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(def)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          편집
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>참고:</strong> 진단지표 정의를 수정하면 모든 사용자에게 즉시 반영됩니다.
            신중하게 수정해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
