require('dotenv').config();
const assert = require('assert');
const prisma = require('../config/prisma');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

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

async function runVendorFlowTests() {
  console.log('=== Running Partner Registration & Login Approval Flow Tests ===\n');

  const testEmail = `test_partner_${Date.now()}@turfexample.com`;
  const testPhone = '9876501234';
  const testPass = 'Password@123';
  let vendorId = null;

  try {
    // -------------------------------------------------------------
    // 1. Register a new vendor with KYC
    // -------------------------------------------------------------
    console.log('1. Testing Vendor Registration...');
    const regReq = {
      body: {
        name: 'Test Partner',
        email: testEmail,
        phone: testPhone,
        password: testPass,
        role: 'vendor',
      },
    };
    const regRes = createMockRes();
    await authController.register(regReq, regRes);

    assert.strictEqual(regRes.statusCode, 200, `Registration status should be 200 (got ${regRes.statusCode})`);
    assert(regRes.data?.data?.vendor, 'Vendor object returned on registration');
    assert.strictEqual(regRes.data?.data?.vendor?.kycStatus, 'pending', 'Vendor KYC status should default to pending');
    vendorId = regRes.data?.data?.vendor?.id;
    console.log(`✅ Vendor registered successfully: id=${vendorId}, kycStatus=pending`);

    // -------------------------------------------------------------
    // 2. Fetch Vendor Approval Status API (pending)
    // -------------------------------------------------------------
    console.log('\n2. Testing getVendorStatus API for pending vendor...');
    const statusReq = {
      query: { email: testEmail },
    };
    const statusRes = createMockRes();
    await authController.getVendorStatus(statusReq, statusRes);

    assert.strictEqual(statusRes.statusCode, 200, `getVendorStatus should return 200 (got ${statusRes.statusCode})`);
    assert.strictEqual(statusRes.data?.data?.kycStatus, 'pending', 'Status API returns kycStatus=pending');
    console.log('✅ getVendorStatus returned pending status correctly:', statusRes.data?.data);

    // -------------------------------------------------------------
    // 3. Attempt Login as Pending Vendor (Must be blocked with 403)
    // -------------------------------------------------------------
    console.log('\n3. Testing Login for pending vendor (Must be blocked)...');
    const loginReq = {
      body: {
        email: testEmail,
        password: testPass,
        role: 'vendor',
      },
    };
    const loginPendingRes = createMockRes();
    await authController.login(loginReq, loginPendingRes);

    assert.strictEqual(loginPendingRes.statusCode, 403, `Pending vendor login must return 403 (got ${loginPendingRes.statusCode})`);
    assert.strictEqual(loginPendingRes.data?.error?.code, 'ACCOUNT_PENDING', 'Error code must be ACCOUNT_PENDING');
    assert(
      loginPendingRes.data?.error?.message?.includes('Your profile has been submitted to Super Admin and is awaiting approval'),
      `Message must state pending approval (got: "${loginPendingRes.data?.error?.message}")`
    );
    console.log('✅ Pending vendor login correctly blocked with 403 ACCOUNT_PENDING:', loginPendingRes.data?.error?.message);

    // -------------------------------------------------------------
    // 4. Super Admin Rejection Flow
    // -------------------------------------------------------------
    console.log('\n4. Testing Super Admin Rejection...');
    const rejectReq = {
      params: { uid: vendorId },
      body: { reason: 'Government ID is blurry and illegible' },
    };
    const rejectRes = createMockRes();
    await adminController.rejectVendor(rejectReq, rejectRes);

    assert.strictEqual(rejectRes.statusCode, 200, `Rejection should succeed (got ${rejectRes.statusCode})`);
    console.log('✅ Vendor rejected via adminController');

    // Check Status API after rejection
    const statusRejectedRes = createMockRes();
    await authController.getVendorStatus(statusReq, statusRejectedRes);
    assert.strictEqual(statusRejectedRes.data?.data?.kycStatus, 'rejected', 'Status API returns kycStatus=rejected');
    assert.strictEqual(statusRejectedRes.data?.data?.rejectionReason, 'Government ID is blurry and illegible', 'Status API returns rejectionReason');
    console.log('✅ getVendorStatus returned rejected status & reason:', statusRejectedRes.data?.data);

    // Attempt Login as Rejected Vendor (Must be blocked with 403)
    const loginRejectedRes = createMockRes();
    await authController.login(loginReq, loginRejectedRes);
    assert.strictEqual(loginRejectedRes.statusCode, 403, `Rejected vendor login must return 403 (got ${loginRejectedRes.statusCode})`);
    assert.strictEqual(loginRejectedRes.data?.error?.code, 'KYC_REJECTED', 'Error code must be KYC_REJECTED');
    assert(
      loginRejectedRes.data?.error?.message?.includes('Your profile was rejected by Super Admin'),
      `Message must state application rejected (got: "${loginRejectedRes.data?.error?.message}")`
    );
    console.log('✅ Rejected vendor login correctly blocked with 403 KYC_REJECTED:', loginRejectedRes.data?.error?.message);

    // -------------------------------------------------------------
    // 5. Super Admin Approval Flow
    // -------------------------------------------------------------
    console.log('\n5. Testing Super Admin Approval...');
    const approveReq = {
      params: { uid: vendorId },
    };
    const approveRes = createMockRes();
    await adminController.approveVendor(approveReq, approveRes);
    assert.strictEqual(approveRes.statusCode, 200, `Approval should succeed (got ${approveRes.statusCode})`);
    console.log('✅ Vendor approved via adminController');

    // Check Status API after approval
    const statusApprovedRes = createMockRes();
    await authController.getVendorStatus(statusReq, statusApprovedRes);
    assert.strictEqual(statusApprovedRes.data?.data?.kycStatus, 'approved', 'Status API returns kycStatus=approved');
    console.log('✅ getVendorStatus returned approved status:', statusApprovedRes.data?.data);

    // Attempt Login as Approved Vendor (Must succeed with 200)
    const loginApprovedRes = createMockRes();
    await authController.login(loginReq, loginApprovedRes);
    assert.strictEqual(loginApprovedRes.statusCode, 200, `Approved vendor login must return 200 (got ${loginApprovedRes.statusCode})`);
    assert(loginApprovedRes.data?.data?.token, 'Approved vendor receives session token');
    assert.strictEqual(loginApprovedRes.data?.data?.vendor?.kycStatus, 'approved', 'Vendor kycStatus is approved');
    console.log('✅ Approved vendor successfully logged in with token:', loginApprovedRes.data?.data?.vendor?.email);

    // -------------------------------------------------------------
    // 6. Test Non-existent Email
    // -------------------------------------------------------------
    console.log('\n6. Testing Non-existent Account Status...');
    const notFoundReq = {
      query: { email: 'nonexistent_account_12345@example.com' },
    };
    const notFoundRes = createMockRes();
    await authController.getVendorStatus(notFoundReq, notFoundRes);
    assert.strictEqual(notFoundRes.statusCode, 404, 'Non-existent vendor returns 404');
    console.log('✅ Non-existent vendor correctly returned 404 ACCOUNT_NOT_FOUND');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  } finally {
    // Cleanup test record
    if (vendorId) {
      try {
        await prisma.vendor.delete({ where: { id: vendorId } });
        console.log(`Cleaned up test vendor ${vendorId}`);
      } catch (e) {}
    }
    await prisma.$disconnect();
  }
}

runVendorFlowTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
