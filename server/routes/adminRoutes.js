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
router.get('/vendors', adminController.getAllVendors);
router.get('/vendors/pending', adminController.getPendingVendors);
router.post('/vendors/:uid/approve', adminController.approveVendor);
router.post('/vendors/:uid/reject', adminController.rejectVendor);

// Turfs Management
router.get('/turfs', adminController.getAllTurfs);
router.get('/turfs/pending', adminController.getPendingTurfs);
router.post('/turfs/:turfId/approve', adminController.approveTurf);
router.post('/turfs/:turfId/toggle-status', adminController.toggleTurfStatus);

// Platform Bookings & Matches Monitoring
router.get('/bookings', adminController.getAllBookings);
router.get('/matches', adminController.getAllMatches);

// Issue Reports & Support
router.get('/reports', adminController.getAllReports);
router.patch('/reports/:id', adminController.updateReportStatus);

// Bootstrap Custom Admin Claim
router.post('/set-admin-claim', adminController.setAdminClaim);

module.exports = router;
