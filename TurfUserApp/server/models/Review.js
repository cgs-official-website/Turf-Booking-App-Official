const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    turf: { type: mongoose.Schema.Types.ObjectId, ref: 'Turf', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ turf: 1, user: 1, booking: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);