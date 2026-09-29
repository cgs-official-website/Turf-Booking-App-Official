const { query, pool } = require('../config/db');

/**
 * Initializes all required PostgreSQL tables on Railway
 */
async function initSchema() {
  console.log('🔄 Initializing PostgreSQL database tables on Railway...');

  const schemaSql = `
    -- Generic Documents Table (collection-based schema for seamless flexible storage)
    CREATE TABLE IF NOT EXISTS documents (
      collection VARCHAR(64) NOT NULL,
      id VARCHAR(255) NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collection, id)
    );

    CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);
    CREATE INDEX IF NOT EXISTS idx_documents_data_gin ON documents USING gin(data);

    -- Slot Overrides table for high-performance direct slot scheduling
    CREATE TABLE IF NOT EXISTS slot_overrides (
      turf_id VARCHAR(255) NOT NULL,
      date VARCHAR(32) NOT NULL,
      blocked_slots JSONB DEFAULT '[]'::jsonb,
      price_overrides JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (turf_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_slot_overrides_turf_date ON slot_overrides(turf_id, date);

    -- Dedicated relational indexes on common filter/sort attributes within jsonb
    CREATE INDEX IF NOT EXISTS idx_docs_users_phone ON documents ((data->>'phone')) WHERE collection = 'users';
    CREATE INDEX IF NOT EXISTS idx_docs_users_email ON documents ((data->>'email')) WHERE collection = 'users';
    CREATE INDEX IF NOT EXISTS idx_docs_vendors_email ON documents ((data->>'email')) WHERE collection = 'vendors';
    CREATE INDEX IF NOT EXISTS idx_docs_turfs_status ON documents ((data->>'status')) WHERE collection = 'turfs';
    CREATE INDEX IF NOT EXISTS idx_docs_bookings_turf_date ON documents ((data->>'turfId'), (data->>'date')) WHERE collection = 'bookings';
    CREATE INDEX IF NOT EXISTS idx_docs_bookings_status ON documents ((data->>'status')) WHERE collection = 'bookings';
    CREATE INDEX IF NOT EXISTS idx_docs_bookings_user ON documents ((data->>'userId')) WHERE collection = 'bookings';
    CREATE INDEX IF NOT EXISTS idx_docs_reviews_turf ON documents ((data->>'turfId')) WHERE collection = 'reviews';
  `;

  try {
    await query(schemaSql);
    console.log('✅ PostgreSQL Schema and indexes created successfully!');
  } catch (err) {
    console.error('❌ Failed to initialize schema:', err.message);
    throw err;
  }
}

if (require.main === module) {
  initSchema()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { initSchema };
