const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const vendorAuth = require('../middleware/vendorAuth');
const {
  getMyTurfs,
  getTurfById,
  addTurf,
  updateTurf,
  deleteTurf,
  addSlot,
  deleteSlot,
  getSlotCalendar,
  freezeSlot,
  uploadVendorIdentityKyc,
  uploadTurfKyc,
} = require('../controllers/vendorTurfController');

// ─────────────────────────────────────────────────────────────────────────
// FIX: this file used to just be a copy-paste of the controller functions
// (exports.getMyTurfs = ..., exports.addTurf = ..., etc) with NO
// express.Router() and NO module.exports = router. Passing that plain
// object into app.use('/api/vendor/turfs', vendorTurfRoutes) in server.js
// crashed the server on startup ("Router.use() requires a middleware
// function but got a Object"), which is why every request from the app
// (turf draft, KYC uploads, everything) was failing.
// This file now correctly builds an Express Router and imports the real
// logic from controllers/vendorTurfController.js instead of duplicating it.
// ─────────────────────────────────────────────────────────────────────────

// Multer storage: turf logo/cover/product images -> uploads/turfs,
// KYC documents (Aadhaar, PAN, GST certificate, EB Bill) -> uploads/kyc.
// FIX: multer does NOT create destination folders by itself — if
// uploads/turfs (or uploads/kyc) doesn't already exist on disk, every
// upload fails with "ENOENT: no such file or directory". We create both
// folders up front (and again defensively inside `destination`) so this
// never breaks a fresh checkout / new machine again.
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const TURFS_DIR = path.join(UPLOADS_ROOT, 'turfs');
const KYC_DIR = path.join(UPLOADS_ROOT, 'kyc');
[TURFS_DIR, KYC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isKyc = ['aadhaar', 'pan', 'gstCertificate', 'ebBill'].includes(file.fieldname);
    const dir = isKyc ? KYC_DIR : TURFS_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname || '')}`);
  },
});
const upload = multer({ storage });

// ─── Turf CRUD (vendor's own turfs) ─────────────────────────────────────
router.get('/', vendorAuth, getMyTurfs);
router.get('/:id', vendorAuth, getTurfById);

// POST /api/vendor/turfs — Screen 1 (TurfSetupScreen). multipart/form-data
// with the turf's `logo` (single) and `images` (up to 10) files.
router.post(
  '/',
  vendorAuth,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  addTurf
);

// PUT /api/vendor/turfs/:id — same reasoning as the POST route above: the
// app sends this as multipart/form-data whenever the logo or turf images
// are being changed (TurfProfileScreen). Without this middleware, req.body
// and req.files are both empty on those requests — logo/image edits looked
// like they "saved" (200 response) but nothing was ever actually written.
// multer skips parsing entirely for plain JSON requests, so this is safe
// for the info/timing/pricing tabs too, which don't send files.
router.put(
  '/:id',
  vendorAuth,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  updateTurf
);
router.delete('/:id', vendorAuth, deleteTurf);

router.post('/:id/slots', vendorAuth, addSlot);
router.delete('/:id/slots/:slotId', vendorAuth, deleteSlot);

// ─── Slot Calendar (date-specific availability + freeze/unfreeze) ───────────
// GET  /api/vendor/turfs/:id/slots/calendar?date=YYYY-MM-DD
router.get('/:id/slots/calendar', vendorAuth, getSlotCalendar);
// POST /api/vendor/turfs/:id/slots/freeze  { date, startTime, endTime, action }
router.post('/:id/slots/freeze', vendorAuth, freezeSlot);

// ─── Onboarding KYC (Screens 2 & 3) ──────────────────────────────────────
// POST /api/vendor/turfs/kyc/identity — Screen 2 (VendorVerificationScreen)
router.post(
  '/kyc/identity',
  vendorAuth,
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
  ]),
  uploadVendorIdentityKyc
);

// POST /api/vendor/turfs/kyc — Screen 3 (TurfVerificationScreen)
router.post(
  '/kyc',
  vendorAuth,
  upload.fields([
    { name: 'gstCertificate', maxCount: 1 },
    { name: 'ebBill', maxCount: 1 },
  ]),
  uploadTurfKyc
);

module.exports = router;