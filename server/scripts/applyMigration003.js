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

async function apply003() {
  const client = await pool.connect();
  try {
    // Step 3: Run 003a_alter_types.sql on its own (outside transaction)
    const sqlFileA = path.join(__dirname, '../prisma/migrations_manual/003a_alter_types.sql');
    const sqlA = fs.readFileSync(sqlFileA, 'utf8');
    console.log('Running 003a_alter_types.sql (outside transaction)...');
    await client.query(sqlA);
    console.log('✅ 003a_alter_types.sql executed successfully.');

    // Step 4: Run 003b_create_more_entities.sql (single transaction)
    const sqlFileB = path.join(__dirname, '../prisma/migrations_manual/003b_create_more_entities.sql');
    const sqlB = fs.readFileSync(sqlFileB, 'utf8');
    console.log('Running 003b_create_more_entities.sql (transactional)...');
    await client.query(sqlB);
    console.log('✅ 003b_create_more_entities.sql executed successfully.');

    // Step 5: Verify row counts of existing tables
    const existingTables = ['bookings', 'slot_overrides', 'vendors', 'turfs'];
    console.log('\n--- Existing Tables Row Counts (Must match before) ---');
    for (const t of existingTables) {
      const res = await client.query(`SELECT count(*)::int as count FROM public."${t}"`);
      console.log(`Table: ${t.padEnd(16)} | Count: ${res.rows[0].count}`);
    }

    // Verify 10 new tables
    const newTables = [
      'reviews',
      'subscription_plans',
      'vendor_subscriptions',
      'payments',
      'notifications',
      'vendor_kyc_documents',
      'otp_codes',
      'matches',
      'match_players',
      'reports',
    ];
    console.log('\n--- 10 New Tables Verification ---');
    for (const t of newTables) {
      const res = await client.query(`SELECT count(*)::int as count FROM public."${t}"`);
      console.log(`New Table: ${t.padEnd(24)} | Status: OK | Rows: ${res.rows[0].count}`);
    }

    // Verify new columns on vendors and turfs
    console.log('\n--- New Columns on Existing Tables ---');
    const colRes = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('vendors', 'turfs') 
        AND column_name IN ('rejection_reason', 'reviewed_at')
      ORDER BY table_name, column_name;
    `);
    for (const row of colRes.rows) {
      console.log(`Table: ${row.table_name.padEnd(10)} | Column: ${row.column_name.padEnd(18)} | Type: ${row.data_type}`);
    }

    // Verify new enums
    console.log('\n--- New Enums Verification ---');
    const enumRes = await client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typname IN (
        'vendor_subscription_status',
        'payment_purpose',
        'payment_record_status',
        'notification_recipient_type',
        'notification_type',
        'kyc_doc_type',
        'kyc_doc_status',
        'otp_identifier_type',
        'otp_purpose',
        'otp_role',
        'match_status',
        'report_status'
      )
      ORDER BY typname;
    `);
    for (const row of enumRes.rows) {
      console.log(`Enum: ${row.typname}`);
    }

    // Verify 'rejected' in turf_status
    const turfStatusRes = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'turf_status' 
      ORDER BY enumsortorder;
    `);
    console.log('\nturf_status values:', turfStatusRes.rows.map(r => r.enumlabel).join(', '));
  } catch (err) {
    console.error('Migration failed:', sanitizeError(err.message));
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

apply003();
