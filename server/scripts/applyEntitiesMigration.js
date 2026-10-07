const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function applyMigration() {
  const sqlFile = path.join(__dirname, '../prisma/migrations_manual/002_create_entities.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('Applying 002_create_entities.sql...');
  await pool.query(sql);
  console.log('✅ Migration executed successfully.');

  const tables = [
    'documents',
    'bookings',
    'slot_overrides',
    'vendors',
    'turfs',
    'users',
    'wishlist_items',
    'device_tokens',
    'superadmins',
  ];

  console.log('\n--- Database Verification Table Counts ---');
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT count(*)::int as count FROM public."${t}"`);
      console.log(`Table: ${t.padEnd(16)} | Row Count: ${res.rows[0].count}`);
    } catch (e) {
      console.log(`Table: ${t.padEnd(16)} | Status: Not found / Error: ${e.message}`);
    }
  }

  await pool.end();
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
