import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToJson() {
  console.log('🔍 기존 데이터 조회 중...');

  // 모든 분석 데이터 조회
  const analyses = await prisma.xrayAnalysis.findMany({
    include: {
      landmarks: true,
      angleMeasurements: true,
    },
  });

  console.log(`📊 총 ${analyses.length}개의 분석 데이터 발견`);

  if (analyses.length === 0) {
    console.log('✅ 마이그레이션할 데이터가 없습니다.');
    return;
  }

  // 백업 데이터 저장
  const backupData = analyses.map(analysis => ({
    id: analysis.id.toString(),
    analysisCode: analysis.analysisCode,
    landmarkCount: analysis.landmarks.length,
    angleCount: analysis.angleMeasurements.length,
    landmarks: analysis.landmarks.map(lm => ({
      name: lm.landmarkName,
      x: Number(lm.xCoordinate),
      y: Number(lm.yCoordinate),
    })),
    angles: analysis.angleMeasurements.map(am => ({
      name: am.angleName,
      value: Number(am.angleValue),
    })),
  }));

  // 백업 파일 생성
  const fs = require('fs');
  const backupPath = 'scripts/backup-landmarks-' + Date.now() + '.json';
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`💾 백업 파일 생성: ${backupPath}`);

  // 마이그레이션 데이터 준비
  const updates = [];

  for (const analysis of analyses) {
    // landmarks를 JSON 객체로 변환
    const landmarksData: Record<string, { x: number; y: number }> = {};
    analysis.landmarks.forEach(lm => {
      landmarksData[lm.landmarkName] = {
        x: Number(lm.xCoordinate),
        y: Number(lm.yCoordinate),
      };
    });

    // angles를 JSON 객체로 변환
    const anglesData: Record<string, number> = {};
    analysis.angleMeasurements.forEach(am => {
      anglesData[am.angleName] = Number(am.angleValue);
    });

    updates.push({
      id: analysis.id,
      landmarksData,
      anglesData,
    });
  }

  console.log(`\n🔄 ${updates.length}개의 분석 데이터 마이그레이션 시작...`);

  // 각 분석 데이터 업데이트
  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    try {
      await prisma.$executeRaw`
        UPDATE xray_analyses
        SET
          landmarks_data = ${JSON.stringify(update.landmarksData)},
          angles_data = ${JSON.stringify(update.anglesData)}
        WHERE id = ${update.id}
      `;
      successCount++;
      process.stdout.write(`\r✓ 진행: ${successCount}/${updates.length}`);
    } catch (error) {
      errorCount++;
      console.error(`\n❌ 에러 (ID: ${update.id}):`, error);
    }
  }

  console.log(`\n\n✅ 마이그레이션 완료!`);
  console.log(`   성공: ${successCount}개`);
  console.log(`   실패: ${errorCount}개`);

  // 검증
  console.log('\n🔍 마이그레이션 검증 중...');
  const verifyCount = await prisma.xrayAnalysis.count({
    where: {
      OR: [
        { landmarksData: { not: null } },
        { anglesData: { not: null } },
      ],
    },
  });

  console.log(`   JSON 데이터가 있는 분석: ${verifyCount}/${analyses.length}`);

  if (verifyCount === analyses.length) {
    console.log('\n✅ 검증 성공! 모든 데이터가 정상적으로 마이그레이션되었습니다.');
  } else {
    console.log('\n⚠️  일부 데이터가 마이그레이션되지 않았습니다. 백업 파일을 확인하세요.');
  }
}

migrateToJson()
  .catch(error => {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
