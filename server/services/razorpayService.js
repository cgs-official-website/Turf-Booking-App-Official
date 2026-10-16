const crypto = require('crypto');
const Razorpay = require('razorpay');
const integrationConfigService = require('./integrationConfigService');
const { query } = require('../config/db');

let activeClient = null;
let activeConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  mode: (process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_live') ? 'live' : 'test',
  isEnabled: true,
};

function rebuildClient(cfg) {
  if (!cfg) return;
  activeConfig = {
    keyId: cfg.keyId || '',
    keySecret: cfg.keySecret || '',
    webhookSecret: cfg.webhookSecret || '',
    mode: cfg.mode || (cfg.keyId?.startsWith('rzp_live') ? 'live' : 'test'),
    isEnabled: cfg.isEnabled !== false,
  };

  const isConfigured = Boolean(
    activeConfig.keyId &&
    activeConfig.keySecret &&
    !activeConfig.keyId.includes('xxxx') &&
    !activeConfig.keySecret.includes('your_')
  );

  if (isConfigured) {
    try {
      activeClient = new Razorpay({
        key_id: activeConfig.keyId,
        key_secret: activeConfig.keySecret,
      });
      console.log(`✅ Razorpay client initialized in [${activeConfig.mode.toUpperCase()}] mode`);
    } catch (e) {
      console.warn('⚠️ Razorpay client initialization error:', e.message);
      activeClient = null;
    }
  } else {
    activeClient = null;
  }
}

// Initial bootstrap
rebuildClient(activeConfig);

// Asynchronously load saved config from DB
(async () => {
  try {
    const dbConfig = await integrationConfigService.getRazorpayConfig();
    rebuildClient(dbConfig);
  } catch (e) {
    console.warn('⚠️ Razorpay initial DB config sync deferred:', e.message);
  }
})();

// Hot-reload on config updates from Super Admin
integrationConfigService.onConfigChange((provider, newConfig) => {
  if (provider === 'razorpay') {
    console.log('🔄 Hot-reloading Razorpay configuration...');
    rebuildClient(newConfig);
  }
});

const razorpayService = {
  /**
   * Get the active public Razorpay Key ID
   */
  async getActiveKeyId() {
    const cfg = await integrationConfigService.getRazorpayConfig();
    return cfg.keyId || activeConfig.keyId;
  },

  /**
   * Returns current mode ('test' | 'live')
   */
  getMode() {
    return activeConfig.mode;
  },

  isConfigured() {
    return Boolean(
      activeConfig.isEnabled &&
      activeConfig.keyId &&
      activeConfig.keySecret &&
      !activeConfig.keyId.includes('xxxx') &&
      !activeConfig.keySecret.includes('your_')
    );
  },

  /**
   * Create Razorpay Order via official API
   */
  async createOrder(amountInRupees, receiptId, notes = {}) {
    const cfg = await integrationConfigService.getRazorpayConfig();
    if (!cfg.isEnabled) {
      throw new Error('Razorpay integration is currently disabled in Super Admin.');
    }

    const keyId = cfg.keyId || activeConfig.keyId;
    const keySecret = cfg.keySecret || activeConfig.keySecret;
    const isPlaceholder = !keyId || !keySecret || keyId.includes('xxxx') || keySecret.includes('your_');

    if (isPlaceholder) {
      throw new Error('Razorpay API keys are missing or invalid. Please configure active Razorpay credentials in Super Admin.');
    }

    // Ensure client is up to date
    let client = activeClient;
    if (!client || activeConfig.keyId !== keyId || activeConfig.keySecret !== keySecret) {
      client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }

    const amountInPaise = Math.round(Number(amountInRupees || 0) * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: String(receiptId),
      notes,
    };

    try {
      return await client.orders.create(options);
    } catch (err) {
      console.error('⚠️ Razorpay API order creation error:', err?.message || err);
      throw new Error(`Razorpay Order Creation Failed: ${err?.message || 'Check Razorpay API Keys'}`);
    }
  },

  /**
   * Cryptographically verify Razorpay payment signature using HMAC-SHA256
   */
  async verifySignature(orderId, paymentId, razorpaySignature) {
    const cfg = await integrationConfigService.getRazorpayConfig();
    const keySecret = cfg.keySecret || activeConfig.keySecret;

    if (!keySecret || keySecret.includes('your_razorpay') || keySecret.includes('xxxx')) {
      console.warn('⚠️ RAZORPAY_KEY_SECRET is missing or invalid');
      return false;
    }

    if (!orderId || !paymentId || !razorpaySignature) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    return generatedSignature === razorpaySignature;
  },

  /**
   * Verify Razorpay Webhook signature
   */
  async verifyWebhookSignature(rawBody, signature, overrideSecret = null) {
    const cfg = await integrationConfigService.getRazorpayConfig();
    const webhookSecret = overrideSecret || cfg.webhookSecret || activeConfig.webhookSecret;

    if (!webhookSecret || webhookSecret.includes('your_razorpay')) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  },

  /**
   * Non-destructive test of Razorpay credentials by calling orders.all({ count: 1 })
   */
  async testConnection(overrideCredentials = null) {
    const creds = overrideCredentials || (await integrationConfigService.getRazorpayConfig());
    const keyId = creds.keyId || activeConfig.keyId;
    const keySecret = creds.keySecret || activeConfig.keySecret;

    if (!keyId || !keySecret || keyId.includes('xxxx') || keySecret.includes('your_')) {
      throw new Error('Valid Key ID and Key Secret are required to test Razorpay connection.');
    }

    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    try {
      // Safe read query that verifies API authentication without modifying or creating data
      const result = await client.orders.all({ count: 1 });
      const mode = keyId.startsWith('rzp_live') ? 'live' : 'test';
      return {
        success: true,
        mode,
        message: `Successfully verified Razorpay credentials in ${mode.toUpperCase()} mode.`,
        ordersFound: Array.isArray(result?.items) ? result.items.length : 0,
      };
    } catch (err) {
      throw new Error(err?.error?.description || err.message || 'Razorpay authentication failed. Verify Key ID and Secret.');
    }
  },

  /**
   * Aggregate local payment and transaction stats from PostgreSQL
   */
  async getPaymentStats() {
    try {
      const statsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'captured') as captured_count,
          COUNT(*) FILTER (WHERE status = 'created') as pending_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE status = 'refunded' OR status = 'partially_refunded') as refunded_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'captured'), 0) as total_captured_amount,
          COALESCE(SUM(refund_amount), 0) as total_refund_amount,
          MAX(created_at) as last_payment_at
        FROM public.payments
      `;
      const res = await query(statsQuery);
      const row = res.rows[0] || {};

      const latestPaymentRes = await query(`
        SELECT id, razorpay_order_id, razorpay_payment_id, amount, status, created_at
        FROM public.payments
        ORDER BY created_at DESC
        LIMIT 1
      `);

      return {
        available: true,
        mode: activeConfig.mode,
        isConfigured: this.isConfigured(),
        metrics: {
          capturedCount: parseInt(row.captured_count || 0, 10),
          pendingCount: parseInt(row.pending_count || 0, 10),
          failedCount: parseInt(row.failed_count || 0, 10),
          refundedCount: parseInt(row.refunded_count || 0, 10),
          totalCapturedInr: parseFloat(row.total_captured_amount || 0),
          totalRefundedInr: parseFloat(row.total_refund_amount || 0),
          lastPaymentAt: row.last_payment_at || null,
        },
        latestTransaction: latestPaymentRes.rows[0] || null,
      };
    } catch (err) {
      return {
        available: false,
        error: err.message || 'Failed to aggregate local transaction statistics.',
      };
    }
  },
};

module.exports = razorpayService;
