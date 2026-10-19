const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function applyMigrations() {
  const client = await pool.connect();
  try {
    const apiFile = path.join(__dirname, '../prisma/migrations_manual/007_create_api_integrations.sql');
    if (fs.existsSync(apiFile)) {
      const sql = fs.readFileSync(apiFile, 'utf8');
      await client.query(sql);
      console.log('✅ 007_create_api_integrations.sql executed.');
    }
    const teamsFile = path.join(__dirname, '../prisma/migrations_manual/007_tournament_teams.sql');
    if (fs.existsSync(teamsFile)) {
      const sql = fs.readFileSync(teamsFile, 'utf8');
      await client.query(sql);
      console.log('✅ 007_tournament_teams.sql executed.');
    }
  } catch (err) {
    console.warn('Migration note:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigrations();
