const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const verifySessionToken = require('../middleware/verifySessionToken');

// Client-side payment signature verification
router.post('/verify', verifySessionToken, paymentController.verifyPayment);

// Razorpay Webhook endpoint (server-to-server, signature verified in controller)
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
