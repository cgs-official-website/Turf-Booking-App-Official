const Review = require('../models/Review');
const Booking = require('../models/Booking');

// @desc   Submit a review for a completed booking
// @route  POST /api/reviews
// @access Private (user)
exports.createReview = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ success: false, message: 'bookingId and rating are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this booking' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'You can only review completed bookings' });
    }

    const existing = await Review.findOne({ booking: bookingId, user: userId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
    }

    const review = await Review.create({
      turf: booking.turf,
      user: userId,
      booking: bookingId,
      rating,
      comment: comment || '',
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    // handles the unique index (turf+user+booking) as a fallback race-condition guard
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc   Get the list of booking IDs the current user has already reviewed
//         (used by MyBookingsScreen to switch "Rate your Experience" -> "Reviewed")
// @route  GET /api/reviews/mine
// @access Private (user)
exports.getMyReviewedBookings = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const reviews = await Review.find({ user: userId }).select('booking');
    res.json({ success: true, bookingIds: reviews.map((r) => String(r.booking)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};