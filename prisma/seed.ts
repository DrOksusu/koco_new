import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a default clinic
  const clinic = await prisma.clinic.upsert({
    where: {
      clinicCode: 'DEFAULT-001',
    },
    update: {},
    create: {
      clinicName: 'Default Clinic',
      clinicCode: 'DEFAULT-001',
      address: 'Seoul, Korea',
      phone: '02-1234-5678',
      licenseNumber: 'LIC-2024-001',
    },
  });

  console.log('Created/Updated clinic:', clinic);

  // Create a default user
  const user = await prisma.user.upsert({
    where: {
      email: 'admin@koco.com',
    },
    update: {},
    create: {
      email: 'admin@koco.com',
      username: 'Admin User',
      passwordHash: 'default-hash', // In production, this should be properly hashed
      role: 'admin',
      clinicId: clinic.id,
      isActive: true,
    },
  });

  console.log('Created/Updated user:', user);

  // Create a default patient
  const patient = await prisma.patient.upsert({
    where: {
      patientCode: 'PAT-001',
    },
    update: {},
    create: {
      patientCode: 'PAT-001',
      patientName: 'Test Patient',
      patientBirthDate: new Date('1990-01-01'),
      gender: 'M',
      phone: '010-1234-5678',
      address: 'Seoul, Korea',
      clinicId: clinic.id,
      createdBy: user.id,
    },
  });

  console.log('Created/Updated patient:', patient);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });