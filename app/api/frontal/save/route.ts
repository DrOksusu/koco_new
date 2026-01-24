import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { generateChartNumber } from '@/lib/chartNumber';

export async function POST(request: NextRequest) {
  try {
    // 세션에서 실제 사용자 ID 가져오기
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      analysisId, // 업데이트용 ID (있으면 업데이트, 없으면 생성)
      type,
      patientName,
      patientBirthDate,
      fileName,
      landmarks,
      angles,
      annotatedImageUrl,
      originalImageUrl,
      timestamp
    } = body;

    console.log('========================================');
    console.log('📥 Received Frontal API request');
    console.log('========================================');
    console.log('Request body:', {
      analysisId: analysisId || 'NEW',
      mode: analysisId ? 'UPDATE' : 'CREATE',
      type,
      fileName,
      patientName: `"${patientName}"`,
      patientBirthDate: `"${patientBirthDate}"`,
      landmarkCount: landmarks ? Object.keys(landmarks).length : 0,
      angles,
      annotatedImageUrl: annotatedImageUrl ? 'provided' : 'missing',
      originalImageUrl: originalImageUrl ? 'provided' : 'missing',
    });
    console.log('========================================');

    // Validate required data
    if (!landmarks || Object.keys(landmarks).length === 0) {
      return NextResponse.json(
        { error: 'No landmarks provided' },
        { status: 400 }
      );
    }

    // 세션에서 사용자 ID 가져오기
    const userId = BigInt(session.user.id);

    // 사용자의 clinicId 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clinicId: true, email: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let clinicId = user.clinicId;

    // clinicId가 없으면 기본 클리닉 생성 또는 할당
    if (!clinicId) {
      console.log('⚠️ User has no clinicId, creating default clinic...');

      // 기본 클리닉 찾기 또는 생성
      let defaultClinic = await prisma.clinic.findFirst({
        where: { clinicCode: 'DEFAULT' }
      });

      if (!defaultClinic) {
        defaultClinic = await prisma.clinic.create({
          data: {
            clinicName: 'Default Clinic',
            clinicCode: 'DEFAULT',
            address: 'Default Address',
            phone: '000-0000-0000'
          }
        });
        console.log('✅ Created default clinic:', defaultClinic.id.toString());
      }

      // 사용자에게 기본 클리닉 할당
      await prisma.user.update({
        where: { id: userId },
        data: { clinicId: defaultClinic.id }
      });

      clinicId = defaultClinic.id;
      console.log('✅ Assigned default clinic to user');
    }

    console.log('Saving Frontal analysis for user:', userId.toString(), 'clinic:', clinicId.toString());

    // Frontal landmarks에 접두사 추가
    const frontalLandmarks: Record<string, { x: number; y: number }> = {};
    Object.entries(landmarks).forEach(([name, coords]) => {
      if (typeof coords === 'object' && coords !== null) {
        frontalLandmarks[`FRONTAL_${name}`] = coords as { x: number; y: number };
      }
    });

    // Frontal-specific measurements (각도)
    const frontalAngles: Record<string, number> = {};

    if (angles) {
      if (angles.angle1 !== undefined) {
        frontalAngles['FRONTAL_ZPoint_vs_Zygion'] = angles.angle1;
      }
      if (angles.angle2 !== undefined) {
        frontalAngles['FRONTAL_Jugal_vs_Zygion'] = angles.angle2;
      }
      if (angles.angle3 !== undefined) {
        frontalAngles['FRONTAL_Antegonial_vs_Zygion'] = angles.angle3;
      }
      if (angles.finalAngle !== undefined) {
        frontalAngles['FRONTAL_ZA_Menton_Angle'] = angles.finalAngle;
      }
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
      console.log('🔍 Searching for existing Frontal analysis by patient info:', {
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
        console.log('✅ Found existing Frontal analysis for patient:', {
          analysisId: existingAnalysis.id.toString(),
          analysisCode: existingAnalysis.analysisCode,
          createdAt: existingAnalysis.createdAt
        });
      }
    }

    // 3단계: UPDATE or CREATE
    if (existingAnalysis) {
      // UPDATE 모드 - 기존 분석 업데이트
      console.log('🔄 Updating existing Frontal analysis:', existingAnalysis.id.toString());

      // 기존 데이터 가져오기
      const existingLandmarks = (existingAnalysis.landmarksData as Record<string, any>) || {};
      const existingAngles = (existingAnalysis.anglesData as Record<string, any>) || {};

      // 새 데이터와 병합 (기존 데이터 유지하면서 새 데이터 추가)
      const mergedLandmarks = {
        ...existingLandmarks,
        ...frontalLandmarks  // Frontal 랜드마크 추가/업데이트
      };

      const mergedAngles = {
        ...existingAngles,
        ...frontalAngles  // Frontal 측정값 추가/업데이트
      };

      console.log('📊 Data merge:', {
        existingLandmarkCount: Object.keys(existingLandmarks).length,
        newFrontalLandmarkCount: Object.keys(frontalLandmarks).length,
        mergedLandmarkCount: Object.keys(mergedLandmarks).length,
        existingAngleCount: Object.keys(existingAngles).length,
        newFrontalAngleCount: Object.keys(frontalAngles).length,
        mergedAngleCount: Object.keys(mergedAngles).length,
      });

      analysis = await prisma.xrayAnalysis.update({
        where: { id: existingAnalysis.id },
        data: {
          patientName: patientName || 'Unknown Patient',
          patientBirthDate: (patientBirthDate && patientBirthDate.trim() !== '') ? new Date(patientBirthDate) : null,
          annotatedImageUrl: cleanUrl(annotatedImageUrl), // Frontal 분석 이미지 (임시로 annotatedImageUrl 사용)
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
          description: 'Frontal Ceph analysis updated',
          type: 'FRONTAL',
          title: `Frontal Analysis - ${patientName || 'Unknown Patient'}`,
          status: 'COMPLETED',
          result: {
            analysisCode: analysis.analysisCode,
            landmarkCount: Object.keys(landmarks).length,
            measurementCount: Object.keys(frontalAngles).length,
            timestamp: timestamp || new Date().toISOString(),
          },
        },
      });

      console.log('✅ Frontal analysis updated successfully');
    } else {
      // CREATE 모드 - 새 분석 생성
      console.log('➕ Creating new Frontal analysis for patient:', patientName);

      // Generate unique analysis code for Frontal
      const analysisCode = `FRONTAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 차트번호 생성 (KOCO-0001, KOCO-0002, ...)
      const chartNumber = await generateChartNumber();
      console.log('📋 Generated chart number:', chartNumber);

      // Create main analysis record in xray_analyses table with JSON data
      analysis = await prisma.xrayAnalysis.create({
        data: {
          analysisCode,
          chartNumber,
          userId,
          clinicId,
          patientName: patientName || 'Unknown Patient',
          patientBirthDate: (patientBirthDate && patientBirthDate.trim() !== '') ? new Date(patientBirthDate) : null,
          xrayType: 'frontal',
          originalImageUrl: cleanUrl(originalImageUrl),
          annotatedImageUrl: cleanUrl(annotatedImageUrl), // Frontal 분석 이미지 (임시로 annotatedImageUrl 사용)
          fileName,
          analysisStatus: 'completed',
          diagnosisNotes: 'Frontal Ceph Analysis - ZA-Menton Angle Measurement',
          analyzedAt: new Date(),
          landmarksData: frontalLandmarks, // JSON 형태로 저장
          anglesData: frontalAngles, // JSON 형태로 저장
        },
      });

      // Create history entry
      await prisma.analysisHistory.create({
        data: {
          analysisId: analysis.id,
          userId,
          actionType: 'created',
          description: 'Frontal Ceph Analysis created and completed',
          type: 'FRONTAL',
          title: `Frontal Analysis - ${patientName || 'Unknown Patient'}`,
          status: 'COMPLETED',
          result: {
            analysisCode: analysis.analysisCode,
            landmarkCount: Object.keys(landmarks).length,
            measurementCount: Object.keys(frontalAngles).length,
            timestamp: timestamp || new Date().toISOString(),
          },
        },
      });

      console.log('✅ Frontal analysis created successfully');
    }

    console.log('Frontal analysis saved successfully:', {
      analysisId: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
      landmarksCount: Object.keys(frontalLandmarks).length,
      measurementsCount: Object.keys(frontalAngles).length,
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
      chartNumber: analysis.chartNumber,
    });

  } catch (error) {
    console.error('Error saving Frontal analysis:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to save Frontal analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
