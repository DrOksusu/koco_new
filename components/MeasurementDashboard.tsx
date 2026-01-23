'use client';

import { useEffect, useState } from 'react';
import MeasurementTable from '@/components/tables/MeasurementTable';
import DiagnosisTable from '@/components/tables/DiagnosisTable';
import { useMeasurementStore } from '@/store/measurementStore';
import { CATEGORIES } from '@/lib/constants/measurements';
import toast, { Toaster } from 'react-hot-toast';

interface MeasurementDashboardProps {
  initialData?: any;
}

export default function MeasurementDashboard({ initialData }: MeasurementDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    measurements,
    diagnosis,
    patientId,
    timestamp,
    updateMeasurements,
    updateDiagnosis
  } = useMeasurementStore();

  // Load initial data from history if provided
  useEffect(() => {
    if (initialData) {
      console.log('Loading initial data from history:', initialData);

      // measurements 우선, 없으면 angles 사용 (하위 호환성)
      const measurementsData = initialData.measurements || initialData.angles;

      if (measurementsData) {
        updateMeasurements(measurementsData);
        toast.success('분석 이력 데이터를 불러왔습니다!');
      }

      if (initialData.diagnosis) {
        updateDiagnosis(initialData.diagnosis);
        console.log('Diagnosis loaded:', Object.keys(initialData.diagnosis).length, 'indicators');
      }
    }
  }, [initialData, updateMeasurements, updateDiagnosis]);

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

  // 미리보기용 데이터 (3개씩)
  const previewMeasurements = Object.entries(measurements).slice(0, 3);
  const previewDiagnosis = diagnosis ? Object.entries(diagnosis).slice(0, 3) : [];

  return (
    <div className="bg-white">
      <Toaster position="top-right" />

      <div className="p-2">
        {/* Header - 클릭하여 펼치기/접기 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <h2 className="text-sm font-bold text-gray-900">계측값 분석</h2>
            <span className="text-xs text-gray-500">
              ({Object.keys(measurements).length}개, {diagnosis ? Object.keys(diagnosis).length : 0}개 진단)
            </span>

            {/* 접힌 상태일 때 인라인 미리보기 */}
            {!isExpanded && previewMeasurements.length > 0 && (
              <div className="flex items-center gap-1 ml-2 text-xs text-gray-600">
                <span className="text-gray-400">|</span>
                {previewMeasurements.map(([key, value], idx) => (
                  <span key={key}>
                    <span className="text-gray-500">{key}:</span>
                    <span className="font-medium text-gray-700">{typeof value === 'number' ? value.toFixed(1) : String(value)}</span>
                    {idx < previewMeasurements.length - 1 && <span className="text-gray-300 mx-1">·</span>}
                  </span>
                ))}
                {Object.keys(measurements).length > 3 && (
                  <span className="text-gray-400 ml-1">+{Object.keys(measurements).length - 3}</span>
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded">
            {isExpanded ? '접기' : '펼치기'}
          </span>
        </button>

        {/* 펼친 상태 - 전체 테이블 */}
        {isExpanded && (
          <div className="mt-2 flex gap-4">
            {/* Measurement Table Section */}
            <div className="flex-1 border rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                계측값 테이블
              </h3>
              <div className="text-xs text-gray-600 mb-2">
                {Object.keys(measurements).length > 0
                  ? `${Object.keys(measurements).length}개의 계측값이 분석되었습니다`
                  : '랜드마크 분석을 진행하면 계측값이 표시됩니다'}
              </div>
              <MeasurementTable
                measurements={measurements}
                categories={CATEGORIES}
              />
            </div>

            {/* Diagnosis Table Section */}
            <div className="flex-1 border rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                진단 지표
              </h3>
              <div className="text-xs text-gray-600 mb-2">
                {diagnosis && Object.keys(diagnosis).length > 0
                  ? '진단 지표가 계산되었습니다'
                  : '계측값 분석 후 진단 지표가 표시됩니다'}
              </div>
              <DiagnosisTable />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}