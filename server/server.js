const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const v1Routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { initCronJobs } = require('./jobs/cronJobs');
const { sendError } = require('./utils/response');

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());

// Preserve raw body for Razorpay webhook HMAC signature verification
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const path = require('path');

// ── Static Files (Super Admin Web Portal & Uploads) ────────────────────────
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use(express.static(path.join(__dirname, 'public')));

// ── Mount Master V1 API Router ─────────────────────────────────────────────
app.use('/api/v1', v1Routes);
app.use('/api', v1Routes); // Legacy compatibility for mobile apps

// Root fallback (redirects to /admin)
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// ── 404 Route Not Found ────────────────────────────────────────────────────
app.use((req, res) => {
  return sendError(res, `Route '${req.originalUrl}' not found`, 404, 'ROUTE_NOT_FOUND');
});

// ── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Background Cron Jobs ─────────────────────────────────────────────
initCronJobs();

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Turf Booking Backend running on http://localhost:${PORT}`);
  console.log(`📡 API V1 Base URL: http://localhost:${PORT}/api/v1`);
});
