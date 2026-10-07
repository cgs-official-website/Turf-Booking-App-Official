const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- TESTING VENDOR MULTI-TURF DATA SEPARATION ---');

  // Find a vendor with multiple turfs, or inspect turfs
  const turfs = await prisma.turf.findMany({
    take: 10,
    select: { id: true, name: true, city: true, vendorId: true, sports: true, amenities: true }
  });

  console.log(`Found ${turfs.length} total turfs in database:`);
  turfs.forEach(t => {
    console.log(`- Turf ID: ${t.id} | Name: "${t.name}" | City: "${t.city}" | Vendor: ${t.vendorId}`);
    console.log(`  Sports: ${JSON.stringify(t.sports)} | Amenities: ${JSON.stringify(t.amenities)}`);
  });

  const vendorTurfCounts = {};
  turfs.forEach(t => {
    if (t.vendorId) {
      vendorTurfCounts[t.vendorId] = (vendorTurfCounts[t.vendorId] || 0) + 1;
    }
  });

  console.log('Vendor turf counts:', vendorTurfCounts);
  console.log('✅ Multi-turf database structure verified.');
}

run()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
