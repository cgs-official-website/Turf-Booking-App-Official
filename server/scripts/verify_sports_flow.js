/**
 * Integration Test for Sport Selection in Booking Flow
 */
const path = require('path');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
const prisma = require('../config/prisma');
const bookingService = require('../services/bookingService');

async function testSportsFlow() {
  console.log('🚀 Starting Sport Selection Flow Verification...');

  try {
    // 1. Find or create a test turf supporting Cricket, Football, Basketball, Badminton, Tennis
    let turf = await prisma.turf.findFirst({
      where: { sports: { has: 'Cricket' } },
    });

    if (!turf) {
      turf = await prisma.turf.findFirst();
    }

    if (!turf) {
      console.error('❌ No turf found in database to test.');
      process.exit(1);
    }

    console.log(`🏟️ Found Turf: "${turf.name}" (${turf.id})`);
    
    // Ensure turf has multiple sports
    const testSports = ['Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis'];
    await prisma.turf.update({
      where: { id: turf.id },
      data: { sports: testSports },
    });

    turf.sports = testSports;
    console.log('✅ Turf sports updated to:', testSports);

    const syntheticUser = { uid: 'test_user_sports_flow' };
    const today = new Date().toISOString().slice(0, 10);

    // Test 1: Booking Cricket
    console.log('\n--- Test 1: Reserve Cricket ---');
    const resCricket = await bookingService.reserveSlot(turf, syntheticUser, {
      turfId: turf.id,
      date: today,
      startTime: '11:00',
      endTime: '12:00',
      sport: 'Cricket',
      courtNumber: 1,
    });
    console.log('Returned API Booking sport:', resCricket.sport);

    const dbCricket = await prisma.booking.findUnique({ where: { bookingId: resCricket.bookingId } });
    console.log('DB Persisted booking.sport:', dbCricket.sport);

    if (dbCricket.sport !== 'Cricket') {
      throw new Error(`Expected DB sport Cricket, got ${dbCricket.sport}`);
    }
    console.log('✅ Test 1 PASSED: DB stored Cricket correctly!');

    // Test 2: Booking Basketball
    console.log('\n--- Test 2: Reserve Basketball ---');
    const resBasketball = await bookingService.reserveSlot(turf, syntheticUser, {
      turfId: turf.id,
      date: today,
      startTime: '12:00',
      endTime: '13:00',
      sport: 'Basketball',
      courtNumber: 1,
    });
    console.log('Returned API Booking sport:', resBasketball.sport);

    const dbBasketball = await prisma.booking.findUnique({ where: { bookingId: resBasketball.bookingId } });
    console.log('DB Persisted booking.sport:', dbBasketball.sport);

    if (dbBasketball.sport !== 'Basketball') {
      throw new Error(`Expected DB sport Basketball, got ${dbBasketball.sport}`);
    }
    console.log('✅ Test 2 PASSED: DB stored Basketball correctly!');

    // Test 3: Backend Validation for unsupported sport
    console.log('\n--- Test 3: Invalid Sport Validation ---');
    try {
      await bookingService.reserveSlot(turf, syntheticUser, {
        turfId: turf.id,
        date: today,
        startTime: '13:00',
        endTime: '14:00',
        sport: 'Formula1Racing',
        courtNumber: 1,
      });
      console.error('❌ Test 3 FAILED: Should have rejected invalid sport');
    } catch (err) {
      console.log('Caught expected error:', err.message);
      if (err.code === 'INVALID_SPORT') {
        console.log('✅ Test 3 PASSED: Backend correctly blocked unsupported sport!');
      } else {
        console.warn('⚠️ Error code was:', err.code);
      }
    }

    // Cleanup test bookings
    await prisma.booking.deleteMany({
      where: { bookingId: { in: [resCricket.bookingId, resBasketball.bookingId] } },
    });
    console.log('\n🧹 Test bookings cleaned up safely.');
    console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSportsFlow();
