/**
 * PowerPoint 생성 서비스
 * https://koco.me/dash_board API 연동
 */

import { urlToFile, downloadBlob, generateFileName } from '@/lib/utils/fileUtils';

export interface PowerPointData {
  // 이미지 URL들
  lateralCephUrl: string | null;          // 원본 lateral ceph 이미지
  psaResultUrl: string | null;            // PSA 분석 결과
  psoResultUrl: string | null;            // PSO 분석 결과
  landmarkResultUrl?: string | null;      // Landmark 분석 결과 (선택)

  // 환자 정보
  patientName: string;
  patientBirthDate: string;

  // 계측 데이터
  measurements: Record<string, number>;   // 계측값
  diagnosis?: Record<string, any>;        // 진단 데이터 (선택)

  // 분석 정보
  analysisCode?: string;

  // 파일 형식
  fileType: 'pptx' | 'pdf';
}

export interface PowerPointGenerationResult {
  success: boolean;
  filename?: string;
  error?: string;
}

/**
 * PowerPoint 생성 API 호출
 */
export async function generatePowerPoint(
  data: PowerPointData,
  onProgress?: (message: string) => void
): Promise<PowerPointGenerationResult> {
  try {
    // 1. 유효성 검사
    if (!data.lateralCephUrl && !data.psaResultUrl && !data.psoResultUrl) {
      return {
        success: false,
        error: '생성할 이미지가 없습니다. 최소 1개 이상의 분석 결과가 필요합니다.'
      };
    }

    onProgress?.('이미지를 준비하는 중...');

    // 2. S3 URL을 File 객체로 변환
    console.log('=== Starting image conversion ===');

    const imageConversions: Array<{
      url: string | null;
      filename: string;
      formKey: string;
      label: string;
    }> = [
      {
        url: data.lateralCephUrl,
        filename: 'lateral_ceph.jpg',
        formKey: 'lateral_ceph',
        label: 'Lateral Ceph'
      },
      {
        url: data.psaResultUrl,
        filename: 'psa_result.jpg',
        formKey: 'psa',
        label: 'PSA Result'
      },
      {
        url: data.psoResultUrl,
        filename: 'pso_result.jpg',
        formKey: 'pso',
        label: 'PSO Result'
      }
    ];

    // Landmark 결과가 있으면 추가 (frontal_ceph 자리에 넣기)
    if (data.landmarkResultUrl) {
      imageConversions.push({
        url: data.landmarkResultUrl,
        filename: 'landmark_result.jpg',
        formKey: 'frontal_ceph',  // 사용 가능한 슬롯 활용
        label: 'Landmark Result'
      });
    }

    const convertedFiles: Array<{ file: File; formKey: string; label: string }> = [];

    for (const item of imageConversions) {
      if (!item.url) {
        console.log(`⏭️ Skipping ${item.label}: URL is null`);
        continue;
      }

      const file = await urlToFile(item.url, item.filename);

      if (file) {
        convertedFiles.push({
          file,
          formKey: item.formKey,
          label: item.label
        });
        console.log(`✅ Converted ${item.label}`);
      } else {
        console.warn(`⚠️ Failed to convert ${item.label}`);
      }
    }

    if (convertedFiles.length === 0) {
      return {
        success: false,
        error: '이미지 변환에 실패했습니다. 네트워크 연결을 확인해주세요.'
      };
    }

    console.log(`✅ Successfully converted ${convertedFiles.length} images`);

    onProgress?.('PowerPoint 파일을 생성하는 중...');

    // 3. FormData 구성
    const formData = new FormData();

    // ===== 그룹 1: 메인 이미지 =====
    // 우리가 가진 이미지들을 적절한 필드에 할당
    convertedFiles.forEach(({ file, formKey }) => {
      formData.append(formKey, file);
      console.log(`📎 Appended ${formKey}: ${file.name}`);
    });

    // ===== 그룹 2-4: 구외사진, 구내사진, 자세사진 =====
    // 현재는 없으므로 빈 Blob으로 채우기 (서버가 필수로 요구하는 경우)
    // 또는 생략 가능 (서버 요구사항에 따라)

    // ===== 추가 데이터 (평탄화) =====
    // 모든 분석 데이터를 최상위로 올려서 백엔드가 바로 접근 가능하도록

    // 백엔드가 기대하는 모든 필드 (누락된 필드는 0으로 채우기)
    const requiredFields = {
      // 계산된 값들 (기본값 0)
      IAPDI: 0,
      HGI: 0,
      VGI: 0,
      IODI: 0,
      VDL: 0,
      CFD: 0,
      APDI: 0,
      ODI: 0,

      // 추가 계측값 (기본값 0)
      MBL: 0,
      ACBL: 0,
      PCBA: 0,
      FHR: 0,
      ACBA: 0,
      'AB<LOP': 0,
    };

    const totalData = {
      // 1. 필수 필드 기본값
      ...requiredFields,

      // 2. 기본 계측값 (위의 기본값을 덮어씀)
      ...(data.measurements || {}),

      // 3. 진단 데이터 (있다면)
      ...(data.diagnosis || {}),

      // 4. 환자 정보
      name: data.patientName || '미입력',
      birthDate: data.patientBirthDate || '미입력',

      // 5. 분석 정보
      analysisCode: data.analysisCode || 'N/A',
      analysisDate: new Date().toISOString(),
    };

    formData.append('totalData', JSON.stringify(totalData));
    formData.append('file_type', data.fileType);

    console.log('=== FormData prepared ===');
    console.log('- File type:', data.fileType);
    console.log('- Patient:', data.patientName);
    console.log('- Images:', convertedFiles.length);
    console.log('- Measurements:', Object.keys(data.measurements).length);

    // 4. API 호출 (프록시 경유)
    console.log('Calling PowerPoint generation API via proxy...');

    const response = await fetch('/api/generate-ppt', {
      method: 'POST',
      body: formData,
      // Note: multipart/form-data는 자동으로 설정되므로 Content-Type 헤더 생략
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      // 에러 응답 처리
      let errorMessage = `서버 오류 (${response.status})`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }

      console.error('API Error:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }

    onProgress?.('파일 다운로드 준비 중...');

    // 5. 응답 처리 - 파일 다운로드
    const blob = await response.blob();

    console.log('Received blob:', {
      size: blob.size,
      type: blob.type
    });

    // 파일명 생성
    const filename = generateFileName(
      data.patientName,
      data.analysisCode || 'analysis',
      data.fileType
    );

    // 파일 다운로드
    downloadBlob(blob, filename);

    console.log('✅ PowerPoint generation completed successfully');

    return {
      success: true,
      filename
    };

  } catch (error) {
    console.error('PowerPoint generation error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    };
  }
}

/**
 * PowerPoint 생성 가능 여부 확인
 */
export function canGeneratePowerPoint(data: Partial<PowerPointData>): {
  canGenerate: boolean;
  reason?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // 이미지는 필수
  if (!data.lateralCephUrl && !data.psaResultUrl && !data.psoResultUrl) {
    return {
      canGenerate: false,
      reason: '생성할 분석 결과가 없습니다. 최소 1개 이상의 이미지가 필요합니다.'
    };
  }

  // 환자 정보는 선택사항 (경고만 표시)
  if (!data.patientName || !data.patientBirthDate) {
    warnings.push('환자 정보가 입력되지 않았습니다.');
  }

  // 계측값도 선택사항 (경고만 표시)
  if (!data.measurements || Object.keys(data.measurements).length === 0) {
    warnings.push('계측값 데이터가 없습니다.');
  }

  return {
    canGenerate: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}
