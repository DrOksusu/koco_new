'use client';

import { useEffect } from 'react';
import MeasurementTable from '@/components/tables/MeasurementTable';
import DiagnosisTable from '@/components/tables/DiagnosisTable';
import { useMeasurementStore } from '@/store/measurementStore';
import { CATEGORIES } from '@/lib/constants/measurements';
import toast, { Toaster } from 'react-hot-toast';

interface MeasurementDashboardProps {
  initialData?: any;
}

export default function MeasurementDashboard({ initialData }: MeasurementDashboardProps) {
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

  return (
    <div className="h-full overflow-auto bg-white">
      <Toaster position="top-right" />

      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            계측값 분석
          </h2>
          {timestamp && (
            <p className="text-xs text-gray-500">
              업데이트: {new Date(timestamp).toLocaleString('ko-KR')}
            </p>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Measurement Table Section */}
          <div className="border rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              계측값 테이블
            </h3>
            <div className="text-xs text-gray-600 mb-3">
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
          <div className="border rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              진단 지표
            </h3>
            <div className="text-xs text-gray-600 mb-3">
              {diagnosis && Object.keys(diagnosis).length > 0
                ? '진단 지표가 계산되었습니다'
                : '계측값 분석 후 진단 지표가 표시됩니다'}
            </div>
            {console.log('🔍 About to render DiagnosisTable')}
            <DiagnosisTable />
          </div>
        </div>
      </div>
    </div>
  );
}