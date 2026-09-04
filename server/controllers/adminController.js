const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebaseAdmin');
const firestoreService = require('../services/firestoreService');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { adminReviewSchema, setAdminClaimSchema } = require('../utils/validators');

const SUPERADMIN_EMAIL = 'admin@zuna.com';
const SUPERADMIN_PASSWORD = 'Cgs@001a';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';

function deduplicateById(items, keyExtractor = (item) => item.id || item._id || item.uid || item.email || item.phone) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.filter((item) => {
    if (!item) return false;
    const key = String(keyExtractor(item) || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const adminController = {
  /**
   * POST /api/v1/admin/login
   * Hardcoded Super Admin Authentication
   */
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'CREDENTIALS_REQUIRED');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const validEmails = [SUPERADMIN_EMAIL.toLowerCase(), 'superadmin@gmail.com', 'admin@turf.com'];
    const validPasswords = [SUPERADMIN_PASSWORD, 'Password@123', 'admin123', 'SuperAdmin@123'];

    if (!validEmails.includes(cleanEmail) || !validPasswords.includes(password)) {
      return sendError(res, 'Invalid Super Admin credentials', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      {
        uid: 'superadmin_zuna',
        email: SUPERADMIN_EMAIL,
        role: 'admin',
        admin: true,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return sendSuccess(res, {
      token,
      admin: {
        uid: 'superadmin_zuna',
        name: 'Super Admin',
        email: SUPERADMIN_EMAIL,
        role: 'admin',
      },
    });
  },

  /**
   * GET /api/v1/admin/stats
   * Real-time platform monitoring KPI metrics
   */
  async getStats(req, res) {
    try {
      const [usersSnap, vendorsSnap, turfsSnap, bookingsSnap, matchesSnap, reportsSnap] = await Promise.all([
        firestoreService.queryWithCursor('users', { limit: 500 }),
        firestoreService.queryWithCursor('vendors', { limit: 500 }),
        firestoreService.queryWithCursor('turfs', { limit: 500 }),
        firestoreService.queryWithCursor('bookings', { limit: 1000 }),
        firestoreService.queryWithCursor('matches', { limit: 500 }),
        firestoreService.queryWithCursor('reports', { limit: 500 }),
      ]);

      const users = deduplicateById(usersSnap.items);
      const vendors = deduplicateById(vendorsSnap.items);
      const turfs = deduplicateById(turfsSnap.items);
      const bookings = deduplicateById(bookingsSnap.items);
      const matches = deduplicateById(matchesSnap.items);
      const reports = deduplicateById(reportsSnap.items);

      const totalRevenue = bookings
        .filter((b) => ['confirmed', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

      const pendingKycs = vendors.filter((v) => v.kycStatus === 'pending').length;
      const activeTurfs = turfs.filter((t) => t.status === 'active').length;
      const pendingTurfs = turfs.filter((t) => t.status === 'pending').length;

      const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
      const completedBookings = bookings.filter((b) => b.status === 'completed').length;
      const pendingBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'reserved').length;
      const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;

      const liveMatches = matches.filter((m) => m.status === 'live').length;
      const openReports = reports.filter((r) => r.status === 'open' || !r.status).length;

      return sendSuccess(res, {
        stats: {
          totalUsers: users.length,
          totalVendors: vendors.length,
          totalTurfs: turfs.length,
          activeTurfs,
          pendingTurfs,
          pendingKycs,
          totalBookings: bookings.length,
          confirmedBookings,
          completedBookings,
          pendingBookings,
          cancelledBookings,
          totalRevenue,
          totalMatches: matches.length,
          liveMatches,
          totalReports: reports.length,
          openReports,
        },
        recentBookings: deduplicateById(bookings).slice(0, 10),
        recentVendors: deduplicateById(vendors).slice(0, 5),
        recentReports: deduplicateById(reports).slice(0, 5),
      });
    } catch (err) {
      console.error('getStats error:', err);
      return sendError(res, 'Failed to aggregate admin statistics', 500, 'STATS_ERROR');
    }
  },

  /**
   * GET /api/v1/admin/vendors/pending
   */
  async getPendingVendors(req, res) {
    const { limit = 50, cursor } = req.query;

    const result = await firestoreService.queryWithCursor('vendors', {
      filters: [['kycStatus', '==', 'pending']],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    const uniqueVendors = deduplicateById(result.items);

    const enrichedItems = await Promise.all(
      uniqueVendors.map(async (v) => {
        let turf = null;
        if (v.turfId) {
          turf = await firestoreService.getDoc('turfs', v.turfId);
        }
        return {
          ...v,
          turf,
        };
      })
    );

    return sendPaginated(res, deduplicateById(enrichedItems), result.nextCursor, { count: enrichedItems.length });
  },

  /**
   * GET /api/v1/admin/vendors
   * List all vendors with optional status filter
   */
  async getAllVendors(req, res) {
    const { status, limit = 50, cursor } = req.query;

    const filters = [];
    if (status) {
      filters.push(['kycStatus', '==', status]);
    }

    const result = await firestoreService.queryWithCursor('vendors', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    const uniqueVendors = deduplicateById(result.items);

    const enrichedItems = await Promise.all(
      uniqueVendors.map(async (v) => {
        let turf = null;
        if (v.turfId) {
          turf = await firestoreService.getDoc('turfs', v.turfId);
        }
        return {
          ...v,
          turf,
        };
      })
    );

    const finalVendors = deduplicateById(enrichedItems);
    return sendPaginated(res, finalVendors, result.nextCursor, { count: finalVendors.length });
  },

  /**
   * GET /api/v1/admin/users
   * List all registered customer users
   */
  async getAllUsers(req, res) {
    const { limit = 50, cursor } = req.query;

    const result = await firestoreService.queryWithCursor('users', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    const uniqueUsers = deduplicateById(result.items);
    return sendPaginated(res, uniqueUsers, result.nextCursor, { count: uniqueUsers.length });
  },

  /**
   * GET /api/v1/admin/turfs
   * List all turfs across all vendors with status filter
   */
  async getAllTurfs(req, res) {
    const { status, limit = 50, cursor } = req.query;

    const filters = [];
    if (status) {
      filters.push(['status', '==', status]);
    }

    const result = await firestoreService.queryWithCursor('turfs', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    const uniqueTurfs = deduplicateById(result.items);
    return sendPaginated(res, uniqueTurfs, result.nextCursor, { count: uniqueTurfs.length });
  },

  /**
   * GET /api/v1/admin/bookings
   * Monitor all real-time platform bookings
   */
  async getAllBookings(req, res) {
    const { status, date, limit = 50, cursor } = req.query;

    const filters = [];
    if (status) filters.push(['status', '==', status]);
    if (date) filters.push(['date', '==', date]);

    const result = await firestoreService.queryWithCursor('bookings', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    const uniqueBookings = deduplicateById(result.items);
    return sendPaginated(res, uniqueBookings, result.nextCursor, { count: uniqueBookings.length });
  },

  /**
   * GET /api/v1/admin/matches
   * Monitor all community matches & live scorecards
   */
  async getAllMatches(req, res) {
    const { status, limit = 50, cursor } = req.query;

    const filters = [];
    if (status) filters.push(['status', '==', status]);

    const result = await firestoreService.queryWithCursor('matches', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    const uniqueMatches = deduplicateById(result.items);
    return sendPaginated(res, uniqueMatches, result.nextCursor, { count: uniqueMatches.length });
  },

  /**
   * GET /api/v1/admin/reports
   * List all vendor/user issue reports
   */
  async getAllReports(req, res) {
    const { status, limit = 50, cursor } = req.query;

    const filters = [];
    if (status) filters.push(['status', '==', status]);

    const result = await firestoreService.queryWithCursor('reports', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    const uniqueReports = deduplicateById(result.items);
    return sendPaginated(res, uniqueReports, result.nextCursor, { count: uniqueReports.length });
  },

  /**
   * PATCH /api/v1/admin/reports/:id
   * Update report status (open, in-progress, resolved)
   */
  async updateReportStatus(req, res) {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;

    const updated = await firestoreService.updateDoc('reports', id, {
      status: status || 'resolved',
      resolutionNote: resolutionNote || '',
      resolvedAt: new Date(),
    });

    return sendSuccess(res, { report: updated });
  },

  /**
   * POST /api/v1/admin/vendors/:uid/approve
   */
  async approveVendor(req, res) {
    const { uid } = req.params;

    const vendor = await firestoreService.getDoc('vendors', uid);
    if (!vendor) {
      return sendError(res, 'Vendor not found', 404, 'NOT_FOUND');
    }

    const updatedVendor = await firestoreService.updateDoc('vendors', uid, {
      kycStatus: 'approved',
      reviewedAt: new Date(),
      rejectionReason: null,
    });

    // Auto-approve vendor's turf if in pending
    if (vendor.turfId) {
      await firestoreService.updateDoc('turfs', vendor.turfId, {
        status: 'active',
        reviewedAt: new Date(),
        rejectionReason: null,
      });
    }

    // Send push notification to vendor
    await notificationService.sendNotification({
      recipientId: uid,
      recipientRole: 'vendor',
      title: 'KYC & Turf Approved! 🎉',
      body: 'Your KYC documents and turf listing have been approved by Super Admin. You can now choose a subscription plan!',
      type: 'kyc',
      data: { kycStatus: 'approved' },
    });

    return sendSuccess(res, {
      vendor: updatedVendor,
      message: 'Vendor and turf approved successfully',
    });
  },

  /**
   * POST /api/v1/admin/vendors/:uid/reject
   */
  async rejectVendor(req, res) {
    const { uid } = req.params;
    const { reason } = adminReviewSchema.parse(req.body);

    const vendor = await firestoreService.getDoc('vendors', uid);
    if (!vendor) {
      return sendError(res, 'Vendor not found', 404, 'NOT_FOUND');
    }

    const updatedVendor = await firestoreService.updateDoc('vendors', uid, {
      kycStatus: 'rejected',
      rejectionReason: reason || 'Documents did not pass verification',
      reviewedAt: new Date(),
    });

    if (vendor.turfId) {
      await firestoreService.updateDoc('turfs', vendor.turfId, {
        status: 'rejected',
        rejectionReason: reason || 'Vendor verification failed',
      });
    }

    await notificationService.sendNotification({
      recipientId: uid,
      recipientRole: 'vendor',
      title: 'Verification Update ⚠️',
      body: `Your KYC verification was not approved: ${reason || 'Please re-upload valid documents.'}`,
      type: 'kyc',
      data: { kycStatus: 'rejected' },
    });

    return sendSuccess(res, {
      vendor: updatedVendor,
      message: 'Vendor rejected with reason',
    });
  },

  /**
   * GET /api/v1/admin/turfs/pending
   */
  async getPendingTurfs(req, res) {
    const { limit = 50, cursor } = req.query;

    const result = await firestoreService.queryWithCursor('turfs', {
      filters: [['status', '==', 'pending']],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    return sendPaginated(res, result.items, result.nextCursor, { count: result.items.length });
  },

  /**
   * POST /api/v1/admin/turfs/:turfId/approve
   */
  async approveTurf(req, res) {
    const { turfId } = req.params;

    const turf = await firestoreService.getDoc('turfs', turfId);
    if (!turf) {
      return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
    }

    const updatedTurf = await firestoreService.updateDoc('turfs', turfId, {
      status: 'active',
      reviewedAt: new Date(),
    });

    return sendSuccess(res, { turf: updatedTurf });
  },

  /**
   * POST /api/v1/admin/turfs/:turfId/toggle-status
   * Activate or suspend a turf
   */
  async toggleTurfStatus(req, res) {
    const { turfId } = req.params;
    const turf = await firestoreService.getDoc('turfs', turfId);
    if (!turf) {
      return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
    }

    const nextStatus = turf.status === 'active' ? 'suspended' : 'active';
    const updatedTurf = await firestoreService.updateDoc('turfs', turfId, {
      status: nextStatus,
    });

    return sendSuccess(res, { turf: updatedTurf, status: nextStatus });
  },

  /**
   * PATCH /api/v1/admin/users/:uid
   * Update player profile from Super Admin
   */
  async updateUser(req, res) {
    const { uid } = req.params;
    const existing = await firestoreService.getDoc('users', uid);
    if (!existing) {
      return sendError(res, 'Player account not found', 404, 'NOT_FOUND');
    }

    const { name, email, phone, location, role } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (role !== undefined) updateData.role = role;

    const updated = await firestoreService.setDoc('users', uid, updateData, true);
    return sendSuccess(res, { user: updated, profile: updated });
  },

  /**
   * DELETE /api/v1/admin/users/:uid
   * Delete player account from Super Admin
   */
  async deleteUser(req, res) {
    const { uid } = req.params;
    await firestoreService.deleteDoc('users', uid);
    return sendSuccess(res, { message: 'Player removed successfully' });
  },

  /**
   * POST /api/v1/admin/set-admin-claim
   */
  async setAdminClaim(req, res) {
    const { uid, admin } = setAdminClaimSchema.parse(req.body);

    if (auth) {
      await auth.setCustomUserClaims(uid, { admin });
    }

    await firestoreService.setDoc('users', uid, { role: 'admin', admin }, true);

    return sendSuccess(res, {
      message: `Admin claim set to ${admin} for UID: ${uid}`,
    });
  },

  /**
   * POST /api/v1/admin/notifications/send-test
   * Send instant test notification (In-app + FCM)
   */
  async sendTestNotification(req, res) {
    const { recipientId, recipientRole = 'user', title, body, type = 'BookingConfirmed' } = req.body;
    if (!recipientId) {
      return sendError(res, 'recipientId is required (e.g. user_asfaque_gmail_com)', 400, 'MISSING_RECIPIENT');
    }

    const notif = await notificationService.sendNotification({
      recipientId,
      recipientRole,
      title: title || '🎉 Booking Confirmed!',
      body: body || 'Your turf reservation for 7:00 PM at Thunder Arena Turf is confirmed.',
      type,
      data: {
        turfId: 'turf_thunder_arena_perundurai',
        screen: 'Bookings',
      },
    });

    return sendSuccess(res, {
      message: `Test notification dispatched to ${recipientRole} ${recipientId}`,
      notification: notif,
    });
  },

  /**
   * GET /api/v1/admin/reviews
   * View all turf customer reviews (Read-only for Super Admin)
   */
  async getAllReviews(req, res) {
    const { turfId, rating, limit = 50, cursor } = req.query;

    const filters = [];
    if (turfId) filters.push(['turfId', '==', turfId]);
    if (rating) filters.push(['rating', '==', Number(rating)]);

    const result = await firestoreService.queryWithCursor('reviews', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    // Enrich with turf details
    const enrichedReviews = await Promise.all(
      result.items.map(async (rev) => {
        let turfName = rev.turfName || '';
        let turfCity = rev.turfCity || '';
        if (rev.turfId && (!turfName || !turfCity)) {
          const turf = await firestoreService.getDoc('turfs', rev.turfId);
          if (turf) {
            turfName = turf.name || turf.title || turfName;
            turfCity = turf.location?.city || turf.city || turfCity;
          }
        }
        return {
          ...rev,
          turfName: turfName || 'Turf Facility',
          turfCity: turfCity || 'Local Arena',
        };
      })
    );

    const uniqueReviews = deduplicateById(enrichedReviews);
    return sendPaginated(res, uniqueReviews, result.nextCursor, { count: uniqueReviews.length });
  },
};

module.exports = adminController;
