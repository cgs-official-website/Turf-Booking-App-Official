const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifySessionToken = require('../middleware/verifySessionToken');
const requireAdmin = require('../middleware/requireAdmin');

// Public Super Admin Login (Hardcoded Credentials: admin@zuna.com / Cgs@001a)
router.post('/login', adminController.login);

// All subsequent routes require Super Admin JWT verification
router.use(verifySessionToken);
router.use(requireAdmin);

// Real-Time System Monitoring & Statistics
router.get('/stats', adminController.getStats);

// Users & Vendors Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:uid', adminController.updateUser);
router.delete('/users/:uid', adminController.deleteUser);
router.get('/vendors', adminController.getAllVendors);
router.get('/vendors/pending', adminController.getPendingVendors);
router.post('/vendors/:uid/approve', adminController.approveVendor);
router.post('/vendors/:uid/reject', adminController.rejectVendor);

// Turfs Management
router.get('/turfs', adminController.getAllTurfs);
router.get('/turfs/pending', adminController.getPendingTurfs);
router.post('/turfs/:turfId/approve', adminController.approveTurf);
router.post('/turfs/:turfId/toggle-status', adminController.toggleTurfStatus);
router.delete('/turfs/:turfId', adminController.deleteTurfAdmin);

// Platform Bookings, Matches & Reviews Monitoring
router.get('/bookings', adminController.getAllBookings);
router.get('/matches', adminController.getAllMatches);
router.get('/reviews', adminController.getAllReviews);

// Tournaments Management (Super Admin Exclusive)
const tournamentController = require('../controllers/tournamentController');
router.get('/tournaments', tournamentController.getAllTournaments);
router.get('/tournaments/:id', tournamentController.getTournamentById);
router.post('/tournaments', tournamentController.createTournament);
router.put('/tournaments/:id', tournamentController.updateTournament);
router.patch('/tournaments/:id/status', tournamentController.updateTournamentStatus);
router.delete('/tournaments/:id', tournamentController.deleteTournament);

// Issue Reports & Support
router.get('/reports', adminController.getAllReports);
router.patch('/reports/:id', adminController.updateReportStatus);

// Notification Testing & Custom Alerts
router.post('/notifications/send-test', adminController.sendTestNotification);

// Bootstrap Custom Admin Claim
router.post('/set-admin-claim', adminController.setAdminClaim);

// Centralized API Integrations & Usage Monitoring
const integrationController = require('../controllers/integrationController');
router.get('/integrations', integrationController.getAllIntegrations);
router.put('/integrations/:provider', integrationController.updateIntegration);
router.post('/integrations/:provider/test', integrationController.testIntegration);
router.get('/integrations/:provider/usage', integrationController.getUsage);
router.post('/integrations/:provider/refresh-usage', integrationController.getUsage);

module.exports = router;
