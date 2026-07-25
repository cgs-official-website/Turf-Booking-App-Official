const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true, select: false },
    businessName: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    profileImage: { type: String },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
    hasCompletedTurfOnboarding: { type: Boolean, default: false },

    // Vendor identity KYC — Aadhaar + PAN, uploaded in onboarding Screen 2
    // (VendorVerificationScreen). Reviewed by the super admin.
    kyc: {
      identity: {
        aadhaarPath: { type: String },
        panPath: { type: String },
        digilockerVerified: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ['not_started', 'pending', 'approved', 'rejected'],
          default: 'not_started',
        },
      },
    },
  },
  { timestamps: true }
);

// Hash password before save
vendorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

vendorSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Vendor', vendorSchema);