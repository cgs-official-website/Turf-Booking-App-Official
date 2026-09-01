const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const turfRoutes = require('./turfRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const vendorRoutes = require('./vendorRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const matchRoutes = require('./matchRoutes');
const adminRoutes = require('./adminRoutes');
const { sendSuccess } = require('../utils/response');

// Health Check
router.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    service: 'turf-booking-backend-v1',
    timestamp: new Date().toISOString(),
  });
});

// Domain Routes
router.use('/auth', authRoutes);
router.use('/turfs', turfRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/vendor', vendorRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/matches', matchRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
