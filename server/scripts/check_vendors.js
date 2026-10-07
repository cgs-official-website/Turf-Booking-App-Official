const prisma = require('../config/prisma');

async function checkVendors() {
  const vendors = await prisma.vendor.findMany();
  console.log('--- VENDORS IN DB ---');
  vendors.forEach(v => {
    console.log(`ID: ${v.id} | Email: ${v.email} | Name: ${v.name} | KYC: ${v.kycStatus}`);
  });
  const turfs = await prisma.turf.findMany();
  console.log('\n--- TURFS IN DB ---');
  turfs.forEach(t => {
    console.log(`ID: ${t.id} | Name: ${t.name} | VendorId: ${t.vendorId} | Status: ${t.status} | Sports: ${JSON.stringify(t.sports)}`);
  });
}

checkVendors().finally(() => prisma.$disconnect());
