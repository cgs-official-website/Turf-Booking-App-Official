require('dotenv').config();
const prisma = require('../config/prisma');
const turfController = require('../controllers/turfController');
const vendorController = require('../controllers/vendorController');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('=== PART A FIXES & PART B TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Vendor login with 'pending' KYC status
    // -------------------------------------------------------------
    console.log('\n--- 1. Vendor Login with Pending KYC Status ---');
    await prisma.vendor.update({
      where: { id: 'vendor_vendor_turf_com' },
      data: { kycStatus: 'pending' },
    });

    const reqLogin = {
      body: {
        email: 'vendor@turf.com',
        password: 'Password@123',
        role: 'vendor',
      },
    };
    const resLogin = createMockRes();
    await authController.login(reqLogin, resLogin);

    assert(resLogin.statusCode === 200, `Vendor with pending KYC can log in (status ${resLogin.statusCode})`);
    assert(resLogin.data?.data?.token, 'JWT session token returned for pending vendor');
    assert(resLogin.data?.data?.vendor?.kycStatus === 'pending', 'Vendor kycStatus is pending');

    // -------------------------------------------------------------
    // Test 2: Vendor login with 'suspended' and 'rejected' KYC status
    // -------------------------------------------------------------
    console.log('\n--- 2. Suspended & Rejected Vendor Login Handling ---');
    await prisma.vendor.update({
      where: { id: 'vendor_vendor_turf_com' },
      data: { kycStatus: 'suspended' },
    });
    const resSuspended = createMockRes();
    await authController.login(reqLogin, resSuspended);
    assert(resSuspended.statusCode === 403, `Suspended vendor login returns 403 (got ${resSuspended.statusCode})`);
    assert(resSuspended.data?.error?.code === 'ACCOUNT_SUSPENDED', 'Returns code ACCOUNT_SUSPENDED');

    await prisma.vendor.update({
      where: { id: 'vendor_vendor_turf_com' },
      data: { kycStatus: 'rejected', rejectionReason: 'Invalid documents' },
    });
    const resRejected = createMockRes();
    await authController.login(reqLogin, resRejected);
    assert(resRejected.statusCode === 403, `Rejected vendor login returns 403 (got ${resRejected.statusCode})`);
    assert(resRejected.data?.error?.code === 'KYC_REJECTED', 'Returns code KYC_REJECTED');

    // Restore vendor to active/approved
    await prisma.vendor.update({
      where: { id: 'vendor_vendor_turf_com' },
      data: { kycStatus: 'approved', rejectionReason: null },
    });

    // -------------------------------------------------------------
    // Test 3: OTP Dev Bypass blocked when NODE_ENV === 'production'
    // -------------------------------------------------------------
    console.log('\n--- 3. OTP Dev Bypass in Production Check ---');
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const reqOtp = {
      body: {
        phone: '9876543210',
        otp: '1234',
        role: 'user',
      },
    };
    const resOtp = createMockRes();
    await authController.verifyPhoneOtp(reqOtp, resOtp);
    assert(resOtp.statusCode === 400, `OTP dev bypass fails in production (status ${resOtp.statusCode})`);
    process.env.NODE_ENV = origEnv;

    // -------------------------------------------------------------
    // Test 4: Turf Public List (turfController.getTurfs)
    // -------------------------------------------------------------
    console.log('\n--- 4. Turf Controller: getTurfs & field shapes ---');
    const reqGetTurfs = { query: { limit: 10 } };
    const resGetTurfs = createMockRes();
    await turfController.getTurfs(reqGetTurfs, resGetTurfs);

    assert(resGetTurfs.statusCode === 200, `getTurfs returned 200`);
    const turfsList = resGetTurfs.data?.data?.items || [];
    assert(turfsList.length > 0, `Turf list has ${turfsList.length} item(s)`);
    const turf0 = turfsList[0];
    assert(typeof turf0.pricePerHour === 'number', `pricePerHour is Number (${turf0.pricePerHour})`);
    assert(turf0.rating && typeof turf0.rating.avg === 'number', `rating has avg (${turf0.rating?.avg})`);
    assert(Array.isArray(turf0.sports), `sports is an array (${JSON.stringify(turf0.sports)})`);
    assert(turf0.location && typeof turf0.location.address === 'string', `location.address is string: "${turf0.location?.address}"`);
    assert(typeof turf0.city === 'string' && turf0.city.length > 0, `city is string: "${turf0.city}"`);
    assert(typeof turf0.reviewsCount === 'number', `reviewsCount is Number (${turf0.reviewsCount})`);

    // -------------------------------------------------------------
    // Test 5: Turf Locations & Detail
    // -------------------------------------------------------------
    console.log('\n--- 5. Turf Controller: locations & detail ---');
    const resLocs = createMockRes();
    await turfController.getTurfLocations({}, resLocs);
    assert(resLocs.statusCode === 200, 'getTurfLocations returned 200');
    assert(Array.isArray(resLocs.data?.data?.cities), 'Returned cities array');

    const resDetail = createMockRes();
    await turfController.getTurfById({ params: { turfId: 'turf_arena_01' } }, resDetail);
    assert(resDetail.statusCode === 200, 'getTurfById returned 200');
    assert(resDetail.data?.data?.turf?.name === 'Kickoff Champions Arena', 'Correct turf name returned');

    // -------------------------------------------------------------
    // Test 6: Available Slots
    // -------------------------------------------------------------
    console.log('\n--- 6. Turf Controller: getAvailableSlots ---');
    const resSlots = createMockRes();
    await turfController.getAvailableSlots({ params: { turfId: 'turf_arena_01' }, query: { date: '2026-10-01' } }, resSlots);
    assert(resSlots.statusCode === 200, 'getAvailableSlots returned 200');
    const slots = resSlots.data?.data?.slots || [];
    assert(slots.length > 0, `Generated ${slots.length} slots for turf`);
    const bookedSlot = slots.find((s) => s.startTime === '06:00');
    assert(bookedSlot && bookedSlot.isBooked === true, 'Confirmed booking marks 06:00 slot as isBooked: true');

    // -------------------------------------------------------------
    // Test 7: Wishlist Toggle
    // -------------------------------------------------------------
    console.log('\n--- 7. Wishlist Toggle ---');
    // Ensure test user exists in users table
    await prisma.user.upsert({
      where: { id: 'user_pragathi5_gmail_com' },
      update: {},
      create: {
        id: 'user_pragathi5_gmail_com',
        name: 'Pragathi',
        email: 'pragathi5@gmail.com',
        phone: '9123456780',
        status: 'active',
      },
    });

    const reqWish = {
      params: { turfId: 'turf_arena_01' },
      user: { uid: 'user_pragathi5_gmail_com' },
    };
    const resWish1 = createMockRes();
    await turfController.toggleWishlist(reqWish, resWish1);
    assert(resWish1.statusCode === 200, `toggleWishlist returned 200 (isWishlisted: ${resWish1.data?.data?.isWishlisted})`);

    const resWish2 = createMockRes();
    await turfController.toggleWishlist(reqWish, resWish2);
    assert(resWish2.statusCode === 200, `toggleWishlist returned 200 (isWishlisted: ${resWish2.data?.data?.isWishlisted})`);

    // -------------------------------------------------------------
    // Test 8: Vendor Controller: Onboarding Status & Slot Overrides
    // -------------------------------------------------------------
    console.log('\n--- 8. Vendor Controller: Onboarding Status & Slot Overrides ---');
    const reqVendorStatus = { user: { uid: 'vendor_vendor_turf_com' } };
    const resVendorStatus = createMockRes();
    await vendorController.getOnboardingStatus(reqVendorStatus, resVendorStatus);
    assert(resVendorStatus.statusCode === 200, 'getOnboardingStatus returned 200');
    assert(resVendorStatus.data?.data?.turf?.id === 'turf_arena_01', 'Vendor status includes owned turf');

    const reqOverride = {
      params: { turfId: 'turf_arena_01' },
      user: { uid: 'vendor_vendor_turf_com', role: 'vendor' },
      body: {
        date: '2026-10-05',
        blockedSlots: ['12:00-13:00'],
        priceOverrides: { '12:00-13:00': 1500 },
      },
    };
    const resOverride = createMockRes();
    await vendorController.updateSlotOverrides(reqOverride, resOverride);
    assert(resOverride.statusCode === 200, 'updateSlotOverrides wrote to slot_overrides table');

    const savedOverride = await prisma.slotOverride.findUnique({
      where: { turfId_date: { turfId: 'turf_arena_01', date: '2026-10-05' } },
    });
    assert(savedOverride !== null, 'slot_overrides row exists in database');
    assert(JSON.stringify(savedOverride.blockedSlots).includes('12:00-13:00'), 'blockedSlots stored correctly');

    await prisma.slotOverride.delete({
      where: { turfId_date: { turfId: 'turf_arena_01', date: '2026-10-05' } },
    });

    // -------------------------------------------------------------
    // Test 9: Vendor Report Issue
    // -------------------------------------------------------------
    console.log('\n--- 9. Vendor Controller: reportIssue ---');
    const reqReport = {
      user: { uid: 'vendor_vendor_turf_com' },
      body: {
        issueType: 'Technical',
        description: 'Test issue report via Prisma',
      },
    };
    const resReport = createMockRes();
    await vendorController.reportIssue(reqReport, resReport);
    assert(resReport.statusCode === 201, 'reportIssue returned 201 created');
    const reportId = resReport.data?.data?.report?.id;
    assert(reportId !== undefined, 'Report created with ID');

    if (reportId) {
      await prisma.report.delete({ where: { id: reportId } });
    }

    // -------------------------------------------------------------
    // Test 10: KYC Document Upsert
    // -------------------------------------------------------------
    console.log('\n--- 10. Vendor KYC Document Upsert ---');
    await prisma.vendorKycDocument.upsert({
      where: { vendorId_docType: { vendorId: 'vendor_vendor_turf_com', docType: 'aadhaar' } },
      update: { fileUrl: 'https://storage.test/aadhaar.pdf', status: 'pending' },
      create: {
        id: 'kyc_test_aadhaar',
        vendorId: 'vendor_vendor_turf_com',
        docType: 'aadhaar',
        fileUrl: 'https://storage.test/aadhaar.pdf',
        status: 'pending',
      },
    });
    const kycDoc = await prisma.vendorKycDocument.findUnique({
      where: { vendorId_docType: { vendorId: 'vendor_vendor_turf_com', docType: 'aadhaar' } },
    });
    assert(kycDoc !== null && kycDoc.docType === 'aadhaar', 'vendor_kyc_documents upsert succeeded');
    await prisma.vendorKycDocument.delete({
      where: { vendorId_docType: { vendorId: 'vendor_vendor_turf_com', docType: 'aadhaar' } },
    });

    // -------------------------------------------------------------
    // Test 11: Super Admin All Turfs & Toggle Status
    // -------------------------------------------------------------
    console.log('\n--- 11. Super Admin: getAllTurfs & toggleTurfStatus ---');
    const resAdminTurfs = createMockRes();
    await adminController.getAllTurfs({ query: {} }, resAdminTurfs);
    assert(resAdminTurfs.statusCode === 200, 'adminController.getAllTurfs returned 200');
    const adminTurf0 = resAdminTurfs.data?.data?.items?.[0];
    assert(adminTurf0 !== undefined, 'Admin turf item exists');
    assert(typeof adminTurf0.pricePerHour === 'number', 'adminTurf.pricePerHour is Number');
    assert(typeof adminTurf0.rating.avg === 'number', 'adminTurf.rating.avg is Number');
    assert(typeof adminTurf0.reviewsCount === 'number', 'adminTurf.reviewsCount is Number');
    assert(adminTurf0.address !== undefined, 'adminTurf.address exists');

    const resToggle = createMockRes();
    await adminController.toggleTurfStatus({ params: { turfId: 'turf_arena_01' } }, resToggle);
    assert(resToggle.statusCode === 200, `toggleTurfStatus changed status to ${resToggle.data?.data?.status}`);
    // Toggle back to active
    await adminController.toggleTurfStatus({ params: { turfId: 'turf_arena_01' } }, createMockRes());

    // -------------------------------------------------------------
    // Test 12: Super Admin deleteTurfAdmin safeguard
    // -------------------------------------------------------------
    console.log('\n--- 12. Super Admin: deleteTurfAdmin Safeguard ---');
    const resDelBlocked = createMockRes();
    await adminController.deleteTurfAdmin({ params: { turfId: 'turf_arena_01' } }, resDelBlocked);
    assert(resDelBlocked.statusCode === 400, `Refused deletion of turf with bookings (status ${resDelBlocked.statusCode})`);
    assert(resDelBlocked.data?.error?.code === 'TURF_HAS_BOOKINGS', 'Returns code TURF_HAS_BOOKINGS');

    // Create a temporary dummy turf without bookings, then delete it
    await prisma.turf.create({
      data: {
        id: 'turf_dummy_to_delete',
        vendorId: 'vendor_vendor_turf_com',
        name: 'Dummy Turf for Deletion Test',
        sports: ['Cricket'],
        pricePerHour: 500,
        city: 'Chennai',
        status: 'active',
      },
    });

    const resDelSuccess = createMockRes();
    await adminController.deleteTurfAdmin({ params: { turfId: 'turf_dummy_to_delete' } }, resDelSuccess);
    assert(resDelSuccess.statusCode === 200, `Successfully deleted turf without bookings (status ${resDelSuccess.statusCode})`);

    const checkDummy = await prisma.turf.findUnique({ where: { id: 'turf_dummy_to_delete' } });
    assert(checkDummy === null, 'Dummy turf successfully removed from database');

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failed++;
  }

  console.log(`\n===================================`);
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`===================================\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
