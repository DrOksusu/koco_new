import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = BigInt(session.user.id);

    // 사용자의 클리닉 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { clinic: true },
    });

    if (!user?.clinicId) {
      return NextResponse.json(
        { error: 'No clinic associated with this user' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 }
      );
    }

    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // S3에 업로드 (clinic-logos 폴더에 저장)
    const fileName = `clinic-logos/${user.clinicId}/${Date.now()}-${file.name}`;
    const { url } = await uploadToS3(buffer, fileName, file.type);

    // 클리닉 로고 URL 업데이트
    await prisma.clinic.update({
      where: { id: user.clinicId },
      data: { logoUrl: url },
    });

    return NextResponse.json({
      success: true,
      logoUrl: url,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
