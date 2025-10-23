import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToS3 } from '@/lib/aws-s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'anonymous';

    const { imageData, fileName, type } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Data URL을 Buffer로 변환
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // S3 키 생성
    const date = new Date().toISOString().split('T')[0];
    const uniqueId = randomUUID();
    const prefix = type === 'original' ? 'original' : 'pso';
    const s3Key = `pso/${userId}/${date}/${prefix}_${uniqueId}_${fileName || 'pso-image.png'}`;

    // S3에 업로드 (헬퍼 함수 사용)
    const s3Url = await uploadImageToS3(buffer, s3Key, 'image/png');

    console.log('PSO image uploaded to S3:', s3Url);

    return NextResponse.json({
      success: true,
      s3Url,
      s3Key,
      message: 'PSO image uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading PSO image to S3:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload PSO image to S3',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
