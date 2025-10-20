import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysisId = id;
    console.log('Deleting analysis with ID:', analysisId);

    // AnalysisHistory는 CASCADE로 자동 삭제됨
    // ExportLog도 CASCADE로 자동 삭제됨
    // XrayAnalysis 삭제 (관련 데이터는 CASCADE로 자동 삭제)
    const deletedAnalysis = await prisma.xrayAnalysis.delete({
      where: {
        id: BigInt(analysisId)
      }
    });

    console.log('Successfully deleted analysis:', deletedAnalysis.id);

    return NextResponse.json({
      success: true,
      message: 'Analysis deleted successfully',
      deletedId: deletedAnalysis.id.toString()
    });
  } catch (error) {
    console.error('Error deleting analysis:', error);

    // 레코드를 찾을 수 없는 경우
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete analysis', details: error },
      { status: 500 }
    );
  }
}