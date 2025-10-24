import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    console.log('Generating pre-signed URL for:', imageUrl);

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // 이미 pre-signed URL인지 확인
    if (imageUrl.includes('X-Amz-Signature')) {
      console.log('Already a pre-signed URL, returning as-is');
      return NextResponse.json({
        success: true,
        presignedUrl: imageUrl,
      });
    }

    // URL 디코딩 (안전한 처리)
    let decodedUrl = imageUrl;
    try {
      // URL이 이미 디코딩되었는지 확인
      if (decodedUrl.includes('%')) {
        // 한 번만 디코딩 시도
        decodedUrl = decodeURIComponent(decodedUrl);
      }
    } catch (e) {
      console.log('URL decoding failed, using original:', e);
      // 디코딩 실패 시 원본 URL 사용
    }

    // S3 URL에서 버킷과 키 추출
    const url = new URL(decodedUrl);
    // pathname을 디코딩하여 @ 같은 특수문자 복원
    const pathname = decodeURIComponent(url.pathname);
    const pathParts = pathname.slice(1).split('/');

    let bucket: string;
    let key: string;

    if (url.hostname.includes('.s3.')) {
      // https://bucket.s3.region.amazonaws.com/key 형식
      bucket = url.hostname.split('.')[0];
      key = pathParts.join('/');
    } else if (url.hostname === 's3.amazonaws.com') {
      // https://s3.amazonaws.com/bucket/key 형식
      bucket = pathParts[0];
      key = pathParts.slice(1).join('/');
    } else {
      // 기본 형식
      bucket = 'koco-dental-files';
      key = pathParts.join('/');
    }

    console.log('S3 Bucket:', bucket);
    console.log('S3 Key:', key);

    // 파일 존재 여부 확인 (더 안전한 처리)
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await s3Client.send(headCommand);
      console.log('File exists in S3:', key);
    } catch (headError: any) {
      console.error('File check failed:', headError.message);
      if (headError.name === 'NotFound') {
        return NextResponse.json(
          { error: 'File not found in S3', bucket, key },
          { status: 404 }
        );
      }
      // 권한 문제나 기타 에러는 무시하고 pre-signed URL 생성 시도
      console.log('Continuing with pre-signed URL generation despite head error');
    }

    // Pre-signed URL 생성
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 28800, // 8시간 유효
    });

    console.log('Generated pre-signed URL successfully');

    return NextResponse.json({
      success: true,
      presignedUrl,
    });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate pre-signed URL', details: error },
      { status: 500 }
    );
  }
}

// GET 메서드로도 지원 (쿼리 파라미터 사용)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // 이미 pre-signed URL인지 확인
    if (imageUrl.includes('X-Amz-Signature')) {
      console.log('Already a pre-signed URL, returning as-is');
      return NextResponse.json({
        success: true,
        presignedUrl: imageUrl,
      });
    }

    // S3 URL에서 버킷과 키 추출
    const url = new URL(imageUrl);
    const pathParts = url.pathname.slice(1).split('/');

    let bucket: string;
    let key: string;

    if (url.hostname.includes('.s3.')) {
      bucket = url.hostname.split('.')[0];
      key = pathParts.join('/');
    } else if (url.hostname === 's3.amazonaws.com') {
      bucket = pathParts[0];
      key = pathParts.slice(1).join('/');
    } else {
      bucket = 'koco-dental-files';
      key = pathParts.join('/');
    }

    // Pre-signed URL 생성
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 28800, // 8시간 유효
    });

    return NextResponse.json({
      success: true,
      presignedUrl,
    });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate pre-signed URL', details: error },
      { status: 500 }
    );
  }
}