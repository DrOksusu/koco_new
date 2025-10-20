/**
 * 데이터베이스에 저장된 pre-signed URL을 순수한 S3 URL로 변환하는 스크립트
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPresignedUrls() {
  try {
    console.log('🔧 Fixing pre-signed URLs in database...\n');

    // pre-signed URL이 포함된 레코드 찾기
    const analyses = await prisma.xrayAnalysis.findMany({
      where: {
        OR: [
          {
            originalImageUrl: {
              contains: 'X-Amz-Signature'
            }
          },
          {
            annotatedImageUrl: {
              contains: 'X-Amz-Signature'
            }
          }
        ]
      }
    });

    console.log(`📋 Found ${analyses.length} records with pre-signed URLs\n`);

    if (analyses.length === 0) {
      console.log('✅ No records to fix!');
      return;
    }

    let fixedCount = 0;

    for (const analysis of analyses) {
      console.log(`\n🔧 Fixing record ID: ${analysis.id}`);

      const updates = {};

      // originalImageUrl 정리
      if (analysis.originalImageUrl && analysis.originalImageUrl.includes('?')) {
        const cleanUrl = analysis.originalImageUrl.split('?')[0];
        updates.originalImageUrl = cleanUrl;
        console.log(`   Original: ${analysis.originalImageUrl.substring(0, 100)}...`);
        console.log(`   Cleaned:  ${cleanUrl}`);
      }

      // annotatedImageUrl 정리
      if (analysis.annotatedImageUrl && analysis.annotatedImageUrl.includes('?')) {
        const cleanUrl = analysis.annotatedImageUrl.split('?')[0];
        updates.annotatedImageUrl = cleanUrl;
        console.log(`   Annotated: ${analysis.annotatedImageUrl.substring(0, 100)}...`);
        console.log(`   Cleaned:   ${cleanUrl}`);
      }

      // 업데이트 실행
      if (Object.keys(updates).length > 0) {
        await prisma.xrayAnalysis.update({
          where: { id: analysis.id },
          data: updates
        });
        fixedCount++;
        console.log(`   ✅ Updated successfully`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Fixed ${fixedCount} records!`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPresignedUrls();
