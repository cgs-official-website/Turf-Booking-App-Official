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
   * POST /api/v1/bookings/:id/confirm-cash
   * Confirm booking with Hand Cash (Pay at Ground upon arrival)
   */
  async confirmCashBooking(req, res) {
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
      return sendSuccess(res, { booking, message: 'Booking is already confirmed' });
    }

    // Set status to pending awaiting vendor approval
    const updated = await firestoreService.updateDoc('bookings', id, {
      status: 'pending',
      paymentMethod: 'cash',
      paymentMode: 'hand_cash',
      paymentStatus: 'pending_cash',
      requestedAt: new Date(),
      updatedAt: new Date(),
    });

    // Invalidate slot cache
    await cacheService.invalidateSlots(booking.turfId, booking.date);

    // Notify user & vendor
    try {
      await notificationService.sendNotification({
        recipientId: uid,
        recipientRole: 'user',
        title: '⏳ Hand Cash Request Submitted',
        body: `Your request for ${booking.turfName || 'the turf'} on ${booking.date} (${booking.startTime} - ${booking.endTime}) has been submitted. The pitch owner will review and confirm.`,
        type: 'booking',
        data: { bookingId: id, screen: 'Bookings' },
      });

      if (booking.vendorId) {
        await notificationService.sendNotification({
          recipientId: booking.vendorId,
          recipientRole: 'vendor',
          title: '🏟️ New Hand Cash Request!',
          body: `New booking request for ${booking.sport} on ${booking.date} (${booking.startTime} - ${booking.endTime}). Collect ₹${booking.amount} at the pitch. Please review and accept.`,
          type: 'booking',
          data: { bookingId: id, screen: 'Bookings' },
        });
      }
    } catch (notifErr) {
      console.warn('⚠️ Notification warning on cash booking:', notifErr.message);
    }

    return sendSuccess(res, {
      booking: updated,
      message: 'Hand Cash booking request submitted. Awaiting vendor confirmation.',
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

    const populatedItems = await Promise.all(
      (result.items || []).map(async (b) => {
        let turf = b.turf;
        if (!turf && b.turfId) {
          turf = await firestoreService.getDoc('turfs', b.turfId);
        }
        return {
          ...b,
          _id: b.id || b._id,
          id: b.id || b._id,
          turf: turf || {
            name: b.turfName || 'Turf Pitch',
            address: b.turfAddress || '',
            images: ['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],
          },
        };
      })
    );

    return sendPaginated(res, populatedItems, result.nextCursor, {
      count: populatedItems.length,
      bookings: populatedItems,
    });
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

    let turf = booking.turf;
    if (!turf && booking.turfId) {
      turf = await firestoreService.getDoc('turfs', booking.turfId);
    }

    const populated = {
      ...booking,
      _id: booking.id || booking._id,
      id: booking.id || booking._id,
      turfName: booking.turfName || turf?.name || 'Turf Pitch',
      turfAddress: booking.turfAddress || turf?.address || turf?.location?.address || `${turf?.city || 'Tamil Nadu'}`,
      turf: turf || {
        name: booking.turfName || 'Turf Pitch',
        address: booking.turfAddress || '',
        images: ['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],
      },
    };

    return sendSuccess(res, { booking: populated });
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
    const { rating, comment } = parsed;

    const booking = await firestoreService.getDoc('bookings', id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    if (booking.userId !== uid) {
      return sendError(res, 'Only the player who booked can review', 403, 'FORBIDDEN');
    }

    const turfId = parsed.turfId || booking.turfId;
    const userProfile = await firestoreService.getDoc('users', uid);

    const reviewDoc = await firestoreService.createDoc('reviews', {
      bookingId: id,
      turfId,
      userId: uid,
      userName: userProfile?.name || booking.userName || 'Turf Player',
      userPhoto: userProfile?.photoURL || userProfile?.avatar || '',
      rating: Number(rating) || 5,
      comment: comment || '',
      createdAt: new Date().toISOString(),
    });

    await firestoreService.updateDoc('bookings', id, {
      isReviewed: true,
      reviewed: true,
      reviewId: reviewDoc.id,
    });

    // Recalculate turf rating summary
    if (turfId) {
      const allReviewsSnap = await firestoreService.queryWithCursor('reviews', {
        filters: [['turfId', '==', turfId]],
        limit: 100,
      });
      const allReviews = allReviewsSnap.items || [];
      const totalRatings = allReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
      const avgRating = allReviews.length > 0 ? Number((totalRatings / allReviews.length).toFixed(1)) : rating;

      await firestoreService.updateDoc('turfs', turfId, {
        rating: { avg: avgRating, count: allReviews.length },
        ratingAvg: avgRating,
        reviewsCount: allReviews.length,
      });
    }

    return sendSuccess(res, { review: reviewDoc, message: 'Review submitted successfully' }, 201);
  },
};

module.exports = bookingController;
