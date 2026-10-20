const prisma = require('../config/prisma');

async function main() {
  console.log('Adding "bracket" column to "tournaments" table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "tournaments"
    ADD COLUMN IF NOT EXISTS "bracket" JSONB DEFAULT '{}'::jsonb;
  `);
  console.log('✅ "bracket" column added successfully.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error adding bracket column:', err);
  process.exit(1);
});
