const firestoreService = require('../services/firestoreService');
const razorpayService = require('../services/razorpayService');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { reserveSlotSchema, createReviewSchema } = require('../utils/validators');

const bookingController = {
  /**
   * POST /api/v1/bookings/reserve
   * Atomic slot reservation with 5-minute TTL to prevent concurrency race conditions
   */
  async reserveSlot(req, res) {
    const { uid } = req.user;
    const parsed = reserveSlotSchema.parse(req.body);
    const { turfId, date, startTime, endTime, courtNumber, sport } = parsed;

    const turf = await firestoreService.getDoc('turfs', turfId);
    if (!turf) {
      return sendError(res, 'Turf not found', 404, 'TURF_NOT_FOUND');
    }

    const price = turf.pricing?.baseRate || 800;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min reservation lock

    let bookingId = null;

    try {
      await firestoreService.runTransaction(async (transaction) => {
        const bookingsRef = firestoreService.db.collection('bookings');

        // Query active bookings for this turf, date & startTime
        const clashQuery = await transaction.get(
          bookingsRef
            .where('turfId', '==', turfId)
            .where('date', '==', date)
            .where('startTime', '==', startTime)
        );

        // Filter for active locks
        for (const doc of clashQuery.docs) {
          const b = doc.data();
          if (['pending', 'confirmed'].includes(b.status)) {
            throw new Error('SLOT_ALREADY_BOOKED');
          }
          if (b.status === 'reserved') {
            const resAt = b.reservedAt?.toDate ? b.reservedAt.toDate() : new Date(b.reservedAt);
            if (now.getTime() - resAt.getTime() < 5 * 60 * 1000) {
              throw new Error('SLOT_CURRENTLY_HELD');
            }
          }
        }

        // Create new reservation document
        const newBookingRef = bookingsRef.doc();
        bookingId = newBookingRef.id;

        transaction.set(newBookingRef, {
          id: bookingId,
          userId: uid,
          turfId,
          vendorId: turf.vendorId || '',
          turfName: turf.name || 'Turf',
          turfAddress: turf.address || '',
          date,
          startTime,
          endTime,
          courtNumber,
          sport: sport || (turf.sportTypes ? turf.sportTypes[0] : 'General'),
          amount: price,
          status: 'reserved',
          reservedAt: now,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Bust slot cache
      await cacheService.invalidateSlots(turfId, date);

      const booking = await firestoreService.getDoc('bookings', bookingId);
      return sendSuccess(res, { booking }, 201);
    } catch (err) {
      if (err.message === 'SLOT_ALREADY_BOOKED') {
        return sendError(res, 'This slot is already booked by another player', 409, 'SLOT_UNAVAILABLE');
      }
      if (err.message === 'SLOT_CURRENTLY_HELD') {
        return sendError(res, 'This slot is currently held in checkout by another player. Try again in 5 minutes.', 409, 'SLOT_HELD');
      }
      console.error('Reservation transaction error:', err);
      return sendError(res, 'Failed to reserve slot. Please try again.', 500, 'RESERVATION_FAILED');
    }
  },

  /**
   * POST /api/v1/bookings/:id/create-order
   * Generate Razorpay order for a reserved booking
   */
  async createRazorpayOrder(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    const booking = await firestoreService.getDoc('bookings', id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    if (booking.userId !== uid) {
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

    await firestoreService.updateDoc('bookings', id, {
      razorpayOrderId: order.id,
    });

    return sendSuccess(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId: booking.id,
    });
  },

  /**
   * GET /api/v1/bookings/mine
   * User booking history with cursor pagination
   */
  async getMyBookings(req, res) {
    const { uid } = req.user;
    const { status, limit = 20, cursor } = req.query;

    const filters = [
      ['userId', '==', uid],
    ];

    if (status) {
      filters.push(['status', '==', status]);
    }

    const result = await firestoreService.queryWithCursor('bookings', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    return sendPaginated(res, result.items, result.nextCursor, { count: result.items.length });
  },

  /**
   * GET /api/v1/bookings/:id
   */
  async getBookingDetail(req, res) {
    const { id } = req.params;
    const { uid, role } = req.user;

    const booking = await firestoreService.getDoc('bookings', id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    // Verify access
    if (role !== 'admin' && booking.userId !== uid && booking.vendorId !== uid) {
      return sendError(res, 'Access denied', 403, 'FORBIDDEN');
    }

    return sendSuccess(res, { booking });
  },

  /**
   * POST /api/v1/bookings/:id/cancel
   */
  async cancelBooking(req, res) {
    const { id } = req.params;
    const { uid, role } = req.user;

    const booking = await firestoreService.getDoc('bookings', id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    if (role !== 'admin' && booking.userId !== uid) {
      return sendError(res, 'Access denied', 403, 'FORBIDDEN');
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return sendError(res, `Cannot cancel a booking with status '${booking.status}'`, 400, 'INVALID_STATUS');
    }

    const updated = await firestoreService.updateDoc('bookings', id, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    // Invalidate slot cache & vendor dashboard
    await cacheService.invalidateSlots(booking.turfId, booking.date);
    if (booking.vendorId) {
      await cacheService.invalidateDashboard(booking.vendorId);
    }

    // Notify Vendor
    if (booking.vendorId) {
      await notificationService.sendNotification({
        recipientId: booking.vendorId,
        recipientRole: 'vendor',
        title: 'Booking Cancelled ❌',
        body: `Booking for ${booking.date} at ${booking.startTime} has been cancelled.`,
        type: 'booking',
        data: { bookingId: id },
      });
    }

    return sendSuccess(res, { booking: updated, message: 'Booking cancelled successfully' });
  },

  /**
   * POST /api/v1/bookings/:id/review
   * Submit review after completion
   */
  async addReview(req, res) {
    const { id } = req.params;
    const { uid } = req.user;
    const parsed = createReviewSchema.parse(req.body);
    const { turfId, rating, comment } = parsed;

    const booking = await firestoreService.getDoc('bookings', id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    if (booking.userId !== uid) {
      return sendError(res, 'Only the player who booked can review', 403, 'FORBIDDEN');
    }

    const userProfile = await firestoreService.getDoc('users', uid);

    const reviewDoc = await firestoreService.createDoc('reviews', {
      bookingId: id,
      turfId,
      userId: uid,
      userName: userProfile?.name || 'Player',
      userPhoto: userProfile?.photoURL || '',
      rating,
      comment,
    });

    await firestoreService.updateDoc('bookings', id, {
      isReviewed: true,
      reviewId: reviewDoc.id,
    });

    return sendSuccess(res, { review: reviewDoc }, 201);
  },
};

module.exports = bookingController;
