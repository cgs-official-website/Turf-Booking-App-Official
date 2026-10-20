const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- TURFS ---');
  const turfs = await prisma.turf.findMany({
    select: { id: true, name: true, vendorId: true },
  });
  console.log(JSON.stringify(turfs, null, 2));

  console.log('\n--- VENDORS ---');
  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true, email: true, phone: true },
  });
  console.log(JSON.stringify(vendors, null, 2));

  console.log('\n--- TOURNAMENTS ---');
  const tournaments = await prisma.tournament.findMany({
    select: {
      id: true,
      name: true,
      creatorType: true,
      userId: true,
      turfId: true,
      vendorId: true,
      status: true,
      approvalStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log(JSON.stringify(tournaments, null, 2));

  console.log('\n--- NOTIFICATIONS ---');
  const notifs = await prisma.notification.findMany({
    where: { type: 'tournament' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log(JSON.stringify(notifs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
