const asyncHandler  = require('express-async-handler');
const crypto        = require('crypto');
const Razorpay      = require('razorpay');
const Booking       = require('../models/Booking');
const Turf          = require('../models/Turf');
const Review        = require('../models/Review');
const { timeToMinutes, createNotification } = require('../utils/helpers');

const getRazorpayInstance = (keyId, keySecret) =>
  new Razorpay({ key_id: keyId, key_secret: keySecret });

// @desc    Create a new booking request (pending vendor approval)
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  const { turfId, sport, date, startTime, endTime, players } = req.body;

  if (!turfId || !sport || !date || !startTime || !endTime || !players) {
    res.status(400);
    throw new Error('turfId, sport, date, startTime, endTime and players are required');
  }

  const turf = await Turf.findById(turfId);
  if (!turf || !turf.isActive) {
    res.status(404);
    throw new Error('Turf not found or unavailable');
  }

  // ✅ clash check - 'confirmed' use பண்றோம் ('accepted' இல்லை)
  const existing = await Booking.find({ turf: turfId, date, status: { $in: ['confirmed', 'pending'] } });
  const startMin = timeToMinutes(startTime);
  const endMin   = timeToMinutes(endTime);
  const clash = existing.some((b) => {
    const bs = timeToMinutes(b.startTime);
    const be = timeToMinutes(b.endTime);
    return startMin < be && endMin > bs;
  });
  if (clash) {
    res.status(409);
    throw new Error('Selected slot was just booked by someone else. Please pick another slot.');
  }

  if (!turf.pricePerHour || turf.pricePerHour <= 0) {
    res.status(400);
    throw new Error('Turf pricing is not configured correctly');
  }

  const durationHours = (endMin - startMin) / 60;
  if (durationHours <= 0) {
    res.status(400);
    throw new Error('Invalid time slot — end time must be after start time');
  }

  const numPlayers  = Number(players);
  const totalAmount = Math.round(turf.pricePerHour * durationHours);

  const booking = await Booking.create({
    user: req.user._id,
    turf: turf._id,
    sport,
    date,
    startTime,
    endTime,
    duration: durationHours,
    players: numPlayers,
    totalAmount,
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    status: 'pending',
  });

  // ✅ FIX 1: type 'General' → 'BookingReminder' (clock icon, orange colour)
  await createNotification({
    user:    req.user._id,
    title:   'Booking Request Sent ⏳',
    message: `Your request for ${turf.name} on ${date} at ${startTime} has been sent to the vendor.`,
    type:    'BookingReminder',
    booking: booking._id,
  });

  res.status(201).json({ success: true, booking });
});

// @desc    Get logged in user's bookings
// @route   GET /api/bookings?status=
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.status) query.status = req.query.status;

  const bookings = await Booking.find(query)
    .populate('turf', 'name images location pricePerHour')
    .sort({ createdAt: -1 });

  // ✅ NEW: attach a `reviewed` flag per booking so the app can show
  // "Rate your Experience" vs "Reviewed" without a separate API call.
  const reviewedIds = new Set(
    (await Review.find({ user: req.user._id }).select('booking')).map((r) => String(r.booking))
  );
  const bookingsWithFlag = bookings.map((b) => {
    const obj = b.toObject();
    obj.reviewed = reviewedIds.has(String(b._id));
    return obj;
  });

  res.json({ success: true, count: bookingsWithFlag.length, bookings: bookingsWithFlag });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('turf');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }
  res.json({ success: true, booking });
});

// @desc    Cancel a booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('turf', 'name');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (!['pending', 'confirmed'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Cannot cancel a booking with status ${booking.status}`);
  }

  booking.status = 'cancelled';
  await booking.save();

  // ✅ FIX 2: Cancel notification add பண்றோம் (BookingExpired = red colour)
  await createNotification({
    user:    req.user._id,
    title:   'Booking Cancelled ❌',
    message: `Your booking at ${booking.turf.name} on ${booking.date} at ${booking.startTime} has been cancelled.`,
    type:    'BookingExpired',
    booking: booking._id,
  });

  res.json({ success: true, booking });
});

// @desc    Vendor approves or rejects (legacy route - vendorBookingController use பண்றோம்)
// @route   PATCH /api/bookings/:id/vendor-respond
// @access  Private/Vendor
const vendorRespond = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const booking = await Booking.findById(req.params.id).populate('turf', 'name');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error(`Booking is already ${booking.status}`);
  }

  if (action === 'approve') {
    // ✅ FIX 3: 'accepted' → 'confirmed'
    booking.status     = 'confirmed';
    booking.acceptedAt = new Date();
  } else {
    booking.status          = 'rejected';
    booking.rejectedAt      = new Date();
    booking.rejectionReason = reason || 'Vendor declined the request';
  }

  await booking.save();

  await createNotification({
    user:    booking.user,
    title:   action === 'approve' ? 'Booking Confirmed! ✅' : 'Booking Rejected ❌',
    message:
      action === 'approve'
        ? `Your slot at ${booking.turf.name} on ${booking.date} is confirmed.`
        : `Your request for ${booking.turf.name} was declined. ${booking.rejectionReason}`,
    type:    action === 'approve' ? 'BookingConfirmed' : 'BookingRejected',
    booking: booking._id,
  });

  res.json({ success: true, booking });
});

// @desc    Vendor view of incoming requests
// @route   GET /api/bookings/vendor/incoming
// @access  Private/Vendor
const getVendorBookings = asyncHandler(async (req, res) => {
  const query = { turf: { $in: await Turf.find({ vendor: req.user._id }).distinct('_id') } };
  if (req.query.status) query.status = req.query.status;
  const bookings = await Booking.find(query)
    .populate('turf', 'name')
    .populate('user', 'name phone')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: bookings.length, bookings });
});

// @desc    Add a review after a completed booking
// @route   POST /api/bookings/:id/review
// @access  Private
const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }
  // ✅ FIX: payment check only applies to 'confirmed' bookings (about to be played).
  // A 'completed' booking has already gone through its lifecycle — don't block
  // reviews on stale/seeded paymentStatus values.
  if (!['confirmed', 'completed'].includes(booking.status)) {
    res.status(400);
    throw new Error('You can only review a confirmed or completed booking');
  }
  if (booking.status === 'confirmed' && booking.paymentStatus !== 'paid') {
    res.status(400);
    throw new Error('You can only review a paid, confirmed booking');
  }

  const existing = await Review.findOne({ booking: booking._id });
  if (existing) {
    res.status(400);
    throw new Error('You have already reviewed this booking');
  }

  const review = await Review.create({
    turf:    booking.turf,
    user:    req.user._id,
    booking: booking._id,
    rating,
    comment,
  });

  const stats = await Review.aggregate([
    { $match: { turf: booking.turf } },
    { $group: { _id: '$turf', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Turf.findByIdAndUpdate(booking.turf, {
      rating:      Math.round(stats[0].avg * 10) / 10,
      reviewCount: stats[0].count,
    });
  }

  res.status(201).json({ success: true, review });
});

// @desc    Create Razorpay order
// @route   POST /api/bookings/:id/payment-order
// @access  Private
const createPaymentOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('turf');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }
  // ✅ FIX 5: 'accepted' → 'confirmed'
  if (booking.status !== 'confirmed') {
    res.status(400);
    throw new Error('Payment is only allowed after vendor confirms the booking');
  }
  if (booking.paymentStatus === 'paid') {
    res.status(400);
    throw new Error('Booking is already paid');
  }

  const { razorpayKeyId, razorpayKeySecret } = booking.turf;
  if (!razorpayKeyId || !razorpayKeySecret) {
    res.status(500);
    throw new Error('Vendor has not configured Razorpay keys');
  }

  const razorpay = getRazorpayInstance(razorpayKeyId, razorpayKeySecret);
  const order = await razorpay.orders.create({
    amount:   booking.totalAmount * 100,
    currency: 'INR',
    receipt:  `booking_${booking._id}`,
    notes:    { bookingId: String(booking._id) },
  });

  booking.razorpayOrderId = order.id;
  await booking.save();

  res.json({
    success:       true,
    orderId:       order.id,
    amount:        order.amount,
    currency:      order.currency,
    razorpayKeyId,
  });
});

// @desc    Verify Razorpay payment signature
// @route   POST /api/bookings/:id/verify-payment
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  const booking = await Booking.findById(req.params.id).populate('turf', 'razorpayKeySecret name');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (booking.paymentStatus === 'paid') {
    res.status(400);
    throw new Error('Already paid');
  }

  const expectedSignature = crypto
    .createHmac('sha256', booking.turf.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed — invalid signature');
  }

  booking.paymentStatus     = 'paid';
  booking.razorpayPaymentId = razorpayPaymentId;
  booking.razorpaySignature = razorpaySignature;
  await booking.save();

  // ✅ Payment notification - General ok (info type)
  await createNotification({
    user:    booking.user,
    title:   'Payment Successful 🎉',
    message: `Payment of ₹${booking.totalAmount} for ${booking.turf.name} is confirmed.`,
    type:    'General',
    booking: booking._id,
  });

  res.json({ success: true, booking });
});

module.exports = {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  vendorRespond,
  getVendorBookings,
  addReview,
  createPaymentOrder,
  verifyPayment,
};