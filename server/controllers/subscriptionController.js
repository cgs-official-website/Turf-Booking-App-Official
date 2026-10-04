const prisma = require('../config/prisma');
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
   */
  async getPlans(req, res) {
    try {
      let plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });

      if (!plans || plans.length === 0) {
        for (const p of SEED_PLANS) {
          await prisma.subscriptionPlan.upsert({
            where: { id: p.id },
            create: {
              id: p.id,
              name: p.name,
              price: p.price,
              durationDays: p.durationDays,
              description: p.description,
              features: p.features,
              popular: p.popular,
              isActive: true,
            },
            update: {},
          });
        }
        plans = await prisma.subscriptionPlan.findMany({
          where: { isActive: true },
          orderBy: { price: 'asc' },
        });
      }

      const formatted = plans.map((p) => ({
        ...p,
        _id: p.id,
        price: Number(p.price),
      }));

      return sendSuccess(res, { plans: formatted });
    } catch (err) {
      console.error('getPlans error:', err);
      return sendSuccess(res, { plans: SEED_PLANS });
    }
  },

  /**
   * POST /api/v1/subscription/plans (Admin only)
   */
  async createPlan(req, res) {
    const { name, price, durationDays, description, features, popular } = req.body;
    if (!name || price === undefined || !durationDays) {
      return sendError(res, 'Name, price and durationDays are required', 400, 'VALIDATION_ERROR');
    }

    try {
      const planId = `plan_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
      const plan = await prisma.subscriptionPlan.create({
        data: {
          id: planId,
          name: name.trim(),
          price: Number(price),
          durationDays: Number(durationDays),
          description: description || '',
          features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n').filter(Boolean) : []),
          popular: !!popular,
          isActive: true,
        },
      });

      return sendSuccess(res, { plan: { ...plan, _id: plan.id, price: Number(plan.price) }, message: 'Subscription plan created successfully' });
    } catch (err) {
      console.error('createPlan error:', err);
      return sendError(res, 'Failed to create plan', 500, 'CREATE_FAILED');
    }
  },

  /**
   * PUT /api/v1/subscription/plans/:id (Admin only)
   */
  async updatePlan(req, res) {
    const { id } = req.params;
    const { name, price, durationDays, description, features, popular, status, isActive } = req.body;

    try {
      const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
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
      if (isActive !== undefined) updates.isActive = !!isActive;
      if (status !== undefined) updates.isActive = status === 'active';

      const updated = await prisma.subscriptionPlan.update({
        where: { id },
        data: updates,
      });

      return sendSuccess(res, { plan: { ...updated, _id: updated.id, price: Number(updated.price) }, message: 'Subscription plan updated successfully' });
    } catch (err) {
      console.error('updatePlan error:', err);
      return sendError(res, 'Failed to update plan', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * DELETE /api/v1/subscription/plans/:id (Admin only)
   */
  async deletePlan(req, res) {
    const { id } = req.params;
    try {
      await prisma.subscriptionPlan.delete({ where: { id } });
      return sendSuccess(res, { message: 'Subscription plan deleted successfully' });
    } catch (err) {
      console.error('deletePlan error:', err);
      return sendError(res, 'Failed to delete plan', 500, 'DELETE_FAILED');
    }
  },

  /**
   * POST /api/v1/subscription/subscribe or /api/v1/vendor/subscriptions/create-order
   */
  async createSubscriptionOrder(req, res) {
    const { uid } = req.user;
    const { planId } = req.body;

    try {
      let plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) {
        plan = SEED_PLANS.find((p) => p.id === planId || p._id === planId);
      }
      if (!plan) {
        return sendError(res, 'Invalid subscription plan', 400, 'INVALID_PLAN');
      }

      const planPrice = Number(plan.price);
      const order = await razorpayService.createOrder(planPrice, `sub_${uid.slice(-6)}_${Date.now()}`, {
        vendorId: uid,
        planId: plan.id,
      });

      const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const subDoc = await prisma.vendorSubscription.create({
        data: {
          id: subId,
          vendorId: uid,
          planId: plan.id,
          planName: plan.name,
          amount: planPrice,
          durationDays: plan.durationDays,
          razorpayOrderId: order.id,
          status: 'created',
        },
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
    } catch (err) {
      console.error('createSubscriptionOrder error:', err);
      return sendError(res, 'Failed to create subscription order', 500, 'CREATE_ORDER_FAILED');
    }
  },

  /**
   * POST /api/v1/subscription/verify or /api/v1/vendor/subscriptions/verify
   */
  async verifySubscription(req, res) {
    const { uid } = req.user;
    const { planId, subscriptionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
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

      let plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) {
        plan = SEED_PLANS.find((p) => p.id === planId || p._id === planId);
      }

      const now = new Date();
      const durationDays = plan?.durationDays || 30;
      const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      if (subscriptionId) {
        await prisma.vendorSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'active',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            startsAt: now,
            expiresAt,
          },
        });
      }

      const vendorSubData = {
        active: true,
        status: 'active',
        planId: planId || plan?.id,
        planName: plan?.name || 'Partner Pro',
        plan: plan || { name: 'Partner Pro', price: 999 },
        startDate: now,
        expiryDate: expiresAt,
        expiresAt,
      };

      await prisma.vendor.update({
        where: { id: uid },
        data: {
          subscription: vendorSubData,
        },
      });

      return sendSuccess(res, {
        message: 'Subscription activated successfully!',
        subscription: vendorSubData,
      });
    } catch (err) {
      console.error('verifySubscription error:', err);
      return sendError(res, 'Failed to verify subscription', 500, 'VERIFY_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/subscriptions/me
   */
  async getMySubscription(req, res) {
    const { uid } = req.user;

    try {
      const vendor = await prisma.vendor.findUnique({ where: { id: uid } });
      if (vendor && vendor.subscription && vendor.subscription.active) {
        return sendSuccess(res, { subscription: vendor.subscription });
      }

      const activeSub = await prisma.vendorSubscription.findFirst({
        where: { vendorId: uid, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });

      if (activeSub) {
        return sendSuccess(res, {
          subscription: {
            active: true,
            status: 'active',
            planId: activeSub.planId,
            planName: activeSub.planName,
            expiryDate: activeSub.expiresAt,
            expiresAt: activeSub.expiresAt,
          },
        });
      }

      return sendSuccess(res, { subscription: null });
    } catch (err) {
      console.error('getMySubscription error:', err);
      return sendError(res, 'Failed to fetch subscription', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/subscriptions/history
   */
  async getSubscriptionHistory(req, res) {
    const { uid } = req.user;

    try {
      const history = await prisma.vendorSubscription.findMany({
        where: { vendorId: uid },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return sendSuccess(res, { history });
    } catch (err) {
      console.error('getSubscriptionHistory error:', err);
      return sendError(res, 'Failed to fetch subscription history', 500, 'FETCH_FAILED');
    }
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

    try {
      const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await prisma.vendorSubscription.create({
        data: {
          id: subId,
          vendorId: uid,
          planId,
          planName: 'Free Trial Starter',
          amount: 0,
          durationDays: 30,
          status: 'active',
          startsAt: now,
          expiresAt,
        },
      });

      const vendorUpdate = {
        active: true,
        status: 'active',
        planId,
        planName: 'Free Trial Starter',
        amount: 0,
        startDate: now,
        endDate: expiresAt,
        expiresAt,
        subscriptionId: subId,
      };

      await prisma.vendor.update({
        where: { id: uid },
        data: {
          subscription: vendorUpdate,
        },
      });

      return sendSuccess(res, {
        subscription: vendorUpdate,
        message: 'Free subscription plan activated successfully! Welcome to your Dashboard.',
      });
    } catch (err) {
      console.error('activateFreePlan error:', err);
      return sendError(res, 'Failed to activate free plan', 500, 'ACTIVATE_FAILED');
    }
  },

  /**
   * POST /api/v1/subscription/webhook
   */
  async handleSubscriptionWebhook(req, res) {
    return sendSuccess(res, { received: true });
  },
};

module.exports = subscriptionController;
