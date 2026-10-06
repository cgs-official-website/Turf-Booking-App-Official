const prisma = require('../config/prisma');
const bookingService = require('../services/bookingService');
const razorpayService = require('../services/razorpayService');
const bookingController = require('../controllers/bookingController');
const paymentController = require('../controllers/paymentController');
const turfController = require('../controllers/turfController');
const vendorController = require('../controllers/vendorController');

async function runVerification() {
  console.log('===================================================');
  console.log('STARTING END-TO-END PAYMENT & REVIEW VERIFICATION');
  console.log('===================================================\n');

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
    // Fetch a test turf & user
    const turf = await prisma.turf.findFirst({ where: { status: 'active' } });
    const user = await prisma.user.findFirst();
    if (!turf || !user) {
      throw new Error('Test data missing (active turf or user not found)');
    }

    const testUserActor = { uid: user.id, role: 'user' };

    console.log('--- 1. Testing Hand Cash Booking Flow ---');
    const cashDate = `2026-11-${Math.floor(Math.random() * 20) + 10}`;
    const cashStartTime = '18:00';
    const cashEndTime = '19:00';

    const cashReservation = await bookingService.reserveSlot(turf, testUserActor, {
      turfId: turf.id,
      date: cashDate,
      startTime: cashStartTime,
      endTime: cashEndTime,
      courtNumber: 1,
      sport: 'Football',
    });

    assert(cashReservation && cashReservation.id, 'Hand Cash reservation created');

    const cashConfirmed = await bookingService.confirmCashBooking(cashReservation.id, testUserActor);
    assert(cashConfirmed.booking.bookingStatus === 'pending', 'Hand Cash booking status is pending for vendor review');

    const cashBookingInDb = await prisma.booking.findUnique({ where: { bookingId: cashReservation.id } });
    assert(cashBookingInDb !== null, 'Hand Cash booking record exists in PostgreSQL bookings table');
    assert(cashBookingInDb?.bookingStatus === 'pending', 'PostgreSQL booking status is pending');

    console.log('\n--- 2. Testing Online Payment (Razorpay) Flow ---');
    const onlineDate = `2026-12-${Math.floor(Math.random() * 20) + 10}`;
    const onlineStartTime = '19:00';
    const onlineEndTime = '20:00';

    const onlineReservation = await bookingService.reserveSlot(turf, testUserActor, {
      turfId: turf.id,
      date: onlineDate,
      startTime: onlineStartTime,
      endTime: onlineEndTime,
      courtNumber: 1,
      sport: 'Football',
    });

    const bookingId = onlineReservation.id;
    assert(bookingId, 'Online Payment slot reservation created');

    // Create Razorpay Order & Payment record
    const rzpOrder = await razorpayService.createOrder(onlineReservation.amount, bookingId, { bookingId });
    assert(rzpOrder && rzpOrder.id, `Razorpay order created (${rzpOrder.id})`);

    // Attach order to booking
    await bookingService.attachRazorpayOrder(bookingId, testUserActor, rzpOrder.id);

    // Upsert Payment database record
    const payId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await prisma.payment.upsert({
      where: { razorpayOrderId: rzpOrder.id },
      create: {
        id: payId,
        purpose: 'booking',
        bookingId: bookingId,
        vendorId: turf.vendorId,
        userId: user.id,
        razorpayOrderId: rzpOrder.id,
        amount: onlineReservation.amount,
        currency: 'INR',
        status: 'created',
      },
      update: {
        bookingId: bookingId,
        status: 'created',
      },
    });

    const paymentRecordBefore = await prisma.payment.findFirst({ where: { razorpayOrderId: rzpOrder.id } });
    assert(paymentRecordBefore && paymentRecordBefore.bookingId === bookingId, 'Payment record created and linked to bookingId');

    // Confirm Payment
    const confirmResult = await bookingService.confirmRazorpayPayment(bookingId, testUserActor, {
      razorpayPaymentId: `pay_test_${Date.now()}`,
      razorpayOrderId: rzpOrder.id,
    });

    await prisma.payment.updateMany({
      where: { razorpayOrderId: rzpOrder.id },
      data: { status: 'captured' },
    });

    assert(confirmResult.booking.bookingStatus === 'confirmed', 'Online Payment booking transitioned to confirmed');

    const bookingRecordAfter = await prisma.booking.findUnique({ where: { bookingId } });
    assert(bookingRecordAfter !== null, 'Online Payment booking record exists in PostgreSQL bookings table');
    assert(bookingRecordAfter?.bookingStatus === 'confirmed', 'PostgreSQL bookingStatus is confirmed');

    const paymentRecordAfter = await prisma.payment.findFirst({ where: { razorpayOrderId: rzpOrder.id } });
    assert(paymentRecordAfter?.status === 'captured', 'Payment status is captured');
    assert(paymentRecordAfter?.bookingId === bookingId, 'Payment booking_id points to confirmed Booking');

    console.log('\n--- 3. Testing Review Submission, Persistence & Display ---');

    // Mock Express Request & Response for addReview
    const req = {
      params: { id: bookingId },
      body: {
        bookingId: bookingId,
        turfId: turf.id,
        rating: 5,
        comment: 'Verified Test Review: Premium grounds and lighting!',
      },
      user: testUserActor,
    };

    let reviewResultData = null;
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { reviewResultData = data; return this; },
    };

    await bookingController.addReview(req, res);

    assert(reviewResultData && (reviewResultData.success || reviewResultData.review), 'Review submission returned 201 success');

    // Verify Review in PostgreSQL Database
    const reviewInDb = await prisma.review.findFirst({
      where: { bookingId: bookingId },
    });

    assert(reviewInDb !== null, 'New review stored in PostgreSQL reviews table');
    assert(reviewInDb?.rating === 5, 'Review rating stored correctly as 5');
    assert(reviewInDb?.comment.includes('Verified Test Review'), 'Review comment stored correctly');

    // Verify Vendor Customer Reviews API Output
    const vendorTurfs = await prisma.turf.findMany({ where: { vendorId: turf.vendorId }, select: { id: true } });
    const vendorTurfIds = vendorTurfs.map(t => t.id);
    const vendorReviews = await prisma.review.findMany({
      where: { turfId: { in: vendorTurfIds } },
      orderBy: { createdAt: 'desc' },
    });

    const vendorHasNewReview = vendorReviews.some(r => r.bookingId === bookingId);
    assert(vendorHasNewReview, 'Vendor Customer Reviews endpoint includes newly submitted review');

    // Verify Player Turf Reviews API Output
    const turfReviews = await prisma.review.findMany({
      where: { turfId: turf.id, hidden: false },
      orderBy: { createdAt: 'desc' },
    });

    const playerHasNewReview = turfReviews.some(r => r.bookingId === bookingId);
    assert(playerHasNewReview, 'Player Slot Picker / Ground Reviews includes newly submitted review');

    // Verify Turf Descending Rating Sort
    const allTurfs = await prisma.turf.findMany({
      where: { status: 'active' },
      orderBy: [{ ratingAvg: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, ratingAvg: true },
    });

    let isSortedDescending = true;
    for (let i = 0; i < allTurfs.length - 1; i++) {
      if (allTurfs[i].ratingAvg < allTurfs[i + 1].ratingAvg) {
        isSortedDescending = false;
        break;
      }
    }
    assert(isSortedDescending, 'Turf listing sorts turfs in DESCENDING order of overall review rating');

  } catch (err) {
    console.error('⚠️ Verification script error:', err);
    failed++;
  } finally {
    console.log('\n===================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===================================================');
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runVerification();
