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
router.get('/bookings/:id', vendorController.getBookingDetail);
router.post('/bookings/:id/accept', vendorController.updateBookingStatus);
router.put('/bookings/:id/accept', vendorController.updateBookingStatus);
router.post('/bookings/:id/reject', vendorController.updateBookingStatus);
router.put('/bookings/:id/reject', vendorController.updateBookingStatus);
router.patch('/turf/:turfId/slots', vendorController.updateSlotOverrides);
router.get('/reviews', vendorController.getVendorReviews);
router.delete('/reviews/:id', vendorController.deleteReview);
router.patch('/reviews/:id/hide', vendorController.toggleReviewVisibility);
router.post('/report-issue', vendorController.reportIssue);

// Vendor Turf Management & Slots
router.get('/turfs', vendorController.getMyTurfs);
router.post('/turfs', vendorController.addTurf);
router.get('/turfs/:turfId', vendorController.getTurfById);
router.put('/turfs/:turfId', vendorController.updateTurf);
router.delete('/turfs/:turfId', vendorController.deleteTurf);

router.get('/turfs/:turfId/slots/calendar', vendorController.getSlotCalendar);
router.post('/turfs/:turfId/slots/freeze', vendorController.freezeSlot);
router.post('/turfs/:turfId/slots', vendorController.addSlot);
router.delete('/turfs/:turfId/slots/:slotId', vendorController.deleteSlot);

module.exports = router;
