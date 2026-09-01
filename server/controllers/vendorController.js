const firestoreService = require('../services/firestoreService');
const storageService = require('../services/storageService');
const cacheService = require('../services/cacheService');
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

    let parsedData = req.body;
    if (typeof req.body.pricing === 'string') {
      parsedData.pricing = JSON.parse(req.body.pricing);
    }
    if (typeof req.body.slotConfig === 'string') {
      parsedData.slotConfig = JSON.parse(req.body.slotConfig);
    }
    if (typeof req.body.sportTypes === 'string') {
      parsedData.sportTypes = JSON.parse(req.body.sportTypes);
    }
    if (typeof req.body.amenities === 'string') {
      parsedData.amenities = JSON.parse(req.body.amenities);
    }
    if (typeof req.body.geo === 'string') {
      parsedData.geo = JSON.parse(req.body.geo);
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

    let turfStatus = 'draft';
    if (vendor.turfId) {
      const turf = await firestoreService.getDoc('turfs', vendor.turfId);
      turfStatus = turf?.status || 'draft';
    }

    return sendSuccess(res, {
      kycStatus: vendor.kycStatus || 'pending',
      turfStatus,
      turfOnboardingComplete: vendor.turfOnboardingComplete || false,
      turfApprovalAcknowledged: vendor.turfApprovalAcknowledged || false,
      hasActiveSubscription: vendor.subscription?.active || false,
      subscription: vendor.subscription || null,
      turfId: vendor.turfId || null,
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
    const { date, status, limit = 30, cursor } = req.query;

    const filters = [
      ['vendorId', '==', uid],
    ];

    if (date) filters.push(['date', '==', date]);
    if (status) filters.push(['status', '==', status]);

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
   * POST /api/v1/vendor/bookings/:id/accept
   */
  async updateBookingStatus(req, res) {
    const { id } = req.params;
    const { uid } = req.user;
    const { action } = req.body; // 'accept' | 'reject'

    const booking = await firestoreService.getDoc('bookings', id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'NOT_FOUND');
    }

    if (booking.vendorId !== uid) {
      return sendError(res, 'Access denied', 403, 'FORBIDDEN');
    }

    const newStatus = action === 'accept' ? 'confirmed' : 'cancelled';
    const updated = await firestoreService.updateDoc('bookings', id, {
      status: newStatus,
      reviewedAt: new Date(),
    });

    await cacheService.invalidateSlots(booking.turfId, booking.date);
    await cacheService.invalidateDashboard(uid);

    return sendSuccess(res, { booking: updated });
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

    if (!vendor?.turfId) {
      return sendSuccess(res, { reviews: [] });
    }

    const result = await firestoreService.queryWithCursor('reviews', {
      filters: [['turfId', '==', vendor.turfId]],
      limit: 50,
    });

    return sendSuccess(res, { reviews: result.items });
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
};

module.exports = vendorController;
