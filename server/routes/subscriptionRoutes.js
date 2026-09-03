const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const verifySessionToken = require('../middleware/verifySessionToken');
const requireRole = require('../middleware/requireRole');

// Public / Vendor view dynamic plans
router.get('/plans', subscriptionController.getPlans);

// Admin dynamic plan management
router.post('/plans', verifySessionToken, requireRole(['admin', 'superadmin']), subscriptionController.createPlan);
router.put('/plans/:id', verifySessionToken, requireRole(['admin', 'superadmin']), subscriptionController.updatePlan);
router.delete('/plans/:id', verifySessionToken, requireRole(['admin', 'superadmin']), subscriptionController.deletePlan);

// Vendor subscription checkout & verification
router.post('/activate-free', verifySessionToken, requireRole(['vendor', 'admin']), subscriptionController.activateFreePlan);
router.post('/subscribe', verifySessionToken, requireRole(['vendor', 'admin']), subscriptionController.createSubscriptionOrder);
router.post('/create-order', verifySessionToken, requireRole(['vendor', 'admin']), subscriptionController.createSubscriptionOrder);
router.post('/verify', verifySessionToken, requireRole(['vendor', 'admin']), subscriptionController.verifySubscription);
router.get('/me', verifySessionToken, requireRole(['vendor', 'admin']), subscriptionController.getMySubscription);
router.get('/history', verifySessionToken, requireRole(['vendor', 'admin']), subscriptionController.getSubscriptionHistory);
router.post('/webhook', subscriptionController.handleSubscriptionWebhook);

module.exports = router;
