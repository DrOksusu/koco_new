import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DIAGNOSIS_DEFINITIONS = [
  {
    name: 'HGI',
    unit: '',
    meanValue: 12,
    titleKo: '수평 성장 지수',
    titleEn: 'Horizontal Growth Index',
    fullName: 'Horizontal Growth Index',
    description: '전후방 골격 성장 패턴을 평가하는 지표',
    normalRangeMin: 10,
    normalRangeMax: 14,
    interpretationHigh: '전방 성장 경향',
    interpretationLow: '후방 성장 경향',
    displayOrder: 1
  },
  {
    name: 'VGI',
    unit: '',
    meanValue: 8,
    titleKo: '수직 성장 지수',
    titleEn: 'Vertical Growth Index',
    fullName: 'Vertical Growth Index',
    description: '수직 골격 성장 패턴을 평가하는 지표',
    normalRangeMin: 6,
    normalRangeMax: 10,
    interpretationHigh: '수직 성장 경향',
    interpretationLow: '수평 성장 경향',
    displayOrder: 2
  },
  {
    name: 'APDI',
    unit: '',
    meanValue: 85,
    titleKo: '전후방 부조화 지표',
    titleEn: 'Anteroposterior Dysplasia Indicator',
    fullName: 'Anteroposterior Dysplasia Indicator',
    description: '전후방 골격 관계를 평가하는 Kim의 진단 지표',
    normalRangeMin: 81,
    normalRangeMax: 89,
    interpretationHigh: '골격성 III급',
    interpretationLow: '골격성 II급',
    calculationMethod: 'Facial Angle + AB to FH Plane - Facial Depth',
    displayOrder: 3
  },
  {
    name: 'ODI',
    unit: '',
    meanValue: 75,
    titleKo: '수직 피개 지표',
    titleEn: 'Overbite Depth Indicator',
    fullName: 'Overbite Depth Indicator',
    description: '수직 골격 관계를 평가하는 Kim의 진단 지표',
    normalRangeMin: 70,
    normalRangeMax: 80,
    interpretationHigh: '과개교합 경향',
    interpretationLow: '개방교합 경향',
    calculationMethod: 'AB to Mandibular Plane + FMA',
    displayOrder: 4
  },
  {
    name: 'IAPDI',
    unit: '',
    meanValue: 80,
    titleKo: '개선된 APDI',
    titleEn: 'Improved APDI',
    fullName: 'Improved Anteroposterior Dysplasia Indicator',
    description: 'FMA를 고려한 개선된 전후방 부조화 지표',
    normalRangeMin: 75,
    normalRangeMax: 85,
    interpretationHigh: '골격성 III급 (FMA 보정)',
    interpretationLow: '골격성 II급 (FMA 보정)',
    displayOrder: 5
  },
  {
    name: 'IODI',
    unit: '',
    meanValue: 70,
    titleKo: '개선된 ODI',
    titleEn: 'Improved ODI',
    fullName: 'Improved Overbite Depth Indicator',
    description: 'FMA와 ANB를 고려한 개선된 수직 피개 지표',
    normalRangeMin: 65,
    normalRangeMax: 75,
    interpretationHigh: '과개교합 경향 (보정)',
    interpretationLow: '개방교합 경향 (보정)',
    displayOrder: 6
  },
  {
    name: '2APDL',
    unit: '',
    meanValue: 90,
    titleKo: '전후방 치아 한계',
    titleEn: '2 × Anteroposterior Dental Limit',
    fullName: '2 × Anteroposterior Dental Limit',
    description: '전후방 치아 이동 가능 범위 (APDL × 2)',
    normalRangeMin: null,
    normalRangeMax: null,
    calculationMethod: '2 × 0.8 × (APDI - IAPDI)',
    displayOrder: 7
  },
  {
    name: 'VDL',
    unit: '',
    meanValue: 65,
    titleKo: '수직 치아 한계',
    titleEn: 'Vertical Dental Limit',
    fullName: 'Vertical Dental Limit',
    description: '수직 치아 이동 가능 범위',
    normalRangeMin: null,
    normalRangeMax: null,
    calculationMethod: '0.4849 × (ODI - IODI)',
    displayOrder: 8
  },
  {
    name: 'CFD',
    unit: '',
    meanValue: 45,
    titleKo: '턱-안면 깊이',
    titleEn: 'Chin-Face Depth',
    fullName: 'Chin-Face Depth',
    description: '하악 이부의 전후방 위치 평가',
    normalRangeMin: null,
    normalRangeMax: null,
    calculationMethod: 'ODI + APDI - IAPDI - IODI',
    displayOrder: 9
  },
  {
    name: 'EI',
    unit: '',
    meanValue: 30,
    titleKo: '발치 지표',
    titleEn: 'Extraction Index',
    fullName: 'Extraction Index',
    description: '발치 필요성을 평가하는 지표',
    normalRangeMin: null,
    normalRangeMax: null,
    interpretationHigh: '발치 필요성 높음',
    interpretationLow: '비발치 치료 가능',
    calculationMethod: 'ODI + APDI + (Interincisal - 125)/5 - (E-line Upper + E-line Lower)',
    displayOrder: 10
  }
];

async function main() {
  console.log('🔍 Checking diagnosis_definitions table...');

  try {
    // Check if table exists and has data
    const existingCount = await prisma.diagnosisDefinition.count();
    console.log(`📊 Current count: ${existingCount}`);

    if (existingCount === 0) {
      console.log('💾 Inserting initial diagnosis definitions...');

      for (const def of DIAGNOSIS_DEFINITIONS) {
        await prisma.diagnosisDefinition.create({
          data: def
        });
        console.log(`✅ Created: ${def.name} - ${def.titleKo}`);
      }

      console.log(`\n✅ Successfully inserted ${DIAGNOSIS_DEFINITIONS.length} definitions!`);
    } else {
      console.log('ℹ️  Data already exists. Skipping insertion.');

      // Show existing data
      const existing = await prisma.diagnosisDefinition.findMany({
        orderBy: { displayOrder: 'asc' }
      });

      console.log('\n📋 Existing definitions:');
      existing.forEach(def => {
        console.log(`  - ${def.name}: ${def.titleKo || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
