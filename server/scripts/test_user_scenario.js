const prisma = require('../config/prisma');
const bookingService = require('../services/bookingService');
const vendorController = require('../controllers/vendorController');

async function runTest() {
  console.log('==================================================');
  console.log('VERIFYING EXACT USER TEST SCENARIO');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const { dateStr: todayStr } = bookingService.getKolkataTimeInfo();

    // Find vendor 'preethi@gmail.com' or vendor with turfs
    let vendor = await prisma.vendor.findFirst({
      where: { email: 'preethi@gmail.com' },
      include: { turfs: true },
    });

    if (!vendor || !vendor.turfs || vendor.turfs.length === 0) {
      vendor = await prisma.vendor.findFirst({
        where: { turfs: { some: {} } },
        include: { turfs: true },
      });
    }

    const turf = vendor.turfs[0];
    console.log(`Vendor: ${vendor.email} (${vendor.id}), Turf: ${turf.name} (${turf.id})`);

    // Clean any existing bookings for today for this test
    await prisma.booking.deleteMany({
      where: { vendorId: vendor.id, bookingDate: new Date(`${todayStr}T00:00:00.000Z`) },
    });

    // Create Booking A: Accepted / Confirmed
    const bookingA = await prisma.booking.create({
      data: {
        bookingId: `test_b1_${Date.now()}`,
        vendorId: vendor.id,
        turfId: turf.id,
        userId: 'user_preethi_gmail_com',
        bookingDate: new Date(`${todayStr}T00:00:00.000Z`),
        startTime: '12:00',
        endTime: '13:00',
        totalAmount: 500,
        bookingStatus: 'confirmed',
        paymentStatus: 'success',
      },
    });

    // Create Booking B: Declined / Rejected
    const bookingB = await prisma.booking.create({
      data: {
        bookingId: `test_b2_${Date.now()}`,
        vendorId: vendor.id,
        turfId: turf.id,
        userId: 'user_preethi_gmail_com',
        bookingDate: new Date(`${todayStr}T00:00:00.000Z`),
        startTime: '15:00',
        endTime: '16:00',
        totalAmount: 500,
        bookingStatus: 'rejected',
        paymentStatus: 'pending',
        rejectionReason: 'Not available',
      },
    });

    console.log(`Created Booking A (confirmed): ${bookingA.bookingId}`);
    console.log(`Created Booking B (rejected): ${bookingB.bookingId}`);

    // Call getDashboard controller
    let responseData = null;
    const req = { user: { uid: vendor.id } };
    const res = {
      json: (d) => { responseData = d; },
      status: (s) => ({ json: (d) => { responseData = d; } }),
    };

    await vendorController.getDashboard(req, res);

    assert(responseData && responseData.success, 'getDashboard API returns success: true');
    const stats = responseData.data.stats;
    console.log('Returned Stats:', stats);

    assert(stats.totalBookings === 2, `Total Bookings is 2 (actual: ${stats.totalBookings})`);
    assert(stats.confirmedBookings === 1, `Accepted is 1 (actual: ${stats.confirmedBookings})`);
    assert(stats.rejectedBookings === 1, `Declined is 1 (actual: ${stats.rejectedBookings})`);
    assert(typeof stats.availableSlots === 'number', `Open Slots is a number: ${stats.availableSlots}`);

    console.log('==================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
