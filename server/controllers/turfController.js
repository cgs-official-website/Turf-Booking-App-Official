const firestoreService = require('../services/firestoreService');
const cacheService = require('../services/cacheService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const DEFAULT_TURFS = [
  {
    id: 'turf_thunder_arena_perundurai',
    name: 'Thunder Arena Turf',
    city: 'Perundurai',
    address: 'Near Bus Stand, NH-544 Highway, Perundurai, Erode',
    sportTypes: ['Football', 'Cricket', 'Badminton'],
    pricing: { baseRate: 800, weekendRate: 1000, peakHourRate: 1200 },
    images: [
      'https://images.unsplash.com/photo-1529900241452-f47285514f7b?w=800',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    ],
    amenities: ['FIFA Approved Turf', 'Floodlights', 'Locker Room', 'Parking', 'Mineral Water'],
    rating: { avg: 4.9, count: 64 },
    status: 'active',
    slotConfig: { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 },
    createdAt: new Date('2026-01-15T08:00:00.000Z').toISOString(),
  },
  {
    id: 'turf_kickoff_sports_anna_nagar',
    name: 'KickOff Sports Arena',
    city: 'Chennai',
    address: '2nd Avenue, Anna Nagar East, Chennai',
    sportTypes: ['Football', 'Cricket'],
    pricing: { baseRate: 1200, weekendRate: 1500, peakHourRate: 1600 },
    images: [
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
      'https://images.unsplash.com/photo-1529900241452-f47285514f7b?w=800',
    ],
    amenities: ['Floodlights', 'Dugout', 'Cafeteria', 'Parking'],
    rating: { avg: 4.8, count: 92 },
    status: 'active',
    slotConfig: { openTime: '05:00', closeTime: '23:00', slotDurationMins: 60 },
    createdAt: new Date('2026-01-10T08:00:00.000Z').toISOString(),
  },
  {
    id: 'turf_champions_kodambakkam',
    name: 'Champions Multi-Turf Arena',
    city: 'Chennai',
    address: 'Arcot Road, Near Power House, Kodambakkam, Chennai',
    sportTypes: ['Football', 'Badminton', 'Tennis'],
    pricing: { baseRate: 900, weekendRate: 1100, peakHourRate: 1300 },
    images: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
    ],
    amenities: ['Badminton Courts', 'Tennis Court', 'Floodlights', 'Showers'],
    rating: { avg: 4.7, count: 53 },
    status: 'active',
    slotConfig: { openTime: '06:00', closeTime: '22:00', slotDurationMins: 60 },
    createdAt: new Date('2026-01-20T08:00:00.000Z').toISOString(),
  },
  {
    id: 'turf_apex_coimbatore',
    name: 'Apex Sports Arena',
    city: 'Coimbatore',
    address: 'Avinashi Road, Near Peelamedu, Coimbatore',
    sportTypes: ['Football', 'Cricket', 'Volleyball'],
    pricing: { baseRate: 1000, weekendRate: 1200, peakHourRate: 1400 },
    images: [
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
    ],
    amenities: ['Pro Artificial Turf', 'Floodlights', 'Equipment Rental', 'Parking'],
    rating: { avg: 4.9, count: 71 },
    status: 'active',
    slotConfig: { openTime: '06:00', closeTime: '23:30', slotDurationMins: 60 },
    createdAt: new Date('2026-02-01T08:00:00.000Z').toISOString(),
  },
  {
    id: 'turf_greenfield_erode',
    name: 'Greenfield Cricket & Football Turf',
    city: 'Erode',
    address: 'Brough Road, Opp. Collectorate, Erode',
    sportTypes: ['Cricket', 'Football'],
    pricing: { baseRate: 750, weekendRate: 950, peakHourRate: 1100 },
    images: [
      'https://images.unsplash.com/photo-1529900241452-f47285514f7b?w=800',
    ],
    amenities: ['Cricket Nets', 'Bowling Machine', 'Floodlights', 'Refreshments'],
    rating: { avg: 4.8, count: 39 },
    status: 'active',
    slotConfig: { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 },
    createdAt: new Date('2026-02-10T08:00:00.000Z').toISOString(),
  },
  {
    id: 'turf_smash_goal_velachery',
    name: 'Smash & Goal Sports Complex',
    city: 'Chennai',
    address: '100 Feet Bypass Road, Velachery, Chennai',
    sportTypes: ['Football', 'Cricket', 'Basketball'],
    pricing: { baseRate: 1100, weekendRate: 1350, peakHourRate: 1500 },
    images: [
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    ],
    amenities: ['Floodlights', 'Basketball Court', 'Changing Rooms', 'Water Dispenser'],
    rating: { avg: 4.9, count: 85 },
    status: 'active',
    slotConfig: { openTime: '05:30', closeTime: '23:00', slotDurationMins: 60 },
    createdAt: new Date('2026-02-15T08:00:00.000Z').toISOString(),
  },
];

let turfsSeeded = false;
async function ensureTurfsExist() {
  if (turfsSeeded) return;
  try {
    const existing = await firestoreService.queryWithCursor('turfs', { limit: 5 });
    if (!existing.items || existing.items.length === 0) {
      for (const t of DEFAULT_TURFS) {
        await firestoreService.setDoc('turfs', t.id, t, true);
      }
    }
    turfsSeeded = true;
  } catch (err) {
    console.warn('Turf auto-seed notice:', err.message);
  }
}

const turfController = {
  /**
   * GET /api/v1/turfs
   * List turfs with smart location ranking, full text search, sport/price filtering, and pagination
   */
  async getTurfs(req, res) {
    await ensureTurfsExist();

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

    const searchTerm = (search || q || '').trim().toLowerCase();
    const locationTerm = (location || city || '').trim().toLowerCase();

    const filters = [
      ['status', '==', 'active'],
    ];

    const result = await firestoreService.queryWithCursor('turfs', {
      filters,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: 100,
      cursor,
    });

    let items = result.items && result.items.length > 0 ? result.items : DEFAULT_TURFS;

    // Standardize all turf fields so UserApp, VendorApp, and AdminPanel consume uniform data
    items = items.map((t) => {
      const cityStr = t.city || t.location?.city || '';
      const addressStr = t.address || t.location?.address || '';
      const sportTypes = Array.isArray(t.sportTypes) && t.sportTypes.length > 0
        ? t.sportTypes
        : (Array.isArray(t.sports) ? t.sports : ['Football', 'Cricket']);
      const baseRate = Number(t.pricing?.baseRate ?? t.price ?? t.pricePerHour ?? 800);
      const images = Array.isArray(t.images) && t.images.length > 0
        ? t.images
        : (t.image ? [t.image] : ['https://images.unsplash.com/photo-1529900241452-f47285514f7b?w=800']);
      const ratingAvg = typeof t.rating === 'object' ? Number(t.rating.avg || 4.8) : (Number(t.rating) || 4.8);
      const ratingCount = typeof t.rating === 'object' ? Number(t.rating.count || 24) : (Number(t.reviewsCount) || 24);

      return {
        ...t,
        _id: t.id || t._id,
        id: t.id || t._id,
        name: t.name || 'Turf Arena',
        city: cityStr,
        address: addressStr,
        location: {
          city: cityStr,
          address: addressStr,
          geo: t.geo || t.location?.geo || null,
        },
        sportTypes,
        sports: sportTypes,
        images,
        image: images[0] || '',
        pricing: t.pricing || { baseRate },
        price: baseRate,
        pricePerHour: baseRate,
        rating: ratingAvg,
        reviewsCount: ratingCount,
        ratingObj: { avg: ratingAvg, count: ratingCount },
        amenities: Array.isArray(t.amenities) ? t.amenities : ['Floodlights', 'Parking', 'Mineral Water'],
        slotConfig: t.slotConfig || { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 },
      };
    });

    // 1. Sport Filter
    if (sport && String(sport).toLowerCase() !== 'all') {
      const targetSport = String(sport).toLowerCase();
      items = items.filter((t) =>
        t.sportTypes.some((s) => s.toLowerCase() === targetSport || s.toLowerCase().includes(targetSport))
      );
    }

    // 2. Price Filter
    if (minPrice || maxPrice) {
      const min = Number(minPrice) || 0;
      const max = Number(maxPrice) || Infinity;
      items = items.filter((t) => t.price >= min && t.price <= max);
    }

    // 3. Search Query Filter (name, sports, city, address, amenities)
    if (searchTerm) {
      items = items.filter((t) => {
        const nameMatch = (t.name || '').toLowerCase().includes(searchTerm);
        const cityMatch = (t.city || '').toLowerCase().includes(searchTerm);
        const addrMatch = (t.address || '').toLowerCase().includes(searchTerm);
        const sportMatch = t.sportTypes.some((s) => s.toLowerCase().includes(searchTerm));
        const amenMatch = (t.amenities || []).some((a) => a.toLowerCase().includes(searchTerm));
        return nameMatch || cityMatch || addrMatch || sportMatch || amenMatch;
      });
    }

    // 4. Location-Based Matching & Intelligent Prioritization
    if (locationTerm && locationTerm !== 'current location') {
      const locTokens = locationTerm
        .split(/[, -]+/)
        .map((tok) => tok.trim())
        .filter((tok) => tok.length >= 2);

      const isLocationMatch = (t) => {
        const c = (t.city || '').toLowerCase();
        const a = (t.address || '').toLowerCase();
        const n = (t.name || '').toLowerCase();
        return locTokens.some((tok) => c.includes(tok) || a.includes(tok) || n.includes(tok) || tok.includes(c));
      };

      const matchedInLocation = items.filter(isLocationMatch);
      const otherLocations = items.filter((t) => !isLocationMatch(t));

      // Put turfs matching the selected location first at top, then list others
      if (matchedInLocation.length > 0) {
        items = [...matchedInLocation, ...otherLocations];
      }
    }

    // 5. Sorting
    if (sort === 'topRated') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'priceLowToHigh') {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === 'priceHighToLow') {
      items.sort((a, b) => b.price - a.price);
    }

    const finalItems = items.slice(0, Number(limit));

    return sendPaginated(res, finalItems, result.nextCursor, {
      count: finalItems.length,
      turfs: finalItems,
    });
  },

  /**
   * GET /api/v1/turfs/meta/locations
   * Retrieve dynamic list of only areas/cities where active turfs are currently located with live counts
   */
  async getTurfLocations(req, res) {
    await ensureTurfsExist();

    const result = await firestoreService.queryWithCursor('turfs', {
      filters: [['status', '==', 'active']],
      limit: 200,
    });

    const turfs = result.items && result.items.length > 0 ? result.items : DEFAULT_TURFS;

    const locationMap = new Map();

    for (const t of turfs) {
      const city = t.city || t.location?.city || 'Chennai';
      const address = t.address || t.location?.address || '';

      // Determine area / name
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

    // Also include primary city-level hubs if distinct
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

    return sendSuccess(res, {
      locations,
      totalTurfs: turfs.length,
      cities: Array.from(new Set(turfs.map((t) => t.city || t.location?.city).filter(Boolean))),
    });
  },

  /**
   * GET /api/v1/turfs/:turfId
   * Turf detail with fallback
   */
  async getTurfById(req, res) {
    const { turfId } = req.params;
    const cacheKey = `turf:${turfId}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, { turf: cached });
    }

    let turf = await firestoreService.getDoc('turfs', turfId);
    if (!turf) {
      turf = DEFAULT_TURFS.find((t) => t.id === turfId);
    }

    if (!turf) {
      return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
    }

    const cityStr = turf.city || turf.location?.city || '';
    const addressStr = turf.address || turf.location?.address || '';
    const sportTypes = Array.isArray(turf.sportTypes) && turf.sportTypes.length > 0
      ? turf.sportTypes
      : (Array.isArray(turf.sports) ? turf.sports : ['Football', 'Cricket']);
    const baseRate = Number(turf.pricing?.baseRate ?? turf.price ?? turf.pricePerHour ?? 800);
    const images = Array.isArray(turf.images) && turf.images.length > 0
      ? turf.images
      : (turf.image ? [turf.image] : ['https://images.unsplash.com/photo-1529900241452-f47285514f7b?w=800']);

    const normalizedTurf = {
      ...turf,
      _id: turf.id || turf._id,
      id: turf.id || turf._id,
      city: cityStr,
      address: addressStr,
      location: {
        city: cityStr,
        address: addressStr,
        geo: turf.geo || turf.location?.geo || null,
      },
      sportTypes,
      sports: sportTypes,
      images,
      image: images[0] || '',
      pricing: turf.pricing || { baseRate },
      price: baseRate,
      pricePerHour: baseRate,
    };

    await cacheService.set(cacheKey, normalizedTurf, 300);
    return sendSuccess(res, { turf: normalizedTurf });
  },

  /**
   * GET /api/v1/turfs/:turfId/slots?date=YYYY-MM-DD
   */
  async getAvailableSlots(req, res) {
    const { turfId } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(res, 'Valid date parameter in YYYY-MM-DD format is required', 400, 'INVALID_DATE');
    }

    let turf = await firestoreService.getDoc('turfs', turfId);
    if (!turf) {
      turf = DEFAULT_TURFS.find((t) => t.id === turfId);
    }

    if (!turf) {
      return sendError(res, 'Turf not found', 404, 'TURF_NOT_FOUND');
    }

    const slotConfig = turf.slotConfig || { openTime: '06:00', closeTime: '23:00', slotDurationMins: 60 };
    const baseRate = turf.pricing?.baseRate || turf.price || 800;

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

    const bookingsResult = await firestoreService.queryWithCursor('bookings', {
      filters: [
        ['turfId', '==', turfId],
        ['date', '==', date],
      ],
      orderByField: null,
      limit: 100,
    });

    const activeBookings = (bookingsResult.items || []).filter((b) =>
      ['reserved', 'pending', 'confirmed'].includes(b.status)
    );

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

    return sendSuccess(res, {
      turfId,
      date,
      slots,
    });
  },

  /**
   * POST /api/v1/turfs/:turfId/wishlist
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
