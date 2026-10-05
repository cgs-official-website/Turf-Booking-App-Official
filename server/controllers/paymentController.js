const prisma = require('../config/prisma');
const bookingService = require('../services/bookingService');
const { BookingError } = bookingService;
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
    try {
      const parsed = paymentVerifySchema.parse(req.body);
      const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed;

      const booking = await bookingService.getById(bookingId, { includeRelations: true });
      if (!booking) {
        return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
      }

      // Idempotent return if already confirmed
      if (booking.status === 'confirmed' || booking.bookingStatus === 'confirmed') {
        return sendSuccess(res, {
          booking,
          message: 'Booking is already confirmed',
        });
      }

      const isValid = razorpayService.verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        return sendError(res, 'Payment signature verification failed', 400, 'PAYMENT_VERIFY_FAILED');
      }

      const { booking: confirmedBooking } = await bookingService.confirmRazorpayPayment(
        bookingId,
        req.user,
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
        }
      );

      // Invalidate Redis slot cache and vendor dashboard
      await cacheService.invalidateSlots(confirmedBooking.turfId, confirmedBooking.date);
      if (confirmedBooking.vendorId) {
        await cacheService.invalidateDashboard(confirmedBooking.vendorId);
      }

      // Send FCM push notifications safely in background
      (async () => {
        let vendorId = confirmedBooking.vendorId;
        if (!vendorId && confirmedBooking.turfId) {
          const turf = await prisma.turf.findUnique({ where: { id: confirmedBooking.turfId } });
          vendorId = turf?.vendorId;
        }

        // 1. To User
        if (confirmedBooking.userId) {
          await notificationService.sendNotification({
            recipientId: confirmedBooking.userId,
            recipientRole: 'user',
            title: 'Booking Confirmed!',
            body: `Your slot at ${confirmedBooking.turfName || confirmedBooking.turf?.name || 'the turf'} on ${confirmedBooking.date} (${confirmedBooking.startTime}) is confirmed!`,
            type: 'booking',
            data: { bookingId },
          });
        }

        // 2. To Vendor associated with the booked turf only
        if (vendorId) {
          let turfName = confirmedBooking.turfName || confirmedBooking.turf?.name;
          let turfType = confirmedBooking.turfType || confirmedBooking.sport || (Array.isArray(confirmedBooking.turf?.sports) && confirmedBooking.turf.sports[0]);

          if ((!turfName || !turfType) && confirmedBooking.turfId) {
            const turf = await prisma.turf.findUnique({ where: { id: confirmedBooking.turfId } });
            if (turf) {
              if (!turfName) turfName = turf.name;
              if (!turfType) turfType = Array.isArray(turf.sports) ? turf.sports[0] : (turf.sports || 'Turf');
            }
          }

          turfName = turfName || 'Turf';
          turfType = turfType || 'Standard';
          const timeSlot = `${confirmedBooking.startTime} - ${confirmedBooking.endTime}`;
          const notifTitle = 'New Booking Request';
          const notifBody = `New booking received for ${turfName}, ${timeSlot} on ${confirmedBooking.date}.`;

          await notificationService.sendNotification({
            recipientId: vendorId,
            recipientRole: 'vendor',
            title: notifTitle,
            body: notifBody,
            type: 'booking',
            data: {
              bookingId: String(bookingId),
              turfId: String(confirmedBooking.turfId || ''),
              screen: 'BookingDetail',
              type: 'booking',
              notificationText: notifBody,
              turfName,
              turfType,
              date: confirmedBooking.date,
              timeSlot,
              amount: String(confirmedBooking.amount || confirmedBooking.totalAmount || ''),
              paymentStatus: confirmedBooking.paymentStatus || 'success',
            },
          });
        }
      })().catch((err) => console.warn('⚠️ Push notification dispatch warning:', err.message));

      return sendSuccess(res, {
        booking: confirmedBooking,
        message: 'Payment verified and booking confirmed successfully',
      });
    } catch (err) {
      if (err instanceof BookingError) {
        return sendError(res, err.message, err.status, err.code);
      }
      console.error('verifyPayment error:', err);
      return sendError(res, 'Failed to verify payment', 500, 'PAYMENT_VERIFY_FAILED');
    }
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
          const result = await bookingService.confirmByRazorpayOrderId(orderId, {
            razorpayPaymentId: paymentId || '',
          });

          if (result.found && result.updated) {
            const booking = result.booking;

            await cacheService.invalidateSlots(booking.turfId, booking.date);
            if (booking.vendorId) {
              await cacheService.invalidateDashboard(booking.vendorId);
            }

            // Send background notifications
            let vendorId = booking.vendorId;
            if (!vendorId && booking.turfId) {
              const turf = await prisma.turf.findUnique({ where: { id: booking.turfId } });
              vendorId = turf?.vendorId;
            }

            if (vendorId) {
              let turfName = booking.turfName || booking.turf?.name;
              let turfType = booking.turfType || booking.sport || (Array.isArray(booking.turf?.sports) && booking.turf.sports[0]);

              if ((!turfName || !turfType) && booking.turfId) {
                const turf = await prisma.turf.findUnique({ where: { id: booking.turfId } });
                if (turf) {
                  if (!turfName) turfName = turf.name;
                  if (!turfType) turfType = Array.isArray(turf.sports) ? turf.sports[0] : (turf.sports || 'Turf');
                }
              }

              turfName = turfName || 'Turf';
              turfType = turfType || 'Standard';
              const timeSlot = `${booking.startTime} - ${booking.endTime}`;
              const notifText = `New Booking: ${turfName} - ${turfType}, ${booking.date}, ${timeSlot}`;

              await notificationService.sendNotification({
                recipientId: vendorId,
                recipientRole: 'vendor',
                title: notifText,
                body: notifText,
                type: 'booking',
                data: {
                  bookingId: String(booking.id),
                  screen: 'BookingDetail',
                  type: 'booking',
                  notificationText: notifText,
                  turfName,
                  turfType,
                  date: booking.date,
                  timeSlot,
                  amount: String(booking.amount || booking.totalAmount || ''),
                  paymentStatus: booking.paymentStatus || 'success',
                },
              });
            }

            if (booking.userId) {
              await notificationService.sendNotification({
                recipientId: booking.userId,
                recipientRole: 'user',
                title: 'Booking Confirmed!',
                body: `Your slot at ${booking.turfName || booking.turf?.name || 'the turf'} on ${booking.date} (${booking.startTime}) is confirmed!`,
                type: 'booking',
                data: { bookingId: booking.id },
              });
            }

            console.log(`✅ Webhook confirmed booking ${booking.id}`);
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
