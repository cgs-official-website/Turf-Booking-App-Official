const cron = require('node-cron');
const bookingService = require('../services/bookingService');

/**
 * Scheduled Background Jobs using node-cron
 */
const initCronJobs = () => {
  // Run every 60 seconds
  cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();

      // ── Job 1: Auto-complete confirmed bookings past endTime ──
      const completedCount = await bookingService.autoCompleteConfirmedBookings(now);
      if (completedCount > 0) {
        console.log(`⏱️ Auto-completed ${completedCount} booking(s)`);
      }

      // ── Job 2: Clean up expired 5-minute slot reservations ──
      const cleanedCount = await bookingService.cleanupExpiredReservations(now);
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired reservation(s)`);
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
