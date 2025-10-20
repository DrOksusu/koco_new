import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 새로운 스키마를 사용하여 분석 이력 조회
    // TODO: 실제 사용자 ID를 세션에서 가져오기
    const userId = BigInt(1); // 임시로 고정값 사용

    // xrayAnalyses 테이블에서 데이터 조회 (JSON 필드 포함)
    const analyses = await prisma.xrayAnalysis.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 기존 format에 맞게 변환
    const diagnoses = analyses.map(analysis => {
      if (!analysis) return null;

      // JSON 데이터에서 landmarks와 angles 가져오기
      const landmarksData = analysis.landmarksData as Record<string, { x: number; y: number }> | null;
      const anglesData = analysis.anglesData as Record<string, number> | null;

      // PSA 분석인지 확인 (PSA_ 접두사가 있는 랜드마크 확인)
      const landmarks = landmarksData || {};
      const isPSA = Object.keys(landmarks).some(key => key.startsWith('PSA_'));

      // 각도 데이터 변환
      const angles: Record<string, number> = {};
      let geometry: { guideZone?: number; bufferZone?: number } | undefined;

      if (isPSA && anglesData) {
        // PSA 분석의 경우 geometry 객체 생성
        geometry = {};
        Object.entries(anglesData).forEach(([angleName, angleValue]) => {
          if (angleName === 'PSA_Guide_Zone_D1') {
            geometry!.guideZone = Number(angleValue);
          } else if (angleName === 'PSA_Buffer_Zone_D2') {
            geometry!.bufferZone = Number(angleValue);
          } else {
            angles[angleName] = Number(angleValue);
          }
        });
      } else if (anglesData) {
        // 일반 랜드마크 분석의 경우
        Object.entries(anglesData).forEach(([angleName, angleValue]) => {
          angles[angleName] = Number(angleValue);
        });
      }

      return {
        id: analysis.id.toString(),
        type: isPSA ? 'PSA' : 'LANDMARK',
        title: analysis.fileName || `Analysis ${analysis.analysisCode}`,
        description: `Patient: ${analysis.patientName}`,
        status: analysis.analysisStatus || 'COMPLETED',
        result: {
          landmarks,
          angles: isPSA ? undefined : angles, // PSA는 angles 대신 geometry 사용
          geometry: isPSA ? geometry : undefined, // PSA만 geometry 포함
          analysisCode: analysis.analysisCode,
          imageUrl: analysis.originalImageUrl || analysis.annotatedImageUrl || '', // 원본 이미지 우선
          originalImageUrl: analysis.originalImageUrl || '', // 원본 이미지 URL
          annotatedImageUrl: analysis.annotatedImageUrl || '', // 랜드마크 이미지 URL
          fileName: analysis.fileName,
          patientName: analysis.patientName,
          patientBirthDate: analysis.patientBirthDate,
          type: isPSA ? 'PSA' : 'LANDMARK' // result 내에도 type 추가
        },
        createdAt: analysis.createdAt?.toISOString() || new Date().toISOString()
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      diagnoses
    });
  } catch (error) {
    console.error('Error fetching history:', error);

    // Prisma 에러 처리
    if (error instanceof Error && error.message.includes('Unknown table')) {
      // 테이블이 없는 경우 빈 배열 반환
      return NextResponse.json({
        success: true,
        diagnoses: [],
        message: 'Database tables not initialized'
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch history', details: error },
      { status: 500 }
    );
  }
}