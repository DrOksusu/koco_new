import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      analysisId, // 업데이트용 ID (있으면 업데이트, 없으면 생성)
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
      analysisId: analysisId || 'NEW',
      mode: analysisId ? 'UPDATE' : 'CREATE',
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

    // URL에서 query parameters 제거 (pre-signed URL 파라미터 제거)
    const cleanUrl = (url: string | undefined | null): string | null => {
      if (!url) return null;
      // query parameters 제거 (? 이후 모두 제거)
      return url.split('?')[0];
    };

    let analysis;
    let existingAnalysis = null;

    // 1단계: sessionStorage의 analysisId로 먼저 확인
    if (analysisId) {
      existingAnalysis = await prisma.xrayAnalysis.findUnique({
        where: { id: BigInt(analysisId) }
      });

      if (existingAnalysis) {
        console.log('✅ Found analysis by analysisId:', analysisId);
      }
    }

    // 2단계: sessionStorage에 없으면 환자 이름+생년월일로 조회
    if (!existingAnalysis &&
        patientName && patientName.trim() !== '' &&
        patientBirthDate && patientBirthDate.trim() !== '') {
      console.log('🔍 Searching for existing analysis by patient info:', {
        patientName,
        patientBirthDate
      });

      existingAnalysis = await prisma.xrayAnalysis.findFirst({
        where: {
          userId,
          patientName,
          patientBirthDate: new Date(patientBirthDate)
        },
        orderBy: { createdAt: 'desc' } // 가장 최근 분석
      });

      if (existingAnalysis) {
        console.log('✅ Found existing analysis for patient:', {
          analysisId: existingAnalysis.id.toString(),
          analysisCode: existingAnalysis.analysisCode,
          createdAt: existingAnalysis.createdAt
        });
      }
    }

    // 3단계: UPDATE or CREATE
    if (existingAnalysis) {
      // UPDATE 모드 - 기존 분석 업데이트
      console.log('🔄 Updating existing analysis:', existingAnalysis.id.toString());

      // 기존 데이터 가져오기
      const existingLandmarks = (existingAnalysis.landmarksData as Record<string, any>) || {};
      const existingAngles = (existingAnalysis.anglesData as Record<string, any>) || {};

      // 새 데이터와 병합 (기존 데이터 유지하면서 새 데이터 추가)
      const mergedLandmarks = {
        ...existingLandmarks,
        ...landmarks  // Landmark 데이터 추가/업데이트
      };

      const mergedAngles = {
        ...existingAngles,
        ...(angles || {})  // Landmark 측정값 추가/업데이트
      };

      console.log('📊 Data merge:', {
        existingLandmarkCount: Object.keys(existingLandmarks).length,
        newLandmarkCount: Object.keys(landmarks).length,
        mergedLandmarkCount: Object.keys(mergedLandmarks).length,
        existingAngleCount: Object.keys(existingAngles).length,
        newAngleCount: Object.keys(angles || {}).length,
        mergedAngleCount: Object.keys(mergedAngles).length,
      });

      analysis = await prisma.xrayAnalysis.update({
        where: { id: existingAnalysis.id },
        data: {
          patientName: patientName || 'Unknown Patient',
          patientBirthDate: (patientBirthDate && patientBirthDate.trim() !== '') ? new Date(patientBirthDate) : null,
          landmarkImageUrl: cleanUrl(annotatedImageUrl || imageUrl), // Landmark 전용 이미지
          fileName,
          analyzedAt: new Date(),
          landmarksData: mergedLandmarks, // 병합된 데이터 저장
          anglesData: mergedAngles, // 병합된 데이터 저장
        },
      });

      // Update history entry
      await prisma.analysisHistory.create({
        data: {
          analysisId: analysis.id,
          userId,
          actionType: 'modified',
          description: 'Landmark analysis updated',
        },
      });

      console.log('✅ Analysis updated successfully');
    } else {
      // CREATE 모드 - 새 분석 생성
      console.log('➕ Creating new analysis for patient:', patientName);

      const analysisCode = `XRAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      analysis = await prisma.xrayAnalysis.create({
        data: {
          analysisCode,
          userId,
          clinicId,
          patientName: patientName || 'Unknown Patient',
          patientBirthDate: (patientBirthDate && patientBirthDate.trim() !== '') ? new Date(patientBirthDate) : null,
          xrayType: 'lateral',
          originalImageUrl: cleanUrl(originalImageUrl || imageUrl), // 원본 이미지 URL (query params 제거)
          landmarkImageUrl: cleanUrl(annotatedImageUrl || imageUrl), // Landmark 전용 이미지
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

      console.log('✅ Analysis created successfully');
    }

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