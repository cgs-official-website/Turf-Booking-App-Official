const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

async function seedSuperAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: Both ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set.');
    console.error('Usage example: ADMIN_EMAIL="admin@turf.com" ADMIN_PASSWORD="SecretPassword123" node scripts/seedSuperAdmin.js');
    process.exit(1);
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const id = `superadmin_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.superAdmin.upsert({
    where: { email: cleanEmail },
    update: {
      passwordHash,
      role: 'superadmin',
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      id,
      name: 'Super Admin',
      email: cleanEmail,
      passwordHash,
      role: 'superadmin',
      isActive: true,
    },
  });

  console.log('✅ Super Admin row upserted successfully.');
  console.log(`ID:    ${admin.id}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Role:  ${admin.role}`);
}

seedSuperAdmin()
  .catch((err) => {
    console.error('Failed to seed Super Admin:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
