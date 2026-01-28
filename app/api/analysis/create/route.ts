import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { generateChartNumber } from '@/lib/chartNumber';

/**
 * 새 분석 레코드를 생성하고 차트번호를 할당합니다.
 * 파일 업로드 시점에 호출되어 미리 차트번호를 생성합니다.
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
    const { fileName, patientName, patientBirthDate, originalImageUrl } = body;

    const userId = BigInt(session.user.id);

    // 사용자의 clinicId 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clinicId: true }
    });

    if (!user?.clinicId) {
      return NextResponse.json(
        { error: 'User clinic not found' },
        { status: 400 }
      );
    }

    // 고유한 분석 코드 생성
    const analysisCode = `XRAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 차트번호 생성 (KOCO-0001, KOCO-0002, ...)
    const chartNumber = await generateChartNumber();
    console.log('📋 Generated chart number for new analysis:', chartNumber);

    // 새 분석 레코드 생성
    const analysis = await prisma.xrayAnalysis.create({
      data: {
        analysisCode,
        chartNumber,
        userId,
        clinicId: user.clinicId,
        patientName: patientName || 'Unknown Patient',
        patientBirthDate: (patientBirthDate && patientBirthDate.trim() !== '')
          ? new Date(patientBirthDate)
          : null,
        xrayType: 'lateral',
        fileName: fileName || 'Untitled',
        originalImageUrl: originalImageUrl || null, // 원본 이미지 URL 저장
        analysisStatus: 'in_progress', // 분석 진행 중
      }
    });

    console.log('✅ Created new analysis:', {
      analysisId: analysis.id.toString(),
      chartNumber: analysis.chartNumber,
      analysisCode: analysis.analysisCode
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
      chartNumber: analysis.chartNumber,
    });

  } catch (error) {
    console.error('Error creating analysis:', error);
    return NextResponse.json(
      { error: 'Failed to create analysis', details: String(error) },
      { status: 500 }
    );
  }
}
