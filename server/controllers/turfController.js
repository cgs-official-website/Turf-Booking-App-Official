const prisma = require('../config/prisma');
const bookingService = require('../services/bookingService');
const cacheService = require('../services/cacheService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getChunkPrice, getHourlyRate, resolveBestOffer } = require('../utils/pricing');

/**
 * Standardize turf entity shape across UserApp, VendorApp, and AdminPanel
 */
const to12h = (t24) => {
  if (!t24) return undefined;
  const [h, m] = String(t24).split(':').map(Number);
  if (Number.isNaN(h)) return undefined;
  const hh = h % 24;
  const ap = hh >= 12 ? 'PM' : 'AM';
  return `${String(hh % 12 || 12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${ap}`;
};

const getLocalDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function formatTurf(t) {
  if (!t) return null;
  const baseRate = Number(t.pricePerHour || 0);
  const city = t.city || t.location?.city || '';
  const address = t.location?.address || t.address || city;
  const sports = Array.isArray(t.sports) ? t.sports : (Array.isArray(t.sportTypes) ? t.sportTypes : []);
  const reviewsCount = typeof t.reviewsCount === 'number' ? t.reviewsCount : (Number(t.rating?.count) || 0);
  const ratingAvg = reviewsCount === 0 ? 0 : (typeof t.ratingAvg === 'number' ? t.ratingAvg : (Number(t.rating?.avg) || 0));
  const images = Array.isArray(t.images) ? t.images : [];
  const lat = t.latitude ?? t.lat ?? (t.location?.geo?.lat || t.location?.lat || null);
  const lng = t.longitude ?? t.lng ?? (t.location?.geo?.lng || t.location?.lng || null);
  const cfg = (t.slotConfig && typeof t.slotConfig === 'object') ? t.slotConfig : {};
  const pricing = cfg.pricing || {};
  const pincode = t.location?.pincode || '';

  const todayStr = getLocalDateStr();
  const now = new Date();
  const dayNum = now.getDay();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDayName = dayNames[dayNum];

  const activeOffers = (Array.isArray(t.offers) ? t.offers : []).filter((o) => {
    if (!o || o.status !== 'active') return false;
    const startStr = String(o.startDate || '').slice(0, 10);
    const endStr = String(o.endDate || o.startDate || '').slice(0, 10);
    if (todayStr < startStr || todayStr > endStr) return false;

    if (o.scope === 'weekdays') {
      const weekdays = Array.isArray(o.weekdays) ? o.weekdays : [];
      return weekdays.some((w) => {
        if (typeof w === 'number') return w === dayNum;
        const str = String(w).trim().toLowerCase();
        return str === todayDayName || str === String(dayNum);
      });
    }

    return true;
  });

  let activeOffer = null;
  if (activeOffers.length > 0) {
    const top = activeOffers[0];
    const isPct = top.discountType === 'percentage';
    const val = Number(top.discountValue);
    const discountLabel = isPct ? `${Math.round(val)}% OFF` : `₹${Math.round(val)}/hr`;

    // Only apply the discount to the displayed general starting rate if the scope covers all slots today
    // (i.e. 'day', 'date_range', or matching 'weekdays'). For 'slot' scope, show the badge, but don't cross out the base rate.
    const qualifiesForGeneralPrice = top.scope !== 'slot';
    const calculatedOfferPrice = isPct
      ? Math.max(1, Math.round(baseRate * (1 - val / 100)))
      : Math.max(1, Math.round(val));

    activeOffer = {
      id: top.id,
      title: top.title,
      description: top.description || '',
      discountType: top.discountType,
      discountValue: val,
      discountLabel,
      offerPrice: qualifiesForGeneralPrice ? calculatedOfferPrice : null,
      saving: qualifiesForGeneralPrice ? Math.max(0, baseRate - calculatedOfferPrice) : 0,
      scope: top.scope,
      startDate: top.startDate,
      endDate: top.endDate,
      applicableSlots: Array.isArray(top.applicableSlots) ? top.applicableSlots : [],
      weekdays: Array.isArray(top.weekdays) ? top.weekdays : [],
      bannerUrl: top.bannerUrl || null,
      qualifiesForGeneralPrice,
    };
  }

  return {
    id: t.id,
    _id: t.id,
    name: t.name,
    vendorId: t.vendorId,
    vendor: t.vendor || undefined,
    description: t.description || '',
    city,
    address,
    latitude: lat,
    longitude: lng,
    lat,
    lng,
    location: {
      city,
      address,
      pincode,
      geo: (lat && lng) ? { lat, lng } : (t.location?.geo || null),
    },
    sportTypes: sports,
    sports,
    pricePerHour: baseRate,
    price: baseRate,
    pricing: {
      baseRate,
      weekendRate: Number(pricing.weekend || baseRate),
      peakHourRate: Number(pricing.evening || baseRate),
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
    logo: t.logo || '',
    pinCode: pincode,
    openingTime: to12h(cfg.openTime || '06:00'),
    closingTime: to12h(cfg.closeTime || '23:00'),
    slotDuration: String(cfg.slotDurationMins || 60),
    basePrice: baseRate,
    eveningPrice: pricing.evening || null,
    weekendPrice: pricing.weekend || null,
    weekendEveningPrice: pricing.weekendEvening || null,
    ballPrice: pricing.ball || null,
    amenities: Array.isArray(t.amenities) ? t.amenities : [],
    slotConfig: t.slotConfig || { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 },
    rejectionReason: t.rejectionReason || null,
    reviewedAt: t.reviewedAt || null,
    activeOffer,
    hasOffer: !!activeOffer,
    offerPrice: activeOffer ? activeOffer.offerPrice : null,
    offerDiscount: activeOffer ? activeOffer.discountLabel : null,
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

      // Base query: Return active eligible turfs only (exclude pending, suspended, inactive)
      const where = {
        status: 'active',
      };

      // City / Location filter
      if (locationTerm) {
        const locLower = locationTerm.toLowerCase().trim();
        const ignores = ['current location', 'select location', 'locating...', 'locating', 'all', 'all locations', 'undefined', 'null'];
        if (!ignores.includes(locLower)) {
          const parts = locationTerm.split(',').map((p) => p.trim()).filter(Boolean);
          const conditions = [];
          for (const part of parts) {
            if (part && !ignores.includes(part.toLowerCase())) {
              conditions.push({ city: { contains: part, mode: 'insensitive' } });
              conditions.push({ name: { contains: part, mode: 'insensitive' } });

            }
          }
          if (conditions.length > 0) {
            where.OR = conditions;
          }
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

      // Sport filter (Case-insensitive matching across sport arrays)
      if (sport && String(sport).toLowerCase() !== 'all') {
        const sClean = String(sport).trim();
        const sLower = sClean.toLowerCase();
        const sCap = sClean.charAt(0).toUpperCase() + sClean.slice(1).toLowerCase();
        const sUpper = sClean.toUpperCase();

        const sportConditions = [
          { sports: { hasSome: [sClean, sLower, sCap, sUpper] } }
        ];
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: sportConditions }];
          delete where.OR;
        } else {
          where.OR = sportConditions;
        }
      }

      // Price range filter
      if (minPrice || maxPrice) {
        where.pricePerHour = {};
        if (minPrice) where.pricePerHour.gte = Number(minPrice);
        if (maxPrice) where.pricePerHour.lte = Number(maxPrice);
      }

      // Sorting (Default: High rating first)
      let orderBy = [{ ratingAvg: 'desc' }, { createdAt: 'desc' }];
      if (sort === 'topRated') {
        orderBy = [{ ratingAvg: 'desc' }, { createdAt: 'desc' }];
      } else if (sort === 'priceLowToHigh') {
        orderBy = [{ pricePerHour: 'asc' }, { ratingAvg: 'desc' }];
      } else if (sort === 'priceHighToLow') {
        orderBy = [{ pricePerHour: 'desc' }, { ratingAvg: 'desc' }];
      }

      // Pagination cursor
      const queryOptions = {
        where,
        orderBy,
        take: take + 1,
        include: {
          offers: {
            where: { status: 'active' },
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

      let formatted = turfs.map(formatTurf);

      if (sport && String(sport).toLowerCase() !== 'all') {
        const target = String(sport).trim().toLowerCase();
        formatted = formatted.filter((t) => {
          const sList = Array.isArray(t.sports) ? t.sports : (Array.isArray(t.sportTypes) ? t.sportTypes : []);
          return sList.some((s) => String(s).trim().toLowerCase().includes(target) || target.includes(String(s).trim().toLowerCase()));
        });
      }

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
      const cacheKey = 'turfs_meta_locations';
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return sendSuccess(res, cached);
      }

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

      const responsePayload = {
        locations,
        totalTurfs: turfs.length,
        cities,
      };
      await cacheService.set(cacheKey, responsePayload, 600); // 10 mins cache

      return sendSuccess(res, responsePayload);
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
      const bypassCache = req.query.refresh === 'true' || req.headers['cache-control'] === 'no-cache';
      const cacheKey = `turf:${turfId}`;

      let turf = !bypassCache ? await cacheService.get(cacheKey) : null;
      if (!turf) {
        turf = await prisma.turf.findUnique({
          where: { id: turfId },
          include: {
            offers: {
              where: { status: 'active' },
            },
          },
        });

        if (!turf) {
          return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
        }

        await cacheService.set(cacheKey, turf, 30);
      }

      const formatted = formatTurf(turf);
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

      // Read active offers for this turf and date
      let activeOffers = [];
      try {
        activeOffers = await prisma.offer.findMany({
          where: {
            turfId,
            status: 'active',
            startDate: { lte: date },
            endDate: { gte: date },
          },
        });
      } catch (err) {
        console.warn('Error reading active offers in getAvailableSlots:', err.message);
      }

      const courtCount = turf.courtCount || 1;
      const activeBookings = await bookingService.activeForSlot(turfId, date);

      const slots = [];
      const [openH, openM] = (slotConfig.openTime || '06:00').split(':').map(Number);
      const [closeH, closeM] = (slotConfig.closeTime || '23:00').split(':').map(Number);
      const duration = Number(slotConfig.slotDurationMins) || 60;

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
        const bookedCourts = activeBookings.filter((b) => {
          const bEnd = b.endTime || `${pad(Number(b.startTime.split(':')[0]) + 1)}:${b.startTime.split(':')[1] || '00'}`;
          return b.startTime < endTime && bEnd > startTime;
        }).length;
        const isBooked = bookedCourts >= courtCount;

        const regularRate = Math.round(getHourlyRate(turf, date, startTime));
        const regularPrice = Math.round((regularRate * duration) / 60);

        const bestOffer = resolveBestOffer(turf, date, startTime, endTime, activeOffers);
        const price = Math.round(getChunkPrice(turf, date, startTime, endTime, slotOverrides.priceOverrides, activeOffers));
        const hasSlotOverride = slotOverrides.priceOverrides && (slotOverrides.priceOverrides[slotKey] !== undefined || slotOverrides.priceOverrides[startTime] !== undefined);
        const hasOffer = !hasSlotOverride && !!bestOffer && price < regularPrice;

        slots.push({
          slotKey,
          startTime,
          endTime,
          start: startTime,
          end: endTime,
          price,
          regularPrice,
          rate: regularRate,
          durationMins: duration,
          available: !isBlocked && !isBooked,
          isBlocked,
          isBooked,
          hasOffer,
          offer: hasOffer && bestOffer ? {
            id: bestOffer.offer.id,
            title: bestOffer.offer.title,
            discountType: bestOffer.offer.discountType,
            discountValue: Number(bestOffer.offer.discountValue),
            discountPercent: bestOffer.discountPercent,
            saving: bestOffer.saving,
            bannerUrl: bestOffer.offer.bannerUrl,
          } : null,
        });

        current = next;
      }

      return sendSuccess(res, {
        turfId,
        date,
        slots,
        activeOffers: activeOffers.map((o) => ({
          id: o.id,
          title: o.title,
          description: o.description,
          discountType: o.discountType,
          discountValue: Number(o.discountValue),
          scope: o.scope,
          startDate: o.startDate,
          endDate: o.endDate,
          bannerUrl: o.bannerUrl,
        })),
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
