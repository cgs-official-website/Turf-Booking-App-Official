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
const enquiryRoutes = require('./enquiryRoutes');
const { sendSuccess } = require('../utils/response');

// Health Check
router.get('/health', async (req, res) => {
  const prisma = require('../config/prisma');
  let dbOk = false;
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
    dbOk = true;
  } catch (e) {
    dbOk = false;
  }

  return sendSuccess(res, {
    status: 'ok',
    version: '1.0.3',
    service: 'turf-booking-backend-v1',
    database: 'Railway PostgreSQL',
    postgres: dbOk ? 'connected' : 'error',
    totalUsers: userCount,
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
router.use('/subscriptions', subscriptionRoutes);
router.use('/matches', matchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/places', placesRoutes);
router.use('/admin', adminRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/inquiries', enquiryRoutes);
router.use('/vendor-enquiries', enquiryRoutes);
router.post('/reports/inquiry', require('../controllers/enquiryController').createEnquiry);

// Public Reviews Stream (Directly from database)
router.get('/reviews', async (req, res) => {
  const firestoreService = require('../services/firestoreService');
  try {
    const result = await firestoreService.queryWithCursor('reviews', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: 12,
    });
    return sendSuccess(res, { reviews: result.items || [] });
  } catch (err) {
    return sendSuccess(res, { reviews: [] });
  }
});

module.exports = router;
