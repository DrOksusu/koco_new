import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 분석 데이터 조회
    const analysis = await prisma.xrayAnalysis.findUnique({
      where: {
        id: BigInt(id)
      },
      include: {
        landmarks: true,
        angleMeasurements: true
      }
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // 랜드마크 데이터 변환
    const landmarks: Record<string, { x: number; y: number }> = {};
    analysis.landmarks.forEach(landmark => {
      landmarks[landmark.landmarkName] = {
        x: Number(landmark.xCoordinate),
        y: Number(landmark.yCoordinate)
      };
    });

    // 각도 데이터 변환
    const angles: Record<string, number> = {};
    analysis.angleMeasurements.forEach(angle => {
      angles[angle.angleName] = Number(angle.angleValue);
    });

    return NextResponse.json({
      success: true,
      data: {
        id: analysis.id.toString(),
        analysisCode: analysis.analysisCode,
        fileName: analysis.fileName,
        patientName: analysis.patientName,
        landmarks,
        angles,
        imageUrl: analysis.originalImageUrl || analysis.annotatedImageUrl,
        createdAt: analysis.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}