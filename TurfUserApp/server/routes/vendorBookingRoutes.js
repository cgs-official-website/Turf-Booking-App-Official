const express = require('express');
const router = express.Router();
const {
  getBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
} = require('../controllers/vendorBookingController');
const vendorAuth = require('../middleware/vendorAuth');

router.use(vendorAuth);

router.get('/', getBookings);
router.get('/:id', getBookingById);
router.put('/:id/accept', acceptBooking);
router.put('/:id/reject', rejectBooking);

module.exports = router;