const jwt = require('jsonwebtoken');
const bookingService = require('../services/bookingService');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { adminReviewSchema, setAdminClaimSchema } = require('../utils/validators');

const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const cacheService = require('../services/cacheService');
const { formatTurf } = require('./turfController');

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
   * Relational Super Admin Authentication via PostgreSQL
   */
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'CREDENTIALS_REQUIRED');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const admin = await prisma.superAdmin.findUnique({
      where: { email: cleanEmail },
    });

    if (!admin || !admin.isActive) {
      return sendError(res, 'Invalid Super Admin credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid Super Admin credentials', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      {
        uid: admin.id,
        email: admin.email,
        role: admin.role === 'superadmin' ? 'superadmin' : 'admin',
        admin: true,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return sendSuccess(res, {
      token,
      admin: {
        uid: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  },

  /**
   * GET /api/v1/admin/stats
   * Real-time platform monitoring KPI metrics
   */
  async getStats(req, res) {
    try {
      const [users, vendors, turfs, bookingStats, recentBookingsResult, matches, reports] = await Promise.all([
        prisma.user.findMany({ select: { id: true, status: true, createdAt: true } }),
        prisma.vendor.findMany({ select: { id: true, kycStatus: true, createdAt: true } }),
        prisma.turf.findMany({ select: { id: true, name: true, status: true, createdAt: true } }),
        bookingService.getAdminStats(),
        bookingService.getAllBookingsAdmin({ limit: 10 }),
        prisma.match.findMany({ select: { id: true, status: true, createdAt: true } }),
        prisma.report.findMany({ select: { id: true, status: true, createdAt: true } }),
      ]);

      const liveTurfs = turfs;

      const totalRevenue = bookingStats.totalRevenue;
      const confirmedBookings = bookingStats.confirmedCount;
      const completedBookings = bookingStats.completedCount;
      const pendingBookings = bookingStats.pendingCount;
      const cancelledBookings = bookingStats.cancelledCount;
      const totalBookings = bookingStats.totalBookings;

      const pendingKycs = vendors.filter((v) => v.kycStatus === 'pending').length;
      const activeTurfs = liveTurfs.filter((t) => t.status === 'active').length;
      const pendingTurfs = liveTurfs.filter((t) => t.status === 'pending').length;

      const liveMatches = matches.filter((m) => m.status === 'live').length;
      const openReports = reports.filter((r) => r.status === 'open' || !r.status).length;

      const sortByTime = (items) => [...items].sort((a, b) => {
        const getT = (x) => new Date(x.createdAt || 0).getTime();
        return getT(b) - getT(a);
      });

      return sendSuccess(res, {
        stats: {
          totalUsers: users.length,
          totalVendors: vendors.length,
          totalTurfs: turfs.length,
          activeTurfs,
          pendingTurfs,
          pendingKycs,
          totalBookings,
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
        recentBookings: recentBookingsResult.items,
        recentVendors: sortByTime(vendors).slice(0, 5),
        recentReports: sortByTime(reports).slice(0, 5),
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
    const { limit = 50 } = req.query;

    try {
      const vendors = await prisma.vendor.findMany({
        where: { kycStatus: 'pending' },
        include: { turfs: true, kycDocuments: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      const enrichedItems = vendors.map((v) => ({
        ...v,
        turf: v.turfs?.[0] || null,
      }));

      return sendPaginated(res, enrichedItems, null, { count: enrichedItems.length });
    } catch (err) {
      console.error('getPendingVendors error:', err);
      return sendError(res, 'Failed to fetch pending vendors', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/vendors
   * List all vendors with optional status filter
   */
  async getAllVendors(req, res) {
    const { status, limit = 50 } = req.query;

    try {
      const where = {};
      if (status) {
        where.kycStatus = status;
      }

      const vendors = await prisma.vendor.findMany({
        where,
        include: { turfs: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      const enrichedItems = vendors.map((v) => ({
        ...v,
        turf: v.turfs?.[0] || null,
      }));

      return sendPaginated(res, enrichedItems, null, { count: enrichedItems.length });
    } catch (err) {
      console.error('getAllVendors error:', err);
      return sendError(res, 'Failed to fetch vendors', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/users
   * List all registered customer users
   */
  async getAllUsers(req, res) {
    const { limit = 50 } = req.query;

    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      return sendPaginated(res, users, null, { count: users.length });
    } catch (err) {
      console.error('getAllUsers error:', err);
      return sendError(res, 'Failed to fetch users', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/turfs
   * List all turfs across all vendors with status filter
   */
  async getAllTurfs(req, res) {
    try {
      const { status, limit = 100, cursor } = req.query;
      const take = Math.min(Number(limit) || 100, 200);

      const where = {};
      if (status && status !== 'all') {
        where.status = status;
      }

      const queryOptions = {
        where,
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }

      const turfs = await prisma.turf.findMany(queryOptions);

      let nextCursor = null;
      if (turfs.length > take) {
        const nextItem = turfs.pop();
        nextCursor = nextItem.id;
      }

      const formatted = turfs.map(formatTurf);

      return sendPaginated(res, formatted, nextCursor, {
        count: formatted.length,
        items: formatted,
        turfs: formatted,
      });
    } catch (err) {
      console.error('getAllTurfs error:', err);
      return sendError(res, 'Failed to fetch turfs', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/bookings
   * Monitor all real-time platform bookings
   */
  async getAllBookings(req, res) {
    const { status, turfId, limit = 50, cursor } = req.query;

    try {
      const result = await bookingService.getAllBookingsAdmin({
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
      console.error('getAllBookings error:', err);
      return sendError(res, 'Failed to fetch platform bookings', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/matches
   * Monitor all community matches & live scorecards
   */
  async getAllMatches(req, res) {
    const { status, limit = 50 } = req.query;

    try {
      const where = {};
      if (status) where.status = status;

      const matches = await prisma.match.findMany({
        where,
        include: { turf: true, players: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      return sendPaginated(res, matches, null, { count: matches.length });
    } catch (err) {
      console.error('getAllMatches error:', err);
      return sendError(res, 'Failed to fetch matches', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/reports
   * List all vendor/user issue reports
   */
  async getAllReports(req, res) {
    const { status, limit = 50 } = req.query;

    try {
      const where = {};
      if (status) where.status = status;

      const reports = await prisma.report.findMany({
        where,
        include: { vendor: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      return sendPaginated(res, reports, null, { count: reports.length });
    } catch (err) {
      console.error('getAllReports error:', err);
      return sendError(res, 'Failed to fetch reports', 500, 'FETCH_FAILED');
    }
  },

  /**
   * PATCH /api/v1/admin/reports/:id
   * Update report status (open, in-progress, resolved)
   */
  async updateReportStatus(req, res) {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;

    try {
      const updated = await prisma.report.update({
        where: { id },
        data: {
          status: status || 'resolved',
          updatedAt: new Date(),
        },
      });

      return sendSuccess(res, { report: updated });
    } catch (err) {
      console.error('updateReportStatus error:', err);
      return sendError(res, 'Failed to update report status', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * POST /api/v1/admin/vendors/:uid/approve
   */
  async approveVendor(req, res) {
    const { uid } = req.params;

    try {
      const vendor = await prisma.vendor.findUnique({ where: { id: uid } });
      if (!vendor) {
        return sendError(res, 'Vendor not found', 404, 'NOT_FOUND');
      }

      const updatedVendor = await prisma.vendor.update({
        where: { id: uid },
        data: {
          kycStatus: 'approved',
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      // Auto-approve vendor's turf if in pending
      await prisma.turf.updateMany({
        where: { vendorId: uid, status: 'pending' },
        data: {
          status: 'active',
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      // Send push notification to vendor
      await notificationService.sendNotification({
        recipientId: uid,
        recipientRole: 'vendor',
        title: 'KYC & Turf Approved!',
        body: 'Your KYC documents and turf listing have been approved by Super Admin. You can now choose a subscription plan!',
        type: 'kyc',
        data: { kycStatus: 'approved' },
      });

      return sendSuccess(res, {
        vendor: updatedVendor,
        message: 'Vendor and turf approved successfully',
      });
    } catch (err) {
      console.error('approveVendor error:', err);
      return sendError(res, 'Failed to approve vendor', 500, 'APPROVE_FAILED');
    }
  },

  /**
   * POST /api/v1/admin/vendors/:uid/reject
   */
  async rejectVendor(req, res) {
    const { uid } = req.params;
    const { reason } = adminReviewSchema.parse(req.body);

    try {
      const vendor = await prisma.vendor.findUnique({ where: { id: uid } });
      if (!vendor) {
        return sendError(res, 'Vendor not found', 404, 'NOT_FOUND');
      }

      const updatedVendor = await prisma.vendor.update({
        where: { id: uid },
        data: {
          kycStatus: 'rejected',
          rejectionReason: reason || 'Documents did not pass verification',
          reviewedAt: new Date(),
        },
      });

      await prisma.turf.updateMany({
        where: { vendorId: uid },
        data: {
          status: 'rejected',
          rejectionReason: reason || 'Vendor verification failed',
          reviewedAt: new Date(),
        },
      });

      await notificationService.sendNotification({
        recipientId: uid,
        recipientRole: 'vendor',
        title: 'Verification Update',
        body: `Your KYC verification was not approved: ${reason || 'Please re-upload valid documents.'}`,
        type: 'kyc',
        data: { kycStatus: 'rejected' },
      });

      return sendSuccess(res, {
        vendor: updatedVendor,
        message: 'Vendor rejected with reason',
      });
    } catch (err) {
      console.error('rejectVendor error:', err);
      return sendError(res, 'Failed to reject vendor', 500, 'REJECT_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/turfs/pending
   */
  async getPendingTurfs(req, res) {
    try {
      const { limit = 50, cursor } = req.query;
      const take = Math.min(Number(limit) || 50, 100);

      const queryOptions = {
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }

      const turfs = await prisma.turf.findMany(queryOptions);

      let nextCursor = null;
      if (turfs.length > take) {
        const nextItem = turfs.pop();
        nextCursor = nextItem.id;
      }

      const formatted = turfs.map(formatTurf);

      return sendPaginated(res, formatted, nextCursor, {
        count: formatted.length,
        items: formatted,
      });
    } catch (err) {
      console.error('getPendingTurfs error:', err);
      return sendError(res, 'Failed to fetch pending turfs', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/admin/turfs/:turfId/approve
   */
  async approveTurf(req, res) {
    try {
      const { turfId } = req.params;

      const turf = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      const updatedTurf = await prisma.turf.update({
        where: { id: turfId },
        data: {
          status: 'active',
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      await cacheService.del(`turf:${turfId}`);

      return sendSuccess(res, {
        turf: formatTurf(updatedTurf),
        message: 'Turf approved successfully',
      });
    } catch (err) {
      console.error('approveTurf error:', err);
      return sendError(res, 'Failed to approve turf', 500, 'APPROVE_FAILED');
    }
  },

  /**
   * POST /api/v1/admin/turfs/:turfId/toggle-status
   * Activate or suspend a turf
   */
  async toggleTurfStatus(req, res) {
    try {
      const { turfId } = req.params;

      const turf = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      const nextStatus = turf.status === 'active' ? 'suspended' : 'active';
      const updatedTurf = await prisma.turf.update({
        where: { id: turfId },
        data: {
          status: nextStatus,
          reviewedAt: new Date(),
        },
      });

      await cacheService.del(`turf:${turfId}`);

      return sendSuccess(res, {
        turf: formatTurf(updatedTurf),
        status: nextStatus,
        message: `Turf status changed to ${nextStatus}`,
      });
    } catch (err) {
      console.error('toggleTurfStatus error:', err);
      return sendError(res, 'Failed to toggle turf status', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * DELETE /api/v1/admin/turfs/:turfId
   * Super Admin delete turf — refuses if turf has associated bookings
   */
  async deleteTurfAdmin(req, res) {
    try {
      const { turfId } = req.params;

      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
      });

      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      const bookingCount = await prisma.booking.count({
        where: { turfId },
      });

      if (bookingCount > 0) {
        return sendError(
          res,
          `Cannot delete turf '${turf.name}' because it has ${bookingCount} existing booking(s). Please suspend the turf instead.`,
          400,
          'TURF_HAS_BOOKINGS',
          { bookingCount, turfId, turfName: turf.name }
        );
      }

      await prisma.turf.delete({
        where: { id: turfId },
      });

      await cacheService.del(`turf:${turfId}`);

      return sendSuccess(res, {
        message: `Turf '${turf.name}' deleted successfully`,
        turfId,
      });
    } catch (err) {
      console.error('deleteTurfAdmin error:', err);
      return sendError(res, 'Failed to delete turf', 500, 'DELETE_FAILED');
    }
  },

  /**
   * PATCH /api/v1/admin/users/:uid
   * Update player profile from Super Admin
   */
  async updateUser(req, res) {
    const { uid } = req.params;
    try {
      const existing = await prisma.user.findUnique({ where: { id: uid } });
      if (!existing) {
        return sendError(res, 'Player account not found', 404, 'NOT_FOUND');
      }

      const { name, email, phone, location, status } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (location !== undefined) updateData.location = location;
      if (status !== undefined) updateData.status = status;

      const updated = await prisma.user.update({
        where: { id: uid },
        data: updateData,
      });
      return sendSuccess(res, { user: updated, profile: updated });
    } catch (err) {
      console.error('updateUser error:', err);
      return sendError(res, 'Failed to update user', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * DELETE /api/v1/admin/users/:uid
   * Delete player account from Super Admin
   */
  async deleteUser(req, res) {
    const { uid } = req.params;
    try {
      await prisma.user.delete({ where: { id: uid } });
      return sendSuccess(res, { message: 'Player removed successfully' });
    } catch (err) {
      console.error('deleteUser error:', err);
      return sendError(res, 'Failed to delete user', 500, 'DELETE_FAILED');
    }
  },

  /**
   * POST /api/v1/admin/set-admin-claim
   */
  async setAdminClaim(req, res) {
    const { uid, admin } = setAdminClaimSchema.parse(req.body);

    try {
      const existing = await prisma.superAdmin.findUnique({ where: { id: uid } });
      if (existing) {
        await prisma.superAdmin.update({
          where: { id: uid },
          data: { role: admin ? 'admin' : 'superadmin' },
        });
      }

      return sendSuccess(res, {
        message: `Admin claim set to ${admin} for UID: ${uid}`,
      });
    } catch (err) {
      console.error('setAdminClaim error:', err);
      return sendError(res, 'Failed to set admin claim', 500, 'SET_CLAIM_FAILED');
    }
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
    const { turfId, rating, limit = 50 } = req.query;

    try {
      const where = {};
      if (turfId) where.turfId = turfId;
      if (rating) where.rating = Number(rating);

      const reviews = await prisma.review.findMany({
        where,
        include: { turf: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      const enrichedReviews = reviews.map((rev) => ({
        ...rev,
        turfName: rev.turf?.name || 'Turf Facility',
        turfCity: rev.turf?.city || 'Local Arena',
      }));

      return sendPaginated(res, enrichedReviews, null, { count: enrichedReviews.length });
    } catch (err) {
      console.error('getAllReviews error:', err);
      return sendError(res, 'Failed to fetch reviews', 500, 'FETCH_FAILED');
    }
  },
};

module.exports = adminController;
