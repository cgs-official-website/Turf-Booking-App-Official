const firestoreService = require('../services/firestoreService');
const razorpayService = require('../services/razorpayService');
const { sendSuccess, sendError } = require('../utils/response');

const SUBSCRIPTION_PLANS = [
  {
    id: 'plan_starter_monthly',
    name: 'Starter Monthly',
    durationDays: 30,
    price: 999,
    description: '1 Turf, basic slot management & analytics',
  },
  {
    id: 'plan_pro_quarterly',
    name: 'Pro Quarterly',
    durationDays: 90,
    price: 2499,
    description: 'Up to 3 Turfs, priority listing, advanced reports',
  },
  {
    id: 'plan_enterprise_annual',
    name: 'Enterprise Annual',
    durationDays: 365,
    price: 8999,
    description: 'Unlimited Turfs, zero platform commission, 24/7 dedicated support',
  },
];

const subscriptionController = {
  /**
   * GET /api/v1/subscription/plans
   */
  async getPlans(req, res) {
    return sendSuccess(res, { plans: SUBSCRIPTION_PLANS });
  },

  /**
   * POST /api/v1/subscription/subscribe
   * Create Razorpay order for vendor subscription
   */
  async createSubscriptionOrder(req, res) {
    const { uid } = req.user;
    const { planId } = req.body;

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return sendError(res, 'Invalid subscription plan', 400, 'INVALID_PLAN');
    }

    const order = await razorpayService.createOrder(plan.price, `sub_${uid.slice(-6)}_${Date.now()}`, {
      vendorId: uid,
      planId,
    });

    const subDoc = await firestoreService.createDoc('subscriptions', {
      vendorId: uid,
      planId,
      planName: plan.name,
      amount: plan.price,
      durationDays: plan.durationDays,
      razorpayOrderId: order.id,
      status: 'created',
    });

    return sendSuccess(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      subscriptionId: subDoc.id,
      plan,
    });
  },

  /**
   * POST /api/v1/subscription/verify
   * Verify Razorpay payment and activate vendor subscription
   */
  async verifySubscription(req, res) {
    const { uid } = req.user;
    const { subscriptionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = razorpayService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return sendError(res, 'Payment verification failed', 400, 'INVALID_SIGNATURE');
    }

    const subDoc = await firestoreService.getDoc('subscriptions', subscriptionId);
    if (!subDoc) {
      return sendError(res, 'Subscription record not found', 404, 'NOT_FOUND');
    }

    const now = new Date();
    const durationDays = subDoc.durationDays || 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update Subscription Record
    await firestoreService.updateDoc('subscriptions', subscriptionId, {
      status: 'active',
      razorpayPaymentId: razorpay_payment_id,
      startDate: now,
      expiresAt,
    });

    // Activate Vendor subscription status
    await firestoreService.updateDoc('vendors', uid, {
      subscription: {
        active: true,
        planId: subDoc.planId,
        planName: subDoc.planName,
        subscriptionId,
        expiresAt,
      },
    });

    return sendSuccess(res, {
      message: 'Subscription activated successfully',
      subscription: {
        active: true,
        planId: subDoc.planId,
        expiresAt,
      },
    });
  },

  /**
   * POST /api/v1/subscription/webhook
   */
  async handleSubscriptionWebhook(req, res) {
    return sendSuccess(res, { received: true });
  },
};

module.exports = subscriptionController;
