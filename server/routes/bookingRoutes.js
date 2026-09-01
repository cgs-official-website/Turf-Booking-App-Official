const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const verifySessionToken = require('../middleware/verifySessionToken');

// All booking routes require user/vendor authentication
router.use(verifySessionToken);

router.post('/reserve', bookingController.reserveSlot);
router.post('/:id/create-order', bookingController.createRazorpayOrder);
router.get('/mine', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingDetail);
router.post('/:id/cancel', bookingController.cancelBooking);
router.post('/:id/review', bookingController.addReview);

module.exports = router;
