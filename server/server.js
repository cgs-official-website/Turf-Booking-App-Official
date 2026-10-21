const express = require('express');
require('express-async-errors');
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

// gzip responses (tournament lists / brackets are large JSON). Optional dep:
// run `npm i compression` in /server. If it is missing the server still works.
try {
  // eslint-disable-next-line global-require
  app.use(require('compression')({ threshold: 1024 }));
} catch (_) {
  console.warn('ℹ️ "compression" not installed - responses are not gzipped. Run: npm i compression');
}

// Preserve raw body for Razorpay webhook HMAC signature verification
app.use(
  express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lightweight request log. NEVER log request bodies: they contain passwords,
// OTPs and base64 images, and JSON.stringify on a big body blocks the event
// loop (this was slowing down every request, including login).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (process.env.LOG_REQUESTS === 'true' || ms > 1000) {
      console.log(`📡 [${req.method}] ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

const path = require('path');

// ── Static Files (Super Admin Web Portal & Uploads) ────────────────────────
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ── Mount Master V1 API Router ─────────────────────────────────────────────
app.use('/api/v1', v1Routes);
app.use('/api', v1Routes); // Legacy compatibility for mobile apps

// ── Public shareable pages (tournament invite links) ───────────────────────
app.use('/', require('./routes/publicPages'));

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
app.listen(PORT, '0.0.0.0', () => {
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    console.warn('⚠️ WARNING: NODE_ENV is set to "production" but REDIS_URL is not configured! OTPs and rate limiting will run in in-memory fallback mode.');
  }
  console.log(`🚀 Turf Booking Backend running on port ${PORT}`);
  console.log(`📡 API V1 Base URL: http://0.0.0.0:${PORT}/api/v1`);
});
