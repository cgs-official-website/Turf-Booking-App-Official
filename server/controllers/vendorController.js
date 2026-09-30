const prisma = require('../config/prisma');
const bookingService = require('../services/bookingService');
const { BookingError } = bookingService;
const storageService = require('../services/storageService');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const {
  vendorTurfSetupSchema,
  slotOverrideSchema,
  reportIssueSchema,
} = require('../utils/validators');
const { formatTurf } = require('./turfController');

/**
 * Format vendor profile object
 */
function formatVendor(v) {
  if (!v) return null;
  return {
    uid: v.id,
    id: v.id,
    name: v.name,
    email: v.email,
    phone: v.phone || '',
    kycStatus: v.kycStatus,
    role: 'vendor',
    subscription: v.subscription || { active: false },
    turfOnboardingComplete: v.turfOnboardingComplete,
    turfApprovalAcknowledged: v.turfApprovalAcknowledged,
    rejectionReason: v.rejectionReason || null,
    reviewedAt: v.reviewedAt || null,
    createdAt: v.createdAt,
  };
}

const vendorController = {
  formatVendor,

  /**
   * POST /api/v1/vendor/onboarding/turf-setup (Step 1)
   */
  async turfSetup(req, res) {
    try {
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
        try { parsedData.pricing = JSON.parse(req.body.pricing); } catch {}
      }
      if (typeof req.body.slotConfig === 'string') {
        try { parsedData.slotConfig = JSON.parse(req.body.slotConfig); } catch {}
      }
      if (typeof req.body.sportTypes === 'string') {
        try { parsedData.sportTypes = JSON.parse(req.body.sportTypes); } catch {}
      } else if (typeof req.body.sports === 'string') {
        try { parsedData.sportTypes = JSON.parse(req.body.sports); } catch {}
      } else if (Array.isArray(req.body.sports)) {
        parsedData.sportTypes = req.body.sports;
      }
      if (typeof req.body.amenities === 'string') {
        try { parsedData.amenities = JSON.parse(req.body.amenities); } catch {}
      } else if (typeof req.body.facilities === 'string') {
        try { parsedData.amenities = JSON.parse(req.body.facilities); } catch {}
      } else if (Array.isArray(req.body.facilities)) {
        parsedData.amenities = req.body.facilities;
      }
      if (typeof req.body.geo === 'string') {
        try { parsedData.geo = JSON.parse(req.body.geo); } catch {}
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
      const turfId = `turf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const baseRate = Number(validated.pricing?.baseRate || validated.price || 800);
      const sports = Array.isArray(validated.sportTypes) && validated.sportTypes.length > 0
        ? validated.sportTypes
        : ['Football', 'Cricket'];
      const finalImages = images.length > 0 ? images : (Array.isArray(parsedData.images) ? parsedData.images : []);

      const city = validated.location?.city || validated.city || 'Chennai';
      const address = validated.location?.address || validated.address || city;

      const turf = await prisma.turf.create({
        data: {
          id: turfId,
          vendorId: uid,
          name: validated.name,
          description: validated.description || '',
          sports,
          pricePerHour: baseRate,
          courtCount: Number(validated.courtCount || validated.numberOfCourts || 1),
          location: {
            city,
            address,
            geo: validated.geo || null,
          },
          city,
          lat: validated.geo?.lat ? Number(validated.geo.lat) : null,
          lng: validated.geo?.lng ? Number(validated.geo.lng) : null,
          slotConfig: validated.slotConfig,
          images: finalImages,
          amenities: Array.isArray(validated.amenities) ? validated.amenities : [],
          status: 'active',
          ratingAvg: 5.0,
          reviewsCount: 0,
        },
      });

      return sendSuccess(res, { turf: formatTurf(turf) }, 201);
    } catch (err) {
      console.error('turfSetup error:', err);
      return sendError(res, err.message || 'Failed to setup turf', 400, 'SETUP_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/onboarding/verification (Step 2 - Identity KYC)
   * Upserts into vendor_kyc_documents table for aadhaar and pan
   */
  async vendorVerification(req, res) {
    try {
      const { uid } = req.user;
      const files = req.files || {};

      if (files.aadhaar && files.aadhaar[0]) {
        const resAadhaar = await storageService.uploadFile(files.aadhaar[0], 'kyc');
        await prisma.vendorKycDocument.upsert({
          where: { vendorId_docType: { vendorId: uid, docType: 'aadhaar' } },
          update: {
            fileUrl: resAadhaar.url,
            status: 'pending',
            rejectionReason: null,
            reviewedAt: null,
          },
          create: {
            id: `kyc_${uid}_aadhaar`,
            vendorId: uid,
            docType: 'aadhaar',
            fileUrl: resAadhaar.url,
            status: 'pending',
          },
        });
      }

      if (files.pan && files.pan[0]) {
        const resPan = await storageService.uploadFile(files.pan[0], 'kyc');
        await prisma.vendorKycDocument.upsert({
          where: { vendorId_docType: { vendorId: uid, docType: 'pan' } },
          update: {
            fileUrl: resPan.url,
            status: 'pending',
            rejectionReason: null,
            reviewedAt: null,
          },
          create: {
            id: `kyc_${uid}_pan`,
            vendorId: uid,
            docType: 'pan',
            fileUrl: resPan.url,
            status: 'pending',
          },
        });
      }

      const vendor = await prisma.vendor.findUnique({
        where: { id: uid },
        include: { kycDocuments: true },
      });

      return sendSuccess(res, { vendor: formatVendor(vendor) });
    } catch (err) {
      console.error('vendorVerification error:', err);
      return sendError(res, 'Failed to upload verification documents', 500, 'UPLOAD_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/onboarding/turf-verification (Step 3 - Business/Turf KYC)
   * Upserts into vendor_kyc_documents table for gst and eb_bill
   */
  async turfVerification(req, res) {
    try {
      const { uid } = req.user;
      const files = req.files || {};

      if (files.gst && files.gst[0]) {
        const resGst = await storageService.uploadFile(files.gst[0], 'kyc');
        await prisma.vendorKycDocument.upsert({
          where: { vendorId_docType: { vendorId: uid, docType: 'gst' } },
          update: {
            fileUrl: resGst.url,
            status: 'pending',
            rejectionReason: null,
            reviewedAt: null,
          },
          create: {
            id: `kyc_${uid}_gst`,
            vendorId: uid,
            docType: 'gst',
            fileUrl: resGst.url,
            status: 'pending',
          },
        });
      }

      if (files.ebBill && files.ebBill[0]) {
        const resEb = await storageService.uploadFile(files.ebBill[0], 'kyc');
        await prisma.vendorKycDocument.upsert({
          where: { vendorId_docType: { vendorId: uid, docType: 'eb_bill' } },
          update: {
            fileUrl: resEb.url,
            status: 'pending',
            rejectionReason: null,
            reviewedAt: null,
          },
          create: {
            id: `kyc_${uid}_eb_bill`,
            vendorId: uid,
            docType: 'eb_bill',
            fileUrl: resEb.url,
            status: 'pending',
          },
        });
      }

      // Mark onboarding complete and pending Super Admin review
      const updatedVendor = await prisma.vendor.update({
        where: { id: uid },
        data: {
          turfOnboardingComplete: true,
          kycStatus: 'pending',
        },
      });

      // Update vendor's turfs to pending status
      await prisma.turf.updateMany({
        where: { vendorId: uid },
        data: { status: 'pending' },
      });

      return sendSuccess(res, {
        vendor: formatVendor(updatedVendor),
        message: 'Onboarding completed. Submitted for Super Admin approval.',
      });
    } catch (err) {
      console.error('turfVerification error:', err);
      return sendError(res, 'Failed to complete turf verification', 500, 'VERIFICATION_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/onboarding/status
   */
  async getOnboardingStatus(req, res) {
    try {
      const { uid } = req.user;

      const vendor = await prisma.vendor.findUnique({
        where: { id: uid },
        include: {
          turfs: { take: 1, orderBy: { createdAt: 'desc' } },
          subscriptions: {
            where: { status: 'active', expiresAt: { gt: new Date() } },
            take: 1,
          },
        },
      });

      if (!vendor) {
        return sendError(res, 'Vendor profile not found', 404, 'NOT_FOUND');
      }

      const turf = vendor.turfs?.[0] || null;
      let turfStatus = turf?.status || (vendor.kycStatus === 'approved' ? 'active' : 'pending');

      const hasActiveSub = vendor.subscriptions && vendor.subscriptions.length > 0;
      const isCompleted = vendor.turfOnboardingComplete || !!turf || vendor.kycStatus === 'pending' || vendor.kycStatus === 'approved';

      return sendSuccess(res, {
        kycStatus: vendor.kycStatus || 'pending',
        turfStatus,
        status: turfStatus,
        turfOnboardingComplete: isCompleted,
        hasCompletedTurfOnboarding: isCompleted,
        turfApprovalAcknowledged: vendor.turfApprovalAcknowledged || false,
        hasActiveSubscription: hasActiveSub,
        subscription: hasActiveSub ? vendor.subscriptions[0] : (vendor.subscription || null),
        turf: turf ? { id: turf.id, name: turf.name, status: turf.status } : null,
        vendor: formatVendor(vendor),
      });
    } catch (err) {
      console.error('getOnboardingStatus error:', err);
      return sendError(res, 'Failed to fetch onboarding status', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/approval-ack
   */
  async acknowledgeApproval(req, res) {
    try {
      const { uid } = req.user;
      await prisma.vendor.update({
        where: { id: uid },
        data: { turfApprovalAcknowledged: true },
      });
      return sendSuccess(res, { acknowledged: true });
    } catch (err) {
      console.error('acknowledgeApproval error:', err);
      return sendError(res, 'Failed to acknowledge approval', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/dashboard
   */
  async getDashboard(req, res) {
    try {
      const { uid } = req.user;
      const cacheKey = `vendor:dashboard:${uid}`;

      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return sendSuccess(res, cached);
      }

      const { dateStr: todayStr } = bookingService.getKolkataTimeInfo();
      const bookingsResult = await bookingService.listForVendor(uid, { limit: 100 });

      const allBookings = bookingsResult.items || [];
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
    } catch (err) {
      console.error('getDashboard error:', err);
      return sendError(res, 'Failed to fetch dashboard', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/bookings
   */
  async getVendorBookings(req, res) {
    const { uid } = req.user;
    const { date, status, turfId, limit = 50, cursor } = req.query;

    try {
      const result = await bookingService.listForVendor(uid, {
        date,
        status,
        turfId,
        limit: Number(limit) || 50,
        cursor,
      });

      return sendPaginated(res, result.items, result.nextCursor, {
        count: result.items.length,
        bookings: result.items,
      });
    } catch (err) {
      if (err instanceof BookingError) {
        return sendError(res, err.message, err.status, err.code);
      }
      console.error('getVendorBookings error:', err);
      return sendError(res, 'Failed to fetch vendor bookings', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/bookings/:id
   */
  async getBookingDetail(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    try {
      const booking = await bookingService.getById(id, { includeRelations: true, needUser: true });
      if (!booking) {
        return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
      }

      if (req.user.role !== 'admin' && !req.user.admin && req.user.role !== 'superadmin' && booking.vendorId !== uid) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      return sendSuccess(res, { booking });
    } catch (err) {
      if (err instanceof BookingError) {
        return sendError(res, err.message, err.status, err.code);
      }
      console.error('getBookingDetail error:', err);
      return sendError(res, 'Failed to fetch booking detail', 500, 'FETCH_FAILED');
    }
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

    const newStatus = (req.body?.status === 'confirmed' || action === 'accept') ? 'confirmed' : 'rejected';

    try {
      const result = await bookingService.updateStatusByVendor(id, req.user, {
        status: newStatus,
        rejectionReason: req.body?.reason || req.body?.rejectionReason,
      });

      const updatedBooking = result.booking;
      await cacheService.invalidateSlots(updatedBooking.turfId, updatedBooking.date);
      await cacheService.invalidateDashboard(uid);

      if (updatedBooking.userId) {
        if (newStatus === 'confirmed') {
          await notificationService.sendNotification({
            recipientId: updatedBooking.userId,
            recipientRole: 'user',
            title: 'Booking Confirmed!',
            body: `Your slot at ${updatedBooking.turfName || updatedBooking.turf?.name || 'the turf'} on ${updatedBooking.date} (${updatedBooking.startTime} - ${updatedBooking.endTime}) is confirmed.`,
            type: 'booking',
            data: { bookingId: id },
          });
        } else {
          await notificationService.sendNotification({
            recipientId: updatedBooking.userId,
            recipientRole: 'user',
            title: 'Booking Request Declined',
            body: `Your booking request for ${updatedBooking.date} at ${updatedBooking.startTime} could not be accepted.`,
            type: 'booking',
            data: { bookingId: id },
          });
        }
      }

      return sendSuccess(res, {
        booking: updatedBooking,
        message: newStatus === 'confirmed' ? 'Booking accepted successfully' : 'Booking rejected successfully',
      });
    } catch (err) {
      if (err instanceof BookingError) {
        return sendError(res, err.message, err.status, err.code);
      }
      console.error('updateBookingStatus error:', err);
      return sendError(res, 'Failed to update booking status', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * PATCH /api/v1/vendor/turf/:turfId/slots
   * Block/unblock slots and price overrides for a date in slot_overrides table
   */
  async updateSlotOverrides(req, res) {
    try {
      const { turfId } = req.params;
      const { uid } = req.user;
      const { date, blockedSlots, priceOverrides } = req.body;

      if (!date) {
        return sendError(res, 'Date is required', 400, 'DATE_REQUIRED');
      }

      // Verify turf ownership
      const turf = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }
      if (turf.vendorId !== uid && !req.user.admin && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied: You do not own this turf', 403, 'FORBIDDEN');
      }

      const parsed = slotOverrideSchema.parse({ blockedSlots, priceOverrides });

      await prisma.slotOverride.upsert({
        where: { turfId_date: { turfId, date } },
        update: {
          blockedSlots: parsed.blockedSlots || [],
          priceOverrides: parsed.priceOverrides || {},
        },
        create: {
          turfId,
          date,
          blockedSlots: parsed.blockedSlots || [],
          priceOverrides: parsed.priceOverrides || {},
        },
      });

      await cacheService.invalidateSlots(turfId, date);

      return sendSuccess(res, { message: 'Slot overrides updated successfully', date });
    } catch (err) {
      console.error('updateSlotOverrides error:', err);
      return sendError(res, err.message || 'Failed to update slot overrides', 400, 'UPDATE_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/reviews
   */
  async getVendorReviews(req, res) {
    try {
      const { uid } = req.user;

      const turfs = await prisma.turf.findMany({
        where: { vendorId: uid },
        select: { id: true },
      });

      const turfIds = turfs.map((t) => t.id);

      const reviews = await prisma.review.findMany({
        where: { turfId: { in: turfIds } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const populated = reviews.map((r) => ({
        id: r.id,
        _id: r.id,
        bookingId: r.bookingId,
        turfId: r.turfId,
        userId: r.userId,
        userName: r.userName,
        userPhoto: r.userPhoto,
        rating: r.rating,
        comment: r.comment,
        hidden: r.hidden,
        createdAt: r.createdAt,
        user: {
          name: r.userName,
          avatar: r.userPhoto,
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
    } catch (err) {
      console.error('getVendorReviews error:', err);
      return sendError(res, 'Failed to fetch reviews', 500, 'FETCH_FAILED');
    }
  },

  /**
   * DELETE /api/v1/vendor/reviews/:id
   */
  async deleteReview(req, res) {
    try {
      const { id } = req.params;
      const { uid } = req.user;

      const review = await prisma.review.findUnique({
        where: { id },
        include: { turf: true },
      });

      if (!review) {
        return sendError(res, 'Review not found', 404, 'NOT_FOUND');
      }

      if (review.turf?.vendorId !== uid && !req.user.admin && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      await prisma.review.delete({ where: { id } });

      // Recalculate turf rating
      if (review.turfId) {
        const agg = await prisma.review.aggregate({
          where: { turfId: review.turfId },
          _avg: { rating: true },
          _count: { rating: true },
        });

        const newAvg = agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : 5.0;
        const newCount = agg._count.rating || 0;

        await prisma.turf.update({
          where: { id: review.turfId },
          data: {
            ratingAvg: newAvg,
            reviewsCount: newCount,
          },
        });
      }

      return sendSuccess(res, { id, message: 'Review deleted successfully' });
    } catch (err) {
      console.error('deleteReview error:', err);
      return sendError(res, 'Failed to delete review', 500, 'DELETE_FAILED');
    }
  },

  /**
   * PATCH /api/v1/vendor/reviews/:id/hide
   */
  async toggleReviewVisibility(req, res) {
    try {
      const { id } = req.params;
      const { uid } = req.user;

      const review = await prisma.review.findUnique({
        where: { id },
        include: { turf: true },
      });

      if (!review) {
        return sendError(res, 'Review not found', 404, 'NOT_FOUND');
      }

      if (review.turf?.vendorId !== uid && !req.user.admin && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      const updated = await prisma.review.update({
        where: { id },
        data: { hidden: !review.hidden },
      });

      return sendSuccess(res, { review: updated });
    } catch (err) {
      console.error('toggleReviewVisibility error:', err);
      return sendError(res, 'Failed to toggle review visibility', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/report-issue
   * Writes to PostgreSQL reports table
   */
  async reportIssue(req, res) {
    try {
      const { uid } = req.user;
      const parsed = reportIssueSchema.parse(req.body);
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const report = await prisma.report.create({
        data: {
          id: reportId,
          vendorId: uid,
          issueType: parsed.issueType || parsed.category || 'General Issue',
          description: parsed.description,
          status: 'open',
        },
      });

      return sendSuccess(res, { report }, 201);
    } catch (err) {
      console.error('reportIssue error:', err);
      return sendError(res, err.message || 'Failed to submit issue report', 400, 'SUBMISSION_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/turfs
   */
  async getMyTurfs(req, res) {
    try {
      const { uid } = req.user;
      const turfs = await prisma.turf.findMany({
        where: { vendorId: uid },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, { turfs: turfs.map(formatTurf) });
    } catch (err) {
      console.error('getMyTurfs error:', err);
      return sendError(res, 'Failed to fetch vendor turfs', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/turfs
   * Add a new turf
   */
  async addTurf(req, res) {
    try {
      const { uid } = req.user;
      let data = req.body;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch {}
      }

      const sportTypes = data.sports || data.sportTypes || ['Football'];
      const amenities = data.amenities || data.facilities || [];
      const address = data.location?.address || data.address || '';
      const city = data.location?.city || data.city || 'Chennai';
      const state = data.location?.state || data.state || 'Tamil Nadu';
      const baseRate = Number(data.pricePerHour || data.price || data.pricing?.baseRate || 800);

      const openTime = data.operatingHours?.open || data.openTime || '06:00';
      const closeTime = data.operatingHours?.close || data.closeTime || '22:00';

      const turfId = `turf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const turf = await prisma.turf.create({
        data: {
          id: turfId,
          name: data.name || 'New Turf',
          vendorId: uid,
          description: data.description || '',
          sports: sportTypes,
          pricePerHour: baseRate,
          courtCount: Number(data.courtCount || data.numberOfCourts || 1),
          location: data.location || { address, city, state },
          city,
          lat: data.geo?.lat || data.location?.lat ? Number(data.geo?.lat || data.location?.lat) : null,
          lng: data.geo?.lng || data.location?.lng ? Number(data.geo?.lng || data.location?.lng) : null,
          slotConfig: {
            openTime,
            closeTime,
            slotDurationMins: Number(data.slotDurationMins) || 60,
          },
          images: Array.isArray(data.images) ? data.images : [],
          amenities,
          status: 'active',
          ratingAvg: 5.0,
          reviewsCount: 0,
        },
      });

      return sendSuccess(res, { turf: formatTurf(turf), message: 'Turf added successfully' }, 201);
    } catch (err) {
      console.error('addTurf error:', err);
      return sendError(res, 'Failed to add turf', 500, 'ADD_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/turfs/:turfId
   */
  async getTurfById(req, res) {
    try {
      const { turfId } = req.params;
      const { uid } = req.user;

      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
      });

      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      if (turf.vendorId !== uid && !req.user.admin && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied: You do not own this turf', 403, 'FORBIDDEN');
      }

      return sendSuccess(res, { turf: formatTurf(turf) });
    } catch (err) {
      console.error('getTurfById error:', err);
      return sendError(res, 'Failed to fetch turf', 500, 'FETCH_FAILED');
    }
  },

  /**
   * PUT /api/v1/vendor/turfs/:turfId
   */
  async updateTurf(req, res) {
    try {
      const { turfId } = req.params;
      const { uid } = req.user;

      const existing = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!existing) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      if (existing.vendorId !== uid && !req.user.admin && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied: You do not own this turf', 403, 'FORBIDDEN');
      }

      let data = req.body;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch {}
      }

      const updateData = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.city) updateData.city = data.city;
      if (data.location) updateData.location = data.location;
      if (data.sports || data.sportTypes) updateData.sports = data.sports || data.sportTypes;
      if (data.pricePerHour !== undefined || data.price !== undefined) {
        updateData.pricePerHour = Number(data.pricePerHour ?? data.price);
      }
      if (data.courtCount !== undefined) updateData.courtCount = Number(data.courtCount);
      if (data.slotConfig) updateData.slotConfig = data.slotConfig;
      if (data.images) updateData.images = data.images;
      if (data.amenities) updateData.amenities = data.amenities;

      const updated = await prisma.turf.update({
        where: { id: turfId },
        data: updateData,
      });

      await cacheService.del(`turf:${turfId}`);

      return sendSuccess(res, { turf: formatTurf(updated) });
    } catch (err) {
      console.error('updateTurf error:', err);
      return sendError(res, 'Failed to update turf', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * DELETE /api/v1/vendor/turfs/:turfId
   * Refuse delete if turf has existing bookings
   */
  async deleteTurf(req, res) {
    try {
      const { turfId } = req.params;
      const { uid } = req.user;

      const existing = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!existing) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      if (existing.vendorId !== uid && !req.user.admin && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied: You do not own this turf', 403, 'FORBIDDEN');
      }

      const bookingCount = await prisma.booking.count({
        where: { turfId },
      });

      if (bookingCount > 0) {
        return sendError(
          res,
          `Cannot delete turf with ${bookingCount} existing booking(s). Please suspend it instead.`,
          400,
          'TURF_HAS_BOOKINGS',
          { bookingCount }
        );
      }

      await prisma.turf.delete({ where: { id: turfId } });
      await cacheService.del(`turf:${turfId}`);

      return sendSuccess(res, { message: 'Turf deleted successfully', turfId });
    } catch (err) {
      console.error('deleteTurf error:', err);
      return sendError(res, 'Failed to delete turf', 500, 'DELETE_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/turfs/:turfId/slots/calendar
   */
  async getSlotCalendar(req, res) {
    try {
      const { turfId } = req.params;
      const { uid } = req.user;
      const { date } = req.query;
      const dateStr = date || new Date().toISOString().split('T')[0];

      let turf = null;
      if (turfId && turfId !== 'undefined' && turfId !== 'null') {
        turf = await prisma.turf.findUnique({ where: { id: turfId } });
      }
      if (!turf) {
        turf = await prisma.turf.findFirst({ where: { vendorId: uid } });
      }

      if (!turf) {
        return sendError(res, 'No turf found for this vendor', 404, 'NOT_FOUND');
      }

      const open = turf.slotConfig?.openTime || '06:00';
      const close = turf.slotConfig?.closeTime || '23:00';
      const duration = Number(turf.slotConfig?.slotDurationMins) || 60;

      let bookedSlots = [];
      try {
        bookedSlots = await bookingService.activeForSlot(turf.id, dateStr);
      } catch (err) {
        console.warn('activeForSlot check:', err.message);
      }

      let blocked = [];
      try {
        const override = await prisma.slotOverride.findUnique({
          where: { turfId_date: { turfId: turf.id, date: dateStr } },
        });
        if (override && Array.isArray(override.blockedSlots)) {
          blocked = override.blockedSlots;
        }
      } catch (err) {
        console.warn('Error reading slot overrides:', err.message);
      }

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
        const slotKey = `${startTime}-${endTime}`;

        let status = 'available';
        const b = bookedSlots.find((x) => x.startTime === startTime);
        if (b) {
          status = b.bookingStatus === 'confirmed' ? 'booked' : 'requested';
        } else if (blocked.includes(startTime) || blocked.includes(slotKey)) {
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
          bookingId: b?.bookingId || null,
        });
      }

      return sendSuccess(res, {
        turfId: turf.id,
        date: dateStr,
        slots,
        counts: { available, requested, booked, frozen, total: slots.length },
      });
    } catch (err) {
      console.error('getSlotCalendar error:', err);
      return sendError(res, 'Failed to fetch slot calendar', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/turfs/:turfId/slots/freeze
   */
  async freezeSlot(req, res) {
    try {
      const { turfId } = req.params;
      const { uid } = req.user;
      const { date, startTime, action } = req.body;
      const dateStr = date || new Date().toISOString().split('T')[0];

      const turf = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }
      if (turf.vendorId !== uid && !req.user.admin && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      const override = await prisma.slotOverride.findUnique({
        where: { turfId_date: { turfId, date: dateStr } },
      });

      let blocked = Array.isArray(override?.blockedSlots) ? [...override.blockedSlots] : [];

      if (action === 'unfreeze') {
        blocked = blocked.filter((t) => t !== startTime);
      } else {
        if (!blocked.includes(startTime)) blocked.push(startTime);
      }

      await prisma.slotOverride.upsert({
        where: { turfId_date: { turfId, date: dateStr } },
        update: { blockedSlots: blocked },
        create: {
          turfId,
          date: dateStr,
          blockedSlots: blocked,
          priceOverrides: {},
        },
      });

      await cacheService.invalidateSlots(turfId, dateStr);

      return sendSuccess(res, {
        date: dateStr,
        startTime,
        status: action === 'unfreeze' ? 'available' : 'frozen',
      });
    } catch (err) {
      console.error('freezeSlot error:', err);
      return sendError(res, 'Failed to freeze/unfreeze slot', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/turfs/:turfId/slots
   */
  async addSlot(req, res) {
    const { turfId } = req.params;
    const turf = await prisma.turf.findUnique({ where: { id: turfId } });
    return sendSuccess(res, { turf: formatTurf(turf) });
  },

  /**
   * DELETE /api/v1/vendor/turfs/:turfId/slots/:slotId
   */
  async deleteSlot(req, res) {
    const { turfId } = req.params;
    const turf = await prisma.turf.findUnique({ where: { id: turfId } });
    return sendSuccess(res, { turf: formatTurf(turf) });
  },
};

module.exports = vendorController;
