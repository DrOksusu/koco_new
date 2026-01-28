import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

/**
 * 빈 분석 레코드를 삭제합니다.
 * 조건: 환자 이름이 없고, 이미지가 없고, 분석 결과가 없는 경우에만 삭제
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { analysisId } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    const userId = BigInt(session.user.id);

    // 분석 레코드 조회
    const analysis = await prisma.xrayAnalysis.findFirst({
      where: {
        id: BigInt(analysisId),
        userId: userId,
      }
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // 삭제 조건 확인: 유의미한 데이터가 있는지 체크
    const hasPatientName = analysis.patientName && analysis.patientName !== 'Unknown Patient' && analysis.patientName.trim() !== '';
    const hasImages = analysis.originalImageUrl || analysis.landmarkImageUrl || analysis.psaImageUrl || analysis.psoImageUrl || analysis.frontalImageUrl;
    const hasAnalysisResults = analysis.landmarks || analysis.angles || analysis.diagnosis;
    const isCompleted = analysis.analysisStatus === 'completed';

    // 유의미한 데이터가 있으면 삭제하지 않음
    if (hasPatientName || hasImages || hasAnalysisResults || isCompleted) {
      console.log('⚠️ Analysis has meaningful data, not deleting:', {
        analysisId: analysisId,
        hasPatientName,
        hasImages,
        hasAnalysisResults,
        isCompleted
      });
      return NextResponse.json({
        success: false,
        message: 'Analysis has meaningful data, not deleted',
        reason: { hasPatientName, hasImages, hasAnalysisResults, isCompleted }
      });
    }

    // 빈 분석 레코드 삭제
    await prisma.xrayAnalysis.delete({
      where: { id: BigInt(analysisId) }
    });

    console.log('🗑️ Empty analysis deleted:', {
      analysisId: analysisId,
      chartNumber: analysis.chartNumber
    });

    return NextResponse.json({
      success: true,
      message: 'Empty analysis deleted',
      deletedChartNumber: analysis.chartNumber
    });

  } catch (error) {
    console.error('Error deleting analysis:', error);
    return NextResponse.json(
      { error: 'Failed to delete analysis', details: String(error) },
      { status: 500 }
    );
  }
}
