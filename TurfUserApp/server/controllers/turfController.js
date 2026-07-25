const asyncHandler = require('express-async-handler');
const Turf = require('../models/Turf');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { VendorSubscription } = require('../models/Subscription'); // ── ADDED: needed for plan-based turf limit check
const { addMinutesToTime, timeToMinutes } = require('../utils/helpers');

// ── FIX: Base URL for converting relative image paths (stored in DB as
// "uploads/turfs/images-xxx.jpg") into full URLs the mobile app can load.
// Set BASE_URL in your .env for both dev and production.
const BASE_URL = process.env.BASE_URL || 'http://10.153.201.246:5000'; // ⚠️ must include http:// prefix

// ── FIX: Helper to convert a turf's image paths (and any other image fields)
// into full URLs. Handles Windows-style backslashes too (\ -> /).
const withFullImageUrls = (turfObj) => {
  const fixPath = (p) => {
    if (!p) return p;
    if (p.startsWith('http://') || p.startsWith('https://')) return p; // already full URL

    let cleanPath = p.replace(/\\/g, '/'); // normalize Windows backslashes

    // ── FIX: some records (e.g. logo) still have the OLD absolute path saved
    // before the normalizePath() fix, e.g.
    // "E:/TurfApp/.../server/uploads/turfs/logo-xxx.jpg". Extract just the
    // "uploads/..." portion so we don't end up with BASE_URL + a full
    // Windows filesystem path glued together.
    const idx = cleanPath.toLowerCase().lastIndexOf('/uploads/');
    if (idx !== -1) {
      cleanPath = cleanPath.slice(idx + 1); // keep from "uploads/..." onward
    } else {
      cleanPath = cleanPath.replace(/^\/+/, ''); // just strip any leading slash
    }

    return `${BASE_URL}/${cleanPath}`;
  };

  return {
    ...turfObj,
    images: Array.isArray(turfObj.images) ? turfObj.images.map(fixPath) : turfObj.images,
    logo: fixPath(turfObj.logo), // ── FIX: logo was never converted, so ExploreScreen row icon couldn't load it
  };
};

// @desc    Get all turfs with search, filter, sort
// @route   GET /api/turfs?search=&sport=&city=&minPrice=&maxPrice=&sort=&timeOfDay=&minRating=
// @access  Public
const getTurfs = asyncHandler(async (req, res) => {
  const { search, sport, city, location, minPrice, maxPrice, sort, timeOfDay, minRating } = req.query;

  // ── FIX: status enum-ல 'Approved' இல்லை — 'active' மட்டும் use பண்ணு ──
  const query = { isActive: true, status: 'active' };

  // ── FIX: search (turf name/sport) மற்றும் location (Google Places-ல் select
  // பண்ண எந்த city/area/state/pincode ஆனாலும்) இரண்டும் ஒரே சமயம் வரலாம்.
  // Both individually assign to query.$or before this would OVERWRITE one
  // another, so both are collected into query.$and instead — each condition
  // ($or block) applies independently and AND-ed together. ──
  const andConditions = [];

  if (search) {
    andConditions.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { sports: { $regex: search, $options: 'i' } },
      ],
    });
  }

  // ── FIX: global location search — LocationScreen sends whatever the user
  // picked (a full city like "Chennai", a locality like "Anna Nagar", or a
  // pincode). We don't know in advance which turf field that text matches,
  // so we check address, city, state and pincode together. This is what
  // makes "search Chennai → show turfs whose location contains Chennai in
  // ANY of these fields" work, instead of only matching an exact city field. ──
  if (location) {
    andConditions.push({
      $or: [
        { 'location.address': { $regex: location, $options: 'i' } },
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } },
        { 'location.pincode': { $regex: location, $options: 'i' } },
      ],
    });
  }

  if (andConditions.length) query.$and = andConditions;

  if (sport) query.sports = { $in: [new RegExp(`^${sport}$`, 'i')] };
  // city filter chip (from getFilterMeta) stays exact-ish, kept separate from `location`
  if (city) query['location.city'] = { $regex: city, $options: 'i' };
  if (minPrice || maxPrice) {
    query.pricePerHour = {};
    if (minPrice) query.pricePerHour.$gte = Number(minPrice);
    if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
  }
  if (minRating) query.rating = { $gte: Number(minRating) };

  if (timeOfDay) {
    const windows = {
      morning:   ['06:00', '12:00'],
      afternoon: ['12:00', '16:00'],
      evening:   ['16:00', '20:00'],
      night:     ['20:00', '24:00'],
    };
    const w = windows[timeOfDay.toLowerCase()];
    if (w) {
      query['operatingHours.open']  = { $lte: w[1] };
      query['operatingHours.close'] = { $gte: w[0] };
    }
  }

  let sortOption = { rating: -1, createdAt: -1 };
  if (sort === 'priceLowToHigh') sortOption = { pricePerHour: 1 };
  if (sort === 'priceHighToLow') sortOption = { pricePerHour: -1 };
  if (sort === 'topRated')       sortOption = { rating: -1 };

  const turfs = await Turf.find(query).populate('vendor', 'name phone').sort(sortOption);

  // ── FIX: convert relative image paths to full URLs before sending ──
  const fixedTurfs = turfs.map((t) => withFullImageUrls(t.toObject()));

  res.json({ success: true, count: fixedTurfs.length, turfs: fixedTurfs });
});

// @desc    Get single turf detail (includes real "recently booked" count from DB)
// @route   GET /api/turfs/:id
// @access  Public
const getTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id).populate('vendor', 'name phone email');
  if (!turf) {
    res.status(404);
    throw new Error('Turf not found');
  }

  // "X Teams booked online recently" — count of confirmed/pending bookings
  // for THIS turf made in the last 24 hours.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeBookings = await Booking.countDocuments({
    turf:      turf._id,
    status:    { $in: ['confirmed', 'pending'] },
    createdAt: { $gte: oneDayAgo },
  });

  // ── FIX: convert relative image paths to full URLs before sending ──
  const turfWithImages = withFullImageUrls({ ...turf.toObject(), activeBookings });

  res.json({
    success: true,
    turf: turfWithImages,
  });
});

// @desc    Get available slots for a turf on a given date
// @route   GET /api/turfs/:id/availability?date=YYYY-MM-DD
// @access  Public
const getAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) {
    res.status(400);
    throw new Error('date query param (YYYY-MM-DD) is required');
  }

  const turf = await Turf.findById(req.params.id);
  if (!turf) {
    res.status(404);
    throw new Error('Turf not found');
  }

  // FIX: this used to auto-generate a full-day grid from operatingHours,
  // completely ignoring turf.slots — the exact slots the vendor actually
  // added from the Slot Calendar screen. Now it mirrors the vendor app:
  // ONLY turf.slots (DB-saved) are shown to the customer. A turf with no
  // vendor-added slots correctly shows "No slots available" instead of a
  // fake auto-generated day.
  const slots = (turf.slots || [])
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((s) => ({ start: s.startTime, end: s.endTime }));

  // Exclude slots that overlap with active bookings
  // FIX: 'accepted' status ondrume illa — 'confirmed' matum use pannunga
  const activeBookings = await Booking.find({
    turf:   turf._id,
    date,
    status: { $in: ['confirmed', 'pending'] },
  });

  const blockedByBooking = activeBookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end:   timeToMinutes(b.endTime),
  }));

  // FIX: also exclude slots the vendor manually froze for this exact date
  // from the Slot Calendar screen (turf.blockedSlots) — previously these
  // were never checked, so a frozen slot still showed as bookable here.
  const frozenStarts = new Set(
    (turf.blockedSlots || [])
      .filter((b) => b.date === date)
      .map((b) => b.startTime)
  );

  const result = slots.map((s) => {
    const sMin      = timeToMinutes(s.start);
    const eMin      = timeToMinutes(s.end);
    const isBlocked = blockedByBooking.some((b) => sMin < b.end && eMin > b.start);
    const isFrozen  = frozenStarts.has(s.start);
    return { ...s, available: !isBlocked && !isFrozen };
  });

  res.json({ success: true, date, slots: result });
});

// @desc    Get reviews for a turf
// @route   GET /api/turfs/:id/reviews
// @access  Public
const getTurfReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ turf: req.params.id })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: reviews.length, reviews });
});

// @desc    Create a turf (vendor)
// @route   POST /api/turfs
// @access  Private/Vendor
const createTurf = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;

  // ── ADDED: enforce subscription plan's turf limit (e.g. Basic=1, Premium=5) ──

  // 1. Vendor's active subscription eduthukanum
  const subscription = await VendorSubscription.findOne({
    vendor: vendorId,
    isActive: true,
    expiryDate: { $gte: new Date() },
  }).populate('plan');

  if (!subscription) {
    res.status(403);
    throw new Error('No active subscription found. Please subscribe to a plan to add turfs.');
  }

  // 2. Vendor ippo evlo turfs add pannirukaru nu count pannunga
  const currentTurfCount = await Turf.countDocuments({ vendor: vendorId });

  // 3. Plan's maxTurfs limit ku mela poirika nu check pannunga
  // ── ADDED: maxTurfs === -1 means "Unlimited turfs" (e.g. Premium plan) — skip the limit check ──
  const isUnlimited = subscription.plan.maxTurfs === -1;

  if (!isUnlimited && currentTurfCount >= subscription.plan.maxTurfs) {
    res.status(403);
    throw new Error(
      `Your ${subscription.plan.name} plan allows only ${subscription.plan.maxTurfs} turf(s). Please upgrade your plan to add more turfs.`
    );
  }

  // 4. Limit ku ulla irundha, turf create pannunga
  const turf = await Turf.create({ ...req.body, vendor: vendorId });
  res.status(201).json({ success: true, turf });
});

// @desc    Get distinct sports & cities for filter chips
// @route   GET /api/turfs/meta/filters
// @access  Public
const getFilterMeta = asyncHandler(async (req, res) => {
  const sports = await Turf.distinct('sports',        { isActive: true, status: 'active' });
  const cities = await Turf.distinct('location.city', { isActive: true, status: 'active' });
  res.json({ success: true, sports, cities });
});

module.exports = { getTurfs, getTurf, getAvailability, getTurfReviews, createTurf, getFilterMeta };