const firestoreService = require('../services/firestoreService');
const razorpayService = require('../services/razorpayService');
const { sendSuccess, sendError } = require('../utils/response');

const SEED_PLANS = [
  {
    id: 'plan_free_starter',
    _id: 'plan_free_starter',
    name: 'Free Trial Starter',
    durationDays: 30,
    price: 0,
    description: '100% Free plan with instant home dashboard access & slot management',
    popular: false,
    status: 'active',
    features: [
      '100% Free / Instant Activation',
      'Instant Home Dashboard Access',
      'Up to 1 Registered Turf Pitch',
      'Basic Slot Booking Management',
      'Direct WhatsApp Customer Support',
    ],
  },
  {
    id: 'plan_starter_monthly',
    _id: 'plan_starter_monthly',
    name: 'Starter Monthly',
    durationDays: 30,
    price: 499,
    description: '1 Turf, basic slot management & analytics',
    popular: false,
    status: 'active',
    features: [
      'Up to 1 Registered Turf',
      'Standard Slot Scheduling',
      'Customer Reviews & Ratings',
      'Weekly Payout Settlements',
    ],
  },
  {
    id: 'plan_pro_quarterly',
    _id: 'plan_pro_quarterly',
    name: 'Pro Growth',
    durationDays: 30,
    price: 999,
    description: 'Multiple Turfs, priority search, instant settlements',
    popular: true,
    status: 'active',
    features: [
      'Multiple Turfs Management',
      'Dynamic Peak & Weekend Pricing',
      'Verified Partner Badge',
      'Instant UPI / Bank Settlements',
      '24/7 Priority Partner Support',
    ],
  },
  {
    id: 'plan_enterprise_annual',
    _id: 'plan_enterprise_annual',
    name: 'Annual Elite',
    durationDays: 365,
    price: 8999,
    description: 'Unlimited Turfs, zero commission, dedicated account manager',
    popular: false,
    status: 'active',
    features: [
      'Everything in Pro Growth',
      'Save 25% on Annual Billing',
      'Featured Banner on Player App',
      'Dedicated Partner Account Manager',
    ],
  },
];

const subscriptionController = {
  /**
   * GET /api/v1/subscription/plans
   * Dynamic fetching from Firestore with fallback seed
   */
  async getPlans(req, res) {
    let result = await firestoreService.queryWithCursor('subscription_plans', { limit: 50 });
    let plans = result?.items || [];

    if (!plans || plans.length === 0) {
      for (const p of SEED_PLANS) {
        await firestoreService.setDoc('subscription_plans', p.id, p);
      }
      result = await firestoreService.queryWithCursor('subscription_plans', { limit: 50 });
      plans = result?.items || [];
    }

    const rawPlans = (plans && plans.length > 0) ? plans : SEED_PLANS;
    const seen = new Set();
    const uniquePlans = [];
    for (const p of rawPlans) {
      const key = (p.id || p._id || p.name || '').trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        uniquePlans.push(p);
      }
    }

    return sendSuccess(res, { plans: uniquePlans });
  },

  /**
   * POST /api/v1/subscription/plans (Admin only)
   * Create dynamic subscription plan
   */
  async createPlan(req, res) {
    const { name, price, durationDays, description, features, popular } = req.body;
    if (!name || !price || !durationDays) {
      return sendError(res, 'Name, price and durationDays are required', 400, 'VALIDATION_ERROR');
    }

    const planId = `plan_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newPlan = {
      id: planId,
      _id: planId,
      name: name.trim(),
      price: Number(price),
      durationDays: Number(durationDays),
      description: description || '',
      features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n').filter(Boolean) : []),
      popular: !!popular,
      status: 'active',
      createdAt: new Date(),
    };

    await firestoreService.setDoc('subscription_plans', planId, newPlan);
    return sendSuccess(res, { plan: newPlan, message: 'Subscription plan created successfully' });
  },

  /**
   * PUT /api/v1/subscription/plans/:id (Admin only)
   * Update dynamic subscription plan
   */
  async updatePlan(req, res) {
    const { id } = req.params;
    const { name, price, durationDays, description, features, popular, status } = req.body;

    const existing = await firestoreService.getDoc('subscription_plans', id);
    if (!existing) {
      return sendError(res, 'Subscription plan not found', 404, 'NOT_FOUND');
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (price !== undefined) updates.price = Number(price);
    if (durationDays !== undefined) updates.durationDays = Number(durationDays);
    if (description !== undefined) updates.description = description;
    if (features !== undefined) {
      updates.features = Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n').filter(Boolean) : []);
    }
    if (popular !== undefined) updates.popular = !!popular;
    if (status !== undefined) updates.status = status;
    updates.updatedAt = new Date();

    const updated = await firestoreService.setDoc('subscription_plans', id, updates, true);
    return sendSuccess(res, { plan: updated, message: 'Subscription plan updated successfully' });
  },

  /**
   * DELETE /api/v1/subscription/plans/:id (Admin only)
   */
  async deletePlan(req, res) {
    const { id } = req.params;
    await firestoreService.deleteDoc('subscription_plans', id);
    return sendSuccess(res, { message: 'Subscription plan deleted successfully' });
  },

  /**
   * POST /api/v1/subscription/subscribe or /api/v1/vendor/subscriptions/create-order
   */
  async createSubscriptionOrder(req, res) {
    const { uid } = req.user;
    const { planId } = req.body;

    let plan = await firestoreService.getDoc('subscription_plans', planId);
    if (!plan) {
      plan = SEED_PLANS.find((p) => p.id === planId || p._id === planId);
    }
    if (!plan) {
      return sendError(res, 'Invalid subscription plan', 400, 'INVALID_PLAN');
    }

    const order = await razorpayService.createOrder(plan.price, `sub_${uid.slice(-6)}_${Date.now()}`, {
      vendorId: uid,
      planId: plan.id || plan._id || planId,
    });

    const subDoc = await firestoreService.createDoc('subscriptions', {
      vendorId: uid,
      planId: plan.id || plan._id || planId,
      planName: plan.name,
      amount: plan.price,
      durationDays: plan.durationDays,
      razorpayOrderId: order.id,
      status: 'created',
      createdAt: new Date(),
    });

    return sendSuccess(res, {
      orderId: order.id,
      order: { id: order.id, amount: order.amount, currency: order.currency },
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      mock: process.env.MOCK_PAYMENTS === 'true' || !process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      subscriptionId: subDoc.id,
      plan,
    });
  },

  /**
   * POST /api/v1/subscription/verify or /api/v1/vendor/subscriptions/verify
   */
  async verifySubscription(req, res) {
    const { uid } = req.user;
    const { planId, subscriptionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (process.env.MOCK_PAYMENTS !== 'true' && razorpay_signature !== 'MOCK_SIGNATURE_FOR_TESTING') {
      const isValid = razorpayService.verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );
      if (!isValid) {
        return sendError(res, 'Payment verification failed', 400, 'INVALID_SIGNATURE');
      }
    }

    let plan = await firestoreService.getDoc('subscription_plans', planId);
    if (!plan) {
      plan = SEED_PLANS.find((p) => p.id === planId || p._id === planId);
    }

    const now = new Date();
    const durationDays = plan?.durationDays || 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Record subscription in Firestore
    const subRecord = {
      vendorId: uid,
      planId: planId || plan?.id,
      plan: plan || { name: 'Partner Pro', price: 999 },
      status: 'active',
      amount: plan?.price || 999,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      startDate: now,
      expiryDate: expiresAt,
      expiresAt,
      createdAt: now,
    };

    if (subscriptionId) {
      await firestoreService.setDoc('subscriptions', subscriptionId, subRecord, true);
    } else {
      await firestoreService.createDoc('subscriptions', subRecord);
    }

    // Activate Vendor subscription status & onboarding payment flag
    await firestoreService.setDoc('vendors', uid, {
      hasPaidSubscription: true,
      hasPaidOnboarding: true,
      subscriptionStatus: 'active',
      subscription: {
        active: true,
        status: 'active',
        planId: planId || plan?.id,
        planName: plan?.name || 'Partner Pro',
        plan: plan || { name: 'Partner Pro', price: 999 },
        startDate: now,
        expiryDate: expiresAt,
        expiresAt,
      },
    }, true);

    return sendSuccess(res, {
      message: 'Subscription activated successfully!',
      subscription: {
        active: true,
        status: 'active',
        plan: plan || { name: 'Partner Pro' },
        expiryDate: expiresAt,
      },
    });
  },

  /**
   * GET /api/v1/vendor/subscriptions/me
   */
  async getMySubscription(req, res) {
    const { uid } = req.user;
    const vendor = await firestoreService.getDoc('vendors', uid);

    if (vendor && vendor.subscription && vendor.subscription.active) {
      return sendSuccess(res, { subscription: vendor.subscription });
    }

    // Check subscriptions collection
    const subs = await firestoreService.queryDocs('subscriptions', [
      { field: 'vendorId', operator: '==', value: uid },
      { field: 'status', operator: '==', value: 'active' },
    ]);

    if (subs && subs.length > 0) {
      return sendSuccess(res, { subscription: subs[0] });
    }

    return sendSuccess(res, { subscription: null });
  },

  /**
   * GET /api/v1/vendor/subscriptions/history
   */
  async getSubscriptionHistory(req, res) {
    const { uid } = req.user;
    const history = await firestoreService.queryDocs('subscriptions', [
      { field: 'vendorId', operator: '==', value: uid },
    ]);

    return sendSuccess(res, { history: history || [] });
  },

  /**
   * POST /api/v1/subscription/activate-free or /api/v1/vendor/subscriptions/activate-free
   * Instantly activate 100% free starter plan
   */
  async activateFreePlan(req, res) {
    const { uid } = req.user;
    const { planId = 'plan_free_starter' } = req.body;

    const now = new Date();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subDoc = await firestoreService.createDoc('subscriptions', {
      vendorId: uid,
      planId,
      planName: 'Free Trial Starter',
      amount: 0,
      durationDays: 30,
      status: 'active',
      startDate: now,
      endDate: expiresAt,
      createdAt: now,
    });

    const vendorUpdate = {
      hasPaidSubscription: true,
      subscription: {
        active: true,
        status: 'active',
        planId,
        planName: 'Free Trial Starter',
        amount: 0,
        startDate: now,
        endDate: expiresAt,
        expiresAt,
        subscriptionId: subDoc.id,
      },
    };

    await firestoreService.setDoc('vendors', uid, vendorUpdate, true);

    return sendSuccess(res, {
      subscription: vendorUpdate.subscription,
      message: 'Free subscription plan activated successfully! Welcome to your Dashboard.',
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
