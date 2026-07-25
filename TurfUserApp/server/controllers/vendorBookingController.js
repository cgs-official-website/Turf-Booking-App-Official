const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const Notification = require('../models/Notification');

// GET /api/vendor/bookings
exports.getBookings = async (req, res) => {
  try {
    const turfs = await Turf.find({ vendor: req.vendor._id }).select('_id');
    const turfIds = turfs.map((t) => t._id);

    const filter = { turf: { $in: turfIds } };
    if (req.query.turfId) filter.turf = req.query.turfId;
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate('user', 'name email phone')
      .populate('turf', 'name location pricePerHour')
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (err) {
    console.error('getBookings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/bookings/:id
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('turf', 'name location pricePerHour vendor');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.turf.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error('getBookingById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/vendor/bookings/:id/accept
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('turf', 'vendor name')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.turf.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}` });
    }

    booking.status = 'confirmed';
    booking.acceptedAt = new Date();
    await booking.save();

    await Notification.create({
      user: booking.user._id,
      title: 'Booking Confirmed! ✅',
      message: `Your booking at ${booking.turf.name} from ${booking.startTime} to ${booking.endTime} has been confirmed.`,
      type: 'BookingConfirmed',
      booking: booking._id,
    });

    res.json({ success: true, message: 'Booking accepted', booking });
  } catch (err) {
    console.error('acceptBooking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/vendor/bookings/:id/reject
exports.rejectBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('turf', 'vendor name')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.turf.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}` });
    }

    booking.status = 'rejected';
    booking.rejectionReason = reason || 'Rejected by vendor';
    booking.rejectedAt = new Date();
    await booking.save();

    await Notification.create({
      user: booking.user._id,
      title: 'Booking Rejected ❌',
      message: `Your booking at ${booking.turf.name} from ${booking.startTime} to ${booking.endTime} was rejected. Reason: ${booking.rejectionReason}`,
      type: 'BookingRejected',
      booking: booking._id,
    });

    res.json({ success: true, message: 'Booking rejected', booking });
  } catch (err) {
    console.error('rejectBooking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};