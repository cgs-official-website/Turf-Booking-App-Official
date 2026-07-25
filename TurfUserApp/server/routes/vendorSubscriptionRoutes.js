const express = require('express');
const router = express.Router();
const {
  getPlans,
  createOrder,
  verifyPayment,
  getMySubscription,
  getHistory,
} = require('../controllers/vendorSubscriptionController');
const vendorAuth = require('../middleware/vendorAuth');

// Plans are public (so vendors can browse before login)
router.get('/plans', getPlans);

// Protected
router.use(vendorAuth);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/me', getMySubscription);
router.get('/history', getHistory);

module.exports = router;