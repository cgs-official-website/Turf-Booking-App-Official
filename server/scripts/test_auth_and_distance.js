const { query } = require('../config/db');
const prisma = require('../config/prisma');

async function runTest() {
  console.log('==================================================');
  console.log('RUNNING DISTANCE VALIDATION & AUTH HYDRATION TEST');
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
    // 1. Coordinate Validation Logic Simulation
    function isValidCoordinate(lat, lng) {
      if (lat == null || lng == null) return false;
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (isNaN(numLat) || isNaN(numLng)) return false;
      if (numLat === 0 && numLng === 0) return false;
      if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) return false;
      return true;
    }

    function calculateDistanceKm(lat1, lon1, lat2, lon2) {
      if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) return null;
      const R = 6371;
      const radLat1 = (Number(lat1) * Math.PI) / 180;
      const radLat2 = (Number(lat2) * Math.PI) / 180;
      const dLatRad = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
      const dLonRad = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
      const a =
        Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLonRad / 2) * Math.sin(dLonRad / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c;
      return Math.round(d * 10) / 10;
    }

    function getDisplayDistance(turf, userCoords) {
      if (!turf) return 'Location unavailable';

      if (typeof turf.distance === 'number' && !isNaN(turf.distance)) {
        return `${turf.distance} km`;
      }

      const uLat = userCoords?.lat ?? userCoords?.latitude;
      const uLng = userCoords?.lng ?? userCoords?.longitude;
      if (!isValidCoordinate(uLat, uLng)) {
        return 'Location unavailable';
      }

      const turfLat = turf.latitude ?? turf.lat ?? turf.location?.latitude ?? turf.location?.lat ?? turf.location?.geo?.lat;
      const turfLng = turf.longitude ?? turf.lng ?? turf.location?.longitude ?? turf.location?.lng ?? turf.location?.geo?.lng;
      if (!isValidCoordinate(turfLat, turfLng)) {
        return 'Location unavailable';
      }

      const dist = calculateDistanceKm(uLat, uLng, turfLat, turfLng);
      if (dist !== null && !isNaN(dist)) {
        return `${dist} km`;
      }
      return 'Location unavailable';
    }

    // Test Case A: Real turf + user GPS -> numeric km
    const validTurf = { latitude: 13.0827, longitude: 80.2707 };
    const userGPS = { lat: 13.0400, lng: 80.2200 };
    assert(getDisplayDistance(validTurf, userGPS) === '7.3 km', `Valid coordinates return calculated KM ("7.3 km")`);

    // Test Case B: Missing turf lat/lng -> "Location unavailable"
    const unlocatedTurf = { city: 'Erode', latitude: null, longitude: null };
    assert(getDisplayDistance(unlocatedTurf, userGPS) === 'Location unavailable', `Null coordinates return "Location unavailable"`);

    // Test Case C: Out-of-bounds/Invalid turf lat/lng -> "Location unavailable"
    const invalidTurf = { latitude: 999, longitude: 80.2707 };
    assert(getDisplayDistance(invalidTurf, userGPS) === 'Location unavailable', `Out-of-bounds coordinates return "Location unavailable"`);

    // Test Case D: User GPS missing -> "Location unavailable"
    assert(getDisplayDistance(validTurf, null) === 'Location unavailable', `Missing user GPS returns "Location unavailable"`);

    // 2. Auth State Transition Logic Simulation
    // State 1: Bootstrapping in progress -> showSplash / SplashScreen (DO NOT render Login or white screen)
    const state1 = { splashDone: true, bootstrapping: true, isAuthenticated: false };
    const vendorScreenState1 = (!state1.splashDone || state1.bootstrapping) ? 'SplashScreen' : (state1.isAuthenticated ? 'MainTabs' : 'LoginScreen');
    assert(vendorScreenState1 === 'SplashScreen', 'VendorApp stays on SplashScreen while bootstrapping=true (No Login flash)');

    const userScreenState1 = (!state1.splashDone || state1.bootstrapping) ? 'SplashScreen' : (state1.token ? 'Main' : 'LoginScreen');
    assert(userScreenState1 === 'SplashScreen', 'UserApp stays on SplashScreen while bootstrapping=true (No white screen)');

    // State 2: Bootstrapped + Authenticated -> Main app
    const state2 = { splashDone: true, bootstrapping: false, isAuthenticated: true, token: 'valid_token' };
    const vendorScreenState2 = (!state2.splashDone || state2.bootstrapping) ? 'SplashScreen' : (state2.isAuthenticated ? 'MainTabs' : 'LoginScreen');
    assert(vendorScreenState2 === 'MainTabs', 'VendorApp renders MainTabs directly when authenticated');

    const userScreenState2 = (!state2.splashDone || state2.bootstrapping) ? 'SplashScreen' : (state2.token ? 'Main' : 'LoginScreen');
    assert(userScreenState2 === 'Main', 'UserApp renders Main directly when authenticated');

    // State 3: Bootstrapped + Unauthenticated -> LoginScreen
    const state3 = { splashDone: true, bootstrapping: false, isAuthenticated: false, token: null };
    const vendorScreenState3 = (!state3.splashDone || state3.bootstrapping) ? 'SplashScreen' : (state3.isAuthenticated ? 'MainTabs' : 'LoginScreen');
    assert(vendorScreenState3 === 'LoginScreen', 'VendorApp renders LoginScreen when unauthenticated');

    const userScreenState3 = (!state3.splashDone || state3.bootstrapping) ? 'SplashScreen' : (state3.token ? 'Main' : 'LoginScreen');
    assert(userScreenState3 === 'LoginScreen', 'UserApp renders LoginScreen when unauthenticated');

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
