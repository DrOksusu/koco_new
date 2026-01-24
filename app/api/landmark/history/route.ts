import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 세션에서 실제 사용자 ID 가져오기
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    // 세션에서 사용자 ID 가져오기
    const userId = BigInt(session.user.id);

    console.log('Fetching history for user:', userId.toString());

    // xrayAnalyses 테이블에서 해당 사용자의 데이터만 조회
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

      // 분석 타입 확인 (PSA_, PSO_, FRONTAL_ 접두사가 있는 랜드마크 확인)
      const landmarks = landmarksData || {};
      const isPSA = Object.keys(landmarks).some(key => key.startsWith('PSA_'));
      const isPSO = Object.keys(landmarks).some(key => key.startsWith('PSO_'));
      const isFrontal = Object.keys(landmarks).some(key => key.startsWith('FRONTAL_'));

      // 분석 타입 결정
      const analysisType = isPSA ? 'PSA' : isPSO ? 'PSO' : isFrontal ? 'FRONTAL' : 'LANDMARK';

      // 각도 데이터 변환
      const angles: Record<string, number> = {};
      let geometry: { guideZone?: number; bufferZone?: number } | undefined;

      if ((isPSA || isPSO) && anglesData) {
        // PSA/PSO 분석의 경우 geometry 객체 생성
        geometry = {};
        const prefix = isPSA ? 'PSA_' : 'PSO_';
        Object.entries(anglesData).forEach(([angleName, angleValue]) => {
          if (angleName === `${prefix}Guide_Zone_D1`) {
            geometry!.guideZone = Number(angleValue);
          } else if (angleName === `${prefix}Buffer_Zone_D2`) {
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
        type: analysisType,
        title: analysis.fileName || `Analysis ${analysis.analysisCode}`,
        description: `Patient: ${analysis.patientName}`,
        status: analysis.analysisStatus || 'COMPLETED',
        result: {
          landmarks,
          angles: angles, // 모든 분석 타입에 angles 포함
          geometry: (isPSA || isPSO) ? geometry : undefined, // PSA/PSO만 geometry 포함
          analysisCode: analysis.analysisCode,
          imageUrl: analysis.originalImageUrl || '', // 원본 이미지
          originalImageUrl: analysis.originalImageUrl || '', // 원본 이미지 URL
          landmarkImageUrl: analysis.landmarkImageUrl || '', // Landmark 전용 이미지
          psaImageUrl: analysis.psaImageUrl || '', // PSA 전용 이미지
          psoImageUrl: analysis.psoImageUrl || '', // PSO 전용 이미지
          frontalImageUrl: analysis.frontalImageUrl || '', // Frontal 전용 이미지
          fileName: analysis.fileName,
          patientName: analysis.patientName,
          patientBirthDate: analysis.patientBirthDate,
          diagnosisDate: analysis.diagnosisDate,
          type: analysisType // result 내에도 type 추가
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