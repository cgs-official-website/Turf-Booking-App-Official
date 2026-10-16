const prisma = require('../config/prisma');

async function main() {
  const cols = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tournaments' ORDER BY ordinal_position"
  );
  console.log('Columns in tournaments:');
  cols.forEach(c => console.log(` - ${c.column_name}: ${c.data_type}`));

  const rows = await prisma.tournament.findMany({
    select: { id: true, name: true, creatorType: true, turfId: true, vendorId: true, userId: true, status: true }
  });
  console.log('Existing tournament rows:', rows);
}

main().catch(console.error).finally(() => prisma.$disconnect());
