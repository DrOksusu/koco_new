import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// 파일 용량 제한 (바이트)
const FILE_SIZE_LIMITS = {
  xray: 10 * 1024 * 1024,      // X-ray: 10MB
  photo: 5 * 1024 * 1024,      // 일반 사진: 5MB
  max: 15 * 1024 * 1024,       // 절대 최대: 15MB
};

// X-ray 타입 확인
const isXrayType = (type: string): boolean => {
  const xrayTypes = ['panorama', 'lateral_ceph', 'frontal_ceph', 'lateral', 'frontal', 'psa', 'pso', 'landmark'];
  return xrayTypes.some(t => type.toLowerCase().includes(t));
};

// 파일 크기를 읽기 쉬운 형식으로 변환
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'anonymous';
    const fileType = formData.get('type') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // 파일 용량 검증
    const sizeLimit = isXrayType(fileType) ? FILE_SIZE_LIMITS.xray : FILE_SIZE_LIMITS.photo;
    if (file.size > FILE_SIZE_LIMITS.max) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `파일이 너무 큽니다. 최대 ${formatFileSize(FILE_SIZE_LIMITS.max)}까지 업로드 가능합니다. (현재: ${formatFileSize(file.size)})`,
        },
        { status: 413 }
      );
    }
    if (file.size > sizeLimit) {
      const limitType = isXrayType(fileType) ? 'X-ray' : '사진';
      return NextResponse.json(
        {
          error: 'File too large',
          message: `${limitType} 파일이 너무 큽니다. 최대 ${formatFileSize(sizeLimit)}까지 업로드 가능합니다. (현재: ${formatFileSize(file.size)})`,
        },
        { status: 413 }
      );
    }

    console.log('Uploading file to S3:', file.name, '- Size:', formatFileSize(file.size), '- Type:', fileType);

    // 파일을 Buffer로 변환
    const buffer = Buffer.from(await file.arrayBuffer());

    // S3 키 생성 (사용자별 폴더 구조)
    const timestamp = Date.now();
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const s3Key = `uploads/${sanitizedUserId}/${new Date().toISOString().split('T')[0]}/original_${timestamp}.${fileExtension}`;

    console.log('S3 Key:', s3Key);

    // 한글 파일명을 안전하게 인코딩 (RFC 2231)
    const encodedFileName = encodeURIComponent(file.name);
    const asciiFileName = file.name.replace(/[^\x00-\x7F]/g, '_'); // 한글을 _로 치환한 ASCII 버전

    // S3에 업로드
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'koco-dental-files',
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      // RFC 2231 형식: ASCII 파일명 + UTF-8 인코딩된 파일명
      ContentDisposition: `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
    });

    await s3Client.send(command);

    // S3 URL 생성
    const s3Url = `https://${process.env.S3_BUCKET_NAME || 'koco-dental-files'}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${s3Key}`;

    console.log('File uploaded successfully:', s3Url);

    return NextResponse.json({
      success: true,
      s3Url,
      s3Key,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      name: error instanceof Error ? error.name : 'Error',
      // AWS SDK 에러인 경우 추가 정보 포함
      ...(error && typeof error === 'object' && '$metadata' in error ? {
        statusCode: (error as any).$metadata?.httpStatusCode,
        requestId: (error as any).$metadata?.requestId,
      } : {})
    };

    return NextResponse.json(
      {
        error: 'Failed to upload file',
        message: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
