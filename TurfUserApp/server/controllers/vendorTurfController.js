const Turf = require('../models/Turf');
const Vendor = require('../models/Vendor');
const Booking = require('../models/Booking');

// ─────────────────────────────────────────────────────────────────────────
// Slot Calendar helpers
// ─────────────────────────────────────────────────────────────────────────

// "1 hour" / "30 mins" / "45 minutes" -> minutes (defaults to 60 if unparseable)
function parseSlotDurationMinutes(slotDuration) {
  if (!slotDuration) return 60;
  const match = String(slotDuration).match(/(\d+(\.\d+)?)/);
  if (!match) return 60;
  const n = parseFloat(match[1]);
  const isHour = /hour|hr/i.test(slotDuration);
  return isHour ? Math.round(n * 60) : Math.round(n);
}

// Normalizes odd time formats ("6:00 AM", "06:00", "18:00") to 24h "HH:MM".
function to24h(time) {
  if (!time) return '00:00';
  const s = String(time).trim();
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2];
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const plain = s.match(/^(\d{1,2}):(\d{2})$/);
  if (plain) return `${String(parseInt(plain[1], 10)).padStart(2, '0')}:${plain[2]}`;
  return '00:00';
}

function addMinutes(time24, minutes) {
  const [h, m] = time24.split(':').map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Builds a full day's worth of {startTime, endTime} slots from the turf's
// operating hours + slot duration, wrapping past midnight when close <= open
// (e.g. open 06:00 -> close 05:00 next day, a common "almost 24h" turf).
function generateSlotGrid(turf) {
  const durationMin = parseSlotDurationMinutes(turf.slotDuration);
  const open = to24h(turf.operatingHours?.open || '06:00');
  const close = to24h(turf.operatingHours?.close || '05:00');

  const openMins = open.split(':').reduce((h, m, i) => (i === 0 ? h + Number(m) * 60 : h + Number(m)), 0);
  let closeMins = close.split(':').reduce((h, m, i) => (i === 0 ? h + Number(m) * 60 : h + Number(m)), 0);
  if (closeMins <= openMins) closeMins += 24 * 60; // wraps past midnight

  const slots = [];
  for (let t = openMins; t + durationMin <= closeMins; t += durationMin) {
    const start = `${String(Math.floor((t % (24 * 60)) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    slots.push({ startTime: start, endTime: addMinutes(start, durationMin) });
  }
  return slots;
}

// GET /api/vendor/turfs/:id/slots?date=YYYY-MM-DD
// Returns the vendor's slot grid for a given date, with each slot's live
// status computed from Bookings (pending -> requested, confirmed -> booked)
// and the turf's manual freezes (blockedSlots).
exports.getSlotCalendar = async (req, res) => {
  try {
    const turf = await Turf.findOne({ _id: req.params.id, vendor: req.vendor._id });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
    if (Number.isNaN(dayStart.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date, expected YYYY-MM-DD' });
    }

    // Base grid: ONLY the slots the vendor has explicitly saved via
    // "Edit Slots" (turf.slots in the DB). No auto-generation from
    // operating hours — a turf with no saved slots shows an empty
    // calendar until the vendor adds some.
    const baseSlots = (turf.slots || []).map((s) => ({ startTime: s.startTime, endTime: s.endTime }));

    const bookings = await Booking.find({
      turf: turf._id,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed'] },
    }).select('startTime status');

    const bookingByStart = new Map(bookings.map((b) => [b.startTime, { status: b.status, id: b._id }]));
    const frozenStarts = new Set(
      (turf.blockedSlots || [])
        .filter((b) => b.date === dateStr)
        .map((b) => b.startTime)
    );

    let available = 0;
    let requested = 0;
    let booked = 0;
    let frozen = 0;

    const slots = baseSlots
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((s) => {
        const booking = bookingByStart.get(s.startTime);
        let status = 'available';
        if (booking?.status === 'confirmed') status = 'booked';
        else if (booking?.status === 'pending') status = 'requested';
        else if (frozenStarts.has(s.startTime)) status = 'frozen';

        if (status === 'available') available += 1;
        else if (status === 'requested') requested += 1;
        else if (status === 'booked') booked += 1;
        else if (status === 'frozen') frozen += 1;

        return {
          startTime: s.startTime,
          endTime: s.endTime,
          status,
          bookingId: booking?.id || null,
        };
      });

    res.json({
      success: true,
      date: dateStr,
      slots,
      counts: { available, requested, booked, frozen, total: slots.length },
    });
  } catch (err) {
    console.error('getSlotCalendar error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/vendor/turfs/:id/slots/freeze
// body: { date: 'YYYY-MM-DD', startTime, endTime, action: 'freeze' | 'unfreeze' }
// Lets the vendor manually block/unblock a specific date+time slot (e.g. for
// maintenance) straight from the Slot Calendar screen.
exports.freezeSlot = async (req, res) => {
  try {
    const { date, startTime, endTime, action } = req.body;
    if (!date || !startTime || !endTime || !['freeze', 'unfreeze'].includes(action)) {
      return res.status(400).json({ success: false, message: 'date, startTime, endTime and a valid action are required' });
    }

    const turf = await Turf.findOne({ _id: req.params.id, vendor: req.vendor._id });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    if (action === 'freeze') {
      // Don't let a vendor freeze a slot a customer already has a live
      // booking on — that'd hide an active booking behind a "frozen" badge.
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      const clash = await Booking.findOne({
        turf: turf._id,
        date: { $gte: dayStart, $lte: dayEnd },
        startTime,
        status: { $in: ['pending', 'confirmed'] },
      });
      if (clash) {
        return res.status(400).json({ success: false, message: `This slot already has a ${clash.status} booking and can't be frozen.` });
      }

      const alreadyFrozen = (turf.blockedSlots || []).some((b) => b.date === date && b.startTime === startTime);
      if (!alreadyFrozen) {
        turf.blockedSlots = turf.blockedSlots || [];
        turf.blockedSlots.push({ date, startTime, endTime });
      }
    } else {
      turf.blockedSlots = (turf.blockedSlots || []).filter((b) => !(b.date === date && b.startTime === startTime));
    }

    await turf.save();
    res.json({
      success: true,
      status: action === 'freeze' ? 'frozen' : 'available',
      message: action === 'freeze' ? 'Slot frozen' : 'Slot unfrozen',
    });
  } catch (err) {
    console.error('freezeSlot error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/turfs — list vendor's own turfs
exports.getMyTurfs = async (req, res) => {
  try {
    const turfs = await Turf.find({ vendor: req.vendor._id }).sort({ createdAt: -1 });
    res.json({ success: true, turfs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/turfs/:id
exports.getTurfById = async (req, res) => {
  try {
    const turf = await Turf.findOne({ _id: req.params.id, vendor: req.vendor._id });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    res.json({ success: true, turf });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Multer's `file.path` uses the OS path separator — on Windows that's a
// backslash ("uploads\kyc\xxx.jpg"), which breaks the URL we build on the
// client (http://host:5000/uploads/kyc/xxx.jpg). Normalize to forward
// slashes before saving so it works as both a filesystem path and a URL path.
function normalizePath(p) {
  if (!p) return p;
  const forward = p.replace(/\\/g, '/');
  const idx = forward.lastIndexOf('/uploads/');
  return idx !== -1 ? forward.slice(idx + 1) : forward;
}

// helper: safely JSON.parse a value that may already be an array/object
// (multer/form-data sends everything as strings, so arrays like `sports`
// and `facilities` arrive as JSON-encoded strings — see api/onboarding.js)
function parseMaybeJSON(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

// POST /api/vendor/turfs — create new turf (draft submit)
// This is called from Screen 1 (TurfSetupScreen) of the onboarding flow.
// NOTE: the app sends this as multipart/form-data (it includes the logo +
// turf images), so this route MUST have the `upload.fields([...])` multer
// middleware in front of it (see routes/vendorTurfRoutes.js) — otherwise
// req.body / req.files are both empty and every "required" check below
// fails even when the vendor filled everything in on the app.
exports.addTurf = async (req, res) => {
  try {
    const {
      name, city, phone, pincode, address, location,
      price, eveningPrice, weekendPrice, weekendEveningPrice,
      openTime, closeTime, slotDuration, description,
    } = req.body;

    const sports = parseMaybeJSON(req.body.sports, []);
    const facilities = parseMaybeJSON(req.body.facilities, []);

    // The app sends a pre-combined `location` string ("<address>, <city> - <pincode>")
    // as well as the raw address/city/pincode fields — prefer the raw fields so we
    // can store a proper structured location, but fall back to the combined string.
    const resolvedAddress = address || location;
    const pricePerHour = price;

    if (!name || !resolvedAddress || !pricePerHour || !sports?.length) {
      return res.status(400).json({ success: false, message: 'Name, location, price, and sports are required' });
    }

    if (Number(pricePerHour) <= 0) {
      return res.status(400).json({ success: false, message: 'Price per hour must be greater than 0' });
    }

    const logoFile = req.files?.logo?.[0];
    const imageFiles = req.files?.images || [];

    const turf = await Turf.create({
      name,
      phone,
      pincode,
      logo: logoFile ? normalizePath(logoFile.path) : undefined,
      location: {
        address: resolvedAddress,
        city,
        pincode,
      },
      pricePerHour: Number(pricePerHour),
      eveningPrice: eveningPrice ? Number(eveningPrice) : undefined,
      weekendPrice: weekendPrice ? Number(weekendPrice) : undefined,
      weekendEveningPrice: weekendEveningPrice ? Number(weekendEveningPrice) : undefined,
      description,
      sports,
      amenities: facilities,
      operatingHours: {
        open: openTime || '06:00 AM',
        close: closeTime || '11:00 PM',
      },
      slotDuration: slotDuration || '1 hour',
      images: imageFiles.map((f) => normalizePath(f.path)),
      vendor: req.vendor._id,
      // Stays 'pending' until the super admin reviews & approves the turf
      // (see controllers/adminController.js). The vendor sees the
      // "Turf under review" screen until this flips to 'active'.
      status: 'pending',
      isActive: true,
    });

    res.status(201).json({ success: true, turf, turfId: turf._id, status: 'pending' });
  } catch (err) {
    console.error('addTurf error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/vendor/turfs/:id — update turf
// FIX: this previously only copied a fixed whitelist of top-level keys
// straight from req.body (name/location/pricePerHour/description/sports/
// amenities/operatingHours/images) — none of which match what the app
// actually sends (address/city/pinCode, openingTime/closingTime,
// basePrice/eveningPrice/weekendPrice/weekendEveningPrice, selectedSports/
// selectedAmenities), and it never looked at req.files at all, so a
// freshly-picked logo or turf image was silently dropped even once the
// multer middleware was attached to the route. Rewritten to mirror addTurf's
// field mapping and to merge uploaded files in.
exports.updateTurf = async (req, res) => {
  try {
    const turf = await Turf.findOne({ _id: req.params.id, vendor: req.vendor._id });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    const {
      name, address, city, pinCode,
      openingTime, closingTime, slotDuration,
      basePrice, eveningPrice, weekendPrice, weekendEveningPrice,
      selectedSports, selectedAmenities, sports: sportsRaw, amenities: amenitiesRaw,
      existingImages,
    } = req.body;

    if (name !== undefined) turf.name = name;

    if (address !== undefined || city !== undefined || pinCode !== undefined) {
      turf.location = {
        address: address !== undefined ? address : turf.location?.address,
        city: city !== undefined ? city : turf.location?.city,
        pincode: pinCode !== undefined ? pinCode : turf.location?.pincode,
      };
    }

    if (openingTime !== undefined || closingTime !== undefined) {
      turf.operatingHours = {
        open: openingTime !== undefined ? openingTime : turf.operatingHours?.open,
        close: closingTime !== undefined ? closingTime : turf.operatingHours?.close,
      };
    }
    if (slotDuration !== undefined) turf.slotDuration = slotDuration;

    if (basePrice !== undefined) turf.pricePerHour = Number(basePrice);
    if (eveningPrice !== undefined) turf.eveningPrice = Number(eveningPrice);
    if (weekendPrice !== undefined) turf.weekendPrice = Number(weekendPrice);
    if (weekendEveningPrice !== undefined) turf.weekendEveningPrice = Number(weekendEveningPrice);
    // NOTE: the app also collects a "ball price" (TurfProfileScreen's
    // Price tab) but the Turf schema has no matching field — add
    // `ballPrice: Number` to models/Turf.js if this needs to persist;
    // until then it's accepted here but has nowhere to go.

    // The "selected" sport/amenity list is the vendor's actual chosen set —
    // that's what should be saved as the turf's sports/amenities. Fall back
    // to the plain sports/amenities field for callers that don't
    // distinguish "available" vs "selected".
    const sportsToSave = parseMaybeJSON(selectedSports, undefined) ?? parseMaybeJSON(sportsRaw, undefined);
    if (sportsToSave !== undefined) turf.sports = sportsToSave;
    const amenitiesToSave = parseMaybeJSON(selectedAmenities, undefined) ?? parseMaybeJSON(amenitiesRaw, undefined);
    if (amenitiesToSave !== undefined) turf.amenities = amenitiesToSave;

    // Logo: only replace if a fresh file actually came through this request.
    const logoFile = req.files?.logo?.[0];
    if (logoFile) turf.logo = normalizePath(logoFile.path);

    // Images: keep whichever previously-saved images the client says to
    // keep (existingImages), plus append any newly uploaded files. Falls
    // back to a plain `images` JSON field for non-multipart saves.
    const newImageFiles = req.files?.images || [];
    if (existingImages !== undefined || newImageFiles.length) {
      const kept = parseMaybeJSON(existingImages, []);
      turf.images = [...kept, ...newImageFiles.map((f) => normalizePath(f.path))];
    } else if (req.body.images !== undefined) {
      turf.images = parseMaybeJSON(req.body.images, turf.images);
    }

    await turf.save();
    res.json({ success: true, turf });
  } catch (err) {
    console.error('updateTurf error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/vendor/turfs/:id
exports.deleteTurf = async (req, res) => {
  try {
    const turf = await Turf.findOneAndDelete({ _id: req.params.id, vendor: req.vendor._id });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    res.json({ success: true, message: 'Turf deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/vendor/turfs/:id/slots
// body: { startTime: "HH:MM", endTime: "HH:MM" }
// Adds one row to the turf's recurring slot template (NOT date-specific —
// no `date` field on this schema). This is what makes a slot show up on
// the calendar for every date until removed.
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

exports.addSlot = async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    if (!TIME_RE.test(startTime || '') || !TIME_RE.test(endTime || '')) {
      return res.status(400).json({ success: false, message: 'startTime and endTime are required, in 24-hour HH:MM format (e.g. 14:00)' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'endTime must be after startTime' });
    }

    const turf = await Turf.findOne({ _id: req.params.id, vendor: req.vendor._id });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    turf.slots = turf.slots || [];
    const dup = turf.slots.some((s) => s.startTime === startTime && s.endTime === endTime);
    if (dup) {
      return res.status(400).json({ success: false, message: 'This slot already exists' });
    }

    turf.slots.push({ startTime, endTime, isAvailable: true });
    turf.slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    await turf.save();

    res.json({ success: true, turf });
  } catch (err) {
    console.error('addSlot error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/vendor/turfs/:id/slots/:slotId
exports.deleteSlot = async (req, res) => {
  try {
    const turf = await Turf.findOne({ _id: req.params.id, vendor: req.vendor._id });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    const before = (turf.slots || []).length;
    turf.slots = (turf.slots || []).filter((s) => s._id.toString() !== req.params.slotId);
    if (turf.slots.length === before) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    await turf.save();
    res.json({ success: true, turf });
  } catch (err) {
    console.error('deleteSlot error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// ONBOARDING KYC ENDPOINTS (Screens 2 & 3 of the vendor onboarding flow)
// NOTE: these routes need a file-upload middleware (e.g. multer) wired up
// in your routes file before req.files will be populated, e.g.:
//   const multer = require('multer');
//   const upload = multer({ dest: 'uploads/kyc/' });
//   router.post('/kyc/identity', protectVendor, upload.fields([
//     { name: 'aadhaar', maxCount: 1 }, { name: 'pan', maxCount: 1 },
//   ]), uploadVendorIdentityKyc);
//   router.post('/turfs/kyc', protectVendor, upload.fields([
//     { name: 'gstCertificate', maxCount: 1 }, { name: 'ebBill', maxCount: 1 },
//   ]), uploadTurfKyc);
// ─────────────────────────────────────────────────────────────────────────

// POST /api/vendor/kyc/identity — Screen 2 (VendorVerificationScreen)
// Saves Aadhaar + PAN (or DigiLocker flag) and marks vendor KYC as pending review.
exports.uploadVendorIdentityKyc = async (req, res) => {
  try {
    const { digilockerVerified } = req.body;
    const aadhaarPath = normalizePath(req.files?.aadhaar?.[0]?.path) || null;
    const panPath = normalizePath(req.files?.pan?.[0]?.path) || null;

    if (digilockerVerified !== 'true' && (!aadhaarPath || !panPath)) {
      return res.status(400).json({ success: false, message: 'Aadhaar and PAN are required' });
    }

    await Vendor.findByIdAndUpdate(req.vendor._id, {
      'kyc.identity.aadhaarPath': aadhaarPath,
      'kyc.identity.panPath': panPath,
      'kyc.identity.digilockerVerified': digilockerVerified === 'true',
      'kyc.identity.status': 'pending', // reviewed by super admin
    });

    res.json({ success: true, status: 'pending_review' });
  } catch (err) {
    console.error('uploadVendorIdentityKyc error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/vendor/turfs/kyc — Screen 3 (TurfVerificationScreen), final onboarding step
// Saves GST certificate + EB Bill, marks turf KYC as pending review, and marks
// the vendor's onboarding as complete so RootNavigator routes them to Home on
// their next login (they no longer need to see the onboarding flow again).
exports.uploadTurfKyc = async (req, res) => {
  try {
    const { turfId, digilockerVerified } = req.body;
    const gstPath = normalizePath(req.files?.gstCertificate?.[0]?.path) || null;
    const ebBillPath = normalizePath(req.files?.ebBill?.[0]?.path) || null;

    if (digilockerVerified !== 'true' && (!gstPath || !ebBillPath)) {
      return res.status(400).json({ success: false, message: 'GST certificate and EB Bill are required' });
    }

    if (turfId) {
      const turf = await Turf.findOne({ _id: turfId, vendor: req.vendor._id });
      if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

      turf.kyc = {
        gstCertificatePath: gstPath,
        ebBillPath,
        digilockerVerified: digilockerVerified === 'true',
        status: 'pending', // reviewed by super admin
      };
      await turf.save();
    }

    // Onboarding is done — vendor has completed all 3 steps (turf setup,
    // identity KYC, turf KYC). They stay `pending` review, but shouldn't be
    // sent through the onboarding flow again on future logins.
    await Vendor.findByIdAndUpdate(req.vendor._id, { hasCompletedTurfOnboarding: true });

    res.json({ success: true, status: 'submitted_for_review' });
  } catch (err) {
    console.error('uploadTurfKyc error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/onboarding/status — used by the app to decide whether to
// show the "Under review" screen or the "Approved" screen after onboarding.
exports.getOnboardingStatus = async (req, res) => {
  try {
    const vendor = req.vendor;
    const turf = await Turf.findOne({ vendor: vendor._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      hasCompletedTurfOnboarding: vendor.hasCompletedTurfOnboarding,
      vendorKycStatus: vendor.kyc?.identity?.status || 'not_started',
      turf: turf
        ? {
            turfId: turf._id,
            name: turf.name,
            status: turf.status, // pending | active | rejected | inactive
            kycStatus: turf.kyc?.status || 'not_started',
            rejectionReason: turf.rejectionReason || null,
            reviewedAt: turf.reviewedAt || null,
          }
        : null,
    });
  } catch (err) {
    console.error('getOnboardingStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};