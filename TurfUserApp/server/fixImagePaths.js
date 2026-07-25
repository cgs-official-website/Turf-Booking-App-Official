// One-time migration: fixes turf.logo, turf.images, and KYC doc paths that
// were saved as full absolute filesystem paths (e.g.
// "E:/TurfApp/.../server/uploads/turfs/images-123.jpg") instead of paths
// relative to the uploads folder ("uploads/turfs/images-123.jpg").
//
// Run this ONCE after deploying the normalizePath() fix in
// controllers/vendorTurfController.js, so already-broken records get
// cleaned up too.
//
// Usage (from your server/ folder):
//   node fixImagePaths.js
//
// Make sure your MongoDB connection string / model paths below match your
// project (adjust MONGO_URI and the require paths if needed).

const mongoose = require('mongoose');
const Turf = require('./models/Turf');
const Vendor = require('./models/Vendor');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/turfapp'; // <-- adjust if needed

function toRelative(p) {
  if (!p || typeof p !== 'string') return p;
  const forward = p.replace(/\\/g, '/');
  const idx = forward.lastIndexOf('/uploads/');
  return idx !== -1 ? forward.slice(idx + 1) : forward;
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Fix turfs (logo + images) ──────────────────────────────────────────
  const turfs = await Turf.find({});
  let turfsFixed = 0;

  for (const turf of turfs) {
    let changed = false;

    if (turf.logo) {
      const fixed = toRelative(turf.logo);
      if (fixed !== turf.logo) {
        turf.logo = fixed;
        changed = true;
      }
    }

    if (Array.isArray(turf.images) && turf.images.length) {
      const fixedImages = turf.images.map(toRelative);
      if (JSON.stringify(fixedImages) !== JSON.stringify(turf.images)) {
        turf.images = fixedImages;
        changed = true;
      }
    }

    if (turf.kyc?.gstCertificatePath || turf.kyc?.ebBillPath) {
      const fixedGst = toRelative(turf.kyc.gstCertificatePath);
      const fixedEb = toRelative(turf.kyc.ebBillPath);
      if (fixedGst !== turf.kyc.gstCertificatePath || fixedEb !== turf.kyc.ebBillPath) {
        turf.kyc.gstCertificatePath = fixedGst;
        turf.kyc.ebBillPath = fixedEb;
        changed = true;
      }
    }

    if (changed) {
      await turf.save();
      turfsFixed += 1;
      console.log(`Fixed turf: ${turf.name} (${turf._id})`);
    }
  }

  // ── Fix vendors (Aadhaar/PAN KYC) ──────────────────────────────────────
  const vendors = await Vendor.find({});
  let vendorsFixed = 0;

  for (const vendor of vendors) {
    const aadhaar = vendor.kyc?.identity?.aadhaarPath;
    const pan = vendor.kyc?.identity?.panPath;
    const fixedAadhaar = toRelative(aadhaar);
    const fixedPan = toRelative(pan);

    if (fixedAadhaar !== aadhaar || fixedPan !== pan) {
      vendor.kyc.identity.aadhaarPath = fixedAadhaar;
      vendor.kyc.identity.panPath = fixedPan;
      await vendor.save();
      vendorsFixed += 1;
      console.log(`Fixed vendor: ${vendor._id}`);
    }
  }

  console.log(`\nDone. Turfs fixed: ${turfsFixed}, Vendors fixed: ${vendorsFixed}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});