// const crypto = require('crypto');
// const razorpay = require('../utils/razorpay');
// const { SubscriptionPlan, VendorSubscription } = require('../models/Subscription');

// // GET /api/vendor/subscriptions/plans
// exports.getPlans = async (req, res) => {
//   try {
//     const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
//     res.json({ success: true, plans });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // POST /api/vendor/subscriptions/create-order
// // Body: { planId }
// // Creates a real Razorpay order for the plan's price. No VendorSubscription
// // row is created here — that only happens once /verify confirms the
// // signature, so an abandoned/failed checkout never leaves a "paid" record
// // behind.
// exports.createOrder = async (req, res) => {
//   try {
//     const { planId } = req.body;
//     if (!planId) {
//       return res.status(400).json({ success: false, message: 'planId is required' });
//     }

//     const plan = await SubscriptionPlan.findById(planId);
//     if (!plan || !plan.isActive) {
//       return res.status(404).json({ success: false, message: 'Plan not found' });
//     }

//     const order = await razorpay.orders.create({
//       amount: Math.round(plan.price * 100), // paise
//       currency: 'INR',
//       receipt: `sub_${req.vendor._id}_${Date.now()}`,
//       notes: {
//         vendorId: String(req.vendor._id),
//         planId: String(plan._id),
//         purpose: 'vendor_subscription',
//       },
//     });

//     res.json({
//       success: true,
//       order,
//       keyId: process.env.RAZORPAY_KEY_ID,
//       plan,
//     });
//   } catch (err) {
//     console.error('createOrder error:', err);
//     res.status(500).json({ success: false, message: 'Could not create payment order' });
//   }
// };

// // POST /api/vendor/subscriptions/verify
// // Body: { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// // Verifies the payment signature server-side (never trust the client's
// // word that a payment succeeded) and only then activates the subscription.
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//     if (!planId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
//     }

//     const plan = await SubscriptionPlan.findById(planId);
//     if (!plan) {
//       return res.status(404).json({ success: false, message: 'Plan not found' });
//     }

//     const body = `${razorpay_order_id}|${razorpay_payment_id}`;
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(body)
//       .digest('hex');

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({ success: false, message: 'Payment verification failed - signature mismatch' });
//     }

//     // Signature is valid — the payment is genuine. Activate the plan.
//     const expiryDate = new Date();
//     expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

//     // Deactivate any existing subscription
//     await VendorSubscription.updateMany(
//       { vendor: req.vendor._id, isActive: true },
//       { isActive: false }
//     );

//     const subscription = await VendorSubscription.create({
//       vendor: req.vendor._id,
//       plan: plan._id,
//       expiryDate,
//       amount: plan.price,
//       paymentMethod: 'razorpay',
//       paymentStatus: 'paid',
//       isActive: true,
//       razorpayOrderId: razorpay_order_id,
//       razorpayPaymentId: razorpay_payment_id,
//       razorpaySignature: razorpay_signature,
//     });

//     await subscription.populate('plan');

//     res.status(201).json({
//       success: true,
//       message: `Subscribed to ${plan.name} plan!`,
//       subscription,
//     });
//   } catch (err) {
//     console.error('verifyPayment error:', err);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // GET /api/vendor/subscriptions/me
// exports.getMySubscription = async (req, res) => {
//   try {
//     const subscription = await VendorSubscription.findOne({
//       vendor: req.vendor._id,
//       isActive: true,
//       expiryDate: { $gte: new Date() },
//     }).populate('plan');

//     res.json({ success: true, subscription });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // GET /api/vendor/subscriptions/history
// exports.getHistory = async (req, res) => {
//   try {
//     const history = await VendorSubscription.find({ vendor: req.vendor._id })
//       .populate('plan', 'name price')
//       .sort({ createdAt: -1 });

//     res.json({ success: true, history });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };













const crypto = require('crypto');
const razorpay = require('../utils/razorpay');
const { SubscriptionPlan, VendorSubscription } = require('../models/Subscription');

// GET /api/vendor/subscriptions/plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// TEMPORARY, for local testing only — set MOCK_PAYMENTS=true in .env when
// you don't have real Razorpay test keys yet. Skips the actual Razorpay API
// call and the signature check so you can exercise the whole
// approve -> paywall -> pay -> verify -> Home flow end-to-end.
// Set MOCK_PAYMENTS=false (or delete the line) once a real rzp_test_ key is
// in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — do NOT ship this to production.
const MOCK_PAYMENTS = process.env.MOCK_PAYMENTS === 'true';
const MOCK_SIGNATURE = 'MOCK_SIGNATURE_FOR_TESTING';

// POST /api/vendor/subscriptions/create-order
// Body: { planId }
// Creates a real Razorpay order for the plan's price. No VendorSubscription
// row is created here — that only happens once /verify confirms the
// signature, so an abandoned/failed checkout never leaves a "paid" record
// behind.
exports.createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId is required' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    if (MOCK_PAYMENTS) {
      // No real Razorpay key yet — hand back a fake order so the frontend
      // can skip straight to a mock "success" instead of opening the
      // Razorpay checkout sheet (which would fail auth with a placeholder key).
      return res.json({
        success: true,
        mock: true,
        order: {
          id: `order_mock_${Date.now()}`,
          amount: Math.round(plan.price * 100),
          currency: 'INR',
        },
        keyId: 'mock',
        plan,
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(plan.price * 100), // paise
      currency: 'INR',
      receipt: `sub_${req.vendor._id}_${Date.now()}`,
      notes: {
        vendorId: String(req.vendor._id),
        planId: String(plan._id),
        purpose: 'vendor_subscription',
      },
    });

    res.json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
    });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: 'Could not create payment order' });
  }
};

// POST /api/vendor/subscriptions/verify
// Body: { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Verifies the payment signature server-side (never trust the client's
// word that a payment succeeded) and only then activates the subscription.
exports.verifyPayment = async (req, res) => {
  try {
    const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!planId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const isMockSignature = MOCK_PAYMENTS && razorpay_signature === MOCK_SIGNATURE;

    if (!isMockSignature) {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed - signature mismatch' });
      }
    }

    // Signature is valid — the payment is genuine. Activate the plan.
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    // Deactivate any existing subscription
    await VendorSubscription.updateMany(
      { vendor: req.vendor._id, isActive: true },
      { isActive: false }
    );

    const subscription = await VendorSubscription.create({
      vendor: req.vendor._id,
      plan: plan._id,
      expiryDate,
      amount: plan.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      isActive: true,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    await subscription.populate('plan');

    res.status(201).json({
      success: true,
      message: `Subscribed to ${plan.name} plan!`,
      subscription,
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/subscriptions/me
exports.getMySubscription = async (req, res) => {
  try {
    const subscription = await VendorSubscription.findOne({
      vendor: req.vendor._id,
      isActive: true,
      expiryDate: { $gte: new Date() },
    }).populate('plan');

    res.json({ success: true, subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/subscriptions/history
exports.getHistory = async (req, res) => {
  try {
    const history = await VendorSubscription.find({ vendor: req.vendor._id })
      .populate('plan', 'name price')
      .sort({ createdAt: -1 });

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};