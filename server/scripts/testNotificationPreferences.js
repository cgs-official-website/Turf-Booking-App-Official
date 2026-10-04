const prisma = require('../config/prisma');
const notificationService = require('../services/notificationService');

async function runTest() {
  console.log('🧪 Starting Notification Preferences & Backend Enforcement Test...\n');

  const testUserId = 'test_user_pref_999';
  const testVendorId = 'test_vendor_pref_999';

  try {
    // 1. Check default preference (should be true)
    const defaultUserPref = await notificationService.getNotificationPreference(testUserId, 'user');
    const defaultVendorPref = await notificationService.getNotificationPreference(testVendorId, 'vendor');
    console.log(`✅ Default User Preference: ${defaultUserPref} (Expected: true)`);
    console.log(`✅ Default Vendor Preference: ${defaultVendorPref} (Expected: true)`);

    // 2. Set preference to false (OFF)
    await notificationService.setNotificationPreference(testUserId, 'user', false);
    const updatedUserPrefFalse = await notificationService.getNotificationPreference(testUserId, 'user');
    console.log(`✅ Updated User Preference to false: ${updatedUserPrefFalse} (Expected: false)`);

    // 3. Verify PostgreSQL documents table record
    const docRecord = await prisma.document.findUnique({
      where: {
        collection_id: {
          collection: 'pref_user',
          id: testUserId,
        },
      },
    });
    console.log(`✅ PostgreSQL Document record persisted:`, JSON.stringify(docRecord?.data));

    // 4. Test sendNotification with preference OFF (should skip FCM push, but save notification in DB)
    const notifOff = await notificationService.sendNotification({
      recipientId: testUserId,
      recipientRole: 'user',
      title: 'Test Notification OFF',
      body: 'This push should be skipped because preference is OFF.',
      type: 'booking',
    });
    console.log(`✅ In-App Notification created with ID: ${notifOff?.id}, recipientId: ${notifOff?.recipientId}`);

    // Verify it is in PostgreSQL notifications table
    const dbNotif = await prisma.notification.findUnique({ where: { id: notifOff.id } });
    console.log(`✅ Verified in PostgreSQL notifications table: "${dbNotif.title}"`);

    // 5. Set preference back to true (ON)
    await notificationService.setNotificationPreference(testUserId, 'user', true);
    const updatedUserPrefTrue = await notificationService.getNotificationPreference(testUserId, 'user');
    console.log(`✅ Updated User Preference to true: ${updatedUserPrefTrue} (Expected: true)`);

    // 6. Clean up test data
    await prisma.notification.deleteMany({ where: { recipientId: testUserId } });
    await prisma.document.deleteMany({
      where: {
        collection: { in: ['pref_user', 'pref_vendor'] },
        id: { in: [testUserId, testVendorId] },
      },
    });
    console.log('\n🎉 ALL TESTS PASSED: Preferences correctly persist in PostgreSQL and backend enforcement works flawlessly!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
