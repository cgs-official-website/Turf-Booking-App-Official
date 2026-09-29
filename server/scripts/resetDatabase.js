const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { query, pool } = require('../config/db');
const { initSchema } = require('./initPostgres');

const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');

async function resetAndSeed() {
  console.log('🔄 Starting PostgreSQL Database Reset & Fresh Seeding...');

  // Ensure schema exists
  await initSchema();

  const passwordHash = await bcrypt.hash('Password@123', 10);

  const freshDb = {
    users: {
      user_9876543210: {
        id: 'user_9876543210',
        uid: 'user_9876543210',
        name: 'Turf Player',
        email: 'player@turf.com',
        phone: '9876543210',
        passwordHash,
        role: 'user',
        createdAt: new Date().toISOString(),
      },
      user_admin_zuna_com: {
        id: 'user_admin_zuna_com',
        uid: 'user_admin_zuna_com',
        name: 'Super Administrator',
        email: 'admin@zuna.com',
        phone: '9999999999',
        passwordHash,
        role: 'admin',
        admin: true,
        createdAt: new Date().toISOString(),
      },
    },
    vendors: {
      vendor_vendor_turf_com: {
        id: 'vendor_vendor_turf_com',
        uid: 'vendor_vendor_turf_com',
        name: 'Kickoff Turf Partner',
        email: 'vendor@turf.com',
        phone: '9876543210',
        passwordHash,
        role: 'vendor',
        turfId: 'turf_arena_01',
        turfName: 'Kickoff Champions Arena',
        kycStatus: 'approved',
        turfOnboardingComplete: true,
        turfApprovalAcknowledged: true,
        subscription: {
          active: true,
          planId: 'plan_pro_annual',
          planName: 'Pro Annual',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
        createdAt: new Date().toISOString(),
      },
    },
    turfs: {
      turf_arena_01: {
        id: 'turf_arena_01',
        vendorId: 'vendor_vendor_turf_com',
        name: 'Kickoff Champions Arena',
        description: 'FIFA-approved synthetic turf suitable for Football, Box Cricket, and Badminton. High-mast LED lighting, player dugout, locker room, and cafeteria.',
        sports: ['Football', 'Cricket', 'Badminton'],
        sport: 'Football',
        pricePerHour: 800,
        hourlyRate: 800,
        images: [
          'https://images.unsplash.com/photo-1529900245534-47fbf7b0bf9e?w=800',
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
        ],
        logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
        location: {
          address: '124 Sports Arena Blvd, Annanagar',
          city: 'Chennai',
          state: 'Tamil Nadu',
          zip: '600040',
          lat: 13.0827,
          lng: 80.2707,
        },
        slotConfig: {
          openTime: '06:00',
          closeTime: '23:00',
          slotDurationMins: 60,
        },
        rating: { avg: 4.9, count: 18 },
        ratingAvg: 4.9,
        reviewsCount: 18,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    },
    bookings: {},
    reviews: {},
    matches: {},
    reports: {},
    otps: {},
    notifications: {},
    subscriptions: {},
    orders: {},
  };

  // 1. Reset Local Fallback JSON DB
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(freshDb, null, 2), 'utf8');
  console.log('✅ Local Database JSON file reset with clean seed data');

  // 2. Clear and Seed Railway PostgreSQL
  try {
    const firestoreService = require('../services/firestoreService');

    // Clean ephemeral collections
    const collectionsToClear = ['bookings', 'reviews', 'matches', 'reports', 'otps', 'notifications', 'subscriptions'];
    for (const col of collectionsToClear) {
      await query('DELETE FROM documents WHERE collection = $1', [col]);
      console.log(`🧹 Cleaned PostgreSQL collection: ${col}`);
    }

    // Seed core users, vendors, and turfs in PostgreSQL
    await firestoreService.setDoc('users', 'user_admin_zuna_com', freshDb.users.user_admin_zuna_com);
    await firestoreService.setDoc('users', 'user_9876543210', freshDb.users.user_9876543210);
    await firestoreService.setDoc('vendors', 'vendor_vendor_turf_com', freshDb.vendors.vendor_vendor_turf_com);
    await firestoreService.setDoc('turfs', 'turf_arena_01', freshDb.turfs.turf_arena_01);
    console.log('✅ Fresh Railway PostgreSQL seed records created successfully!');
  } catch (err) {
    console.warn('⚠️ PostgreSQL seed warning:', err.message);
  }

  console.log('\n🎉 Fresh Railway PostgreSQL Database Ready!');
  console.log('----------------------------------------------------');
  console.log('👑 Super Admin: admin@zuna.com / Password@123');
  console.log('🏟️ Vendor:      vendor@turf.com / Password@123');
  console.log('⚽ Player User: 9876543210 (OTP: 1234) or player@turf.com / Password@123');
  console.log('----------------------------------------------------');
}

if (require.main === module) {
  resetAndSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { resetAndSeed };
