const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const verifySessionToken = require('../middleware/verifySessionToken');

const requireRole = require('../middleware/requireRole');

// All booking routes require user/vendor authentication
router.use(verifySessionToken);

router.post('/reserve', requireRole(['user', 'admin']), bookingController.reserveSlot);
router.post('/:id/create-order', requireRole(['user', 'admin']), bookingController.createRazorpayOrder);
router.post('/:id/confirm-cash', requireRole(['user', 'admin']), bookingController.confirmCashBooking);
router.get('/mine', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingDetail);
router.post('/:id/cancel', bookingController.cancelBooking);
router.post('/:id/review', bookingController.addReview);

module.exports = router;
