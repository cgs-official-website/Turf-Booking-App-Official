const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

<<<<<<< HEAD
async function apply007() {
  const client = await pool.connect();
  try {
    const sqlFile = path.join(__dirname, '../prisma/migrations_manual/007_create_api_integrations.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('Applying 007_create_api_integrations.sql...');
    await client.query(sql);
    console.log('✅ 007_create_api_integrations.sql executed successfully.');

    const res = await client.query('SELECT count(*)::int as count FROM public.api_integrations');
    console.log('api_integrations row count:', res.rows[0].count);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
=======
async function main() {
  const client = await pool.connect();
  try {
    const sqlFile = path.join(__dirname, '../prisma/migrations_manual/007_tournament_teams.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('Running 007_tournament_teams.sql...');
    await client.query(sql);
    console.log('✅ 007_tournament_teams.sql executed successfully.');

    // Verify column exists
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name = 'teams';
    `);
    console.log('Verification:', res.rows);
>>>>>>> 4d1ada6 (Describe your changes)
  } finally {
    client.release();
    await pool.end();
  }
}

<<<<<<< HEAD
apply007();
=======
main().catch(console.error);
>>>>>>> 4d1ada6 (Describe your changes)
