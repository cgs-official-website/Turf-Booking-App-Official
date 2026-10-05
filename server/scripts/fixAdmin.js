const p = require('../config/prisma');

async function main() {
  // Approve all pending vendors
  const result = await p.vendor.updateMany({
    where: { kycStatus: 'pending' },
    data: { kycStatus: 'approved' }
  });
  console.log('✅ Approved vendors count:', result.count);

  // Show all vendors
  const all = await p.vendor.findMany({
    select: { id: true, email: true, kycStatus: true, turfOnboardingComplete: true }
  });
  console.log('\n📋 All vendors:');
  all.forEach(v => console.log(` - ${v.email} | kycStatus: ${v.kycStatus} | turfOnboarding: ${v.turfOnboardingComplete}`));

  // Test superadmin login  
  const bcrypt = require('bcryptjs');
  const admin = await p.superAdmin.findUnique({ where: { email: 'admin@turf.com' } });
  console.log('\n🔐 Superadmin email:', admin.email);
  console.log('🔐 Password hash stored:', admin.passwordHash.substring(0, 20) + '...');

  await p.$disconnect();
  console.log('\n✅ Done! Use vendor@turf.com / (original password) to login in TurfVendorApp.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
