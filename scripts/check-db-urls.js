/**
 * 데이터베이스에 저장된 S3 URL 확인 스크립트
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUrls() {
  try {
    console.log('📋 Checking recent xray_analyses records...\n');

    const analyses = await prisma.xrayAnalysis.findMany({
      orderBy: {
        analyzedAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        fileName: true,
        originalImageUrl: true,
        annotatedImageUrl: true,
        analyzedAt: true
      }
    });

    if (analyses.length === 0) {
      console.log('❌ No records found');
      return;
    }

    console.log(`✅ Found ${analyses.length} records:\n`);
    console.log('='.repeat(80));

    analyses.forEach((record, index) => {
      console.log(`\n📄 Record ${index + 1}:`);
      console.log(`   ID: ${record.id}`);
      console.log(`   File: ${record.fileName}`);
      console.log(`   Analyzed: ${record.analyzedAt}`);
      console.log(`   Original URL: ${record.originalImageUrl}`);
      console.log(`   Annotated URL: ${record.annotatedImageUrl}`);

      // URL 분석
      if (record.originalImageUrl) {
        const hasPresigned = record.originalImageUrl.includes('X-Amz-Signature');
        const hasQueryParams = record.originalImageUrl.includes('?');
        console.log(`   ⚠️  Original has pre-signed params: ${hasPresigned}`);
        console.log(`   ⚠️  Original has query params: ${hasQueryParams}`);
      }

      if (record.annotatedImageUrl) {
        const hasPresigned = record.annotatedImageUrl.includes('X-Amz-Signature');
        const hasQueryParams = record.annotatedImageUrl.includes('?');
        console.log(`   ⚠️  Annotated has pre-signed params: ${hasPresigned}`);
        console.log(`   ⚠️  Annotated has query params: ${hasQueryParams}`);
      }
    });

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUrls();
