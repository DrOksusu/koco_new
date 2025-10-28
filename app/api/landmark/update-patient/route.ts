import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 분석 레코드의 환자 정보만 업데이트하는 API
 * 분석 이력에서 온 경우에만 사용
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, patientName, patientBirthDate, diagnosisDate } = body;

    console.log('Updating patient info:', {
      analysisId,
      patientName,
      patientBirthDate,
      diagnosisDate
    });

    // 필수 파라미터 검증
    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisId is required' },
        { status: 400 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: {
      patientName?: string;
      patientBirthDate?: Date | null;
      diagnosisDate?: Date | null;
    } = {};

    if (patientName !== undefined) {
      updateData.patientName = patientName || 'Unknown Patient';
    }

    if (patientBirthDate !== undefined) {
      updateData.patientBirthDate = patientBirthDate ? new Date(patientBirthDate) : null;
    }

    if (diagnosisDate !== undefined) {
      updateData.diagnosisDate = diagnosisDate ? new Date(diagnosisDate) : null;
    }

    // 데이터베이스 업데이트
    const updatedAnalysis = await prisma.xrayAnalysis.update({
      where: {
        id: BigInt(analysisId)
      },
      data: updateData,
      select: {
        id: true,
        patientName: true,
        patientBirthDate: true,
        diagnosisDate: true,
        updatedAt: true
      }
    });

    console.log('Patient info updated successfully:', updatedAnalysis);

    return NextResponse.json({
      success: true,
      message: 'Patient info updated',
      data: {
        id: updatedAnalysis.id.toString(),
        patientName: updatedAnalysis.patientName,
        patientBirthDate: updatedAnalysis.patientBirthDate,
        diagnosisDate: updatedAnalysis.diagnosisDate,
        updatedAt: updatedAnalysis.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating patient info:', error);

    // 레코드를 찾을 수 없는 경우
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Analysis record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update patient info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
