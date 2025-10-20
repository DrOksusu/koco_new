import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fileName,
      landmarks,
      angles,
      originalImageUrl,
      annotatedImageUrl,
      imageUrl, // 기존 호환성을 위해 유지
      patientName,
      patientBirthDate
    } = body;

    console.log('Received API request with data:', {
      fileName,
      landmarkCount: landmarks ? Object.keys(landmarks).length : 0,
      angleCount: angles ? Object.keys(angles).length : 0,
      originalImageUrl: originalImageUrl ? 'provided' : 'not provided',
      annotatedImageUrl: annotatedImageUrl ? 'provided' : 'not provided',
      patientName,
      patientBirthDate,
    });

    // Validate required data
    if (!landmarks || Object.keys(landmarks).length === 0) {
      return NextResponse.json(
        { error: 'No landmarks provided' },
        { status: 400 }
      );
    }

    // Validate image URLs
    if (!originalImageUrl && !annotatedImageUrl && !imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    // S3 URL 형식 검증 (base64 데이터 거부)
    const validateImageUrl = (url: string | undefined, fieldName: string) => {
      if (!url) return;

      // base64 데이터 URL 거부
      if (url.startsWith('data:image')) {
        throw new Error(`${fieldName}에 base64 데이터가 전송되었습니다. S3 URL을 사용해주세요.`);
      }

      // URL 길이 검증 (비정상적으로 긴 URL은 잘린 base64일 가능성)
      if (url.length > 1000) {
        throw new Error(`${fieldName}이 비정상적으로 깁니다 (${url.length}자). S3 URL 형식이 올바른지 확인해주세요.`);
      }
    };

    try {
      validateImageUrl(originalImageUrl, 'originalImageUrl');
      validateImageUrl(annotatedImageUrl, 'annotatedImageUrl');
      validateImageUrl(imageUrl, 'imageUrl');
    } catch (validationError) {
      return NextResponse.json(
        {
          error: 'Invalid image URL format',
          details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
        },
        { status: 400 }
      );
    }

    // TODO: Get actual user and clinic from session
    // For now, using default values
    const userId = BigInt(1); // BigInt
    const clinicId = BigInt(1); // BigInt

    // Generate unique analysis code
    const analysisCode = `XRAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // URL에서 query parameters 제거 (pre-signed URL 파라미터 제거)
    const cleanUrl = (url: string | undefined | null): string | null => {
      if (!url) return null;
      // query parameters 제거 (? 이후 모두 제거)
      return url.split('?')[0];
    };

    // Create main analysis record with JSON data
    const analysis = await prisma.xrayAnalysis.create({
      data: {
        analysisCode,
        userId,
        clinicId,
        patientName: patientName || 'Unknown Patient',
        patientBirthDate: patientBirthDate ? new Date(patientBirthDate) : null,
        xrayType: 'lateral',
        originalImageUrl: cleanUrl(originalImageUrl || imageUrl), // 원본 이미지 URL (query params 제거)
        annotatedImageUrl: cleanUrl(annotatedImageUrl || imageUrl), // 랜드마크가 그려진 이미지 URL (query params 제거)
        fileName,
        analysisStatus: 'completed',
        analyzedAt: new Date(),
        landmarksData: landmarks, // JSON 형태로 저장
        anglesData: angles || {}, // JSON 형태로 저장
      },
    });

    // Create history entry
    await prisma.analysisHistory.create({
      data: {
        analysisId: analysis.id,
        userId,
        actionType: 'created',
        description: 'Analysis created and completed',
      },
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
    });

  } catch (error) {
    console.error('Error saving analysis:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to save analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}