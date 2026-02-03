import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

// GET: 모든 룰 조회 (관리자용)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await prisma.chatRule.findMany({
      include: { media: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
    });

    return NextResponse.json({
      rules: rules.map(rule => ({
        id: rule.id.toString(),
        keywords: rule.keywords,
        response: rule.response,
        category: rule.category,
        priority: rule.priority,
        isActive: rule.isActive,
        media: rule.media ? {
          id: rule.media.id.toString(),
          title: rule.media.title,
          mediaType: rule.media.mediaType
        } : null,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

// POST: 새 룰 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { keywords, response, category, priority, mediaId, isActive } = body;

    if (!keywords || !response) {
      return NextResponse.json(
        { error: 'Keywords and response are required' },
        { status: 400 }
      );
    }

    const rule = await prisma.chatRule.create({
      data: {
        keywords,
        response,
        category: category || null,
        priority: priority || 0,
        mediaId: mediaId ? BigInt(mediaId) : null,
        isActive: isActive !== false
      },
      include: { media: true }
    });

    return NextResponse.json({
      success: true,
      rule: {
        id: rule.id.toString(),
        keywords: rule.keywords,
        response: rule.response,
        category: rule.category,
        priority: rule.priority,
        isActive: rule.isActive,
        media: rule.media ? {
          id: rule.media.id.toString(),
          title: rule.media.title
        } : null
      }
    });

  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}

// PUT: 룰 수정
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, keywords, response, category, priority, mediaId, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const rule = await prisma.chatRule.update({
      where: { id: BigInt(id) },
      data: {
        ...(keywords && { keywords }),
        ...(response && { response }),
        ...(category !== undefined && { category }),
        ...(priority !== undefined && { priority }),
        ...(mediaId !== undefined && { mediaId: mediaId ? BigInt(mediaId) : null }),
        ...(isActive !== undefined && { isActive })
      },
      include: { media: true }
    });

    return NextResponse.json({
      success: true,
      rule: {
        id: rule.id.toString(),
        keywords: rule.keywords,
        response: rule.response,
        category: rule.category,
        priority: rule.priority,
        isActive: rule.isActive
      }
    });

  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}

// DELETE: 룰 삭제
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    await prisma.chatRule.delete({
      where: { id: BigInt(id) }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
