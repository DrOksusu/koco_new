import { useEffect } from 'react';
import { useMeasurementStore } from '@/store/measurementStore';
import { performCompleteAnalysis } from '@/lib/calculations/diagnosisCalculations';
import toast from 'react-hot-toast';

// Hook to bridge landmark data with measurement dashboard
export function useLandmarkData() {
  const { updateMeasurements, updateDiagnosis } = useMeasurementStore();

  const sendMeasurementData = async (landmarks: Record<string, { x: number; y: number }>) => {
    console.log('Sending measurement data with landmarks:', Object.keys(landmarks).length);

    try {
      // API를 통해 계산 수행
      const response = await fetch('/api/calculation/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarks })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Calculation API response:', result);

        if (result.success && result.data) {
          const { measurements, diagnosis } = result.data;

          // Store 업데이트
          updateMeasurements(measurements);
          updateDiagnosis(diagnosis);

          console.log('Updated measurements:', measurements);
          console.log('Updated diagnosis:', diagnosis);

          // localStorage에도 저장
          localStorage.setItem('landmarkAnalysisData', JSON.stringify({
            measurements,
            diagnosis,
            timestamp: new Date().toISOString()
          }));

          // 성공 메시지
          if (result.warnings && result.warnings.length > 0) {
            console.warn('Analysis warnings:', result.warnings);
          }

          return { success: true, measurements, diagnosis };
        }
      } else {
        // API 에러 처리
        const error = await response.json();
        console.error('API error:', error);

        // 로컬 계산으로 폴백
        const localResult = performCompleteAnalysis(landmarks);
        if (localResult.success) {
          updateMeasurements(localResult.measurements);
          updateDiagnosis(localResult.diagnosis);

          localStorage.setItem('landmarkAnalysisData', JSON.stringify({
            measurements: localResult.measurements,
            diagnosis: localResult.diagnosis,
            timestamp: new Date().toISOString()
          }));

          console.log('Fallback to local calculation successful');
          return { success: true, measurements: localResult.measurements, diagnosis: localResult.diagnosis };
        }
      }
    } catch (error) {
      console.error('Calculation error:', error);

      // 네트워크 에러 시 로컬 계산
      const localResult = performCompleteAnalysis(landmarks);
      if (localResult.success) {
        updateMeasurements(localResult.measurements);
        updateDiagnosis(localResult.diagnosis);

        localStorage.setItem('landmarkAnalysisData', JSON.stringify({
          measurements: localResult.measurements,
          diagnosis: localResult.diagnosis,
          timestamp: new Date().toISOString()
        }));

        console.log('Local calculation used due to network error');
        return { success: true, measurements: localResult.measurements, diagnosis: localResult.diagnosis };
      }
    }

    // Send message to measurement page if it's open
    window.postMessage({
      type: 'LANDMARK_DATA',
      measurements: {},
      diagnosis: {}
    }, '*');

    return { success: false };
  };

  return { sendMeasurementData };
}