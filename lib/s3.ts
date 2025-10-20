import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const key = `uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { key, url };
}

export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}

export async function getPresignedUrlFromFullUrl(fullUrl: string): Promise<string> {
  console.log('[getPresignedUrlFromFullUrl] Input URL:', fullUrl);

  // S3 URL에서 key 추출
  // 예: https://koco-dental-files.s3.ap-northeast-2.amazonaws.com/landmarks/ok4192ok@gmail.com/2025-09-26/1758921910310_lateral_ceph.jpg
  const urlParts = fullUrl.split('.amazonaws.com/');
  if (urlParts.length !== 2) {
    console.error('[getPresignedUrlFromFullUrl] Failed to split URL:', urlParts);
    throw new Error('Invalid S3 URL');
  }

  const key = urlParts[1];
  console.log('[getPresignedUrlFromFullUrl] Extracted key:', key);

  const presignedUrl = await getPresignedUrl(key);
  console.log('[getPresignedUrlFromFullUrl] Generated presigned URL (first 150 chars):', presignedUrl.substring(0, 150));

  return presignedUrl;
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  });

  await s3Client.send(command);
}