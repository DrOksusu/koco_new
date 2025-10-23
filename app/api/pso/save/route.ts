import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      analysisId, // 업데이트용 ID (있으면 업데이트, 없으면 생성)
      type,
      patientName,
      patientBirthDate,
      fileName,
      landmarks,
      geometry,
      annotatedImageUrl,
      originalImageUrl,
      timestamp
    } = body;

    console.log('========================================');
    console.log('📥 Received PSO API request');
    console.log('========================================');
    console.log('Request body:', {
      analysisId: analysisId || 'NEW',
      mode: analysisId ? 'UPDATE' : 'CREATE',
      type,
      fileName,
      patientName: `"${patientName}"`,
      patientBirthDate: `"${patientBirthDate}"`,
      landmarkCount: landmarks ? Object.keys(landmarks).length : 0,
      geometry,
      annotatedImageUrl: annotatedImageUrl ? 'provided' : 'missing',
      originalImageUrl: originalImageUrl ? 'provided' : 'missing',
    });
    console.log('patientName type:', typeof patientName);
    console.log('patientName value:', patientName);
    console.log('patientName length:', patientName?.length);
    console.log('patientBirthDate type:', typeof patientBirthDate);
    console.log('patientBirthDate value:', patientBirthDate);
    console.log('patientBirthDate length:', patientBirthDate?.length);
    console.log('========================================');

    // Validate required data
    if (!landmarks || Object.keys(landmarks).length === 0) {
      return NextResponse.json(
        { error: 'No landmarks provided' },
        { status: 400 }
      );
    }

    // TODO: Get actual user and clinic from session
    // For now, using default values
    const userId = BigInt(1);
    const clinicId = BigInt(1);

    // PSO landmarks에 접두사 추가
    const psoLandmarks: Record<string, { x: number; y: number }> = {};
    Object.entries(landmarks).forEach(([name, coords]) => {
      if (typeof coords === 'object' && coords !== null) {
        psoLandmarks[`PSO_${name}`] = coords as { x: number; y: number };
      }
    });

    // Calculate PSO-specific measurements
    const psoAngles: Record<string, number> = {};

    // Calculate distances and angles based on landmarks
    if (landmarks['Hinge Point'] && landmarks['Mn.1 Crown']) {
      const hingePoint = landmarks['Hinge Point'] as {x: number, y: number};
      const mn1Crown = landmarks['Mn.1 Crown'] as {x: number, y: number};

      // Calculate distance between Hinge Point and Mn.1 Crown
      const distance = Math.sqrt(
        Math.pow(mn1Crown.x - hingePoint.x, 2) +
        Math.pow(mn1Crown.y - hingePoint.y, 2)
      );

      psoAngles['PSO_Hinge_to_Mn1_Distance'] = distance;
    }

    // Add Guide Zone and Buffer Zone if provided
    if (geometry) {
      if (geometry.guideZone !== undefined) {
        psoAngles['PSO_Guide_Zone_D1'] = geometry.guideZone;
      }

      if (geometry.bufferZone !== undefined) {
        psoAngles['PSO_Buffer_Zone_D2'] = geometry.bufferZone;
      }
    }

    // Calculate FH Line angle if Porion and Orbitale exist
    if (landmarks['Porion'] && landmarks['Orbitale']) {
      const porion = landmarks['Porion'] as {x: number, y: number};
      const orbitale = landmarks['Orbitale'] as {x: number, y: number};

      // Calculate angle of FH line relative to horizontal
      const angle = Math.atan2(orbitale.y - porion.y, orbitale.x - porion.x) * (180 / Math.PI);

      psoAngles['PSO_FH_Line_Angle'] = angle;
    }

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
      console.log('🔍 Searching for existing PSO analysis by patient info:', {
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
        console.log('✅ Found existing PSO analysis for patient:', {
          analysisId: existingAnalysis.id.toString(),
          analysisCode: existingAnalysis.analysisCode,
          createdAt: existingAnalysis.createdAt
        });
      }
    }

    // 3단계: UPDATE or CREATE
    if (existingAnalysis) {
      // UPDATE 모드 - 기존 분석 업데이트
      console.log('🔄 Updating existing PSO analysis:', existingAnalysis.id.toString());

      // 기존 데이터 가져오기
      const existingLandmarks = (existingAnalysis.landmarksData as Record<string, any>) || {};
      const existingAngles = (existingAnalysis.anglesData as Record<string, any>) || {};

      // 새 데이터와 병합 (기존 데이터 유지하면서 새 데이터 추가)
      const mergedLandmarks = {
        ...existingLandmarks,
        ...psoLandmarks  // PSO 랜드마크 추가/업데이트
      };

      const mergedAngles = {
        ...existingAngles,
        ...psoAngles  // PSO 측정값 추가/업데이트
      };

      console.log('📊 Data merge:', {
        existingLandmarkCount: Object.keys(existingLandmarks).length,
        newPsoLandmarkCount: Object.keys(psoLandmarks).length,
        mergedLandmarkCount: Object.keys(mergedLandmarks).length,
        existingAngleCount: Object.keys(existingAngles).length,
        newPsoAngleCount: Object.keys(psoAngles).length,
        mergedAngleCount: Object.keys(mergedAngles).length,
      });

      analysis = await prisma.xrayAnalysis.update({
        where: { id: existingAnalysis.id },
        data: {
          patientName: patientName || 'Unknown Patient',
          patientBirthDate: (patientBirthDate && patientBirthDate.trim() !== '') ? new Date(patientBirthDate) : null,
          psoImageUrl: cleanUrl(annotatedImageUrl), // PSO 전용 이미지
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
          description: 'PSO analysis updated',
          type: 'PSO',
          title: `PSO Analysis - ${patientName || 'Unknown Patient'}`,
          status: 'COMPLETED',
          result: {
            analysisCode: analysis.analysisCode,
            landmarkCount: Object.keys(landmarks).length,
            measurementCount: Object.keys(psoAngles).length,
            timestamp: timestamp || new Date().toISOString(),
          },
        },
      });

      console.log('✅ PSO analysis updated successfully');
    } else {
      // CREATE 모드 - 새 분석 생성
      console.log('➕ Creating new PSO analysis for patient:', patientName);

      // Generate unique analysis code for PSO
      const analysisCode = `PSO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create main analysis record in xray_analyses table with JSON data
      analysis = await prisma.xrayAnalysis.create({
        data: {
          analysisCode,
          userId,
          clinicId,
          patientName: patientName || 'Unknown Patient',
          patientBirthDate: (patientBirthDate && patientBirthDate.trim() !== '') ? new Date(patientBirthDate) : null,
          xrayType: 'lateral',
          originalImageUrl: cleanUrl(originalImageUrl),
          psoImageUrl: cleanUrl(annotatedImageUrl), // PSO 전용 이미지
          fileName,
          analysisStatus: 'completed',
          diagnosisNotes: 'PSO Analysis - Postural Sagittal Occlusal',
          analyzedAt: new Date(),
          landmarksData: psoLandmarks, // JSON 형태로 저장
          anglesData: psoAngles, // JSON 형태로 저장
        },
      });

      // Create history entry
      await prisma.analysisHistory.create({
        data: {
          analysisId: analysis.id,
          userId,
          actionType: 'created',
          description: 'PSO Analysis created and completed',
          type: 'PSO',
          title: `PSO Analysis - ${patientName || 'Unknown Patient'}`,
          status: 'COMPLETED',
          result: {
            analysisCode: analysis.analysisCode,
            landmarkCount: Object.keys(landmarks).length,
            measurementCount: Object.keys(psoAngles).length,
            timestamp: timestamp || new Date().toISOString(),
          },
        },
      });

      console.log('✅ PSO analysis created successfully');
    }

    console.log('PSO analysis saved successfully:', {
      analysisId: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
      landmarksCount: Object.keys(psoLandmarks).length,
      measurementsCount: Object.keys(psoAngles).length,
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
    });

  } catch (error) {
    console.error('Error saving PSO analysis:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to save PSO analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
