import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
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

    console.log('Received PSA API request with data:', {
      type,
      fileName,
      landmarkCount: landmarks ? Object.keys(landmarks).length : 0,
      geometry,
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

    // TODO: Get actual user and clinic from session
    // For now, using default values
    const userId = BigInt(1);
    const clinicId = BigInt(1);

    // Generate unique analysis code for PSA
    const analysisCode = `PSA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // PSA landmarks에 접두사 추가
    const psaLandmarks: Record<string, { x: number; y: number }> = {};
    Object.entries(landmarks).forEach(([name, coords]) => {
      if (typeof coords === 'object' && coords !== null) {
        psaLandmarks[`PSA_${name}`] = coords as { x: number; y: number };
      }
    });

    // Calculate PSA-specific measurements
    const psaAngles: Record<string, number> = {};

    // Calculate distances and angles based on landmarks
    if (landmarks['Hinge Point'] && landmarks['Mn.1 Crown']) {
      const hingePoint = landmarks['Hinge Point'] as {x: number, y: number};
      const mn1Crown = landmarks['Mn.1 Crown'] as {x: number, y: number};

      // Calculate distance between Hinge Point and Mn.1 Crown
      const distance = Math.sqrt(
        Math.pow(mn1Crown.x - hingePoint.x, 2) +
        Math.pow(mn1Crown.y - hingePoint.y, 2)
      );

      psaAngles['PSA_Hinge_to_Mn1_Distance'] = distance;
    }

    // Add Guide Zone and Buffer Zone if provided
    if (geometry) {
      if (geometry.guideZone !== undefined) {
        psaAngles['PSA_Guide_Zone_D1'] = geometry.guideZone;
      }

      if (geometry.bufferZone !== undefined) {
        psaAngles['PSA_Buffer_Zone_D2'] = geometry.bufferZone;
      }
    }

    // Calculate FH Line angle if Porion and Orbitale exist
    if (landmarks['Porion'] && landmarks['Orbitale']) {
      const porion = landmarks['Porion'] as {x: number, y: number};
      const orbitale = landmarks['Orbitale'] as {x: number, y: number};

      // Calculate angle of FH line relative to horizontal
      const angle = Math.atan2(orbitale.y - porion.y, orbitale.x - porion.x) * (180 / Math.PI);

      psaAngles['PSA_FH_Line_Angle'] = angle;
    }

    // URL에서 query parameters 제거 (pre-signed URL 파라미터 제거)
    const cleanUrl = (url: string | undefined | null): string | null => {
      if (!url) return null;
      // query parameters 제거 (? 이후 모두 제거)
      return url.split('?')[0];
    };

    // Create main analysis record in xray_analyses table with JSON data
    const analysis = await prisma.xrayAnalysis.create({
      data: {
        analysisCode,
        userId,
        clinicId,
        patientName: patientName || 'Unknown Patient',
        patientBirthDate: patientBirthDate ? new Date(patientBirthDate) : null,
        xrayType: 'lateral',
        originalImageUrl: cleanUrl(originalImageUrl),
        annotatedImageUrl: cleanUrl(annotatedImageUrl),
        fileName,
        analysisStatus: 'completed',
        diagnosisNotes: 'PSA Analysis - Postural Structure Analysis',
        analyzedAt: new Date(),
        landmarksData: psaLandmarks, // JSON 형태로 저장
        anglesData: psaAngles, // JSON 형태로 저장
      },
    });

    // Create history entry
    await prisma.analysisHistory.create({
      data: {
        analysisId: analysis.id,
        userId,
        actionType: 'created',
        description: 'PSA Analysis created and completed',
        type: 'PSA',
        title: `PSA Analysis - ${patientName || 'Unknown Patient'}`,
        status: 'COMPLETED',
        result: {
          analysisCode: analysis.analysisCode,
          landmarkCount: Object.keys(landmarks).length,
          measurementCount: Object.keys(psaAngles).length,
          timestamp: timestamp || new Date().toISOString(),
        },
      },
    });

    console.log('PSA analysis saved successfully:', {
      analysisId: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
      landmarksCount: Object.keys(psaLandmarks).length,
      measurementsCount: Object.keys(psaAngles).length,
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
    });

  } catch (error) {
    console.error('Error saving PSA analysis:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to save PSA analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}