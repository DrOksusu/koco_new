import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

export async function POST(request: Request) {
  try {
    const { s3Key } = await request.json();

    if (!s3Key) {
      return NextResponse.json(
        { error: 'S3 key is required' },
        { status: 400 }
      );
    }

    // S3 URL에서 버킷 이름과 키 추출
    let bucketName = process.env.AWS_S3_BUCKET_NAME || 'koco-dental-files';
    let key = s3Key;

    if (s3Key.includes('s3.amazonaws.com')) {
      // https://bucket-name.s3.amazonaws.com/key 형식
      const url = new URL(s3Key);
      const pathParts = url.pathname.split('/');
      bucketName = pathParts[1];
      key = pathParts.slice(2).join('/');
    } else if (s3Key.includes('s3.ap-northeast-2.amazonaws.com')) {
      // https://bucket-name.s3.ap-northeast-2.amazonaws.com/key 형식
      const url = new URL(s3Key);
      bucketName = url.hostname.split('.')[0];
      key = url.pathname.slice(1);
    }

    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 3600, // 1시간 후 만료
    };

    const presignedUrl = await s3.getSignedUrlPromise('getObject', params);

    return NextResponse.json({ url: presignedUrl });
  } catch (error) {
    console.error('Pre-signed URL 생성 실패:', error);
    return NextResponse.json(
      { error: 'Pre-signed URL 생성 실패' },
      { status: 500 }
    );
  }
}