import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, panoramaImageUrl, photosData, originalImageUrl } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisId is required' },
        { status: 400 }
      );
    }

    console.log('📸 Updating photos for analysis:', analysisId);
    console.log('Panorama URL:', panoramaImageUrl);
    console.log('Photos data:', JSON.stringify(photosData, null, 2));

    // Update the analysis with photos data
    const updateData: any = {};

    if (originalImageUrl) {
      updateData.originalImageUrl = originalImageUrl;
    }

    if (panoramaImageUrl) {
      updateData.panoramaImageUrl = panoramaImageUrl;
    }

    if (photosData) {
      updateData.photosData = photosData;
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No photos data to update',
      });
    }

    const updatedAnalysis = await prisma.xrayAnalysis.update({
      where: { id: BigInt(analysisId) },
      data: updateData,
    });

    console.log('✅ Photos data updated for analysis:', analysisId);

    return NextResponse.json({
      success: true,
      analysisId: updatedAnalysis.id.toString(),
    });
  } catch (error) {
    console.error('❌ Error updating photos:', error);
    return NextResponse.json(
      { error: 'Failed to update photos', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
