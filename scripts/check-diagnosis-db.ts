import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking diagnosis_definitions table...\n');

    // Try to count records
    const count = await prisma.diagnosisDefinition.count();
    console.log(`📊 Total records: ${count}\n`);

    if (count > 0) {
      // Fetch all records
      const definitions = await prisma.diagnosisDefinition.findMany({
        orderBy: { displayOrder: 'asc' }
      });

      console.log('📋 Records in database:');
      definitions.forEach((def, index) => {
        console.log(`${index + 1}. ${def.name}: ${def.titleKo || 'N/A'}`);
        console.log(`   - Mean: ${def.meanValue}`);
        console.log(`   - Description: ${def.description || 'N/A'}`);
        if (def.normalRangeMin !== null && def.normalRangeMax !== null) {
          console.log(`   - Normal Range: ${def.normalRangeMin}~${def.normalRangeMax}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No records found in diagnosis_definitions table!');
    }

    // Also check if measurement_definitions exists
    console.log('\n🔍 Checking measurement_definitions table...');
    const measurementCount = await prisma.measurementDefinition.count();
    console.log(`📊 Total measurement records: ${measurementCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
