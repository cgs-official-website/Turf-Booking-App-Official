const cron = require('node-cron');
const firestoreService = require('../services/firestoreService');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');

/**
 * Scheduled Background Jobs using node-cron
 */
const initCronJobs = () => {
  // Run every 60 seconds
  cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // ── Job 1: Auto-complete confirmed bookings past endTime ──
      const confirmedResult = await firestoreService.queryWithCursor('bookings', {
        filters: [
          ['status', '==', 'confirmed'],
        ],
        limit: 50,
      });

      for (const booking of confirmedResult.items) {
        if (!booking.date || !booking.endTime) continue;

        const bookingEnd = new Date(`${booking.date}T${booking.endTime}:00`);
        if (!isNaN(bookingEnd.getTime()) && bookingEnd.getTime() < now.getTime()) {
          await firestoreService.updateDoc('bookings', booking.id, {
            status: 'completed',
            completedAt: now,
          });

          // Invalidate vendor dashboard
          if (booking.vendorId) {
            await cacheService.invalidateDashboard(booking.vendorId);
          }

          // Send FCM Rating Prompt to User
          await notificationService.sendNotification({
            recipientId: booking.userId,
            recipientRole: 'user',
            title: 'How was your game? 🏟️',
            body: `Your session at ${booking.turfName || 'the turf'} is complete. Rate your experience!`,
            type: 'booking',
            data: { bookingId: booking.id, action: 'rate' },
          });

          console.log(`⏱️ Auto-completed booking ${booking.id}`);
        }
      }

      // ── Job 2: Clean up expired 5-minute slot reservations ──
      const reservedResult = await firestoreService.queryWithCursor('bookings', {
        filters: [['status', '==', 'reserved']],
        limit: 50,
      });

      for (const resBooking of reservedResult.items) {
        const resAt = resBooking.reservedAt?.toDate
          ? resBooking.reservedAt.toDate()
          : new Date(resBooking.reservedAt);

        // Older than 5 minutes
        if (now.getTime() - resAt.getTime() > 5 * 60 * 1000) {
          await firestoreService.deleteDoc('bookings', resBooking.id);
          await cacheService.invalidateSlots(resBooking.turfId, resBooking.date);
          console.log(`🧹 Released expired reservation ${resBooking.id} (${resBooking.turfId}, ${resBooking.date} ${resBooking.startTime})`);
        }
      }
    } catch (err) {
      console.error('Cron job error:', err.message);
    }
  });

  console.log('✅ Background cron jobs initialized (auto-complete & reservation cleaner)');
};

module.exports = {
  initCronJobs,
};
