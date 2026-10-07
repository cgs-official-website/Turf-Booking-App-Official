const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { query } = require('../config/db');

async function cleanStaticData() {
  console.log('🧹 Clearing sample / static records from database...');

  try {
    // 1. Delete all static turfs
    const delTurfs = await query("DELETE FROM documents WHERE collection = 'turfs'");
    console.log(`✅ Deleted turfs: ${delTurfs.rowCount}`);

    // 2. Delete all static vendors
    const delVendors = await query("DELETE FROM documents WHERE collection = 'vendors'");
    console.log(`✅ Deleted vendors: ${delVendors.rowCount}`);

    // 3. Delete demo non-admin users (preserve super admin)
    const delUsers = await query("DELETE FROM documents WHERE collection = 'users' AND id != 'user_admin_zuna_com'");
    console.log(`✅ Deleted demo users: ${delUsers.rowCount}`);

    // 4. Delete demo reports, reviews, bookings, matches
    const delOthers = await query("DELETE FROM documents WHERE collection IN ('bookings', 'reviews', 'matches', 'reports', 'otps', 'notifications', 'orders')");
    console.log(`✅ Deleted demo bookings, reviews, matches, reports: ${delOthers.rowCount}`);

    // 5. Clean local fallback json file
    const localDbPath = path.join(__dirname, '../data/local_db.json');
    if (fs.existsSync(localDbPath)) {
      const data = JSON.parse(fs.readFileSync(localDbPath, 'utf8') || '{}');
      const adminUser = data.users?.user_admin_zuna_com;
      const cleanDb = {
        users: adminUser ? { user_admin_zuna_com: adminUser } : {},
        vendors: {},
        turfs: {},
        bookings: {},
        reviews: {},
        matches: {},
        reports: {},
        otps: {},
        notifications: {},
        subscriptions: {},
        orders: {},
      };
      fs.writeFileSync(localDbPath, JSON.stringify(cleanDb, null, 2), 'utf8');
      console.log('✅ Cleaned local_db.json fallback file');
    }

    // 6. Verify remaining documents
    const remaining = await query('SELECT collection, count(*) as count FROM documents GROUP BY collection');
    console.log('\n📊 Remaining database collections and counts:');
    console.table(remaining.rows);

    console.log('\n🎉 Static / sample records successfully deleted!');
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
  } finally {
    process.exit(0);
  }
}

cleanStaticData();
