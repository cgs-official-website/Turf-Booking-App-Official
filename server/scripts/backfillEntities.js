const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const prisma = require('../config/prisma');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const isApply = process.argv.includes('--apply');
  const mode = isApply ? 'APPLY (LIVE WRITE)' : 'DRY-RUN (SIMULATION ONLY - NO WRITES)';

  console.log('='.repeat(70));
  console.log(` TURF BOOKING ENTITY BACKFILL SCRIPT`);
  console.log(` MODE: ${mode}`);
  console.log('='.repeat(70));

  try {
    // -------------------------------------------------------------
    // 1. Fetch raw data from `documents`
    // -------------------------------------------------------------
    const [vendorsRes, turfsRes, usersRes, bookingsRes] = await Promise.all([
      pool.query("SELECT id, data, created_at, updated_at FROM documents WHERE collection = 'vendors'"),
      pool.query("SELECT id, data, created_at, updated_at FROM documents WHERE collection = 'turfs'"),
      pool.query("SELECT id, data, created_at, updated_at FROM documents WHERE collection = 'users'"),
      pool.query("SELECT booking_id, user_id, turf_id, vendor_id, booking_status FROM bookings"),
    ]);

    const vendorDocs = vendorsRes.rows;
    const turfDocs = turfsRes.rows;
    const userDocs = usersRes.rows;
    const bookingRows = bookingsRes.rows;

    console.log(`\n[Read Documents]`);
    console.log(`- Vendors read from documents: ${vendorDocs.length}`);
    console.log(`- Turfs read from documents:   ${turfDocs.length}`);
    console.log(`- Users read from documents:   ${userDocs.length}`);
    console.log(`- Existing bookings checked:   ${bookingRows.length}`);

    // -------------------------------------------------------------
    // 2. Prepare Vendors
    // -------------------------------------------------------------
    const plannedVendors = [];
    const skippedVendors = [];
    const validVendorIds = new Set();

    for (const row of vendorDocs) {
      const data = row.data || {};
      const id = row.id || data.id || data.uid;
      const email = data.email ? String(data.email).toLowerCase().trim() : null;
      const name = data.name || null;
      const passwordHash = data.passwordHash || null;

      if (!id) {
        skippedVendors.push({ id: row.id, reason: 'Missing id' });
        continue;
      }
      if (!name) {
        skippedVendors.push({ id, reason: 'Missing name' });
        continue;
      }
      if (!email) {
        skippedVendors.push({ id, reason: 'Missing email' });
        continue;
      }
      if (!passwordHash) {
        skippedVendors.push({ id, reason: 'Missing password_hash (NOT NULL constraint)' });
        continue;
      }

      const validKyc = ['pending', 'approved', 'rejected', 'suspended'].includes(data.kycStatus)
        ? data.kycStatus
        : 'pending';

      const vendorRecord = {
        id,
        name,
        email,
        phone: data.phone ? String(data.phone).trim() : null,
        passwordHash, // Copied unchanged, never rehashed, never logged
        kycStatus: validKyc,
        subscription: data.subscription || null,
        turfOnboardingComplete: Boolean(data.turfOnboardingComplete),
        turfApprovalAcknowledged: Boolean(data.turfApprovalAcknowledged),
        createdAt: data.createdAt ? new Date(data.createdAt) : (row.created_at || new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (row.updated_at || new Date()),
      };

      plannedVendors.push(vendorRecord);
      validVendorIds.add(id);
    }

    // -------------------------------------------------------------
    // 3. Prepare Turfs
    // -------------------------------------------------------------
    const plannedTurfs = [];
    const skippedTurfs = [];
    const validTurfIds = new Set();

    for (const row of turfDocs) {
      const data = row.data || {};
      const id = row.id || data.id;

      if (!id) {
        skippedTurfs.push({ id: row.id, reason: 'Missing id' });
        continue;
      }

      // Vendor ID check: strictly match existing valid vendor, never guess
      const vendorId = data.vendorId || data.vendor_id;
      if (!vendorId) {
        skippedTurfs.push({ id, reason: 'No vendorId specified in turf data' });
        continue;
      }
      if (!validVendorIds.has(vendorId)) {
        skippedTurfs.push({ id, reason: `vendorId "${vendorId}" has no matching vendor in valid vendors list` });
        continue;
      }

      // Name check
      const name = data.name;
      if (!name) {
        skippedTurfs.push({ id, reason: 'Missing name' });
        continue;
      }

      // City check: strictly resolve from real data, no fallback default
      const city = data.location?.city || data.city;
      if (!city || typeof city !== 'string' || !city.trim()) {
        skippedTurfs.push({ id, reason: 'city cannot be resolved from real data (no fallback allowed)' });
        continue;
      }

      // PricePerHour check: strictly resolve from real data, no fallback default
      const rawPrice = data.pricePerHour ?? data.hourlyRate ?? data.pricing?.baseRate;
      const priceNum = Number(rawPrice);
      if (rawPrice === null || rawPrice === undefined || isNaN(priceNum) || priceNum <= 0) {
        skippedTurfs.push({ id, reason: `pricePerHour cannot be resolved from real data (value: ${rawPrice}, no fallback allowed)` });
        continue;
      }

      // Sports array
      let sports = [];
      if (Array.isArray(data.sports) && data.sports.length > 0) {
        sports = data.sports.map(String);
      } else if (Array.isArray(data.sportTypes) && data.sportTypes.length > 0) {
        sports = data.sportTypes.map(String);
      } else if (data.sport) {
        sports = [String(data.sport)];
      }

      const courtCount = parseInt(data.courtCount || data.numberOfCourts || 1, 10);
      const lat = data.location?.lat != null ? Number(data.location.lat) : null;
      const lng = data.location?.lng != null ? Number(data.location.lng) : null;
      const validStatus = ['active', 'inactive', 'pending', 'suspended'].includes(data.status)
        ? data.status
        : 'active';

      const turfRecord = {
        id,
        vendorId,
        name,
        description: data.description ? String(data.description) : null,
        sports,
        pricePerHour: priceNum,
        courtCount: isNaN(courtCount) ? 1 : courtCount,
        location: data.location || null,
        city: city.trim(),
        lat: isNaN(lat) ? null : lat,
        lng: isNaN(lng) ? null : lng,
        slotConfig: data.slotConfig || null,
        logo: data.logo ? String(data.logo) : null,
        images: Array.isArray(data.images) ? data.images.map(String) : [],
        amenities: Array.isArray(data.amenities) ? data.amenities.map(String) : [],
        ratingAvg: Number(data.rating?.avg ?? data.ratingAvg ?? 0) || 0,
        reviewsCount: Number(data.rating?.count ?? data.reviewsCount ?? 0) || 0,
        status: validStatus,
        createdAt: data.createdAt ? new Date(data.createdAt) : (row.created_at || new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (row.updated_at || new Date()),
      };

      plannedTurfs.push(turfRecord);
      validTurfIds.add(id);
    }

    // -------------------------------------------------------------
    // 4. Prepare Users & Wishlists
    // -------------------------------------------------------------
    const plannedUsers = [];
    const skippedUsers = [];
    const validUserIds = new Set();
    const plannedWishlists = [];
    const skippedWishlists = [];

    for (const row of userDocs) {
      const data = row.data || {};
      const id = row.id || data.id || data.uid;
      const name = data.name;

      if (!id) {
        skippedUsers.push({ id: row.id, reason: 'Missing id' });
        continue;
      }
      if (!name) {
        skippedUsers.push({ id, reason: 'Missing name' });
        continue;
      }

      const email = data.email ? String(data.email).toLowerCase().trim() : null;
      const phone = data.phone ? String(data.phone).trim() : null;
      const validStatus = ['active', 'inactive', 'suspended'].includes(data.status)
        ? data.status
        : 'active';

      const userRecord = {
        id,
        name,
        email,
        phone,
        passwordHash: data.passwordHash || null, // Copied unchanged, never rehashed, never logged
        avatar: data.avatar || data.photoURL || null,
        location: data.location || null,
        status: validStatus,
        createdAt: data.createdAt ? new Date(data.createdAt) : (row.created_at || new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (row.updated_at || new Date()),
      };

      plannedUsers.push(userRecord);
      validUserIds.add(id);

      // Wishlist items for this user
      if (Array.isArray(data.wishlist)) {
        for (const turfId of data.wishlist) {
          if (!turfId) continue;
          if (validTurfIds.has(turfId)) {
            plannedWishlists.push({
              userId: id,
              turfId,
              createdAt: new Date(),
            });
          } else {
            skippedWishlists.push({
              userId: id,
              turfId,
              reason: `Turf "${turfId}" does not exist in valid turfs table`,
            });
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 5. Audit Report of Planned Backfill
    // -------------------------------------------------------------
    console.log(`\n--- VENDORS MAPPING SUMMARY ---`);
    console.log(`- Valid & ready to upsert: ${plannedVendors.length}`);
    plannedVendors.forEach((v) => {
      console.log(`  + [Vendor] id: "${v.id}" | email: "${v.email}" | name: "${v.name}" | kyc: "${v.kycStatus}"`);
    });
    if (skippedVendors.length > 0) {
      console.log(`- Skipped vendors: ${skippedVendors.length}`);
      skippedVendors.forEach((s) => console.log(`  ! Skipped vendor id "${s.id}": ${s.reason}`));
    }

    console.log(`\n--- TURFS MAPPING SUMMARY ---`);
    console.log(`- Valid & ready to upsert: ${plannedTurfs.length}`);
    plannedTurfs.forEach((t) => {
      console.log(`  + [Turf] id: "${t.id}" | name: "${t.name}" | vendorId: "${t.vendorId}" | city: "${t.city}" | pricePerHour: ₹${t.pricePerHour}`);
    });
    if (skippedTurfs.length > 0) {
      console.log(`- Skipped turfs: ${skippedTurfs.length}`);
      skippedTurfs.forEach((s) => console.log(`  ! Skipped turf id "${s.id}": ${s.reason}`));
    }

    console.log(`\n--- USERS & WISHLIST MAPPING SUMMARY ---`);
    console.log(`- Valid users ready to upsert:     ${plannedUsers.length}`);
    plannedUsers.forEach((u) => {
      console.log(`  + [User] id: "${u.id}" | name: "${u.name}" | email: "${u.email || 'N/A'}" | phone: "${u.phone || 'N/A'}"`);
    });
    if (skippedUsers.length > 0) {
      console.log(`- Skipped users: ${skippedUsers.length}`);
      skippedUsers.forEach((s) => console.log(`  ! Skipped user id "${s.id}": ${s.reason}`));
    }
    console.log(`- Valid wishlist items to upsert:  ${plannedWishlists.length}`);
    if (skippedWishlists.length > 0) {
      console.log(`- Skipped wishlist items: ${skippedWishlists.length}`);
      skippedWishlists.forEach((w) => console.log(`  ! Skipped wishlist for user "${w.userId}": ${w.reason}`));
    }

    // -------------------------------------------------------------
    // 6. Read-Only Foreign Key Audit on Existing Bookings
    // -------------------------------------------------------------
    console.log(`\n--- READ-ONLY BOOKINGS FOREIGN KEY AUDIT ---`);
    console.log(`Total existing bookings in database: ${bookingRows.length}`);
    let missingTurfCount = 0;
    let missingUserCount = 0;

    for (const b of bookingRows) {
      const hasTurf = validTurfIds.has(b.turf_id);
      const hasUser = validUserIds.has(b.user_id);
      if (!hasTurf) missingTurfCount++;
      if (!hasUser) missingUserCount++;

      const turfStatus = hasTurf ? 'EXISTS in new turfs' : 'MISSING in new turfs';
      const userStatus = hasUser ? 'EXISTS in new users' : 'MISSING in new users';

      console.log(`  * Booking [${b.booking_id}]: status: "${b.booking_status}" | turfId: "${b.turf_id}" -> [${turfStatus}] | userId: "${b.user_id}" -> [${userStatus}]`);
    }

    console.log(`\n[Bookings Relation Audit Summary]`);
    console.log(`- Bookings referencing valid new Turfs: ${bookingRows.length - missingTurfCount} / ${bookingRows.length}`);
    console.log(`- Bookings referencing valid new Users: ${bookingRows.length - missingUserCount} / ${bookingRows.length}`);
    if (missingTurfCount > 0 || missingUserCount > 0) {
      console.log(`ℹ️ As expected, FK constraints on bookings table must remain omitted until user records are populated.`);
    } else {
      console.log(`✅ All bookings point to valid turfs and users.`);
    }

    // -------------------------------------------------------------
    // 7. Execution or Dry-Run Exit
    // -------------------------------------------------------------
    if (!isApply) {
      console.log('\n' + '='.repeat(70));
      console.log(' [DRY-RUN COMPLETED] Zero database writes performed.');
      console.log(' To execute real backfill, run with --apply after approval.');
      console.log('='.repeat(70));
      return;
    }

    // Live execution inside a single atomic Prisma transaction
    console.log('\n' + '='.repeat(70));
    console.log(' [APPLY MODE] Executing atomic transaction in database...');
    console.log('='.repeat(70));

    await prisma.$transaction(async (tx) => {
      // 1. Vendors
      for (const v of plannedVendors) {
        await tx.vendor.upsert({
          where: { id: v.id },
          create: v,
          update: v,
        });
      }
      console.log(`✅ Upserted ${plannedVendors.length} vendors`);

      // 2. Turfs
      for (const t of plannedTurfs) {
        await tx.turf.upsert({
          where: { id: t.id },
          create: t,
          update: t,
        });
      }
      console.log(`✅ Upserted ${plannedTurfs.length} turfs`);

      // 3. Users
      for (const u of plannedUsers) {
        await tx.user.upsert({
          where: { id: u.id },
          create: u,
          update: u,
        });
      }
      console.log(`✅ Upserted ${plannedUsers.length} users`);

      // 4. Wishlist Items
      for (const w of plannedWishlists) {
        await tx.wishlistItem.upsert({
          where: {
            userId_turfId: {
              userId: w.userId,
              turfId: w.turfId,
            },
          },
          create: w,
          update: {},
        });
      }
      console.log(`✅ Upserted ${plannedWishlists.length} wishlist items`);
    }, { timeout: 30000 });

    console.log('\n🎉 ALL ENTITIES BACKFILLED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Backfill execution failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    await prisma.$disconnect();
  }
}

main();
