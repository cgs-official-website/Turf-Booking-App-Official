const prisma = require('../config/prisma');

async function main() {
  console.log('Adding approval columns to tournaments table if not exist...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "tournaments" 
    ADD COLUMN IF NOT EXISTS "approval_status" VARCHAR(32) DEFAULT 'approved';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "tournaments" 
    ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
  `);
  console.log('✅ Columns added successfully!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error adding columns:', e);
  process.exit(1);
});
