const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const razorpay = require('../utils/razorpay');
const Booking = require('../models/Booking');
const { createNotification } = require('../utils/helpers');

// @desc    Create a Razorpay order for a confirmed booking
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId).populate('turf', 'name');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (booking.status !== 'Confirmed') {
    res.status(400);
    throw new Error('Payment is only allowed after the vendor confirms your booking');
  }
  if (booking.paymentStatus === 'Paid') {
    res.status(400);
    throw new Error('This booking has already been paid for');
  }

  const order = await razorpay.orders.create({
    amount: booking.totalAmount * 100, // paise
    currency: 'INR',
    receipt: booking.bookingCode,
    notes: { bookingId: String(booking._id), turf: booking.turf.name },
  });

  booking.razorpayOrderId = order.id;
  await booking.save();

  res.json({
    success: true,
    order,
    keyId: process.env.RAZORPAY_KEY_ID,
    booking: { id: booking._id, bookingCode: booking.bookingCode, totalAmount: booking.totalAmount },
  });
});

// @desc    Verify Razorpay payment signature and mark booking paid
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error('Payment verification failed - signature mismatch');
  }

  booking.paymentStatus = 'Paid';
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  await booking.save();

  await createNotification({
    user: booking.user,
    title: 'Payment Successful',
    message: `Payment of ₹${booking.totalAmount} received for booking #${booking.bookingCode}.`,
    type: 'BookingConfirmed',
    booking: booking._id,
  });

  res.json({ success: true, booking });
});

module.exports = { createOrder, verifyPayment };