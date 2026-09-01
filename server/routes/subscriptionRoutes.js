const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const verifySessionToken = require('../middleware/verifySessionToken');
const requireRole = require('../middleware/requireRole');

// Publicly view plans
router.get('/plans', subscriptionController.getPlans);

// Authenticated vendor subscription endpoints
router.post('/subscribe', verifySessionToken, requireRole(['vendor', 'admin']), subscriptionController.createSubscriptionOrder);
router.post('/verify', verifySessionToken, requireRole(['vendor', 'admin']), subscriptionController.verifySubscription);
router.post('/webhook', subscriptionController.handleSubscriptionWebhook);

module.exports = router;
