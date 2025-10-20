import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToS3, generatePresignedUploadUrl } from '@/lib/aws-s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'anonymous';

    const body = await request.json();
    const { imageData, fileName, type } = body;

    // S3 키 생성 (userId/날짜/파일명 구조)
    // type에 따라 다른 경로 사용 (original vs landmark)
    const date = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const prefix = type === 'original' ? 'original' : 'landmark';
    const s3Key = `landmarks/${userId}/${date}/${prefix}_${timestamp}_${fileName}`;

    if (imageData) {
      // Base64 이미지 데이터를 Buffer로 변환
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // S3에 업로드
      const s3Url = await uploadImageToS3(buffer, s3Key, 'image/png');

      return NextResponse.json({
        success: true,
        s3Url,
        s3Key,
        message: 'Image uploaded successfully'
      });
    } else {
      // Presigned URL 생성 (클라이언트 직접 업로드용)
      const uploadUrl = await generatePresignedUploadUrl(s3Key, 'image/png');

      return NextResponse.json({
        success: true,
        uploadUrl,
        s3Key,
        message: 'Presigned URL generated'
      });
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      error: JSON.stringify(error, null, 2)
    });
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}