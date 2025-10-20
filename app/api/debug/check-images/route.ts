import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 최근 분석 데이터 가져오기
    const recentAnalyses = await prisma.xrayAnalysis.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        analysisCode: true,
        originalImageUrl: true,
        annotatedImageUrl: true,
        fileName: true,
        createdAt: true
      }
    });

    // 각 분석에 대한 URL 상태 확인
    const analyses = recentAnalyses.map(analysis => ({
      id: analysis.id.toString(),
      analysisCode: analysis.analysisCode,
      fileName: analysis.fileName,
      originalImageUrl: analysis.originalImageUrl || 'NOT SET',
      annotatedImageUrl: analysis.annotatedImageUrl || 'NOT SET',
      hasOriginal: !!analysis.originalImageUrl,
      hasAnnotated: !!analysis.annotatedImageUrl,
      isSameUrl: analysis.originalImageUrl === analysis.annotatedImageUrl,
      createdAt: analysis.createdAt?.toISOString()
    }));

    return NextResponse.json({
      success: true,
      totalCount: analyses.length,
      analyses,
      summary: {
        withOriginal: analyses.filter(a => a.hasOriginal).length,
        withAnnotated: analyses.filter(a => a.hasAnnotated).length,
        withSameUrls: analyses.filter(a => a.isSameUrl).length
      }
    });
  } catch (error) {
    console.error('Debug check error:', error);
    return NextResponse.json(
      { error: 'Failed to check images', details: error },
      { status: 500 }
    );
  }
}