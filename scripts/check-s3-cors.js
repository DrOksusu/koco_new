/**
 * S3 버킷 CORS 설정 확인 스크립트
 *
 * 사용법:
 * node scripts/check-s3-cors.js
 */

const { S3Client, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

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

async function checkCORS() {
  try {
    console.log(`📋 Checking CORS configuration for bucket: ${bucketName}\n`);

    const command = new GetBucketCorsCommand({
      Bucket: bucketName,
    });

    const response = await s3Client.send(command);

    console.log('✅ Current CORS configuration:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(response.CORSRules, null, 2));
    console.log('='.repeat(60));

    // CORS 규칙 검증
    console.log('\n🔍 Validation:');

    const hasGetMethod = response.CORSRules.some(rule =>
      rule.AllowedMethods.includes('GET')
    );
    const hasHeadMethod = response.CORSRules.some(rule =>
      rule.AllowedMethods.includes('HEAD')
    );
    const hasLocalhostOrigin = response.CORSRules.some(rule =>
      rule.AllowedOrigins.some(origin =>
        origin.includes('localhost') || origin === '*'
      )
    );

    console.log(hasGetMethod ? '✅ GET method allowed' : '❌ GET method NOT allowed');
    console.log(hasHeadMethod ? '✅ HEAD method allowed' : '❌ HEAD method NOT allowed');
    console.log(hasLocalhostOrigin ? '✅ localhost origin allowed' : '❌ localhost origin NOT allowed');

    if (!hasGetMethod || !hasHeadMethod || !hasLocalhostOrigin) {
      console.log('\n⚠️  CORS configuration needs to be updated!');
      console.log('Run: npm run s3:cors');
    } else {
      console.log('\n✅ CORS configuration looks good!');
    }

  } catch (error) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('❌ No CORS configuration found!');
      console.log('\n💡 To add CORS configuration, run:');
      console.log('   npm run s3:cors');
    } else {
      console.error('❌ Error checking CORS:', error);
      console.error('\n💡 Possible issues:');
      console.error('  1. Check AWS credentials in .env file');
      console.error('  2. Verify IAM user has s3:GetBucketCors permission');
      console.error('  3. Ensure bucket name is correct');
    }
    process.exit(1);
  }
}

checkCORS();
