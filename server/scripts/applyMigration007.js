const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const files = [
      '007_create_api_integrations.sql',
      '007_create_tournament_registrations.sql',
      '007_tournament_teams.sql',
    ];

    for (const f of files) {
      const sqlFile = path.join(__dirname, '../prisma/migrations_manual', f);
      if (fs.existsSync(sqlFile)) {
        const sql = fs.readFileSync(sqlFile, 'utf8');
        console.log(`Applying ${f}...`);
        try {
          await client.query(sql);
          console.log(`✅ ${f} executed successfully.`);
        } catch (e) {
          console.warn(`Note on ${f}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
