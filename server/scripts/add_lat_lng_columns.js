const { query } = require('../config/db');

async function migrate() {
  try {
    // 1. Check existing columns
    console.log('Checking columns of table "turfs"...');
    const colRes = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'turfs'
      ORDER BY ordinal_position;
    `);
    const existingCols = colRes.rows.map(r => r.column_name);
    console.log('Current columns:', existingCols.join(', '));

    // 2. Add latitude and longitude columns if not present
    console.log('Adding latitude and longitude columns if not exists...');
    await query(`
      ALTER TABLE "turfs" 
      ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
    `);
    console.log('Columns added successfully.');

    // 3. Safely populate from existing columns
    const hasLat = existingCols.includes('lat');
    const hasLng = existingCols.includes('lng');
    const hasLocation = existingCols.includes('location');

    if (hasLat && hasLng) {
      console.log('Populating latitude/longitude from lat/lng columns...');
      await query(`
        UPDATE "turfs"
        SET "latitude"  = COALESCE("latitude",  "lat"::DOUBLE PRECISION),
            "longitude" = COALESCE("longitude", "lng"::DOUBLE PRECISION)
        WHERE "latitude" IS NULL OR "longitude" IS NULL;
      `);
      console.log('Populated from lat/lng.');
    } else if (hasLocation) {
      console.log('Populating latitude/longitude from location JSON column...');
      await query(`
        UPDATE "turfs"
        SET "latitude"  = COALESCE("latitude",  ("location"->>'lat')::DOUBLE PRECISION,  ("location"->>'latitude')::DOUBLE PRECISION),
            "longitude" = COALESCE("longitude", ("location"->>'lng')::DOUBLE PRECISION, ("location"->>'longitude')::DOUBLE PRECISION)
        WHERE "latitude" IS NULL OR "longitude" IS NULL;
      `);
      console.log('Populated from location JSON.');
    } else {
      console.log('No existing coordinate columns found — latitude/longitude left as NULL (to be set when vendors add turfs).');
    }

    // 4. Verify
    const verifyRes = await query(`
      SELECT id, name, latitude, longitude 
      FROM "turfs" 
      LIMIT 5;
    `);
    console.log('Sample turfs after migration:');
    verifyRes.rows.forEach(r =>
      console.log(`  [${r.id}] ${r.name} → lat: ${r.latitude}, lng: ${r.longitude}`)
    );

    console.log('\n✅ Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
