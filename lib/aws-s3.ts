import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 클라이언트 초기화
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'koco-dental-files';

// 이미지 업로드 함수
export async function uploadImageToS3(
  file: Buffer | Uint8Array | string,
  key: string,
  contentType: string = 'image/jpeg'
) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // 업로드된 파일의 URL 반환
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
}

// Presigned URL 생성 (클라이언트 직접 업로드용)
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string = 'image/jpeg'
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  // URL은 1시간 동안 유효
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}

// Presigned URL 생성 (다운로드용)
export async function generatePresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  // URL은 1시간 동안 유효
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}

// S3에서 파일 삭제
export async function deleteFromS3(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    return false;
  }
}