const prisma = require('../config/prisma');

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS avatar TEXT;');
    console.log('✅ Successfully added avatar column to vendors table');
  } catch (err) {
    console.error('❌ Error adding avatar column:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
