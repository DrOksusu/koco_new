'use client';

import { useEffect } from 'react';
import MeasurementTable from '@/components/tables/MeasurementTable';
import DiagnosisTable from '@/components/tables/DiagnosisTable';
import ExportButton from '@/components/ui/ExportButton';
import { useMeasurementStore } from '@/store/measurementStore';
import { CATEGORIES } from '@/lib/constants/measurements';
import toast, { Toaster } from 'react-hot-toast';

export default function MeasurementPage() {
  const {
    measurements,
    diagnosis,
    patientId,
    timestamp,
    updateMeasurements,
    updateDiagnosis
  } = useMeasurementStore();

  // Listen for landmark data from other pages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LANDMARK_DATA') {
        const { measurements: newMeasurements, diagnosis: newDiagnosis } = event.data;
        if (newMeasurements) {
          updateMeasurements(newMeasurements);
          toast.success('계측값이 업데이트되었습니다!');
        }
        if (newDiagnosis) {
          updateDiagnosis(newDiagnosis);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [updateMeasurements, updateDiagnosis]);

  // Simulate receiving data from landmark analysis
  useEffect(() => {
    const savedData = localStorage.getItem('landmarkAnalysisData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData.measurements) {
          updateMeasurements(parsedData.measurements);
        }
        if (parsedData.diagnosis) {
          updateDiagnosis(parsedData.diagnosis);
        }
        toast.success('저장된 분석 데이터를 불러왔습니다');
        localStorage.removeItem('landmarkAnalysisData');
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, [updateMeasurements, updateDiagnosis]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                계측값 분석 대시보드
              </h1>
              <p className="text-gray-600">
                X-ray 랜드마크 분석 결과를 실시간으로 확인하고 관리합니다
              </p>
              {timestamp && (
                <p className="text-sm text-gray-500 mt-2">
                  마지막 업데이트: {new Date(timestamp).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
            <ExportButton
              measurements={measurements}
              diagnosis={diagnosis}
              patientInfo={{
                id: patientId || undefined,
                date: timestamp || undefined
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div id="measurement-dashboard" className="space-y-8">
          {/* Measurement Table Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                계측값 테이블
              </h2>
              <p className="text-gray-600 text-sm">
                34개 계측 항목의 측정값을 평균값과 비교하여 표시합니다
              </p>
            </div>
            <MeasurementTable />
          </div>

          {/* Diagnosis Table Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                진단 지표
              </h2>
              <p className="text-gray-600 text-sm">
                10개 진단 지표의 계산 결과를 표시합니다
              </p>
            </div>
            <DiagnosisTable />
          </div>

          {/* Legend Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">범례</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(CATEGORIES).map(([key, category]) => (
                <div key={key} className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded ${category.bgColor} border-2 border-gray-300`}
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="총 계측항목"
              value={Object.keys(measurements).length}
              total={34}
              color="blue"
            />
            <StatCard
              title="진단지표"
              value={Object.keys(diagnosis).length}
              total={10}
              color="green"
            />
            <StatCard
              title="정상 범위"
              value={calculateNormalCount(measurements)}
              total={34}
              color="emerald"
            />
            <StatCard
              title="주의 필요"
              value={calculateWarningCount(measurements)}
              total={34}
              color="orange"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">사용 방법</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 계측값 셀을 클릭하여 직접 입력할 수 있습니다</li>
            <li>• 랜드마크 분석 페이지에서 데이터가 자동으로 연동됩니다</li>
            <li>• 내보내기 버튼으로 Excel, PDF, CSV 형식으로 저장할 수 있습니다</li>
            <li>• 평균값과의 차이가 클수록 색상이 진하게 표시됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Statistics Card Component
function StatCard({
  title,
  value,
  total,
  color
}: {
  title: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200'
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
      </div>
      <div className="text-2xl font-bold">
        {value}/{total}
      </div>
      <div className="mt-2 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-green-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-orange-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Helper functions
function calculateNormalCount(measurements: Record<string, number>): number {
  // This would check against normal ranges
  return Object.keys(measurements).filter(key => measurements[key]).length;
}

function calculateWarningCount(measurements: Record<string, number>): number {
  // This would check for values outside normal range
  return 0; // Placeholder
}