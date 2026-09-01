const firestoreService = require('../services/firestoreService');
const razorpayService = require('../services/razorpayService');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');
const { paymentVerifySchema } = require('../utils/validators');

const paymentController = {
  /**
   * POST /api/v1/payments/verify
   * Verify Razorpay payment signature (client-return path)
   */
  async verifyPayment(req, res) {
    const parsed = paymentVerifySchema.parse(req.body);
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed;

    const booking = await firestoreService.getDoc('bookings', bookingId);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    const isValid = razorpayService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return sendError(res, 'Payment signature verification failed', 400, 'PAYMENT_VERIFY_FAILED');
    }

    const confirmedBooking = await firestoreService.updateDoc('bookings', bookingId, {
      status: 'confirmed',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      confirmedAt: new Date(),
    });

    // Invalidate Redis slot cache and vendor dashboard
    await cacheService.invalidateSlots(booking.turfId, booking.date);
    if (booking.vendorId) {
      await cacheService.invalidateDashboard(booking.vendorId);
    }

    // Send FCM push notifications
    // 1. To User
    await notificationService.sendNotification({
      recipientId: booking.userId,
      recipientRole: 'user',
      title: 'Booking Confirmed! 🏟️',
      body: `Your slot at ${booking.turfName || 'the turf'} on ${booking.date} (${booking.startTime}) is confirmed!`,
      type: 'booking',
      data: { bookingId },
    });

    // 2. To Vendor
    if (booking.vendorId) {
      await notificationService.sendNotification({
        recipientId: booking.vendorId,
        recipientRole: 'vendor',
        title: 'New Booking Received! 💰',
        body: `New booking for ${booking.date} at ${booking.startTime} (₹${booking.amount}).`,
        type: 'booking',
        data: { bookingId },
      });
    }

    return sendSuccess(res, {
      booking: confirmedBooking,
      message: 'Payment verified and booking confirmed successfully',
    });
  },

  /**
   * POST /api/v1/payments/webhook
   * Server-side Razorpay Webhook listener (async fallback for dropped connections)
   */
  async handleWebhook(req, res) {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('⚠️ Invalid Razorpay Webhook signature');
      return sendError(res, 'Invalid webhook signature', 400, 'INVALID_SIGNATURE');
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`🔔 Razorpay Webhook Event: ${event}`);

    try {
      if (event === 'payment.captured' || event === 'order.paid') {
        const orderId = payload.payment?.entity?.order_id || payload.order?.entity?.id;
        const paymentId = payload.payment?.entity?.id;

        if (orderId) {
          const result = await firestoreService.queryWithCursor('bookings', {
            filters: [['razorpayOrderId', '==', orderId]],
            limit: 1,
          });

          if (result.items.length > 0) {
            const booking = result.items[0];
            if (booking.status !== 'confirmed') {
              await firestoreService.updateDoc('bookings', booking.id, {
                status: 'confirmed',
                razorpayPaymentId: paymentId || '',
                confirmedAt: new Date(),
              });

              await cacheService.invalidateSlots(booking.turfId, booking.date);
              if (booking.vendorId) {
                await cacheService.invalidateDashboard(booking.vendorId);
              }
              console.log(`✅ Webhook confirmed booking ${booking.id}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Webhook processing error:', err.message);
    }

    return sendSuccess(res, { received: true });
  },
};

module.exports = paymentController;
