import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 분석 데이터에서 이미지 URL 조회
    const analysis = await prisma.xrayAnalysis.findUnique({
      where: {
        id: BigInt(id)
      },
      select: {
        originalImageUrl: true,
        annotatedImageUrl: true
      }
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    const imageUrl = analysis.originalImageUrl || analysis.annotatedImageUrl;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image found for this analysis' },
        { status: 404 }
      );
    }

    // S3 URL인 경우 이미지를 fetch하여 반환
    if (imageUrl.startsWith('http') || imageUrl.startsWith('https')) {
      try {
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/png';

        return NextResponse.json({
          success: true,
          imageData: `data:${mimeType};base64,${base64}`
        });
      } catch (error) {
        console.error('Error fetching S3 image:', error);
        // S3 URL을 직접 반환
        return NextResponse.json({
          success: true,
          imageData: imageUrl
        });
      }
    }

    // base64 데이터인 경우 그대로 반환
    return NextResponse.json({
      success: true,
      imageData: imageUrl
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}