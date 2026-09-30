const fs = require('fs');
const path = require('path');

// Resolve pg module (from local or server/node_modules)
let Client;
try {
  ({ Client } = require('pg'));
} catch (e) {
  try {
    ({ Client } = require(path.resolve(__dirname, '../server/node_modules/pg')));
  } catch (e2) {
    try {
      ({ Client } = require(path.resolve(__dirname, 'node_modules/pg')));
    } catch (e3) {
      console.error('Error: Cannot find "pg" module. Ensure server/node_modules is installed.');
      process.exit(1);
    }
  }
}

// Target output file path: server/data/source_export.json
const exportFilePath = path.resolve(
  __dirname,
  __dirname.endsWith('server' + path.sep + 'scripts')
    ? '../data/source_export.json'
    : '../server/data/source_export.json'
);

// Redact database credentials from any error output
function sanitizeError(msg) {
  if (!msg) return '';
  return msg.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgresql://***:***@');
}

async function exportSourceDb() {
  const connectionString = process.env.SOURCE_DATABASE_URL;

  if (!connectionString || !connectionString.trim()) {
    console.error('Error: SOURCE_DATABASE_URL environment variable is not set.');
    console.error('Please set SOURCE_DATABASE_URL in your terminal session before running this script.');
    process.exit(1);
  }

  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const client = new Client({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
  } catch (err) {
    console.error('Connection failed:', sanitizeError(err.message));
    process.exit(1);
  }

  try {
    // 1. Open strictly read-only transaction
    await client.query('BEGIN TRANSACTION READ ONLY;');

    // 2. Discover all base tables in the public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `);

    const tableNames = tablesRes.rows.map((r) => r.table_name);
    console.log('--- Tables Found in Source Database ---');

    const tableSummaries = [];
    for (const tableName of tableNames) {
      try {
        const countRes = await client.query(`SELECT count(*)::int as count FROM public."${tableName}"`);
        const count = countRes.rows[0].count;
        tableSummaries.push({ tableName, count });
        console.log(`Table: ${tableName.padEnd(20)} | Rows: ${count}`);
      } catch (err) {
        tableSummaries.push({ tableName, count: null, error: err.message });
        console.log(`Table: ${tableName.padEnd(20)} | Error counting: ${sanitizeError(err.message)}`);
      }
    }

    // 3. Export documents rows grouped by collection
    const collections = {};
    const collectionCounts = {};

    if (tableNames.includes('documents')) {
      console.log('\n--- Documents Collection Counts ---');
      const countsRes = await client.query(`
        SELECT collection, count(*)::int as count 
        FROM public.documents 
        GROUP BY collection 
        ORDER BY collection ASC;
      `);

      for (const row of countsRes.rows) {
        collectionCounts[row.collection] = row.count;
        console.log(`Collection: ${row.collection.padEnd(16)} | Rows: ${row.count}`);
      }

      // SELECT only query
      const docsRes = await client.query(`
        SELECT collection, id, data, created_at, updated_at 
        FROM public.documents 
        ORDER BY collection ASC, id ASC;
      `);

      for (const row of docsRes.rows) {
        const col = row.collection || 'unknown';
        if (!collections[col]) {
          collections[col] = [];
        }
        collections[col].push({
          id: row.id,
          data: row.data,
          createdAt: row.created_at || null,
          updatedAt: row.updated_at || null,
        });
      }
    } else {
      console.log('\nNotice: No "documents" table found in source database.');
    }

    // 4. Safely conclude read-only transaction
    await client.query('COMMIT;');

    // 5. Ensure server/data directory exists and save to source_export.json
    const dataDir = path.dirname(exportFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      tables: tableSummaries,
      collectionCounts,
      collections,
    };

    fs.writeFileSync(exportFilePath, JSON.stringify(exportPayload, null, 2), 'utf8');

    console.log('\n--- Export Summary ---');
    console.log(`Output file: server/data/source_export.json`);
    console.log(`Collections exported: ${Object.keys(collections).length}`);
    for (const [col, count] of Object.entries(collectionCounts)) {
      console.log(`  - ${col}: ${count} rows`);
    }
    console.log('✅ Read-only export completed successfully.');
  } catch (err) {
    try {
      await client.query('ROLLBACK;');
    } catch (_) {}
    console.error('Export failed:', sanitizeError(err.message));
    process.exit(1);
  } finally {
    await client.end();
  }
}

exportSourceDb();
