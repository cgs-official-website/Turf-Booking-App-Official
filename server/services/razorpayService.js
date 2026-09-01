const crypto = require('crypto');
const razorpay = require('../config/razorpay');

/**
 * Razorpay Payment Gateway Service
 */
const razorpayService = {
  /**
   * Create Razorpay Order
   * @param {number} amountInRupees - Amount in INR (e.g. 500)
   * @param {string} receiptId - Unique identifier (bookingId / subId)
   * @param {Object} notes - Metadata object
   */
  async createOrder(amountInRupees, receiptId, notes = {}) {
    if (!razorpay) {
      console.warn('⚠️ Razorpay is not configured. Returning mock order for testing.');
      return {
        id: `order_mock_${Date.now()}`,
        amount: Math.round(amountInRupees * 100),
        currency: 'INR',
        receipt: receiptId,
        status: 'created',
      };
    }

    const options = {
      amount: Math.round(amountInRupees * 100), // convert to paise
      currency: 'INR',
      receipt: String(receiptId),
      notes,
    };

    return razorpay.orders.create(options);
  },

  /**
   * Verify Razorpay payment signature from client app
   */
  verifySignature(orderId, paymentId, razorpaySignature) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.warn('⚠️ RAZORPAY_KEY_SECRET missing. Accepting mock signature.');
      return true;
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    return generatedSignature === razorpaySignature;
  },

  /**
   * Verify Razorpay Webhook signature
   */
  verifyWebhookSignature(rawBody, signature, webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET) {
    if (!webhookSecret) {
      console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET missing in .env');
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
