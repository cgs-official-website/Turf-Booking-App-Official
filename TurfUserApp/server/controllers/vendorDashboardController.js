const Booking = require('../models/Booking');
const Turf = require('../models/Turf');

// GET /api/vendor/dashboard/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const turfs = await Turf.find({ vendor: req.vendor._id }).select('_id slots');
    const turfIds = turfs.map((t) => t._id);

    // NOTE: booking status is 'confirmed' (not 'accepted') — see the FIX
    // comment in models/Booking.js. This was previously querying 'accepted'
    // here, which never matched anything, so "Accepted" always showed 0.
    const [totalBookings, confirmedBookings, pendingBookings, rejectedBookings] = await Promise.all([
      Booking.countDocuments({ turf: { $in: turfIds } }),
      Booking.countDocuments({ turf: { $in: turfIds }, status: 'confirmed' }),
      Booking.countDocuments({ turf: { $in: turfIds }, status: 'pending' }),
      Booking.countDocuments({ turf: { $in: turfIds }, status: 'rejected' }),
    ]);

    // Revenue from confirmed bookings
    const revenueAgg = await Booking.aggregate([
      { $match: { turf: { $in: turfIds }, status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Revenue lost to rejected bookings — shown alongside the Rejected count
    const rejectedRevenueAgg = await Booking.aggregate([
      { $match: { turf: { $in: turfIds }, status: 'rejected' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const rejectedRevenue = rejectedRevenueAgg[0]?.total || 0;

    // Today's bookings
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayBookings = await Booking.countDocuments({
      turf: { $in: turfIds },
      createdAt: { $gte: startOfDay },
    });

    // Slot counts across all of this vendor's turfs
    let totalSlots = 0;
    let availableSlots = 0;
    turfs.forEach((t) => {
      const slots = t.slots || [];
      totalSlots += slots.length;
      availableSlots += slots.filter((s) => s.isAvailable).length;
    });

    // Average rating across turfs
    const ratingAgg = await Turf.aggregate([
      { $match: { vendor: req.vendor._id } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);
    const avgRating = ratingAgg[0]?.avg || null;

    res.json({
      success: true,
      stats: {
        totalTurfs: turfs.length,
        totalBookings,
        confirmedBookings,
        // Kept as an alias for a little while in case anything else on the
        // frontend still reads `acceptedBookings` — remove once confirmed
        // nothing depends on the old name.
        acceptedBookings: confirmedBookings,
        pendingBookings,
        rejectedBookings,
        rejectedRevenue,
        totalRevenue,
        todayBookings,
        totalSlots,
        availableSlots,
        avgRating,
      },
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/dashboard/revenue?period=monthly
exports.getRevenue = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const turfs = await Turf.find({ vendor: req.vendor._id }).select('_id');
    const turfIds = turfs.map((t) => t._id);

    let groupBy;
    if (period === 'weekly') {
      groupBy = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
    } else if (period === 'yearly') {
      groupBy = { year: { $year: '$createdAt' } };
    } else {
      // monthly (default)
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    }

    const revenue = await Booking.aggregate([
      { $match: { turf: { $in: turfIds }, status: 'confirmed' } },
      { $group: { _id: groupBy, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    res.json({ success: true, revenue });
  } catch (err) {
    console.error('getRevenue error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};