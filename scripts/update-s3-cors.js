/**
 * S3 버킷 CORS 설정 업데이트 스크립트
 *
 * 사용법:
 * node scripts/update-s3-cors.js
 */

const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

// .env 파일 로드
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.S3_BUCKET_NAME || 'koco-dental-files';

// CORS 설정
const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST'],
      AllowedOrigins: [
        'http://localhost:3001',
        'http://localhost:3000',
        // 운영 도메인 추가
        // 'https://your-production-domain.com',
      ],
      ExposeHeaders: [
        'ETag',
        'x-amz-server-side-encryption',
        'x-amz-request-id',
        'x-amz-id-2'
      ],
      MaxAgeSeconds: 3000,
    },
  ],
};

async function updateCORS() {
  try {
    console.log(`🔧 Updating CORS configuration for bucket: ${bucketName}`);

    // CORS 설정 업데이트
    const putCommand = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration,
    });

    await s3Client.send(putCommand);
    console.log('✅ CORS configuration updated successfully!');

    // 업데이트된 CORS 설정 확인
    console.log('\n📋 Verifying CORS configuration...');
    const getCommand = new GetBucketCorsCommand({
      Bucket: bucketName,
    });

    const response = await s3Client.send(getCommand);
    console.log('\n✅ Current CORS configuration:');
    console.log(JSON.stringify(response.CORSRules, null, 2));

  } catch (error) {
    console.error('❌ Error updating CORS:', error);
    console.error('\n💡 Possible issues:');
    console.error('  1. Check AWS credentials in .env file');
    console.error('  2. Verify IAM user has s3:PutBucketCors permission');
    console.error('  3. Ensure bucket name is correct');
    process.exit(1);
  }
}

async function checkCurrentCORS() {
  try {
    console.log(`📋 Checking current CORS configuration for: ${bucketName}\n`);

    const getCommand = new GetBucketCorsCommand({
      Bucket: bucketName,
    });

    const response = await s3Client.send(getCommand);
    console.log('✅ Current CORS configuration:');
    console.log(JSON.stringify(response.CORSRules, null, 2));

    return true;
  } catch (error) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('⚠️  No CORS configuration found. Will create new one.');
      return false;
    }
    throw error;
  }
}

// 메인 실행
(async () => {
  try {
    console.log('🚀 S3 CORS Configuration Tool\n');
    console.log('='.repeat(50));

    // 현재 CORS 설정 확인
    const hasExisting = await checkCurrentCORS();

    console.log('\n' + '='.repeat(50));
    console.log('\n🔄 Proceeding with update...\n');

    // CORS 설정 업데이트
    await updateCORS();

    console.log('\n' + '='.repeat(50));
    console.log('\n✨ Done! CORS configuration has been updated.');
    console.log('\n💡 Next steps:');
    console.log('  1. Clear browser cache');
    console.log('  2. Restart your Next.js development server');
    console.log('  3. Test image loading in the application\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
})();
