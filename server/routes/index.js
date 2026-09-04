const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const turfRoutes = require('./turfRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const vendorRoutes = require('./vendorRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const matchRoutes = require('./matchRoutes');
const notificationRoutes = require('./notificationRoutes');
const placesRoutes = require('./placesRoutes');
const adminRoutes = require('./adminRoutes');
const wishlistRoutes = require('./wishlistRoutes');
const { sendSuccess } = require('../utils/response');

// Health Check
router.get('/health', async (req, res) => {
  const { db } = require('../config/firebaseAdmin');
  let dbOk = false;
  let userCount = 0;
  try {
    if (db) {
      const snap = await db.collection('users').limit(1).get();
      dbOk = true;
      userCount = snap.size;
    }
  } catch (e) {
    dbOk = false;
  }

  return sendSuccess(res, {
    status: 'ok',
    version: '1.0.3',
    service: 'turf-booking-backend-v1',
    firestore: dbOk ? 'connected' : 'error',
    timestamp: new Date().toISOString(),
  });
});

// Domain Routes
router.use('/auth', authRoutes);
router.use('/turfs', turfRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/vendor', vendorRoutes);
router.use('/vendor/subscriptions', subscriptionRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/matches', matchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/places', placesRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
