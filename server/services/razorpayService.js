const crypto = require('crypto');
const razorpay = require('../config/razorpay');

/**
 * Razorpay Payment Gateway Service
 */
const razorpayService = {
  /**
   * Create Razorpay Order via official API
   * @param {number} amountInRupees - Amount in INR (e.g. 500)
   * @param {string} receiptId - Unique identifier (bookingId)
   * @param {Object} notes - Metadata object
   */
  async createOrder(amountInRupees, receiptId, notes = {}) {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const isPlaceholder = !keyId || !keySecret || keyId.includes('xxxx') || keySecret.includes('your_razorpay');

    if (!razorpay || isPlaceholder) {
      throw new Error('Razorpay API keys are missing or invalid in server/.env. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    const amountInPaise = Math.round(Number(amountInRupees || 0) * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: String(receiptId),
      notes,
    };

    try {
      return await razorpay.orders.create(options);
    } catch (err) {
      console.error('⚠️ Razorpay API order creation error:', err?.message || err);
      throw new Error(`Razorpay Order Creation Failed: ${err?.message || 'Check Razorpay API Keys'}`);
    }
  },

  /**
   * Cryptographically verify Razorpay payment signature using HMAC-SHA256
   */
  verifySignature(orderId, paymentId, razorpaySignature) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret || keySecret.includes('your_razorpay') || keySecret.includes('xxxx')) {
      console.warn('⚠️ RAZORPAY_KEY_SECRET is missing or invalid in .env');
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
  verifyWebhookSignature(rawBody, signature, webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET) {
    if (!webhookSecret || webhookSecret.includes('your_razorpay')) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  },
};

module.exports = razorpayService;
