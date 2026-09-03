const firestoreService = require('../services/firestoreService');
const storageService = require('../services/storageService');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const {
  vendorTurfSetupSchema,
  slotOverrideSchema,
  reportIssueSchema,
} = require('../utils/validators');

const vendorController = {
  /**
   * POST /api/v1/vendor/onboarding/turf-setup (Step 1)
   */
  async turfSetup(req, res) {
    const { uid } = req.user;

    // Handle multipart images if present
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await storageService.uploadFile(file, 'turfs');
        images.push(uploadResult.url);
      }
    }

    let parsedData = { ...req.body };
    if (typeof req.body.pricing === 'string') {
      parsedData.pricing = JSON.parse(req.body.pricing);
    }
    if (typeof req.body.slotConfig === 'string') {
      parsedData.slotConfig = JSON.parse(req.body.slotConfig);
    }
    if (typeof req.body.sportTypes === 'string') {
      parsedData.sportTypes = JSON.parse(req.body.sportTypes);
    } else if (typeof req.body.sports === 'string') {
      parsedData.sportTypes = JSON.parse(req.body.sports);
    } else if (Array.isArray(req.body.sports)) {
      parsedData.sportTypes = req.body.sports;
    }
    if (typeof req.body.amenities === 'string') {
      parsedData.amenities = JSON.parse(req.body.amenities);
    } else if (typeof req.body.facilities === 'string') {
      parsedData.amenities = JSON.parse(req.body.facilities);
    } else if (Array.isArray(req.body.facilities)) {
      parsedData.amenities = req.body.facilities;
    }
    if (typeof req.body.geo === 'string') {
      parsedData.geo = JSON.parse(req.body.geo);
    }

    if (!parsedData.pricing && parsedData.price !== undefined) {
      parsedData.pricing = {
        baseRate: Number(parsedData.price) || 0,
        weekendRate: Number(parsedData.weekendPrice || parsedData.price) || 0,
        peakHourRate: Number(parsedData.eveningPrice || parsedData.price) || 0,
      };
    }

    if (!parsedData.slotConfig) {
      parsedData.slotConfig = {
        openTime: parsedData.openTime || '06:00',
        closeTime: parsedData.closeTime || '23:00',
        slotDurationMins: parsedData.slotDuration === '30 min' ? 30 : 60,
      };
    }

    const validated = vendorTurfSetupSchema.parse(parsedData);

    const turfData = {
      ...validated,
      vendorId: uid,
      images: images.length > 0 ? images : (parsedData.images || []),
      status: 'draft',
      rating: { avg: 5.0, count: 0 },
    };

    const turf = await firestoreService.createDoc('turfs', turfData);

    // Link turf to vendor
    await firestoreService.updateDoc('vendors', uid, {
      turfId: turf.id,
      turfName: turf.name,
    });

    return sendSuccess(res, { turf }, 201);
  },

  /**
   * POST /api/v1/vendor/onboarding/verification (Step 2 - Identity KYC)
   */
  async vendorVerification(req, res) {
    const { uid } = req.user;
    const files = req.files || {};

    const kycDocs = {};

    if (files.aadhaar && files.aadhaar[0]) {
      const resAadhaar = await storageService.uploadFile(files.aadhaar[0], 'kyc');
      kycDocs.aadhaarUrl = resAadhaar.url;
    }

    if (files.pan && files.pan[0]) {
      const resPan = await storageService.uploadFile(files.pan[0], 'kyc');
      kycDocs.panUrl = resPan.url;
    }

    const updatedVendor = await firestoreService.setDoc('vendors', uid, {
      kycDocs,
      businessName: req.body.businessName || '',
      panNumber: req.body.panNumber || '',
    }, true);

    return sendSuccess(res, { vendor: updatedVendor });
  },

  /**
   * POST /api/v1/vendor/onboarding/turf-verification (Step 3 - Business/Turf KYC)
   */
  async turfVerification(req, res) {
    const { uid } = req.user;
    const files = req.files || {};

    const vendor = await firestoreService.getDoc('vendors', uid);
    const existingKyc = vendor?.kycDocs || {};

    if (files.gst && files.gst[0]) {
      const resGst = await storageService.uploadFile(files.gst[0], 'kyc');
      existingKyc.gstUrl = resGst.url;
    }

    if (files.ebBill && files.ebBill[0]) {
      const resEb = await storageService.uploadFile(files.ebBill[0], 'kyc');
      existingKyc.ebBillUrl = resEb.url;
    }

    // Submit for Super Admin review
    const updatedVendor = await firestoreService.updateDoc('vendors', uid, {
      kycDocs: existingKyc,
      gstNumber: req.body.gstNumber || '',
      turfOnboardingComplete: true,
      kycStatus: 'pending',
    });

    if (vendor?.turfId) {
      await firestoreService.updateDoc('turfs', vendor.turfId, {
        status: 'pending',
      });
    }

    return sendSuccess(res, {
      vendor: updatedVendor,
      message: 'Onboarding completed. Submitted for Super Admin approval.',
    });
  },

  /**
   * GET /api/v1/vendor/onboarding/status
   */
  async getOnboardingStatus(req, res) {
    const { uid } = req.user;
    const vendor = await firestoreService.getDoc('vendors', uid);

    if (!vendor) {
      return sendError(res, 'Vendor profile not found', 404, 'NOT_FOUND');
    }

    let turf = null;
    let turfStatus = 'draft';
    if (vendor.turfId) {
      turf = await firestoreService.getDoc('turfs', vendor.turfId);
      turfStatus = turf?.status || 'draft';
    }

    if (vendor.kycStatus === 'approved') {
      turfStatus = 'active';
    }

    const isCompleted = vendor.turfOnboardingComplete || !!vendor.turfId || vendor.kycStatus === 'pending' || vendor.kycStatus === 'approved';

    return sendSuccess(res, {
      kycStatus: vendor.kycStatus || 'pending',
      turfStatus,
      status: turfStatus,
      turfOnboardingComplete: isCompleted,
      hasCompletedTurfOnboarding: isCompleted,
      turfApprovalAcknowledged: vendor.turfApprovalAcknowledged || false,
      hasActiveSubscription: vendor.subscription?.active || false,
      subscription: vendor.subscription || null,
      turf: turf ? { id: turf.id, name: turf.name, status: turfStatus } : (vendor.turfName ? { name: vendor.turfName, status: turfStatus } : null),
      vendor,
    });
  },

  /**
   * POST /api/v1/vendor/approval-ack
   */
  async acknowledgeApproval(req, res) {
    const { uid } = req.user;
    await firestoreService.updateDoc('vendors', uid, {
      turfApprovalAcknowledged: true,
    });
    return sendSuccess(res, { acknowledged: true });
  },

  /**
   * GET /api/v1/vendor/dashboard
   * Quick stats, today's schedule, revenue with 60s Redis cache
   */
  async getDashboard(req, res) {
    const { uid } = req.user;
    const cacheKey = `vendor:dashboard:${uid}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch vendor's bookings
    const bookingsResult = await firestoreService.queryWithCursor('bookings', {
      filters: [['vendorId', '==', uid]],
      limit: 100,
    });

    const allBookings = bookingsResult.items;
    const todayBookings = allBookings.filter((b) => b.date === todayStr);

    const totalRevenue = allBookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const todayRevenue = todayBookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const pendingRequests = allBookings.filter((b) => b.status === 'pending');

    const payload = {
      stats: {
        totalBookings: allBookings.length,
        todayBookingsCount: todayBookings.length,
        totalRevenue,
        todayRevenue,
        pendingRequestsCount: pendingRequests.length,
      },
      todaySchedule: todayBookings,
      recentBookings: allBookings.slice(0, 5),
    };

    await cacheService.set(cacheKey, payload, 60);

    return sendSuccess(res, payload);
  },

  /**
   * GET /api/v1/vendor/bookings
   */
  async getVendorBookings(req, res) {
    const { uid } = req.user;
    const { date, status, limit = 50, cursor } = req.query;

    const vendor = await firestoreService.getDoc('vendors', uid);
    const turfId = vendor?.turfId;

    const result = await firestoreService.queryWithCursor('bookings', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    const vendorBookings = (result.items || []).filter((b) => {
      if (b.vendorId === uid) return true;
      if (turfId && b.turfId === turfId) return true;
      if (!b.vendorId) return true;
      return false;
    });

    const populated = await Promise.all(
      vendorBookings.map(async (b) => {
        let user = b.user;
        if (!user && b.userId) {
          user = await firestoreService.getDoc('users', b.userId);
        }
        return {
          ...b,
          _id: b.id || b._id,
          id: b.id || b._id,
          userName: b.userName || user?.name || 'Turf Player',
          phone: b.phone || user?.phone || '',
          user: {
            name: user?.name || b.userName || 'Turf Player',
            phone: user?.phone || b.phone || '',
            avatar: user?.avatar || user?.photo || null,
            email: user?.email || '',
          },
        };
      })
    );

    return sendPaginated(res, populated, result.nextCursor, {
      count: populated.length,
      bookings: populated,
    });
  },

  /**
   * GET /api/v1/vendor/bookings/:id
   */
  async getBookingDetail(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    const booking = await firestoreService.getDoc('bookings', id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    let user = booking.user;
    if (!user && booking.userId) {
      user = await firestoreService.getDoc('users', booking.userId);
    }

    let turf = booking.turf;
    if (!turf && booking.turfId) {
      turf = await firestoreService.getDoc('turfs', booking.turfId);
    }

    const populated = {
      ...booking,
      _id: booking.id || booking._id,
      id: booking.id || booking._id,
      userName: booking.userName || user?.name || 'Turf Player',
      user: {
        name: user?.name || booking.userName || 'Turf Player',
        phone: user?.phone || booking.phone || '',
        avatar: user?.avatar || user?.photo || null,
        email: user?.email || '',
      },
      turf: turf || {
        name: booking.turfName || 'Turf Pitch',
        address: booking.turfAddress || '',
      },
    };

    return sendSuccess(res, { booking: populated });
  },

  /**
   * POST /api/v1/vendor/bookings/:id/accept (or /reject)
   */
  async updateBookingStatus(req, res) {
    const { id } = req.params;
    const { uid } = req.user;
    let action = req.body?.action;
    if (!action) {
      action = req.originalUrl.includes('reject') ? 'reject' : 'accept';
    }

    const booking = await firestoreService.getDoc('bookings', id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    const vendor = await firestoreService.getDoc('vendors', uid);

    // Allow vendor who owns the booking or the turf, or any vendor if unassigned
    const isOwner = (booking.vendorId === uid) || (vendor?.turfId && booking.turfId === vendor.turfId) || (!booking.vendorId);
    if (!isOwner && req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403, 'FORBIDDEN');
    }

    const newStatus = action === 'accept' ? 'confirmed' : 'rejected';
    const updated = await firestoreService.updateDoc('bookings', id, {
      status: newStatus,
      vendorId: uid,
      reviewedAt: new Date(),
    });

    await cacheService.invalidateSlots(booking.turfId, booking.date);
    await cacheService.invalidateDashboard(uid);

    // Send push notification to customer
    if (booking.userId) {
      if (action === 'accept') {
        await notificationService.sendNotification({
          recipientId: booking.userId,
          recipientRole: 'user',
          title: 'Booking Confirmed! 🏟️',
          body: `Your slot at ${booking.turfName || 'the turf'} on ${booking.date} (${booking.startTime} - ${booking.endTime}) is confirmed.`,
          type: 'booking',
          data: { bookingId: id },
        });
      } else {
        await notificationService.sendNotification({
          recipientId: booking.userId,
          recipientRole: 'user',
          title: 'Booking Request Declined',
          body: `Your booking request for ${booking.date} at ${booking.startTime} could not be accepted.`,
          type: 'booking',
          data: { bookingId: id },
        });
      }
    }

    const bookingRes = {
      ...booking,
      ...updated,
      _id: id,
      id: id,
      status: newStatus,
    };

    return sendSuccess(res, {
      booking: bookingRes,
      message: action === 'accept' ? 'Booking accepted successfully' : 'Booking rejected successfully',
    });
  },

  /**
   * PATCH /api/v1/vendor/turf/:turfId/slots
   * Block/unblock slots and price overrides for a date
   */
  async updateSlotOverrides(req, res) {
    const { turfId } = req.params;
    const { date, blockedSlots, priceOverrides } = req.body;

    if (!date) {
      return sendError(res, 'Date is required', 400, 'DATE_REQUIRED');
    }

    const parsed = slotOverrideSchema.parse({ blockedSlots, priceOverrides });

    if (firestoreService.db) {
      await firestoreService.db
        .collection('turfs')
        .doc(turfId)
        .collection('slotOverrides')
        .doc(date)
        .set(parsed, { merge: true });
    }

    // Invalidate slot cache for this date
    await cacheService.invalidateSlots(turfId, date);

    return sendSuccess(res, { message: 'Slot overrides updated successfully', date });
  },

  /**
   * GET /api/v1/vendor/reviews
   */
  async getVendorReviews(req, res) {
    const { uid } = req.user;
    const vendor = await firestoreService.getDoc('vendors', uid);

    let reviews = [];
    if (vendor?.turfId) {
      const result = await firestoreService.queryWithCursor('reviews', {
        filters: [['turfId', '==', vendor.turfId]],
        limit: 50,
      });
      reviews = result.items || [];
    }

    if (reviews.length === 0) {
      const result = await firestoreService.queryWithCursor('reviews', { limit: 50 });
      reviews = result.items || [];
    }

    const populated = reviews.map((r) => ({
      ...r,
      _id: r.id || r._id,
      id: r.id || r._id,
      user: {
        name: r.userName || r.user?.name || 'Turf Player',
        avatar: r.userPhoto || r.user?.avatar || null,
      },
    }));

    const total = populated.length;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    populated.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      counts[star] = (counts[star] || 0) + 1;
      sum += Number(r.rating) || 5;
    });
    const avgRating = total > 0 ? Number((sum / total).toFixed(1)) : 5.0;

    return sendSuccess(res, {
      reviews: populated,
      ratingSummary: {
        avgRating,
        totalReviews: total,
        breakdown: counts,
      },
    });
  },

  /**
   * DELETE /api/v1/vendor/reviews/:id
   */
  async deleteReview(req, res) {
    const { id } = req.params;
    const review = await firestoreService.getDoc('reviews', id);
    if (!review) {
      return sendError(res, 'Review not found', 404, 'NOT_FOUND');
    }

    await firestoreService.deleteDoc('reviews', id);

    // Recalculate turf rating after delete
    if (review.turfId) {
      const allReviewsSnap = await firestoreService.queryWithCursor('reviews', {
        filters: [['turfId', '==', review.turfId]],
        limit: 100,
      });
      const allReviews = allReviewsSnap.items || [];
      const totalRatings = allReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
      const avgRating = allReviews.length > 0 ? Number((totalRatings / allReviews.length).toFixed(1)) : 5.0;

      await firestoreService.updateDoc('turfs', review.turfId, {
        rating: { avg: avgRating, count: allReviews.length },
        ratingAvg: avgRating,
        reviewsCount: allReviews.length,
      });
    }

    return sendSuccess(res, { id, message: 'Review deleted successfully' });
  },

  /**
   * PATCH /api/v1/vendor/reviews/:id/hide
   */
  async toggleReviewVisibility(req, res) {
    const { id } = req.params;
    const review = await firestoreService.getDoc('reviews', id);
    if (!review) {
      return sendError(res, 'Review not found', 404, 'NOT_FOUND');
    }

    const newHidden = !review.hidden;
    const updated = await firestoreService.updateDoc('reviews', id, { hidden: newHidden });

    return sendSuccess(res, { review: { ...review, ...updated, hidden: newHidden } });
  },

  /**
   * POST /api/v1/vendor/report-issue
   */
  async reportIssue(req, res) {
    const { uid } = req.user;
    const parsed = reportIssueSchema.parse(req.body);

    const report = await firestoreService.createDoc('reports', {
      vendorId: uid,
      ...parsed,
      status: 'open',
    });

    return sendSuccess(res, { report }, 201);
  },

  /**
   * GET /api/v1/vendor/turfs
   */
  async getMyTurfs(req, res) {
    const { uid } = req.user;
    const result = await firestoreService.queryWithCursor('turfs', {
      filters: [['vendorId', '==', uid]],
      limit: 50,
    });
    return sendSuccess(res, { turfs: result.items });
  },

  /**
   * POST /api/v1/vendor/turfs
   * Add a new turf
   */
  async addTurf(req, res) {
    const { uid } = req.user;
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }

    const sportTypes = data.sports || data.sportTypes || ['Football'];
    const amenities = data.amenities || data.facilities || [];
    const address = data.location?.address || data.address || '';
    const city = data.location?.city || data.city || '';
    const state = data.location?.state || data.state || '';
    const baseRate = Number(data.pricePerHour || data.price || data.pricing?.baseRate || 0);

    const openTime = data.operatingHours?.open || data.openTime || '06:00';
    const closeTime = data.operatingHours?.close || data.closeTime || '22:00';

    const turfData = {
      name: data.name || 'New Turf',
      vendorId: uid,
      sportTypes,
      sports: sportTypes,
      amenities,
      address,
      city,
      state,
      location: data.location || { address, city, state },
      description: data.description || '',
      pricing: {
        baseRate,
        weekendRate: baseRate,
        peakHourRate: baseRate,
      },
      pricePerHour: baseRate,
      slotConfig: {
        openTime,
        closeTime,
        slotDurationMins: 60,
      },
      operatingHours: { open: openTime, close: closeTime },
      images: data.images || [],
      status: 'pending',
      rating: { avg: 5.0, count: 0 },
      createdAt: new Date().toISOString(),
    };

    const turf = await firestoreService.createDoc('turfs', turfData);

    // Update vendor active turf
    await firestoreService.updateDoc('vendors', uid, {
      turfId: turf.id,
      turfName: turf.name,
    });

    return sendSuccess(res, { turf, message: 'Turf added successfully' }, 201);
  },

  /**
   * GET /api/v1/vendor/turfs/:turfId
   */
  async getTurfById(req, res) {
    const { turfId } = req.params;
    const turf = await firestoreService.getDoc('turfs', turfId);
    if (!turf) {
      return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, { turf });
  },

  /**
   * PUT /api/v1/vendor/turfs/:turfId
   */
  async updateTurf(req, res) {
    const { turfId } = req.params;
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }
    const updated = await firestoreService.updateDoc('turfs', turfId, data);
    return sendSuccess(res, { turf: updated });
  },

  /**
   * DELETE /api/v1/vendor/turfs/:turfId
   */
  async deleteTurf(req, res) {
    const { turfId } = req.params;
    await firestoreService.deleteDoc('turfs', turfId);
    return sendSuccess(res, { message: 'Turf deleted successfully' });
  },

  /**
   * GET /api/v1/vendor/turfs/:turfId/slots/calendar
   */
  async getSlotCalendar(req, res) {
    const { turfId } = req.params;
    const { date } = req.query;
    const dateStr = date || new Date().toISOString().split('T')[0];

    let turf = null;
    if (turfId && turfId !== 'undefined' && turfId !== 'null') {
      turf = await firestoreService.getDoc('turfs', turfId);
    }
    if (!turf) {
      const allTurfs = await firestoreService.queryWithCursor('turfs', { limit: 1 });
      turf = allTurfs.items?.[0] || null;
    }

    const open = turf?.slotConfig?.openTime || turf?.operatingHours?.open || '06:00';
    const close = turf?.slotConfig?.closeTime || turf?.operatingHours?.close || '23:00';
    const duration = Number(turf?.slotConfig?.slotDurationMins) || 60;

    // Fetch bookings for this turf & date
    let bookedSlots = [];
    if (turfId && turfId !== 'undefined') {
      const bookingsSnap = await firestoreService.queryWithCursor('bookings', {
        filters: [['turfId', '==', turfId], ['date', '==', dateStr]],
        limit: 100,
      });
      bookedSlots = bookingsSnap.items || [];
    }

    const overrides = turf?.slotOverrides?.[dateStr] || {};
    const blocked = overrides.blockedSlots || [];

    const [openH = 6, openM = 0] = String(open).split(':').map(Number);
    const [closeH = 23, closeM = 0] = String(close).split(':').map(Number);
    const startMin = (isNaN(openH) ? 6 : openH) * 60 + (isNaN(openM) ? 0 : openM);
    const endMin = (isNaN(closeH) ? 23 : closeH) * 60 + (isNaN(closeM) ? 0 : closeM);

    const slots = [];
    let available = 0, requested = 0, booked = 0, frozen = 0;

    for (let m = startMin; m < endMin; m += duration) {
      const sH = String(Math.floor(m / 60)).padStart(2, '0');
      const sM = String(m % 60).padStart(2, '0');
      const eH = String(Math.floor((m + duration) / 60)).padStart(2, '0');
      const eM = String((m + duration) % 60).padStart(2, '0');
      const startTime = `${sH}:${sM}`;
      const endTime = `${eH}:${eM}`;

      let status = 'available';
      const b = bookedSlots.find((x) => x.startTime === startTime);
      if (b) {
        status = b.status === 'confirmed' ? 'booked' : 'requested';
      } else if (blocked.includes(startTime)) {
        status = 'frozen';
      }

      if (status === 'available') available++;
      if (status === 'requested') requested++;
      if (status === 'booked') booked++;
      if (status === 'frozen') frozen++;

      slots.push({
        startTime,
        endTime,
        status,
        bookingId: b?.id || null,
      });
    }

    return sendSuccess(res, {
      date: dateStr,
      slots,
      counts: { available, requested, booked, frozen, total: slots.length },
    });
  },

  /**
   * POST /api/v1/vendor/turfs/:turfId/slots/freeze
   */
  async freezeSlot(req, res) {
    const { turfId } = req.params;
    const { date, startTime, action } = req.body;
    const dateStr = date || new Date().toISOString().split('T')[0];

    const turf = await firestoreService.getDoc('turfs', turfId);
    const slotOverrides = turf?.slotOverrides || {};
    const currentDayOverrides = slotOverrides[dateStr] || { blockedSlots: [] };
    let blocked = currentDayOverrides.blockedSlots || [];

    if (action === 'unfreeze') {
      blocked = blocked.filter((t) => t !== startTime);
    } else {
      if (!blocked.includes(startTime)) blocked.push(startTime);
    }

    slotOverrides[dateStr] = { ...currentDayOverrides, blockedSlots: blocked };
    await firestoreService.updateDoc('turfs', turfId, { slotOverrides });

    return sendSuccess(res, {
      date: dateStr,
      startTime,
      status: action === 'unfreeze' ? 'available' : 'frozen',
    });
  },

  /**
   * POST /api/v1/vendor/turfs/:turfId/slots
   */
  async addSlot(req, res) {
    const { turfId } = req.params;
    const turf = await firestoreService.getDoc('turfs', turfId);
    return sendSuccess(res, { turf });
  },

  /**
   * DELETE /api/v1/vendor/turfs/:turfId/slots/:slotId
   */
  async deleteSlot(req, res) {
    const { turfId } = req.params;
    const turf = await firestoreService.getDoc('turfs', turfId);
    return sendSuccess(res, { turf });
  },
};

module.exports = vendorController;
