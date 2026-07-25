const mongoose = require('mongoose');

const ISSUE_TYPES = [
  'All issues',
  'Payment Issue',
  'Booking Issue',
  'Technical Issue',
  'Turf Listing Issue',
  'Subscription Issue',
  'Other',
];

const reportSchema = new mongoose.Schema(
  {
    // Human-friendly ticket id shown to the vendor, e.g. "APP-1023".
    // Generated in the controller right before save (see reportController.js).
    reportId: {
      type: String,
      required: true,
      unique: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    issueType: {
      type: String,
      enum: ISSUE_TYPES,
      default: 'All issues',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved'],
      default: 'open',
    },
  },
  { timestamps: true }
);

reportSchema.statics.ISSUE_TYPES = ISSUE_TYPES;

module.exports = mongoose.model('Report', reportSchema);