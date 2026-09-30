const prisma = require('../config/prisma');
const bookingService = require('../services/bookingService');
const cacheService = require('../services/cacheService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

/**
 * Standardize turf entity shape across UserApp, VendorApp, and AdminPanel
 */
function formatTurf(t) {
  if (!t) return null;
  const baseRate = Number(t.pricePerHour || 0);
  const city = t.city || t.location?.city || '';
  const address = t.location?.address || t.address || city;
  const sports = Array.isArray(t.sports) ? t.sports : (Array.isArray(t.sportTypes) ? t.sportTypes : []);
  const ratingAvg = typeof t.ratingAvg === 'number' ? t.ratingAvg : (Number(t.rating?.avg) || 5.0);
  const reviewsCount = typeof t.reviewsCount === 'number' ? t.reviewsCount : (Number(t.rating?.count) || 0);
  const images = Array.isArray(t.images) ? t.images : [];

  return {
    id: t.id,
    _id: t.id,
    name: t.name,
    vendorId: t.vendorId,
    vendor: t.vendor || undefined,
    description: t.description || '',
    city,
    address,
    location: {
      city,
      address,
      geo: (t.lat && t.lng) ? { lat: t.lat, lng: t.lng } : (t.location?.geo || null),
    },
    sportTypes: sports,
    sports,
    pricePerHour: baseRate,
    price: baseRate,
    pricing: {
      baseRate,
      weekendRate: Number(t.pricing?.weekendRate || baseRate),
      peakHourRate: Number(t.pricing?.peakHourRate || baseRate),
    },
    courtCount: t.courtCount || 1,
    rating: {
      avg: ratingAvg,
      count: reviewsCount,
    },
    ratingAvg,
    reviewsCount,
    ratingObj: { avg: ratingAvg, count: reviewsCount },
    status: t.status,
    images,
    image: images[0] || '',
    amenities: Array.isArray(t.amenities) ? t.amenities : [],
    slotConfig: t.slotConfig || { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 },
    rejectionReason: t.rejectionReason || null,
    reviewedAt: t.reviewedAt || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

const turfController = {
  formatTurf,

  /**
   * GET /api/v1/turfs
   * Public list of active turfs with filtering, search, sorting, and pagination
   */
  async getTurfs(req, res) {
    try {
      const {
        sport,
        city,
        location,
        search,
        q,
        minPrice,
        maxPrice,
        sort,
        limit = 50,
        cursor,
      } = req.query;

      const take = Math.min(Number(limit) || 50, 100);
      const searchTerm = (search || q || '').trim();
      const locationTerm = (location || city || '').trim();

      // Base query: Return active and pending turfs (exclude suspended, inactive, deleted)
      const where = {
        status: { in: ['active', 'pending'] },
      };

      // City / Location filter
      if (locationTerm && locationTerm.toLowerCase() !== 'current location') {
        const cleanLoc = locationTerm.split(',')[0].trim();
        if (cleanLoc) {
          where.OR = [
            { city: { contains: cleanLoc, mode: 'insensitive' } },
            { name: { contains: cleanLoc, mode: 'insensitive' } },
            { address: { contains: cleanLoc, mode: 'insensitive' } },
          ];
        }
      }

      // Keyword Search filter
      if (searchTerm) {
        const searchConditions = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ];
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            { OR: searchConditions },
          ];
          delete where.OR;
        } else {
          where.OR = searchConditions;
        }
      }

      // Sport filter (PostgreSQL String[] column)
      if (sport && String(sport).toLowerCase() !== 'all') {
        where.sports = {
          has: String(sport),
        };
      }

      // Price range filter
      if (minPrice || maxPrice) {
        where.pricePerHour = {};
        if (minPrice) where.pricePerHour.gte = Number(minPrice);
        if (maxPrice) where.pricePerHour.lte = Number(maxPrice);
      }

      // Sorting
      let orderBy = { createdAt: 'desc' };
      if (sort === 'topRated') {
        orderBy = { ratingAvg: 'desc' };
      } else if (sort === 'priceLowToHigh') {
        orderBy = { pricePerHour: 'asc' };
      } else if (sort === 'priceHighToLow') {
        orderBy = { pricePerHour: 'desc' };
      }

      // Pagination cursor
      const queryOptions = {
        where,
        orderBy,
        take: take + 1,
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
        turfs: formatted,
      });
    } catch (err) {
      console.error('getTurfs error:', err);
      return sendError(res, 'Failed to fetch turfs', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/turfs/meta/locations
   * Retrieve unique cities and area hubs where active turfs are currently located
   */
  async getTurfLocations(req, res) {
    try {
      const turfs = await prisma.turf.findMany({
        where: { status: 'active' },
        select: {
          id: true,
          city: true,
          location: true,
          name: true,
        },
      });

      const locationMap = new Map();

      for (const t of turfs) {
        const city = t.city || t.location?.city || 'Chennai';
        const address = t.location?.address || '';

        let area = city;
        if (address) {
          const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
          if (parts.length > 1) {
            area = parts[parts.length - 2] || parts[0];
          }
        }

        const key = `${city}_${area}`.toLowerCase();
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            id: `loc_${key.replace(/[^a-z0-9]/g, '_')}`,
            name: area,
            city,
            address: address || `${area}, ${city}`,
            count: 0,
          });
        }
        locationMap.get(key).count += 1;
      }

      // Include city hubs
      for (const t of turfs) {
        const city = t.city || t.location?.city;
        if (city) {
          const cityKey = `city_${city}`.toLowerCase();
          if (!locationMap.has(cityKey)) {
            const count = turfs.filter((item) => (item.city || item.location?.city || '').toLowerCase() === city.toLowerCase()).length;
            if (count > 0) {
              locationMap.set(cityKey, {
                id: `loc_${cityKey}`,
                name: city,
                city,
                address: `${city}, Tamil Nadu`,
                count,
              });
            }
          }
        }
      }

      const locations = Array.from(locationMap.values()).filter((l) => l.count > 0);
      locations.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      const cities = Array.from(new Set(turfs.map((t) => t.city).filter(Boolean)));

      return sendSuccess(res, {
        locations,
        totalTurfs: turfs.length,
        cities,
      });
    } catch (err) {
      console.error('getTurfLocations error:', err);
      return sendError(res, 'Failed to fetch turf locations', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/turfs/:turfId
   * Turf detail with Redis caching
   */
  async getTurfById(req, res) {
    try {
      const { turfId } = req.params;
      const cacheKey = `turf:${turfId}`;

      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return sendSuccess(res, { turf: cached });
      }

      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
      });

      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      const formatted = formatTurf(turf);
      await cacheService.set(cacheKey, formatted, 300);

      return sendSuccess(res, { turf: formatted });
    } catch (err) {
      console.error('getTurfById error:', err);
      return sendError(res, 'Failed to fetch turf details', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/turfs/:turfId/slots?date=YYYY-MM-DD
   */
  async getAvailableSlots(req, res) {
    try {
      const { turfId } = req.params;
      const { date } = req.query;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendError(res, 'Valid date parameter in YYYY-MM-DD format is required', 400, 'INVALID_DATE');
      }

      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
      });

      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'TURF_NOT_FOUND');
      }

      const slotConfig = turf.slotConfig || { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 };
      const baseRate = Number(turf.pricePerHour ?? turf.price ?? 500);

      // Read slot overrides from Postgres slot_overrides table
      let slotOverrides = { blockedSlots: [], priceOverrides: {} };
      try {
        const override = await prisma.slotOverride.findUnique({
          where: { turfId_date: { turfId, date } },
        });
        if (override) {
          slotOverrides = {
            blockedSlots: Array.isArray(override.blockedSlots) ? override.blockedSlots : [],
            priceOverrides: (override.priceOverrides && typeof override.priceOverrides === 'object') ? override.priceOverrides : {},
          };
        }
      } catch (err) {
        console.warn('Error reading slot overrides:', err.message);
      }

      const courtCount = turf.courtCount || 1;
      const activeBookings = await bookingService.activeForSlot(turfId, date);

      const slots = [];
      const [openH, openM] = (slotConfig.openTime || '06:00').split(':').map(Number);
      const [closeH, closeM] = (slotConfig.closeTime || '23:00').split(':').map(Number);
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

        const isBlocked = (slotOverrides.blockedSlots || []).includes(slotKey) || (slotOverrides.blockedSlots || []).includes(startTime);
        const bookedCourts = activeBookings.filter((b) => b.startTime === startTime).length;
        const isBooked = bookedCourts >= courtCount;

        let price = baseRate;
        if (slotOverrides.priceOverrides && slotOverrides.priceOverrides[slotKey]) {
          price = Number(slotOverrides.priceOverrides[slotKey]);
        } else if (slotOverrides.priceOverrides && slotOverrides.priceOverrides[startTime]) {
          price = Number(slotOverrides.priceOverrides[startTime]);
        }

        slots.push({
          slotKey,
          startTime,
          endTime,
          start: startTime,
          end: endTime,
          price,
          available: !isBlocked && !isBooked,
          isBlocked,
          isBooked,
        });

        current = next;
      }

      return sendSuccess(res, {
        turfId,
        date,
        slots,
      });
    } catch (err) {
      console.error('getAvailableSlots error:', err);
      return sendError(res, 'Failed to fetch available slots', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/turfs/:turfId/wishlist
   */
  async toggleWishlist(req, res) {
    try {
      const { turfId } = req.params;
      const { uid } = req.user;

      const existingWishlist = await prisma.wishlistItem.findUnique({
        where: {
          userId_turfId: {
            userId: uid,
            turfId,
          },
        },
      });

      let isWishlisted = false;

      if (existingWishlist) {
        await prisma.wishlistItem.delete({
          where: {
            userId_turfId: {
              userId: uid,
              turfId,
            },
          },
        });
        isWishlisted = false;
      } else {
        await prisma.wishlistItem.create({
          data: {
            userId: uid,
            turfId,
          },
        });
        isWishlisted = true;
      }

      const allWishlist = await prisma.wishlistItem.findMany({
        where: { userId: uid },
        select: { turfId: true },
      });

      const wishlist = allWishlist.map((w) => w.turfId);

      return sendSuccess(res, {
        turfId,
        isWishlisted,
        wishlist,
      });
    } catch (err) {
      console.error('toggleWishlist error:', err);
      return sendError(res, 'Failed to toggle wishlist', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * GET /api/v1/turfs/:turfId/reviews
   */
  async getTurfReviews(req, res) {
    try {
      const { turfId } = req.params;
      const { limit = 20, cursor } = req.query;
      const take = Math.min(Number(limit) || 20, 50);

      const queryOptions = {
        where: {
          turfId,
          hidden: false,
        },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }

      const reviews = await prisma.review.findMany(queryOptions);

      let nextCursor = null;
      if (reviews.length > take) {
        const nextItem = reviews.pop();
        nextCursor = nextItem.id;
      }

      const formatted = reviews.map((r) => ({
        id: r.id,
        _id: r.id,
        bookingId: r.bookingId,
        turfId: r.turfId,
        userId: r.userId,
        userName: r.userName,
        userPhoto: r.userPhoto,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: {
          name: r.userName,
          avatar: r.userPhoto,
        },
      }));

      return sendPaginated(res, formatted, nextCursor, { count: formatted.length });
    } catch (err) {
      console.error('getTurfReviews error:', err);
      return sendError(res, 'Failed to fetch reviews', 500, 'FETCH_FAILED');
    }
  },
};

module.exports = turfController;
