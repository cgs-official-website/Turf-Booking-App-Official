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
router.post('/matches', adminController.createAdminMatch);
router.patch('/matches/:id', adminController.updateAdminMatch);
router.delete('/matches/:id', adminController.deleteAdminMatch);
router.get('/reviews', adminController.getAllReviews);

// Tournaments Management (Super Admin Exclusive)
const tournamentAdminController = require('../controllers/tournamentAdminController');
const tournamentController = require('../controllers/tournamentController');

router.get('/tournaments/history', tournamentAdminController.getTournamentHistory);
router.get('/tournaments', tournamentAdminController.getAllTournaments);
router.get('/tournaments/:id/live', tournamentAdminController.getTournamentLiveScore);
router.get('/tournaments/:id', tournamentAdminController.getTournamentById);
router.post('/tournaments', async (req, res, next) => {
  await tournamentAdminController.invalidateAdminTournamentCache();
  return tournamentController.createTournament(req, res, next);
});
router.put('/tournaments/:id', async (req, res, next) => {
  await tournamentAdminController.invalidateAdminTournamentCache();
  return tournamentController.updateTournament(req, res, next);
});
router.patch('/tournaments/:id/status', async (req, res, next) => {
  await tournamentAdminController.invalidateAdminTournamentCache();
  return tournamentController.updateTournamentStatus(req, res, next);
});
router.delete('/tournaments/:id', async (req, res, next) => {
  await tournamentAdminController.invalidateAdminTournamentCache();
  return tournamentController.deleteTournament(req, res, next);
});

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
