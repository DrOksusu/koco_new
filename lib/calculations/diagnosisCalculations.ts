import { LandmarkCoordinates, DiagnosisResult, MeasurementResult } from '@/lib/types/calculation.types';
import { calculateAllAngles, calculateIntersectionAngle } from './angleCalculations';
import { calculateAllDistances } from './distanceCalculations';
import { addCalculatedLandmarks } from './intersectionCalculations';

/**
 * 진단 지표 계산
 */
export function calculateDiagnosisIndicators(
  landmarks: LandmarkCoordinates
): DiagnosisResult {
  // Go, Gn 등 계산된 랜드마크 추가
  const extendedLandmarks = addCalculatedLandmarks(landmarks);

  // 모든 각도와 거리 계산
  const angles = calculateAllAngles(extendedLandmarks);
  const distances = calculateAllDistances(extendedLandmarks);

  // 측정값 병합
  const measurements: MeasurementResult = {
    ...angles,
    ...distances
  };

  // 진단 지표 계산
  const indicators = calculateIndicators(measurements, extendedLandmarks);

  // 경고 메시지 생성
  const warnings = validateMeasurements(measurements);

  return {
    measurements,
    indicators,
    warnings
  };
}

/**
 * 복합 진단 지표 계산
 */
function calculateIndicators(
  measurements: MeasurementResult,
  landmarks: LandmarkCoordinates
): DiagnosisResult['indicators'] {
  // HGI (Horizontal Growth Index)
  let HGI = 0;
  if (measurements.MBL && measurements.ACBL) {
    const MB_ACBL = measurements.MBL - measurements.ACBL;
    HGI = round(0.2 * (MB_ACBL * 2));
  }

  // VGI (Vertical Growth Index)
  let VGI = 0;
  if (measurements.FHR) {
    VGI = round(0.2 * ((measurements.FHR - 60) * 2));
  }

  // APDI (Anteroposterior Dysplasia Indicator)
  let APDI = 81;
  if (measurements.ANB && measurements.FMA && measurements['SN to GoGn']) {
    const FABA = measurements.ANB + 5; // Simplified calculation
    const PPA = measurements.FMA - 25; // Simplified calculation
    APDI = round(FABA + PPA);
  }

  // ODI (Overbite Depth Indicator)
  let ODI = 75;
  if (measurements.FMA && measurements.IMPA) {
    const MAB = 90 - measurements.IMPA; // Simplified
    const PPA = measurements.FMA - 25;
    ODI = round(MAB + PPA);
  }

  // IAPDI (Improved APDI)
  let IAPDI = 81;
  if (APDI >= 81 && measurements.FMA) {
    if (measurements.FMA < 27.5) {
      IAPDI = round(95 - 0.5 * measurements.FMA);
    } else {
      IAPDI = 81;
    }
  } else if (measurements.FMA && measurements.ANB) {
    const a = (3.5 / 4.4) * Math.cos((measurements.ANB * Math.PI) / 180);
    IAPDI = round(81 - a * (measurements.FMA - 27.5));
  }

  // IODI (Improved ODI)
  let IODI = 70;
  if (measurements.FMA && measurements.ANB) {
    IODI = round(
      80 - 0.3 * measurements.FMA -
      (0.776 - 0.008 * measurements.FMA) * (measurements.ANB - 2)
    );
  }

  // APDL (Anteroposterior Dental Limit)
  const APDL = round(0.8 * (APDI - IAPDI));

  // 2APDL
  const twoAPDL = round(2 * APDL);

  // VDL (Vertical Dental Limit)
  const VDL = round(0.4849 * (ODI - IODI));

  // CFD (Chin-Face Depth)
  const CFD = round(ODI + APDI - IAPDI - IODI);

  // EI (Extraction Index)
  let EI = 30;
  if (measurements.Interincisal && measurements['E-line Upper'] && measurements['E-line Lower']) {
    EI = round(
      ODI + APDI +
      (measurements.Interincisal - 125) / 5 -
      (measurements['E-line Upper'] + measurements['E-line Lower'])
    );
  }

  return {
    HGI,
    VGI,
    APDI,
    ODI,
    IAPDI,
    IODI,
    '2APDL': twoAPDL,
    VDL,
    CFD,
    EI
  };
}

/**
 * 측정값 검증 및 경고 생성
 */
function validateMeasurements(measurements: MeasurementResult): string[] {
  const warnings: string[] = [];
  const normalRanges: Record<string, [number, number]> = {
    SNA: [79, 83],
    SNB: [77, 81],
    ANB: [0, 4],
    FMA: [22, 32],
    IMPA: [85, 97],
    FMIA: [57, 68],
    'SN to GoGn': [27, 37],
    'U1 to SN': [100, 110],
    'L1 to NB': [4, 6],
    Interincisal: [125, 135],
    'E-line Upper': [-4, 0],
    'E-line Lower': [-2, 2]
  };

  for (const [key, range] of Object.entries(normalRanges)) {
    const value = measurements[key];
    if (value !== undefined) {
      if (value < range[0] || value > range[1]) {
        const status = Math.abs(value - (range[0] + range[1]) / 2) > 10 ? '⚠️' : '⚡';
        warnings.push(`${status} ${key}: ${value}° (정상: ${range[0]}-${range[1]}°)`);
      }
    }
  }

  return warnings;
}

/**
 * 반올림 헬퍼
 */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * 전체 분석 수행
 */
export function performCompleteAnalysis(
  landmarks: LandmarkCoordinates
): {
  measurements: MeasurementResult;
  diagnosis: DiagnosisResult['indicators'];
  warnings: string[];
  success: boolean;
} {
  try {
    const result = calculateDiagnosisIndicators(landmarks);

    return {
      measurements: result.measurements,
      diagnosis: result.indicators,
      warnings: result.warnings,
      success: true
    };
  } catch (error) {
    console.error('Analysis failed:', error);
    return {
      measurements: {},
      diagnosis: {
        HGI: 0,
        VGI: 0,
        APDI: 0,
        ODI: 0,
        IAPDI: 0,
        IODI: 0,
        APDL: 0,
        VDL: 0,
        CFD: 0,
        EI: 0
      },
      warnings: [`분석 실패: ${error instanceof Error ? error.message : 'Unknown error'}`],
      success: false
    };
  }
}