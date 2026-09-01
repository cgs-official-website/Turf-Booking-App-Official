const firestoreService = require('../services/firestoreService');
const cacheService = require('../services/cacheService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const turfController = {
  /**
   * GET /api/v1/turfs
   * List turfs with filters, cursor pagination, and Redis caching
   */
  async getTurfs(req, res) {
    const { sport, city, minPrice, maxPrice, limit = 20, cursor } = req.query;

    const cacheKey = `turfs:list:${sport || 'all'}:${city || 'all'}:${minPrice || '0'}:${maxPrice || 'max'}:${limit}:${cursor || 'first'}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendPaginated(res, cached.items, cached.nextCursor, { count: cached.items.length });
    }

    const filters = [
      ['status', '==', 'active'],
    ];

    if (city) {
      filters.push(['city', '==', city]);
    }

    const result = await firestoreService.queryWithCursor('turfs', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    let items = result.items;

    // In-memory filter for array field `sportTypes` and price range
    if (sport) {
      items = items.filter((t) =>
        t.sportTypes && Array.isArray(t.sportTypes) &&
        t.sportTypes.some((s) => s.toLowerCase() === String(sport).toLowerCase())
      );
    }

    if (minPrice || maxPrice) {
      const min = Number(minPrice) || 0;
      const max = Number(maxPrice) || Infinity;
      items = items.filter((t) => {
        const rate = t.pricing?.baseRate || 0;
        return rate >= min && rate <= max;
      });
    }

    // Cache filtered result for 2 minutes
    await cacheService.set(cacheKey, { items, nextCursor: result.nextCursor }, 120);

    return sendPaginated(res, items, result.nextCursor, { count: items.length });
  },

  /**
   * GET /api/v1/turfs/:turfId
   * Turf detail with 5-minute Redis cache
   */
  async getTurfById(req, res) {
    const { turfId } = req.params;
    const cacheKey = `turf:${turfId}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, { turf: cached });
    }

    const turf = await firestoreService.getDoc('turfs', turfId);
    if (!turf) {
      return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
    }

    await cacheService.set(cacheKey, turf, 300);
    return sendSuccess(res, { turf });
  },

  /**
   * GET /api/v1/turfs/:turfId/slots?date=YYYY-MM-DD
   * Computes available slots for a date (merges slotConfig, sub-collection slotOverrides, and active bookings)
   * Cached in Redis for 30 seconds
   */
  async getAvailableSlots(req, res) {
    const { turfId } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(res, 'Valid date parameter in YYYY-MM-DD format is required', 400, 'INVALID_DATE');
    }

    const cacheKey = `slots:${turfId}:${date}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    const turf = await firestoreService.getDoc('turfs', turfId);
    if (!turf) {
      return sendError(res, 'Turf not found', 404, 'TURF_NOT_FOUND');
    }

    const slotConfig = turf.slotConfig || { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 };
    const baseRate = turf.pricing?.baseRate || 800;

    // 1. Fetch any overrides for this date from sub-collection: turfs/{turfId}/slotOverrides/{date}
    let slotOverrides = { blockedSlots: [], priceOverrides: {} };
    try {
      if (firestoreService.db) {
        const overrideSnap = await firestoreService.db
          .collection('turfs')
          .doc(turfId)
          .collection('slotOverrides')
          .doc(date)
          .get();

        if (overrideSnap.exists) {
          slotOverrides = overrideSnap.data();
        }
      }
    } catch (err) {
      console.warn('Error reading slot overrides:', err.message);
    }

    // 2. Fetch existing bookings for this turf & date (status != 'cancelled')
    const bookingsResult = await firestoreService.queryWithCursor('bookings', {
      filters: [
        ['turfId', '==', turfId],
        ['date', '==', date],
      ],
      orderByField: null,
      limit: 100,
    });

    const activeBookings = bookingsResult.items.filter((b) =>
      ['reserved', 'pending', 'confirmed'].includes(b.status)
    );

    // 3. Generate all time slots from openTime to closeTime
    const slots = [];
    const [openH, openM] = slotConfig.openTime.split(':').map(Number);
    const [closeH, closeM] = slotConfig.closeTime.split(':').map(Number);
    const duration = slotConfig.slotDurationMins || 60;

    let current = new Date();
    current.setHours(openH, openM, 0, 0);

    const end = new Date();
    end.setHours(closeH, closeM, 0, 0);

    const pad = (n) => String(n).padStart(2, '0');

    while (current < end) {
      const next = new Date(current.getTime() + duration * 60 * 1000);
      if (next > end) break;

      const startTime = `${pad(current.getHours())}:${pad(current.getMinutes())}`;
      const endTime = `${pad(next.getHours())}:${pad(next.getMinutes())}`;
      const slotKey = `${startTime}-${endTime}`;

      const isBlocked = (slotOverrides.blockedSlots || []).includes(slotKey);
      const isBooked = activeBookings.some((b) => b.startTime === startTime);

      let price = baseRate;
      if (slotOverrides.priceOverrides && slotOverrides.priceOverrides[slotKey]) {
        price = slotOverrides.priceOverrides[slotKey];
      }

      slots.push({
        slotKey,
        startTime,
        endTime,
        price,
        available: !isBlocked && !isBooked,
        isBlocked,
        isBooked,
      });

      current = next;
    }

    const payload = {
      turfId,
      date,
      slots,
    };

    // Cache for 30 seconds
    await cacheService.set(cacheKey, payload, 30);

    return sendSuccess(res, payload);
  },

  /**
   * POST /api/v1/turfs/:turfId/wishlist
   * Toggle wishlist for authenticated user
   */
  async toggleWishlist(req, res) {
    const { turfId } = req.params;
    const { uid } = req.user;

    const userDoc = await firestoreService.getDoc('users', uid);
    if (!userDoc) {
      return sendError(res, 'User profile not found', 404, 'NOT_FOUND');
    }

    let wishlist = userDoc.wishlist || [];
    const index = wishlist.indexOf(turfId);
    let isWishlisted = false;

    if (index > -1) {
      wishlist.splice(index, 1);
      isWishlisted = false;
    } else {
      wishlist.push(turfId);
      isWishlisted = true;
    }

    await firestoreService.updateDoc('users', uid, { wishlist });

    return sendSuccess(res, {
      turfId,
      isWishlisted,
      wishlist,
    });
  },

  /**
   * GET /api/v1/turfs/:turfId/reviews
   */
  async getTurfReviews(req, res) {
    const { turfId } = req.params;
    const { limit = 20, cursor } = req.query;

    const result = await firestoreService.queryWithCursor('reviews', {
      filters: [['turfId', '==', turfId]],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    return sendPaginated(res, result.items, result.nextCursor, { count: result.items.length });
  },
};

module.exports = turfController;
