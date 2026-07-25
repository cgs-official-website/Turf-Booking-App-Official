const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const Booking = require('./models/Booking');           // ✅ NEW: needed for auto-complete job
const { createNotification } = require('./utils/helpers'); // ✅ NEW

dotenv.config();

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded KYC / turf-draft images (logo, cover, product images, GST,
// EB Bill) so the app can actually load them — Turf.images / Turf.logo /
// Vendor.kyc.*.path / Turf.kyc.*Path are all stored as paths relative to
// this 'uploads' folder, e.g. "uploads/kyc/<file>.jpg". They get turned into
// full URLs like http://<host>:5000/uploads/kyc/<file>.jpg on the client
// (see src/api/client.js -> getImageUrl).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── DB Connection ────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/turfbooking')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// ── Existing User Routes ─────────────────────────────────────────────────────
const authRoutes          = require('./routes/authRoutes');
const bookingRoutes       = require('./routes/bookingRoutes');
const turfRoutes          = require('./routes/turfRoutes');
const paymentRoutes       = require('./routes/paymentRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const wishlistRoutes      = require('./routes/wishlistRoutes');
// ❌ reviewRoutes removed — review is handled via POST /api/bookings/:id/review
//    (bookingController.js -> addReview), not a separate /api/reviews route.


app.use('/api/auth',          authRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/turfs',         turfRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wishlist',      wishlistRoutes);


// ── Vendor Routes (NEW) ──────────────────────────────────────────────────────
const vendorAuthRoutes         = require('./routes/vendorAuthRoutes');
const vendorTurfRoutes         = require('./routes/vendorTurfRoutes');
const vendorBookingRoutes      = require('./routes/vendorBookingRoutes');
const vendorDashboardRoutes    = require('./routes/vendorDashboardRoutes');
const vendorSubscriptionRoutes = require('./routes/vendorSubscriptionRoutes');
const reportRoutes             = require('./routes/reportRoutes'); // ✅ NEW: Report an Issue

app.use('/api/vendor/auth',          vendorAuthRoutes);
app.use('/api/vendor/turfs',         vendorTurfRoutes);
app.use('/api/vendor/bookings',      vendorBookingRoutes);
app.use('/api/vendor/dashboard',     vendorDashboardRoutes);
app.use('/api/vendor/subscriptions', vendorSubscriptionRoutes);
app.use('/api/vendor/reports',       reportRoutes); // ✅ NEW
app.use('/api/vendor',               require('./routes/vendorOnboardingRoutes')); // GET /api/vendor/onboarding/status
app.use('/api/places', require('./routes/placesRoutes'));

// ── Super Admin Routes (NEW) ─────────────────────────────────────────────────
// Reviews vendor identity KYC + turf business KYC and approves/rejects them.
// Protected by ADMIN_SECRET (see middleware/adminAuth.js) — no admin UI is
// included here, these are plain REST endpoints to call from Postman/an
// admin panel until a proper super-admin app is built.
app.use('/api/admin', require('./routes/adminRoutes'));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Background job: auto-complete confirmed bookings whose slot has ended ──
// Runs every 60 seconds. Once a 'confirmed' booking's endTime has passed, we
// mark it 'completed' so it moves from the Confirmed tab to the Completed
// tab automatically (which is what unlocks the "Rate your Experience" button).
const AUTO_COMPLETE_INTERVAL_MS = 60 * 1000;
setInterval(async () => {
  try {
    const now = new Date();
    const candidates = await Booking.find({ status: 'confirmed' }).populate('turf', 'name');

    for (const booking of candidates) {
      if (!booking.date || !booking.endTime) continue;
      const datePart = String(booking.date).split('T')[0];
      const end = new Date(`${datePart}T${booking.endTime}:00`);
      if (isNaN(end.getTime()) || end.getTime() >= now.getTime()) continue;

      booking.status = 'completed';
      await booking.save();

      await createNotification({
        user:    booking.user,
        title:   'How was your game? 🏟️',
        message: `Your session at ${booking.turf?.name || 'the turf'} is complete. Rate your experience!`,
        type:    'General',
        booking: booking._id,
      });
    }
  } catch (err) {
    console.error('Auto-complete job failed:', err.message);
  }
}, AUTO_COMPLETE_INTERVAL_MS);

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));