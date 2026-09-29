const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL;

let pool = null;

if (connectionString) {
  // Check if SSL is required (Railway external connection usually uses SSL)
  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  
  pool = new Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL client error:', err.message);
  });
} else {
  console.warn('⚠️ DATABASE_URL is not defined in environment variables.');
}

/**
 * Execute a query with parameters
 */
const query = async (text, params = []) => {
  if (!pool) {
    throw new Error('PostgreSQL pool is not initialized. Please configure DATABASE_URL.');
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
  }
  return res;
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
  if (!pool) {
    throw new Error('PostgreSQL pool is not initialized. Please configure DATABASE_URL.');
  }
  return await pool.connect();
};

module.exports = {
  pool,
  query,
  getClient,
};
