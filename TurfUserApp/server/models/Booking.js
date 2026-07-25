const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    // ── Refs ───────────────────────────────────────────────────────────────
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    turf:  { type: mongoose.Schema.Types.ObjectId, ref: 'Turf', required: true },

    // ── Slot Info ──────────────────────────────────────────────────────────
    date:      { type: Date, required: true },
    startTime: { type: String, required: true },  // "10:00"
    endTime:   { type: String, required: true },  // "11:00"
    duration:  { type: Number, default: 1 },      // hours
    players:   { type: Number, default: 1 },

    // ── Sport ─────────────────────────────────────────────────────────────
    sport: { type: String },

    // ── Payment ───────────────────────────────────────────────────────────
    totalAmount:   { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'paid' },
    paymentMethod: { type: String },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // ── Booking Status ────────────────────────────────────────────────────
    // ✅ FIX: 'accepted' ஐ 'confirmed' ஆக மாத்தினோம்
    // UserApp 'confirmed' expect பண்றது, vendor 'accepted' save பண்றது — mismatch fix
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },

    // ── Vendor Actions ────────────────────────────────────────────────────
    acceptedAt:      { type: Date },
    rejectedAt:      { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);