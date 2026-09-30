const prisma = require('../config/prisma');
const razorpayService = require('../services/razorpayService');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');
const bookingService = require('../services/bookingService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { reserveSlotSchema, createReviewSchema } = require('../utils/validators');
const { ZodError } = require('zod');

/**
 * Safely format error diagnostics by removing credentials, connection URIs, and tokens
 */
function sanitizeError(err) {
  if (!err) return 'Unknown error';
  const name = err.name || 'Error';
  const code = err.code ? ` [code: ${err.code}]` : '';
  const rawMsg = typeof err.message === 'string' ? err.message : String(err);

  const sanitizedMsg = rawMsg
    .replace(/(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/\b(password|pwd|secret|token|bearer|key)=[^\s&"';]+/gi, '$1=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');

  return `${name}${code}: ${sanitizedMsg}`;
}

const bookingController = {
  /**
   * POST /api/v1/bookings/reserve
   * Atomic slot reservation with 5-minute TTL in Prisma bookings table
   */
  async reserveSlot(req, res) {
    try {
      const parsed = reserveSlotSchema.parse(req.body);
      const { turfId, date } = parsed;

      const turf = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'TURF_NOT_FOUND');
      }

      const booking = await bookingService.reserveSlot(turf, req.user, parsed);

      // Bust slot cache
      await cacheService.invalidateSlots(turfId, date);

      return sendSuccess(res, { booking }, 201);
    } catch (err) {
      if (err instanceof ZodError || err.name === 'ZodError') {
        const message = err.errors && Array.isArray(err.errors)
          ? err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
          : err.message || 'Validation failed';
        return sendError(res, message, 400, 'VALIDATION_ERROR');
      }

      if (err instanceof bookingService.BookingError || err.name === 'BookingError') {
        return sendError(res, err.message, err.status || 400, err.code || 'BOOKING_ERROR');
      }

      if (err.code === 'P2021') {
        const rawTable = typeof err.meta?.table === 'string' ? err.meta.table : '';
        const cleanTable = rawTable.replace(/["`]/g, '').trim();
        const isBookingsTable = /^(?:[a-zA-Z0-9_]+\.)?bookings$/i.test(cleanTable);
        if (isBookingsTable) {
          console.error(`Database configuration error: Table "${cleanTable}" does not exist (Prisma P2021). Run 001_create_bookings.sql to create the bookings table.`);
        } else if (cleanTable) {
          console.error(`Database configuration error: Table "${cleanTable}" does not exist (Prisma P2021).`);
        } else {
          console.error('Database configuration error: A required database table does not exist (Prisma P2021).');
        }
        return sendError(res, 'Booking service is temporarily unavailable. Please try again later.', 503, 'SERVICE_UNAVAILABLE');
      }

      const safeMessage = String(err?.message || '')
        .replace(/(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi, '[REDACTED_DATABASE_URL]')
        .replace(/\b(password|pwd|secret|token|bearer|key)=[^\s&"';]+/gi, '$1=[REDACTED]')
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
        .slice(0, 300);
      console.error({
        name: err?.name,
        code: err?.code,
        meta: err?.meta,
        message: safeMessage,
      });
      return sendError(res, 'Failed to reserve slot. Please try again.', 500, 'RESERVATION_FAILED');
    }
  },

  /**
   * POST /api/v1/bookings/:id/create-order
   * Generate Razorpay order for a reserved booking
   */
  async createRazorpayOrder(req, res) {
    const { id } = req.params;
    const { uid, role } = req.user;

    try {
      const booking = await bookingService.getById(id);
      if (!booking) {
        return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
      }

      if (role !== 'admin' && !req.user.admin && booking.userId !== uid) {
        return sendError(res, 'Unauthorized booking access', 403, 'FORBIDDEN');
      }

      if (booking.status === 'confirmed') {
        return sendError(res, 'Booking is already confirmed', 400, 'ALREADY_CONFIRMED');
      }

      // Create Razorpay Order
      const order = await razorpayService.createOrder(booking.amount, booking.id, {
        bookingId: booking.id,
        turfId: booking.turfId,
        userId: uid,
      });

      await bookingService.attachRazorpayOrder(id, req.user, order.id);

      return sendSuccess(res, {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        bookingId: booking.id,
      });
    } catch (err) {
      if (err instanceof bookingService.BookingError || err.name === 'BookingError') {
        return sendError(res, err.message, err.status, err.code);
      }
      console.error('Create order error:', sanitizeError(err));
      return sendError(res, 'Failed to create payment order', 500, 'ORDER_CREATION_FAILED');
    }
  },

  /**
   * POST /api/v1/bookings/:id/confirm-cash
   * Confirm booking with Hand Cash (Pay at Ground upon arrival)
   */
  async confirmCashBooking(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    try {
      const result = await bookingService.confirmCashBooking(id, req.user);
      const booking = result.booking;

      if (result.updated) {
        // Invalidate slot cache
        await cacheService.invalidateSlots(booking.turfId, booking.date);

        // Notify user & vendor
        try {
          await notificationService.sendNotification({
            recipientId: uid,
            recipientRole: 'user',
            title: 'Hand Cash Request Submitted',
            body: `Your request for ${booking.turfName || 'the turf'} on ${booking.date} (${booking.startTime} - ${booking.endTime}) has been submitted. The pitch owner will review and confirm.`,
            type: 'booking',
            data: { bookingId: id, screen: 'Bookings' },
          });

          // Resolve vendorId and turf details for vendor notification
          let vendorId = booking.vendorId;
          let turfName = booking.turfName || booking.turf?.name;
          let turfType = booking.turfType || booking.sport || (Array.isArray(booking.turf?.sports) && booking.turf.sports[0]);

          if ((!vendorId || !turfName || !turfType) && booking.turfId) {
            const turf = await prisma.turf.findUnique({ where: { id: booking.turfId } });
            if (turf) {
              if (!vendorId) vendorId = turf.vendorId;
              if (!turfName) turfName = turf.name;
              if (!turfType) turfType = Array.isArray(turf.sports) ? turf.sports[0] : (turf.sports || 'Turf');
            }
          }

          turfName = turfName || 'Turf';
          turfType = turfType || 'Standard';
          const timeSlot = `${booking.startTime} - ${booking.endTime}`;
          const notifText = `New Booking: ${turfName} - ${turfType}, ${booking.date}, ${timeSlot}`;

          if (vendorId) {
            await notificationService.sendNotification({
              recipientId: vendorId,
              recipientRole: 'vendor',
              title: notifText,
              body: notifText,
              type: 'booking',
              data: {
                bookingId: String(id),
                screen: 'BookingDetail',
                type: 'booking',
                notificationText: notifText,
                turfName,
                turfType,
                date: booking.date,
                timeSlot,
                amount: String(booking.amount || booking.totalAmount || ''),
                paymentStatus: booking.paymentStatus || 'pending',
              },
            });
          }
        } catch (notifErr) {
          console.warn('⚠️ Notification warning on cash booking:', notifErr.message);
        }
      }

      return sendSuccess(res, {
        booking,
        message: result.updated
          ? 'Hand Cash booking request submitted. Awaiting vendor confirmation.'
          : 'Booking is already pending vendor confirmation.',
      });
    } catch (err) {
      if (err instanceof bookingService.BookingError || err.name === 'BookingError') {
        return sendError(res, err.message, err.status, err.code);
      }
      const safeMessage = String(err?.message || '')
        .replace(/(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi, '[REDACTED_DATABASE_URL]')
        .replace(/\b(password|pwd|secret|token|bearer|key)=[^\s&"';]+/gi, '$1=[REDACTED]')
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
        .slice(0, 300);
      console.error({
        name: err?.name,
        code: err?.code,
        meta: err?.meta,
        message: safeMessage,
      });
      return sendError(res, 'Failed to confirm cash booking', 500, 'CONFIRMATION_FAILED');
    }
  },

  /**
   * GET /api/v1/bookings/mine
   * User booking history with keyset pagination
   */
  async getMyBookings(req, res) {
    const { uid } = req.user;
    const { status, limit = 20, cursor } = req.query;

    try {
      const result = await bookingService.listForUser(uid, {
        status,
        limit: Number(limit),
        cursor,
      });

      return sendPaginated(res, result.items, result.nextCursor, {
        count: result.items.length,
        bookings: result.items,
      });
    } catch (err) {
      console.error('getMyBookings error:', sanitizeError(err));
      return sendError(res, 'Failed to fetch bookings', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/bookings/:id
   */
  async getBookingDetail(req, res) {
    const { id } = req.params;
    const { uid, role } = req.user;

    try {
      const booking = await bookingService.getById(id, { includeRelations: true, needUser: true });
      if (!booking) {
        return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
      }

      // Verify access: allowed for booking's user, booking's vendor, or admin
      if (role !== 'admin' && !req.user.admin && booking.userId !== uid && booking.vendorId !== uid) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      return sendSuccess(res, { booking });
    } catch (err) {
      console.error('getBookingDetail error:', sanitizeError(err));
      return sendError(res, 'Failed to fetch booking detail', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/bookings/:id/cancel
   */
  async cancelBooking(req, res) {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const result = await bookingService.cancelBooking(id, req.user, { reason });
      const booking = result.booking;

      if (result.updated) {
        // Invalidate slot cache & vendor dashboard
        await cacheService.invalidateSlots(booking.turfId, booking.date);
        if (booking.vendorId) {
          await cacheService.invalidateDashboard(booking.vendorId);
        }

        // Notify Vendor
        if (booking.vendorId) {
          try {
            await notificationService.sendNotification({
              recipientId: booking.vendorId,
              recipientRole: 'vendor',
              title: 'Booking Cancelled',
              body: `Booking for ${booking.date} at ${booking.startTime} has been cancelled.`,
              type: 'booking',
              data: { bookingId: id },
            });
          } catch (notifErr) {
            console.warn('⚠️ Notification error on cancel:', notifErr.message);
          }
        }
      }

      return sendSuccess(res, { booking, message: 'Booking cancelled successfully' });
    } catch (err) {
      if (err instanceof bookingService.BookingError || err.name === 'BookingError') {
        return sendError(res, err.message, err.status, err.code);
      }
      console.error('cancelBooking error:', sanitizeError(err));
      return sendError(res, 'Failed to cancel booking', 500, 'CANCEL_FAILED');
    }
  },

  /**
   * POST /api/v1/bookings/:id/review
   * Submit review after completion
   */
  async addReview(req, res) {
    const { id } = req.params;
    const { uid, role } = req.user;

    try {
      const parsed = createReviewSchema.parse(req.body);
      const { rating, comment } = parsed;

      const booking = await bookingService.getById(id);
      if (!booking) {
        return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
      }

      if (role !== 'admin' && !req.user.admin && booking.userId !== uid) {
        return sendError(res, 'Only the player who booked can review', 403, 'FORBIDDEN');
      }

      const turfId = parsed.turfId || booking.turfId;
      const userProfile = await prisma.user.findUnique({ where: { id: uid } });

      const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const reviewDoc = await prisma.review.create({
        data: {
          id: reviewId,
          bookingId: id,
          turfId,
          userId: uid,
          userName: userProfile?.name || booking.userName || 'Turf Player',
          userPhoto: userProfile?.avatar || '',
          rating: Number(rating) || 5,
          comment: comment || '',
        },
      });

      // Update booking review fields via bookingService
      await bookingService.attachReview(id, req.user, { reviewId: reviewDoc.id });

      // Recalculate turf rating summary
      if (turfId) {
        const allReviews = await prisma.review.findMany({
          where: { turfId },
          select: { rating: true },
        });
        const totalRatings = allReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
        const avgRating = allReviews.length > 0 ? Number((totalRatings / allReviews.length).toFixed(1)) : Number(rating);

        await prisma.turf.update({
          where: { id: turfId },
          data: {
            ratingAvg: avgRating,
            reviewsCount: allReviews.length,
          },
        });
      }

      return sendSuccess(res, { review: reviewDoc, message: 'Review submitted successfully' }, 201);
    } catch (err) {
      if (err instanceof ZodError || err.name === 'ZodError') {
        const message = err.errors && Array.isArray(err.errors)
          ? err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
          : err.message || 'Validation failed';
        return sendError(res, message, 400, 'VALIDATION_ERROR');
      }
      if (err instanceof bookingService.BookingError || err.name === 'BookingError') {
        return sendError(res, err.message, err.status, err.code);
      }
      console.error('addReview error:', sanitizeError(err));
      return sendError(res, 'Failed to submit review', 500, 'REVIEW_FAILED');
    }
  },
};

module.exports = bookingController;
