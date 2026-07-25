const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },  // Basic, Standard, Premium
  price: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  features: [{ type: String }],
  maxTurfs: { type: Number, default: 1 }, // ── ADDED: -1 = Unlimited turfs (e.g. Premium plan)
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const vendorSubscriptionSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String },
  paymentStatus: { type: String, enum: ['paid', 'failed', 'pending'], default: 'paid' },
  isActive: { type: Boolean, default: true },
  // Razorpay audit trail — populated once the payment is verified.
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
}, { timestamps: true });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
const VendorSubscription = mongoose.model('VendorSubscription', vendorSubscriptionSchema);

module.exports = { SubscriptionPlan, VendorSubscription };