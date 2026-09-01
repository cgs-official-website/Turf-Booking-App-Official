const express = require('express');
const multer = require('multer');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const verifySessionToken = require('../middleware/verifySessionToken');
const requireRole = require('../middleware/requireRole');

// Memory storage for streaming files to Firebase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// All vendor routes require authenticated vendor role
router.use(verifySessionToken);
router.use(requireRole(['vendor', 'admin']));

// Onboarding Steps & Status
router.post('/onboarding/turf-setup', upload.array('images', 8), vendorController.turfSetup);
router.post(
  '/onboarding/verification',
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
  ]),
  vendorController.vendorVerification
);
router.post(
  '/onboarding/turf-verification',
  upload.fields([
    { name: 'gst', maxCount: 1 },
    { name: 'ebBill', maxCount: 1 },
  ]),
  vendorController.turfVerification
);
router.get('/onboarding/status', vendorController.getOnboardingStatus);
router.post('/approval-ack', vendorController.acknowledgeApproval);

// Vendor Dashboard & Slot Management
router.get('/dashboard', vendorController.getDashboard);
router.get('/bookings', vendorController.getVendorBookings);
router.post('/bookings/:id/accept', vendorController.updateBookingStatus);
router.patch('/turf/:turfId/slots', vendorController.updateSlotOverrides);
router.get('/reviews', vendorController.getVendorReviews);
router.post('/report-issue', vendorController.reportIssue);

module.exports = router;
