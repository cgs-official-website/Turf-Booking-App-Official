const prisma = require('../config/prisma');
const bookingService = require('../services/bookingService');
const vendorController = require('../controllers/vendorController');

async function runTest() {
  console.log('==================================================');
  console.log('RUNNING OPEN SLOTS CARD VERIFICATION SUITE');
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
    const { dateStr: todayStr, timeStr: currentTimeStr } = bookingService.getKolkataTimeInfo();
    console.log(`Current Kolkata Info - Date: ${todayStr}, Time: ${currentTimeStr}`);

    // Get vendor with a turf
    const vendor = await prisma.vendor.findFirst({
      where: { turfs: { some: {} } },
      include: { turfs: true },
    });

    assert(vendor !== null, `Found test vendor '${vendor?.email}' with turf '${vendor?.turfs?.[0]?.name}'`);
    const turf = vendor.turfs[0];

    // Check operating hours
    const open = turf.slotConfig?.openTime || '06:00';
    const close = turf.slotConfig?.closeTime || '23:00';
    const duration = Number(t => t.slotConfig?.slotDurationMins) || 60;
    const [curH, curM] = currentTimeStr.split(':').map(Number);
    const currentMin = (curH || 0) * 60 + (curM || 0);

    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);
    const startMin = openH * 60 + (openM || 0);
    const endMin = closeH * 60 + (closeM || 0);

    let totalConfiguredSlots = 0;
    let expectedPastSlots = 0;

    for (let m = startMin; m < endMin; m += duration) {
      totalConfiguredSlots++;
      if (m < currentMin) {
        expectedPastSlots++;
      }
    }

    console.log(`Total Configured Slots: ${totalConfiguredSlots}`);
    console.log(`Expected Expired/Past Slots at current time: ${expectedPastSlots}`);

    // Call getDashboard
    let dashboardResult = null;
    const req = { user: { uid: vendor.id } };
    const res = {
      json: (d) => { dashboardResult = d; },
      status: (s) => ({ json: (d) => { dashboardResult = d; } }),
    };

    await vendorController.getDashboard(req, res);

    assert(dashboardResult && dashboardResult.success, 'getDashboard API returns success');
    const openSlotsCount = dashboardResult.data.stats.availableSlots;
    assert(typeof openSlotsCount === 'number', `getDashboard stats.availableSlots is a number: ${openSlotsCount}`);

    // Verify past slots are excluded
    assert(openSlotsCount <= (totalConfiguredSlots - expectedPastSlots), `Open slots count (${openSlotsCount}) correctly excludes past hours (${expectedPastSlots})`);

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
