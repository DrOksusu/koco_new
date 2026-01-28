import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No IDs provided' },
        { status: 400 }
      );
    }

    const userId = BigInt(session.user.id);

    console.log(`Bulk deleting ${ids.length} analyses for user ${userId}`);

    // 사용자 소유의 분석만 삭제 (보안)
    const deleteResult = await prisma.xrayAnalysis.deleteMany({
      where: {
        id: {
          in: ids.map(id => BigInt(id))
        },
        userId: userId
      }
    });

    console.log(`Successfully deleted ${deleteResult.count} analyses`);

    return NextResponse.json({
      success: true,
      message: `${deleteResult.count}개의 분석이 삭제되었습니다.`,
      deletedCount: deleteResult.count
    });
  } catch (error) {
    console.error('Error bulk deleting analyses:', error);
    return NextResponse.json(
      { error: 'Failed to delete analyses', details: String(error) },
      { status: 500 }
    );
  }
}
