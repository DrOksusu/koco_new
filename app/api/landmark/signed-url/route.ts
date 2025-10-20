import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrlFromFullUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('=== SIGNED URL API DEBUG ===');
    console.log('Original URL:', imageUrl);
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
    console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);

    // S3 URL인지 확인
    if (!imageUrl.includes('s3.amazonaws.com')) {
      console.log('Not an S3 URL, returning original URL');
      // S3가 아니면 원본 URL 그대로 반환
      return NextResponse.json({
        success: true,
        signedUrl: imageUrl
      });
    }

    console.log('Detected S3 URL, generating signed URL...');

    // 서명된 URL 생성
    const signedUrl = await getPresignedUrlFromFullUrl(imageUrl);

    console.log('Generated signed URL (first 100 chars):', signedUrl.substring(0, 100));
    console.log('Signed URL includes X-Amz-Signature?:', signedUrl.includes('X-Amz-Signature'));
    console.log('Signed URL includes X-Amz-Credential?:', signedUrl.includes('X-Amz-Credential'));
    console.log('=== END DEBUG ===');

    return NextResponse.json({
      success: true,
      signedUrl
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Failed to generate signed URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}