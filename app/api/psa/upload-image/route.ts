import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { imageData, fileName, type } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Data URL을 Buffer로 변환
    const base64Data = imageData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // S3 키 생성
    const uniqueId = uuidv4();
    const s3Key = `psa/${type}/${uniqueId}-${fileName || 'psa-image.png'}`;

    // S3에 업로드
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'koco-dental-files',
      Key: s3Key,
      Body: buffer,
      ContentType: 'image/png',
    });

    await s3Client.send(uploadCommand);

    // S3 URL 생성
    const s3Url = `https://${process.env.S3_BUCKET_NAME || 'koco-dental-files'}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${s3Key}`;

    console.log('PSA image uploaded to S3:', s3Url);

    return NextResponse.json({
      success: true,
      s3Url,
      key: s3Key,
    });

  } catch (error) {
    console.error('Error uploading PSA image to S3:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload PSA image to S3',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
