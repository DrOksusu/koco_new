import { NextRequest, NextResponse } from 'next/server';
import { performCompleteAnalysis } from '@/lib/calculations/diagnosisCalculations';
import { LandmarkCoordinates } from '@/lib/types/calculation.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { landmarks, options } = body;

    if (!landmarks || typeof landmarks !== 'object') {
      return NextResponse.json(
        { error: 'Invalid landmarks data' },
        { status: 400 }
      );
    }

    // 필수 랜드마크 검증
    const requiredLandmarks = [
      'Nasion', 'Sella', 'Porion', 'Orbitale',
      'A-Point', 'B-Point', 'Menton', 'Corpus Lt.'
    ];

    const missing = requiredLandmarks.filter(key => !landmarks[key]);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required landmarks',
          missing,
          message: `다음 랜드마크가 필요합니다: ${missing.join(', ')}`
        },
        { status: 400 }
      );
    }

    // 전체 분석 수행
    const result = performCompleteAnalysis(landmarks as LandmarkCoordinates);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Analysis failed',
          warnings: result.warnings
        },
        { status: 500 }
      );
    }

    // 결과 반환
    return NextResponse.json({
      success: true,
      data: {
        measurements: result.measurements,
        diagnosis: result.diagnosis,
        warnings: result.warnings
      },
      timestamp: new Date().toISOString(),
      landmarkCount: Object.keys(landmarks).length
    });

  } catch (error) {
    console.error('Batch calculation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Calculation failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}