/**
 * Turf Booking - Phase 5 Integration Test Suite
 *
 * Verifies the 11 end-to-end booking flow scenarios against a live API server
 * connected to the designated scratch PostgreSQL database.
 *
 * Requirements:
 * - Plain Node.js (fetch, jsonwebtoken, dotenv)
 * - Refuses to run unless TEST_BASE_URL is explicitly provided
 * - Uses synthetic JWT tokens (user_test_*, vendor_test_*)
 * - Operates only on run-specific test data (tracked by exact IDs)
 * - Cleanup deletes ONLY the exact booking IDs and document IDs created by this run
 * - No wildcard or startsWith deletions
 *
 * Usage:
 *   $env:TEST_BASE_URL="http://localhost:5000/api/v1"
 *   node scripts/testBookingFlow.js
 */

const path = require('path');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config({ path: path.join(__dirname, '../.env') });

const { query, pool } = require('../config/db');
const prisma = require('../config/prisma');

// Safeguard 1: Refuse execution without TEST_BASE_URL
const BASE_URL = process.env.TEST_BASE_URL;
if (!BASE_URL) {
  console.error('\n❌ ERROR: TEST_BASE_URL environment variable is required.');
  console.error('Refusing to execute against unspecified environment.\n');
  console.error('Example (PowerShell):');
  console.error('  $env:TEST_BASE_URL = "http://localhost:5000/api/v1"');
  console.error('  node scripts/testBookingFlow.js\n');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';

// Synthetic Test Identities
const TOKENS = {
  user1: jwt.sign({ uid: 'user_test_1', email: 'user1@test.com', role: 'user' }, JWT_SECRET, { expiresIn: '2h' }),
  user2: jwt.sign({ uid: 'user_test_2', email: 'user2@test.com', role: 'user' }, JWT_SECRET, { expiresIn: '2h' }),
  vendor1: jwt.sign({ uid: 'vendor_test_1', email: 'vendor1@test.com', role: 'vendor' }, JWT_SECRET, { expiresIn: '2h' }),
  vendor2: jwt.sign({ uid: 'vendor_test_2', email: 'vendor2@test.com', role: 'vendor' }, JWT_SECRET, { expiresIn: '2h' }),
};

// Helper: HTTP request wrapper
async function apiRequest(endpoint, { method = 'GET', token, body } = {}) {
  const url = `${BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const rawText = await res.text();
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { rawText };
  }

  return { status: res.status, ok: res.ok, data };
}

// Test Runner
const testResults = [];
function recordResult(caseNumber, name, passed, details = '') {
  testResults.push({ caseNumber, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Case ${String(caseNumber).padStart(2, '0')}] ${icon} - ${name}${details ? ` (${details})` : ''}`);
}

async function runTestSuite() {
  // Unique Run ID for complete collision avoidance
  const RUN_ID = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const TURF_ID_1 = `turf_test_1_${RUN_ID}`;
  const TURF_ID_NOVENDOR = `turf_test_novendor_${RUN_ID}`;

  // Exact ID Trackers for 100% surgical cleanup
  const createdDocIds = new Set();
  const createdBookingIds = new Set();

  console.log('==============================================================');
  console.log('        TURF BOOKING: PHASE 5 INTEGRATION TEST SUITE          ');
  console.log('==============================================================');
  console.log(`Target URL:        ${BASE_URL}`);
  console.log(`Test Run ID:       ${RUN_ID}`);
  console.log(`Timestamp:         ${new Date().toISOString()}`);
  console.log('--------------------------------------------------------------\n');

  const TEST_DATE = '2026-12-01'; // Future date to avoid collision
  let bookingId1 = null;
  let bookingId2 = null;
  let bookingId3 = null;
  let mainError = null;
  let cleanupError = null;

  try {
    // ── Setup: Insert unique test turf fixtures (create-only, no upsert) ──
    console.log('🔧 Setting up test turf fixtures in database (create-only)...');
    
    // Turf 1: Assigned to vendor_test_1
    const res1 = await query(
      `INSERT INTO documents (collection, id, data, created_at, updated_at)
       VALUES ('turfs', $1, $2::jsonb, NOW(), NOW())`,
      [
        TURF_ID_1,
        JSON.stringify({
          name: `Test Stadium Arena (${RUN_ID})`,
          vendorId: 'vendor_test_1',
          courtCount: 1,
          pricing: { baseRate: 600 },
          slotConfig: { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 },
        }),
      ]
    );
    if (res1.rowCount === 1) {
      createdDocIds.add(TURF_ID_1);
    } else {
      throw new Error(`Failed to create test turf fixture ${TURF_ID_1}`);
    }

    // Turf 2: Unassigned (no vendor)
    const res2 = await query(
      `INSERT INTO documents (collection, id, data, created_at, updated_at)
       VALUES ('turfs', $1, $2::jsonb, NOW(), NOW())`,
      [
        TURF_ID_NOVENDOR,
        JSON.stringify({
          name: `Test Stadium Unassigned (${RUN_ID})`,
          vendorId: null,
          courtCount: 1,
          pricing: { baseRate: 600 },
          slotConfig: { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 },
        }),
      ]
    );
    if (res2.rowCount === 1) {
      createdDocIds.add(TURF_ID_NOVENDOR);
    } else {
      throw new Error(`Failed to create test turf fixture ${TURF_ID_NOVENDOR}`);
    }

    console.log('✅ Fixtures created and tracked successfully.\n');

    // ──────────────────────────────────────────────────────────
    // Case 1: User reserves a slot -> 201, status 'reserved'
    // ──────────────────────────────────────────────────────────
    try {
      const res = await apiRequest('/bookings/reserve', {
        method: 'POST',
        token: TOKENS.user1,
        body: {
          turfId: TURF_ID_1,
          date: TEST_DATE,
          startTime: '10:00',
          endTime: '11:00',
          amount: 600,
        },
      });

      const passed = res.status === 201 && (res.data?.data?.booking?.status === 'reserved' || res.data?.data?.booking?.bookingStatus === 'reserved');
      bookingId1 = res.data?.data?.booking?.id || res.data?.data?.booking?.bookingId;
      if (bookingId1) {
        createdBookingIds.add(bookingId1);
      }
      recordResult(1, 'User reserves a slot -> 201 reserved', passed, `status: ${res.status}, id: ${bookingId1}`);
    } catch (err) {
      recordResult(1, 'User reserves a slot -> 201 reserved', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 2: Second user reserves same slot -> 409 SLOT_HELD
    // ──────────────────────────────────────────────────────────
    try {
      const res = await apiRequest('/bookings/reserve', {
        method: 'POST',
        token: TOKENS.user2,
        body: {
          turfId: TURF_ID_1,
          date: TEST_DATE,
          startTime: '10:00',
          endTime: '11:00',
          amount: 600,
        },
      });

      const passed = res.status === 409 && (res.data?.code === 'SLOT_HELD' || res.data?.error?.code === 'SLOT_HELD' || res.data?.error?.includes('reserved'));
      recordResult(2, 'Second user reserves same slot -> 409 SLOT_HELD', passed, `status: ${res.status}, code: ${res.data?.error?.code || res.data?.code}`);
    } catch (err) {
      recordResult(2, 'Second user reserves same slot -> 409 SLOT_HELD', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 3: User confirm-cash -> pending; row exists in bookings
    // ──────────────────────────────────────────────────────────
    try {
      const res = await apiRequest(`/bookings/${bookingId1}/confirm-cash`, {
        method: 'POST',
        token: TOKENS.user1,
      });

      const dbRow = await prisma.booking.findUnique({ where: { bookingId: bookingId1 } });
      const passed = res.status === 200 && dbRow && dbRow.bookingStatus === 'pending';
      recordResult(3, 'User confirm-cash -> pending in Prisma table', passed, `status: ${res.status}, dbStatus: ${dbRow?.bookingStatus}`);
    } catch (err) {
      recordResult(3, 'User confirm-cash -> pending in Prisma table', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 4: vendor_test_1 lists -> sees it; vendor_test_2 -> does NOT
    // ──────────────────────────────────────────────────────────
    try {
      const res1 = await apiRequest('/vendor/bookings', { method: 'GET', token: TOKENS.vendor1 });
      const res2 = await apiRequest('/vendor/bookings', { method: 'GET', token: TOKENS.vendor2 });

      const items1 = res1.data?.data?.bookings || res1.data?.data?.items || [];
      const items2 = res2.data?.data?.bookings || res2.data?.data?.items || [];

      const vendor1Sees = items1.some((b) => (b.id === bookingId1 || b.bookingId === bookingId1));
      const vendor2Sees = items2.some((b) => (b.id === bookingId1 || b.bookingId === bookingId1));

      const passed = res1.status === 200 && res2.status === 200 && vendor1Sees && !vendor2Sees;
      recordResult(4, 'Vendor isolation: vendor_test_1 sees booking, vendor_test_2 does not', passed, `v1Count: ${items1.length}, v2Count: ${items2.length}`);
    } catch (err) {
      recordResult(4, 'Vendor isolation: vendor_test_1 sees booking, vendor_test_2 does not', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 5: vendor_test_2 accept -> 403; vendor_test_2 GET detail -> 403
    // ──────────────────────────────────────────────────────────
    try {
      const acceptRes = await apiRequest(`/vendor/bookings/${bookingId1}/accept`, {
        method: 'POST',
        token: TOKENS.vendor2,
      });
      const detailRes = await apiRequest(`/vendor/bookings/${bookingId1}`, {
        method: 'GET',
        token: TOKENS.vendor2,
      });

      const passed = acceptRes.status === 403 && detailRes.status === 403;
      recordResult(5, 'Non-owner vendor accept & detail -> 403 FORBIDDEN', passed, `acceptStatus: ${acceptRes.status}, detailStatus: ${detailRes.status}`);
    } catch (err) {
      recordResult(5, 'Non-owner vendor accept & detail -> 403 FORBIDDEN', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 6: vendor_test_1 accept -> confirmed; accept again -> 409 INVALID_STATUS
    // ──────────────────────────────────────────────────────────
    try {
      const accept1 = await apiRequest(`/vendor/bookings/${bookingId1}/accept`, {
        method: 'POST',
        token: TOKENS.vendor1,
      });
      const accept2 = await apiRequest(`/vendor/bookings/${bookingId1}/accept`, {
        method: 'POST',
        token: TOKENS.vendor1,
      });

      const passed = accept1.status === 200 && accept2.status === 409;
      recordResult(6, 'Owner vendor accept -> confirmed, double accept -> 409', passed, `first: ${accept1.status}, second: ${accept2.status}`);
    } catch (err) {
      recordResult(6, 'Owner vendor accept -> confirmed, double accept -> 409', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 7: user /bookings/mine -> confirmed; other user /mine -> not shown; other user detail -> 403
    // ──────────────────────────────────────────────────────────
    try {
      const mineRes1 = await apiRequest('/bookings/mine', { method: 'GET', token: TOKENS.user1 });
      const mineRes2 = await apiRequest('/bookings/mine', { method: 'GET', token: TOKENS.user2 });
      const otherDetail = await apiRequest(`/bookings/${bookingId1}`, { method: 'GET', token: TOKENS.user2 });

      const user1Items = mineRes1.data?.data?.bookings || mineRes1.data?.data?.items || [];
      const user2Items = mineRes2.data?.data?.bookings || mineRes2.data?.data?.items || [];

      const inUser1 = user1Items.some((b) => (b.id === bookingId1 || b.bookingId === bookingId1) && b.status === 'confirmed');
      const inUser2 = user2Items.some((b) => (b.id === bookingId1 || b.bookingId === bookingId1));

      const passed = inUser1 && !inUser2 && otherDetail.status === 403;
      recordResult(7, 'Customer bookings isolation and detail authorization', passed, `user1Mine: ${inUser1}, user2Mine: ${!inUser2}, detail403: ${otherDetail.status === 403}`);
    } catch (err) {
      recordResult(7, 'Customer bookings isolation and detail authorization', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 8: Second booking: vendor rejects with reason -> rejected;
    //         user sees rejectionReason; reject confirmed booking -> 409
    // ──────────────────────────────────────────────────────────
    try {
      // Reserve & confirm-cash on slot 2
      const r2 = await apiRequest('/bookings/reserve', {
        method: 'POST',
        token: TOKENS.user1,
        body: {
          turfId: TURF_ID_1,
          date: TEST_DATE,
          startTime: '11:00',
          endTime: '12:00',
          amount: 600,
        },
      });
      bookingId2 = r2.data?.data?.booking?.id || r2.data?.data?.booking?.bookingId;
      if (bookingId2) {
        createdBookingIds.add(bookingId2);
      }
      await apiRequest(`/bookings/${bookingId2}/confirm-cash`, { method: 'POST', token: TOKENS.user1 });

      // Reject slot 2
      const rejectRes = await apiRequest(`/vendor/bookings/${bookingId2}/reject`, {
        method: 'POST',
        token: TOKENS.vendor1,
        body: { reason: 'Turf maintenance scheduled' },
      });

      // User checks detail
      const detailRes = await apiRequest(`/bookings/${bookingId2}`, { method: 'GET', token: TOKENS.user1 });
      const detailBooking = detailRes.data?.data?.booking;

      // Try to reject confirmed bookingId1 -> 409
      const rejectConfirmed = await apiRequest(`/vendor/bookings/${bookingId1}/reject`, {
        method: 'POST',
        token: TOKENS.vendor1,
        body: { reason: 'Trying to reject confirmed' },
      });

      const passed = rejectRes.status === 200 &&
                     detailBooking?.status === 'rejected' &&
                     detailBooking?.rejectionReason === 'Turf maintenance scheduled' &&
                     rejectConfirmed.status === 409;

      recordResult(8, 'Vendor reject with reason & reject confirmed -> 409', passed, `rejectStatus: ${rejectRes.status}, confirmedRejectStatus: ${rejectConfirmed.status}`);
    } catch (err) {
      recordResult(8, 'Vendor reject with reason & reject confirmed -> 409', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 9: User cancels pending booking -> cancelled; cancel rejected -> 409
    // ──────────────────────────────────────────────────────────
    try {
      // Reserve & confirm-cash on slot 3
      const r3 = await apiRequest('/bookings/reserve', {
        method: 'POST',
        token: TOKENS.user1,
        body: {
          turfId: TURF_ID_1,
          date: TEST_DATE,
          startTime: '14:00',
          endTime: '15:00',
          amount: 600,
        },
      });
      bookingId3 = r3.data?.data?.booking?.id || r3.data?.data?.booking?.bookingId;
      if (bookingId3) {
        createdBookingIds.add(bookingId3);
      }
      await apiRequest(`/bookings/${bookingId3}/confirm-cash`, { method: 'POST', token: TOKENS.user1 });

      // Cancel pending booking
      const cancelPending = await apiRequest(`/bookings/${bookingId3}/cancel`, {
        method: 'POST',
        token: TOKENS.user1,
        body: { reason: 'Personal conflict' },
      });

      // Try to cancel already rejected bookingId2 -> 409
      const cancelRejected = await apiRequest(`/bookings/${bookingId2}/cancel`, {
        method: 'POST',
        token: TOKENS.user1,
        body: { reason: 'Already rejected' },
      });

      const passed = cancelPending.status === 200 && cancelRejected.status === 409;
      recordResult(9, 'User cancels pending -> cancelled; cancel rejected -> 409', passed, `cancelPending: ${cancelPending.status}, cancelRejected: ${cancelRejected.status}`);
    } catch (err) {
      recordResult(9, 'User cancels pending -> cancelled; cancel rejected -> 409', false, err.message);
    }

    // ──────────────────────────────────────────────────────────
    // Case 10: Reserve on a turf with no vendorId -> 409 TURF_HAS_NO_VENDOR
    // ──────────────────────────────────────────────────────────
    try {
      const res = await apiRequest('/bookings/reserve', {
        method: 'POST',
        token: TOKENS.user1,
        body: {
          turfId: TURF_ID_NOVENDOR,
          date: TEST_DATE,
          startTime: '16:00',
          endTime: '17:00',
          amount: 600,
        },
      });

      const passed = res.status === 409 && (res.data?.code === 'TURF_HAS_NO_VENDOR' || res.data?.error?.code === 'TURF_HAS_NO_VENDOR');
      recordResult(10, 'Reserve on turf without vendor -> 409 TURF_HAS_NO_VENDOR', passed, `status: ${res.status}, code: ${res.data?.error?.code || res.data?.code}`);
    } catch (err) {
      recordResult(10, 'Reserve on turf without vendor -> 409 TURF_HAS_NO_VENDOR', false, err.message);
    }
  } catch (err) {
    mainError = err;
    console.error('❌ Test suite encountered unhandled error:', err.message);
  } finally {
    // ──────────────────────────────────────────────────────────
    // Case 11: Cleanup ONLY exact records created by this run
    // ──────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up test artifacts created in this run...');
    const cleanupErrors = [];
    let deletedBookingsCount = 0;
    let deletedDocsCount = 0;

    // 1. Delete ONLY exact booking IDs created in this run (independent try/catch)
    try {
      const bookingIdsToDelete = Array.from(createdBookingIds);
      if (bookingIdsToDelete.length > 0) {
        const delBookings = await prisma.booking.deleteMany({
          where: {
            bookingId: { in: bookingIdsToDelete },
          },
        });
        deletedBookingsCount = delBookings.count;
      }
    } catch (err) {
      cleanupErrors.push(`Bookings cleanup failed: ${err.message}`);
      console.error('❌ Failed to clean up test bookings:', err.message);
    }

    // 2. Delete ONLY exact turf document IDs created in this run (independent try/catch)
    try {
      const docIdsToDelete = Array.from(createdDocIds);
      if (docIdsToDelete.length > 0) {
        const delDocs = await query(
          `DELETE FROM documents 
           WHERE collection = 'turfs' AND id = ANY($1::text[])`,
          [docIdsToDelete]
        );
        deletedDocsCount = delDocs.rowCount;
      }
    } catch (err) {
      cleanupErrors.push(`Documents cleanup failed: ${err.message}`);
      console.error('❌ Failed to clean up test turf documents:', err.message);
    }

    if (cleanupErrors.length > 0) {
      cleanupError = new Error(cleanupErrors.join(' | '));
      recordResult(11, 'Surgical cleanup of exact run records', false, cleanupError.message);
    } else {
      recordResult(11, 'Surgical cleanup of exact run records', true, `deletedBookings: ${deletedBookingsCount}, deletedDocs: ${deletedDocsCount}`);
    }

    // Disconnect resources
    try {
      await prisma.$disconnect();
    } catch {}
    if (pool) {
      try {
        await pool.end();
      } catch {}
    }

    // Report errors clearly without hiding original test failures
    if (mainError) {
      console.error('\n⚠️ Original test error recorded:', mainError.message);
    }
    if (cleanupError) {
      console.error('\n⚠️ Cleanup error recorded:', cleanupError.message);
    }
  }

  // Final Summary
  console.log('\n==============================================================');
  console.log('                      TEST SUMMARY                            ');
  console.log('==============================================================');
  const totalPassed = testResults.filter((r) => r.passed).length;
  const totalFailed = testResults.filter((r) => !r.passed).length;
  console.log(`Total Cases:  ${testResults.length}`);
  console.log(`Passed:       ${totalPassed}`);
  console.log(`Failed:       ${totalFailed}`);
  console.log('==============================================================\n');

  if (totalFailed > 0 || mainError || cleanupError) {
    process.exitCode = 1;
  }
}

// Execute test suite
runTestSuite().catch((err) => {
  console.error('💥 Test suite runner encountered an unhandled exception:', err);
  process.exit(1);
});
