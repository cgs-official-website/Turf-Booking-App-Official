const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

function sanitizeError(msg) {
  if (!msg) return '';
  return msg.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgresql://***:***@');
}

async function apply005() {
  const client = await pool.connect();
  try {
    const sqlFile = path.join(__dirname, '../prisma/migrations_manual/005_create_tournaments.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('Running 005_create_tournaments.sql...');
    await client.query(sql);
    console.log('✅ 005_create_tournaments.sql executed successfully.');

    // Verify tournaments table exists and count columns
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'tournaments'
      ORDER BY ordinal_position;
    `);

    console.log('\n--- Tournaments Table Columns (' + colRes.rows.length + ' columns) ---');
    for (const row of colRes.rows) {
      console.log(`Column: ${row.column_name.padEnd(28)} | Type: ${row.data_type.padEnd(18)} | Nullable: ${row.is_nullable}`);
    }

    const countRes = await client.query(`SELECT count(*)::int as count FROM public."tournaments"`);
    console.log(`\nTournaments row count: ${countRes.rows[0].count}`);
  } catch (err) {
    console.error('Migration 005 failed:', sanitizeError(err.message));
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

apply005();
