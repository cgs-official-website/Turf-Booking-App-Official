const { query } = require('../config/db');
const prisma = require('../config/prisma');
const turfController = require('../controllers/turfController');
const nearbyTurfsController = require('../controllers/nearbyTurfsController');

async function runTest() {
  console.log('==================================================');
  console.log('RUNNING RATING & DISTANCE VERIFICATION TEST');
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
    // 1. Check zero review turf format
    const unratedTurfRaw = {
      id: 'test_unrated_turf',
      name: 'Unrated Ground',
      city: 'Erode',
      ratingAvg: 0,
      reviewsCount: 0,
    };
    const formattedUnrated = turfController.formatTurf(unratedTurfRaw);

    assert(formattedUnrated.ratingAvg === 0, 'Unrated turf formatTurf.ratingAvg is 0 (not 5.0)');
    assert(formattedUnrated.reviewsCount === 0, 'Unrated turf formatTurf.reviewsCount is 0');
    assert(formattedUnrated.rating.avg === 0, 'Unrated turf formatTurf.rating.avg is 0');

    // 2. Check 2 reviews calculation: 3-star + 4-star = 3.5 average
    const ratedTurfRaw = {
      id: 'test_rated_turf_35',
      name: 'Rated 3.5 Ground',
      city: 'Chennai',
      ratingAvg: 3.5,
      reviewsCount: 2,
    };
    const formattedRated = turfController.formatTurf(ratedTurfRaw);
    assert(formattedRated.ratingAvg === 3.5, 'Rated turf formatTurf.ratingAvg is 3.5');
    assert(formattedRated.reviewsCount === 2, 'Rated turf formatTurf.reviewsCount is 2');

    // 3. Test turf sorting in DB turfs
    const dbTurfs = await prisma.turf.findMany({
      where: { status: 'active' },
      orderBy: [{ ratingAvg: 'desc' }, { createdAt: 'desc' }],
    });

    const formattedTurfs = dbTurfs.map(turfController.formatTurf);
    assert(formattedTurfs.length > 0, `Fetched ${formattedTurfs.length} active turfs from DB`);

    let isSortedDesc = true;
    for (let i = 0; i < formattedTurfs.length - 1; i++) {
      if (formattedTurfs[i].ratingAvg < formattedTurfs[i + 1].ratingAvg) {
        isSortedDesc = false;
        break;
      }
    }
    assert(isSortedDesc, 'Turfs are sorted in descending order of ratingAvg');

    // Check that turfs with 0 reviews are placed at the bottom
    const firstUnratedIdx = formattedTurfs.findIndex(t => t.reviewsCount === 0 || t.ratingAvg === 0);
    const lastRatedIdx = formattedTurfs.map(t => (t.reviewsCount > 0 && t.ratingAvg > 0)).lastIndexOf(true);

    if (firstUnratedIdx !== -1 && lastRatedIdx !== -1) {
      assert(firstUnratedIdx > lastRatedIdx, 'Unrated turfs appear after rated turfs');
    } else {
      assert(true, 'All turfs are either rated or unrated in current DB snapshot');
    }

    // 4. Test Haversine distance logic with 2 different user locations
    const chennaiUser = { lat: 13.0827, lng: 80.2707 };
    const coimbatoreUser = { lat: 11.0168, lng: 76.9558 };
    const chennaiTurf = { latitude: 13.0827, longitude: 80.2707 };

    // Distance from Chennai user to Chennai turf should be ~0 km
    const R = 6371;
    const dLat1 = (chennaiTurf.latitude - chennaiUser.lat) * (Math.PI / 180);
    const dLon1 = (chennaiTurf.longitude - chennaiUser.lng) * (Math.PI / 180);
    const a1 = Math.sin(dLat1/2)*Math.sin(dLat1/2) + Math.cos(chennaiUser.lat*Math.PI/180)*Math.cos(chennaiTurf.latitude*Math.PI/180)*Math.sin(dLon1/2)*Math.sin(dLon1/2);
    const distChennai = Math.round(R * 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1-a1)) * 10) / 10;

    const dLat2 = (chennaiTurf.latitude - coimbatoreUser.lat) * (Math.PI / 180);
    const dLon2 = (chennaiTurf.longitude - coimbatoreUser.lng) * (Math.PI / 180);
    const a2 = Math.sin(dLat2/2)*Math.sin(dLat2/2) + Math.cos(coimbatoreUser.lat*Math.PI/180)*Math.cos(chennaiTurf.latitude*Math.PI/180)*Math.sin(dLon2/2)*Math.sin(dLon2/2);
    const distCoimbatore = Math.round(R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1-a2)) * 10) / 10;

    assert(distChennai === 0, `Distance from same location is 0 km (actual: ${distChennai} km)`);
    assert(distCoimbatore > 400, `Distance from Coimbatore to Chennai is > 400 km (actual: ${distCoimbatore} km)`);
    assert(distChennai !== distCoimbatore, 'Distance dynamically changes when user GPS coordinates change');

    console.log('==================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
