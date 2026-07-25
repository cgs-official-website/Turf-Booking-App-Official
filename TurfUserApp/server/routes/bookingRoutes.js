// const express = require('express');
// const router = express.Router();
// const {
//   createBooking,
//   getMyBookings,
//   getBooking,
//   cancelBooking,
//   vendorRespond,
//   getVendorBookings,
//   addReview,
// } = require('../controllers/bookingController');
// const { protect, authorize } = require('../middleware/auth');

// router.use(protect);

// router.get('/vendor/incoming', authorize('vendor', 'admin'), getVendorBookings);

// router.post('/', createBooking);
// router.get('/', getMyBookings);
// router.get('/:id', getBooking);
// router.patch('/:id/cancel', cancelBooking);
// router.patch('/:id/vendor-respond', authorize('vendor', 'admin'), vendorRespond);
// router.post('/:id/review', addReview);

// module.exports = router;

const express = require('express');
const router  = express.Router();
const {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  vendorRespond,
  getVendorBookings,
  addReview,
  createPaymentOrder,   // ← new
  verifyPayment,        // ← new
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/vendor/incoming', authorize('vendor', 'admin'), getVendorBookings);

router.post('/',                              createBooking);
router.get('/',                               getMyBookings);
router.get('/:id',                            getBooking);
router.patch('/:id/cancel',                   cancelBooking);
router.patch('/:id/vendor-respond',           authorize('vendor', 'admin'), vendorRespond);
router.post('/:id/review',                    addReview);

// ── Payment routes ──────────────────────────────────────────────────────────
router.post('/:id/payment-order',             createPaymentOrder);
router.post('/:id/verify-payment',            verifyPayment);

module.exports = router;