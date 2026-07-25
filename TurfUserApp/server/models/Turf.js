const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // "08:00"
  endTime: { type: String, required: true },   // "09:00"
  isAvailable: { type: Boolean, default: true },
});

// A specific date+time slot the vendor has manually frozen (blocked off) from
// the Slot Calendar screen — e.g. for maintenance or an offline booking that
// isn't tracked as a Booking document. Distinct from `slots` above (which is
// just the recurring daily time-template, not tied to a date).
const blockedSlotSchema = new mongoose.Schema(
  {
    date:      { type: String, required: true }, // "YYYY-MM-DD"
    startTime: { type: String, required: true },  // "06:00"
    endTime:   { type: String, required: true },  // "07:00"
    reason:    { type: String, default: '' },
  },
  { timestamps: true }
);

const turfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // ── Vendor who owns this turf ──────────────────────────────────────────
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: false },

    // ── Vendor contact (captured on Turf Setup screen) ──────────────────────
    phone:   { type: String },
    pincode: { type: String },
    logo:    { type: String },

    // ── Location ───────────────────────────────────────────────────────────
    location: {
      address: { type: String, required: true },
      city:    { type: String },
      state:   { type: String },
      pincode: { type: String },
      lat:     { type: Number },
      lng:     { type: Number },
    },

    // ── Pricing ────────────────────────────────────────────────────────────
    pricePerHour:        { type: Number, required: true },
    eveningPrice:        { type: Number },
    weekendPrice:        { type: Number },
    weekendEveningPrice: { type: Number },

    // ── Details ────────────────────────────────────────────────────────────
    description:  { type: String },
    sports:       [{ type: String }],
    amenities:    [{ type: String }],
    images:       [{ type: String }],

    // ── Operating Hours ────────────────────────────────────────────────────
    operatingHours: {
      open:  { type: String, default: '06:00' },
      close: { type: String, default: '22:00' },
    },
    slotDuration: { type: String, default: '1 hour' },

    // ── Slots ──────────────────────────────────────────────────────────────
    slots: [slotSchema],
    // Per-date manual freezes — see blockedSlotSchema above.
    blockedSlots: [blockedSlotSchema],

    // ── Business KYC (GST certificate + EB Bill) — Screen 3 of onboarding ──
    // Reviewed by the super admin alongside the turf details themselves.
    kyc: {
      gstCertificatePath: { type: String },
      ebBillPath:         { type: String },
      digilockerVerified: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['not_started', 'pending', 'approved', 'rejected'],
        default: 'not_started',
      },
    },

    // ── Status & Rating ────────────────────────────────────────────────────
    // 'pending'  -> submitted by vendor, waiting for super admin review (Under Review screen)
    // 'active'   -> approved by super admin (Approved screen / visible in user app)
    // 'rejected' -> sent back to vendor
    // 'inactive' -> manually disabled after being active
    status:          { type: String, enum: ['pending', 'active', 'rejected', 'inactive'], default: 'pending' },
    rejectionReason: { type: String },
    reviewedAt:      { type: Date },
    rating:       { type: Number, default: 0 },
    reviewCount:  { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },

    razorpayKeyId:     { type: String, default: '' },  // rzp_live_xxxxxxxxxxxxxxx
razorpayKeySecret: { type: String, default: '' },  // vendor's secret key (never expose to frontend)

  },
  { timestamps: true }
);

// Text index for search
turfSchema.index({ name: 'text', 'location.address': 'text', 'location.city': 'text' });

module.exports = mongoose.model('Turf', turfSchema);