/**
 * Turf Booking - Prisma Backfill Migration Script
 *
 * Migrates legacy bookings from `documents` (collection = 'bookings')
 * to the new PostgreSQL `bookings` table using Prisma Client.
 *
 * Features:
 * - 100% Idempotent (upsert by bookingId)
 * - Safe Dry-run by default (--apply required to write)
 * - Vendor ID resolution from turf documents
 * - Slot clash detection matching partial unique index `bookings_active_slot_key`
 * - Comprehensive status/payment mapping audit report
 * - Never deletes or modifies the legacy `documents` table
 *
 * Usage:
 *   Dry-Run (Default): node scripts/backfillBookings.js
 *   Explicit Dry-Run:  node scripts/backfillBookings.js --dry-run
 *   Apply Changes:     node scripts/backfillBookings.js --apply
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const { query, pool } = require('../config/db');
const prisma = require('../config/prisma');

// CLI Flags
const isApply = process.argv.includes('--apply');
const isDryRun = !isApply || process.argv.includes('--dry-run');

// Known default turfs fallback for vendor lookup
const DEFAULT_TURFS = [
  { id: 'turf_thunder_arena_perundurai', vendorId: 'vendor_vendor_turf_com' },
  { id: 'turf_green_valley_salem', vendorId: 'vendor_vendor_turf_com' },
  { id: 'turf_kickoff_arena_erode', vendorId: 'vendor_vendor_turf_com' },
  { id: 'turf_arena_01', vendorId: 'vendor_vendor_turf_com' },
];

/**
 * Normalizes ISO date string or Date object to YYYY-MM-DD
 */
function normalizeDateStr(rawDate) {
  if (!rawDate) return null;
  if (typeof rawDate === 'string') {
    const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = new Date(rawDate);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Normalizes time string to HH:mm (24-hour)
 */
function normalizeTimeStr(rawTime) {
  if (!rawTime || typeof rawTime !== 'string') return null;
  const match = rawTime.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2];
    return `${h}:${m}`;
  }
  return null;
}

/**
 * Map legacy status string to Prisma BookingStatus enum
 */
function mapBookingStatus(rawStatus, paymentStatus) {
  const s = String(rawStatus || '').toLowerCase().trim();
  switch (s) {
    case 'confirmed':
      return 'confirmed';
    case 'completed':
      return 'completed';
    case 'pending':
      return 'pending';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'rejected':
      return 'rejected';
    case 'reserved':
      return 'reserved';
    case 'expired':
      return 'expired';
    default:
      return paymentStatus === 'success' ? 'confirmed' : 'pending';
  }
}

/**
 * Map legacy payment status string to Prisma PaymentStatus enum
 */
function mapPaymentStatus(rawStatus) {
  const s = String(rawStatus || '').toLowerCase().trim();
  switch (s) {
    case 'success':
    case 'paid':
    case 'completed':
      return 'success';
    case 'failed':
      return 'failed';
    case 'refunded':
      return 'refunded';
    case 'pending':
    default:
      return 'pending';
  }
}

/**
 * Map legacy payment method
 */
function mapPaymentMethod(rawMethod) {
  if (!rawMethod) return null;
  const m = String(rawMethod).toLowerCase().trim();
  if (m === 'hand_cash' || m === 'cash') return 'cash';
  if (m === 'online' || m === 'razorpay') return 'razorpay';
  return m.slice(0, 16);
}

/**
 * Safe parser for timestamp fields
 */
function parseTimestamp(raw, fallback = new Date()) {
  if (!raw) return fallback;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? fallback : raw;
  if (typeof raw === 'object' && raw._seconds) {
    return new Date(raw._seconds * 1000);
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? fallback : d;
}

async function runBackfill() {
  console.log('==============================================================');
  console.log('        TURF BOOKING: PRISMA BOOKINGS BACKFILL MIGRATION      ');
  console.log('==============================================================');
  console.log(`Execution Mode:  ${isDryRun ? '🔍 DRY-RUN (Audit only - NO DB WRITES)' : '🚀 APPLY (Writing to PostgreSQL bookings table)'}`);
  console.log('Timestamp:       ' + new Date().toISOString());
  console.log('--------------------------------------------------------------\n');

  // Statistics Collectors
  const stats = {
    totalScanned: 0,
    migrated: 0,
    skipped: 0,
    statusBreakdown: {
      confirmed: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
      rejected: 0,
      reserved: 0,
      expired: 0,
    },
    paymentStatusBreakdown: {
      success: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
    },
    vendorResolution: {
      direct: 0,
      fromTurf: 0,
      fallback: 0,
    },
    skippedRows: [],
  };

  // 1. Fetch Turfs for Vendor Resolution
  console.log('📦 Loading turf directory for vendorId resolution...');
  const turfMap = new Map();
  for (const dt of DEFAULT_TURFS) {
    turfMap.set(dt.id, { vendorId: dt.vendorId });
  }

  try {
    const turfRows = await query("SELECT id, data FROM documents WHERE collection = 'turfs'");
    for (const r of turfRows.rows) {
      if (r.data && typeof r.data === 'object') {
        turfMap.set(r.id, r.data);
      }
    }
    console.log(`✅ Loaded ${turfRows.rows.length} turf definitions from database.`);
  } catch (err) {
    console.warn(`⚠️ Could not query turfs from documents table (${err.message}). Using fallback defaults.`);
  }

  // 2. Fetch Legacy Bookings
  console.log('\n📖 Fetching legacy booking documents...');
  let legacyRows = [];
  try {
    const res = await query(
      "SELECT id, data, created_at, updated_at FROM documents WHERE collection = 'bookings' ORDER BY created_at ASC"
    );
    legacyRows = res.rows;
    console.log(`✅ Retrieved ${legacyRows.length} legacy booking rows from 'documents' table.`);
  } catch (err) {
    console.error(`❌ Failed to read legacy bookings from PostgreSQL documents table: ${err.message}`);
    // Check local fallback
    const localDbPath = path.join(__dirname, '../data/local_db.json');
    if (fs.existsSync(localDbPath)) {
      try {
        const localData = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        const localBookings = localData.bookings || {};
        legacyRows = Object.keys(localBookings).map((id) => ({
          id,
          data: localBookings[id],
          created_at: localBookings[id].createdAt,
          updated_at: localBookings[id].updatedAt,
        }));
        console.log(`ℹ️ Fallback: Loaded ${legacyRows.length} booking rows from local_db.json.`);
      } catch (fErr) {
        console.error(`❌ Failed to read local_db.json fallback: ${fErr.message}`);
      }
    }
  }

  stats.totalScanned = legacyRows.length;

  if (legacyRows.length === 0) {
    console.log('\nℹ️ No legacy bookings found to backfill. Migration complete.');
    printReport(stats);
    return;
  }

  // Active slot tracker for partial unique index duplicate detection
  // Key: turfId#courtNumber#bookingDate#startTime
  const activeSlotsSeen = new Map();

  console.log('\n⚙️ Processing and validating legacy bookings...');

  for (const row of legacyRows) {
    const data = row.data || {};
    const bookingId = String(row.id || data.id || data._id || data.bookingId || '').trim();

    // Check mandatory Booking ID
    if (!bookingId) {
      stats.skipped++;
      stats.skippedRows.push({
        bookingId: '(none)',
        reason: 'MISSING_BOOKING_ID: Record has no identifier.',
      });
      continue;
    }

    // Check mandatory User ID
    const userId = String(data.userId || data.user_id || '').trim();
    if (!userId) {
      stats.skipped++;
      stats.skippedRows.push({
        bookingId,
        reason: 'MISSING_USER_ID: No userId associated with booking.',
      });
      continue;
    }

    // Check mandatory Turf ID
    const turfId = String(data.turfId || data.turf_id || '').trim();
    if (!turfId) {
      stats.skipped++;
      stats.skippedRows.push({
        bookingId,
        reason: 'MISSING_TURF_ID: No turfId associated with booking.',
      });
      continue;
    }

    // Resolve Vendor ID
    let vendorId = String(data.vendorId || data.vendor_id || '').trim();
    if (vendorId) {
      stats.vendorResolution.direct++;
    } else {
      const turfDoc = turfMap.get(turfId);
      if (turfDoc && turfDoc.vendorId) {
        vendorId = String(turfDoc.vendorId).trim();
        stats.vendorResolution.fromTurf++;
      } else {
        // Fallback default vendor
        vendorId = 'vendor_vendor_turf_com';
        stats.vendorResolution.fallback++;
      }
    }

    // Validate Booking Date
    const rawDate = data.date || data.bookingDate || data.booking_date;
    const dateStr = normalizeDateStr(rawDate);
    if (!dateStr) {
      stats.skipped++;
      stats.skippedRows.push({
        bookingId,
        reason: `INVALID_DATE: Could not parse booking date '${rawDate}'`,
      });
      continue;
    }
    const bookingDate = new Date(`${dateStr}T00:00:00.000Z`);

    // Validate Start & End Times
    const startTime = normalizeTimeStr(data.startTime || data.start_time);
    const endTime = normalizeTimeStr(data.endTime || data.end_time);
    if (!startTime || !endTime) {
      stats.skipped++;
      stats.skippedRows.push({
        bookingId,
        reason: `INVALID_TIME: Invalid start/end times ('${data.startTime}' - '${data.endTime}')`,
      });
      continue;
    }

    // Court Number
    const courtNumber = Math.max(1, parseInt(data.courtNumber || data.court_number, 10) || 1);

    // Total Amount
    const rawAmount = data.totalAmount ?? data.amount ?? data.price ?? data.total_amount ?? 0;
    const totalAmount = Math.max(0, Number(rawAmount) || 0);

    // Status Mapping
    const paymentStatus = mapPaymentStatus(data.paymentStatus || data.payment_status);
    const bookingStatus = mapBookingStatus(data.status || data.bookingStatus, paymentStatus);

    // Timestamps
    const createdAt = parseTimestamp(data.createdAt || data.created_at || row.created_at);
    const updatedAt = parseTimestamp(data.updatedAt || data.updated_at || row.updated_at, createdAt);

    // Slot Clash Prevention (bookings_active_slot_key)
    // Constraint is on: (turf_id, court_number, booking_date, start_time) WHERE booking_status IN ('reserved', 'pending', 'confirmed')
    const isActiveStatus = ['reserved', 'pending', 'confirmed'].includes(bookingStatus);
    const slotKey = `${turfId}#${courtNumber}#${dateStr}#${startTime}`;

    if (isActiveStatus) {
      if (activeSlotsSeen.has(slotKey)) {
        const conflictingBookingId = activeSlotsSeen.get(slotKey);
        stats.skipped++;
        stats.skippedRows.push({
          bookingId,
          reason: `SLOT_CLASH: Slot ${dateStr} ${startTime} (Court ${courtNumber}) on turf ${turfId} already occupied by active booking '${conflictingBookingId}'. Skipped to prevent unique constraint failure.`,
        });
        continue;
      }
      activeSlotsSeen.set(slotKey, bookingId);
    }

    // Construct Prisma Record
    const bookingRecord = {
      bookingId,
      userId,
      vendorId,
      turfId,
      slotId: data.slotId || data.slot_id ? String(data.slotId || data.slot_id).slice(0, 255) : null,
      bookingDate,
      startTime,
      endTime,
      totalAmount,
      bookingStatus,
      paymentStatus,
      courtNumber,
      sport: data.sport ? String(data.sport).slice(0, 64) : null,
      paymentMethod: mapPaymentMethod(data.paymentMethod || data.payment_method || data.paymentMode),
      razorpayOrderId: data.razorpayOrderId || data.razorpay_order_id ? String(data.razorpayOrderId || data.razorpay_order_id).slice(0, 64) : null,
      razorpayPaymentId: data.razorpayPaymentId || data.razorpay_payment_id ? String(data.razorpayPaymentId || data.razorpay_payment_id).slice(0, 64) : null,
      holdExpiresAt: data.holdExpiresAt ? parseTimestamp(data.holdExpiresAt, null) : null,
      requestedAt: data.requestedAt ? parseTimestamp(data.requestedAt, null) : null,
      rejectionReason: data.rejectionReason || data.rejectReason || null,
      cancellationReason: data.cancellationReason || data.cancelReason || null,
      isReviewed: Boolean(data.isReviewed || data.is_reviewed || data.reviewId),
      reviewId: data.reviewId ? String(data.reviewId).slice(0, 255) : null,
      createdAt,
      updatedAt,
    };

    // Upsert or Dry-Run
    if (isApply) {
      try {
        await prisma.booking.upsert({
          where: { bookingId },
          create: bookingRecord,
          update: bookingRecord,
        });
        stats.migrated++;
        stats.statusBreakdown[bookingStatus]++;
        stats.paymentStatusBreakdown[paymentStatus]++;
      } catch (err) {
        if (err.code === 'P2002') {
          stats.skipped++;
          stats.skippedRows.push({
            bookingId,
            reason: `P2002: Unique constraint failed on target (${err.meta?.target || 'bookings_active_slot_key'}). Slot occupied.`,
          });
        } else {
          stats.skipped++;
          stats.skippedRows.push({
            bookingId,
            reason: `DB_ERROR: ${err.message}`,
          });
        }
      }
    } else {
      // Dry run simulation
      stats.migrated++;
      stats.statusBreakdown[bookingStatus]++;
      stats.paymentStatusBreakdown[paymentStatus]++;
    }
  }

  printReport(stats);
}

/**
 * Print detailed migration report
 */
function printReport(stats) {
  console.log('\n==============================================================');
  console.log('                 MIGRATION AUDIT REPORT                       ');
  console.log('==============================================================');
  console.log(`Execution Mode:            ${isDryRun ? 'DRY-RUN (Simulated)' : 'APPLIED (Database updated)'}`);
  console.log(`Total Documents Scanned:   ${stats.totalScanned}`);
  console.log(`Successfully Backfilled:   ${stats.migrated}`);
  console.log(`Skipped Rows:              ${stats.skipped}`);
  console.log('--------------------------------------------------------------');
  console.log('STATUS BREAKDOWN:');
  console.log(`  - Confirmed:             ${stats.statusBreakdown.confirmed}`);
  console.log(`  - Completed:             ${stats.statusBreakdown.completed}`);
  console.log(`  - Pending:               ${stats.statusBreakdown.pending}`);
  console.log(`  - Cancelled:             ${stats.statusBreakdown.cancelled}`);
  console.log(`  - Rejected:              ${stats.statusBreakdown.rejected}`);
  console.log(`  - Reserved:              ${stats.statusBreakdown.reserved}`);
  console.log(`  - Expired:               ${stats.statusBreakdown.expired}`);
  console.log('--------------------------------------------------------------');
  console.log('PAYMENT STATUS BREAKDOWN:');
  console.log(`  - Success:               ${stats.paymentStatusBreakdown.success}`);
  console.log(`  - Pending:               ${stats.paymentStatusBreakdown.pending}`);
  console.log(`  - Failed:                ${stats.paymentStatusBreakdown.failed}`);
  console.log(`  - Refunded:              ${stats.paymentStatusBreakdown.refunded}`);
  console.log('--------------------------------------------------------------');
  console.log('VENDOR ID RESOLUTION:');
  console.log(`  - Direct from booking:   ${stats.vendorResolution.direct}`);
  console.log(`  - Resolved from turf:    ${stats.vendorResolution.fromTurf}`);
  console.log(`  - Default fallback:      ${stats.vendorResolution.fallback}`);
  console.log('--------------------------------------------------------------');

  if (stats.skippedRows.length > 0) {
    console.log(`SKIPPED ROWS DETAILS (${stats.skippedRows.length} total):`);
    stats.skippedRows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. [${row.bookingId}] ${row.reason}`);
    });
  } else {
    console.log('SKIPPED ROWS DETAILS: None. All scanned rows valid!');
  }

  console.log('==============================================================\n');
}

// Execute backfill script
runBackfill()
  .catch((err) => {
    console.error('💥 Fatal error executing backfill script:', err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
    if (pool) {
      try {
        await pool.end();
      } catch {}
    }
  });
