import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { uploadToS3, getPresignedUrl } from '@/lib/s3';

// GET: 미디어 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get('type');

    const where: any = { isActive: true };
    if (mediaType) {
      where.mediaType = mediaType;
    }

    const mediaList = await prisma.chatMedia.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // presigned URL 생성
    const mediaWithUrls = await Promise.all(
      mediaList.map(async (media) => ({
        id: media.id.toString(),
        title: media.title,
        description: media.description,
        mediaType: media.mediaType,
        url: await getPresignedUrl(media.s3Key),
        fileName: media.fileName,
        fileSize: media.fileSize,
        mimeType: media.mimeType,
        thumbnail: media.thumbnail ? await getPresignedUrl(media.thumbnail) : null,
        duration: media.duration,
        createdAt: media.createdAt
      }))
    );

    return NextResponse.json({ media: mediaWithUrls });

  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

// POST: 미디어 업로드
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const mediaType = formData.get('mediaType') as string;

    if (!file || !title || !mediaType) {
      return NextResponse.json(
        { error: 'File, title, and mediaType are required' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (이미지: 10MB, 동영상: 100MB, 파일: 50MB)
    const sizeLimits: Record<string, number> = {
      image: 10 * 1024 * 1024,
      video: 100 * 1024 * 1024,
      file: 50 * 1024 * 1024
    };

    if (file.size > (sizeLimits[mediaType] || sizeLimits.file)) {
      return NextResponse.json(
        { error: `File too large. Max size for ${mediaType}: ${sizeLimits[mediaType] / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // S3에 업로드 (customKey 사용)
    const s3Key = `chatbot/${mediaType}/${Date.now()}-${file.name}`;
    const { url } = await uploadToS3(buffer, file.name, file.type, s3Key);

    // 데이터베이스에 저장
    const media = await prisma.chatMedia.create({
      data: {
        title,
        description: description || null,
        mediaType: mediaType as any,
        s3Key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      }
    });

    // presigned URL 생성
    const presignedUrl = await getPresignedUrl(s3Key);

    return NextResponse.json({
      success: true,
      media: {
        id: media.id.toString(),
        title: media.title,
        description: media.description,
        mediaType: media.mediaType,
        url: presignedUrl,
        fileName: media.fileName,
        fileSize: media.fileSize
      }
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}

// DELETE: 미디어 삭제
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    // 연결된 룰이 있는지 확인
    const linkedRules = await prisma.chatRule.count({
      where: { mediaId: BigInt(id) }
    });

    if (linkedRules > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${linkedRules} rule(s) are using this media` },
        { status: 400 }
      );
    }

    await prisma.chatMedia.delete({
      where: { id: BigInt(id) }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}
