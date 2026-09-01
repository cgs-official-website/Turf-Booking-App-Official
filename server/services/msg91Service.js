const axios = require('axios');

/**
 * MSG91 SMS OTP Service (DLT compliant)
 */
const msg91Service = {
  /**
   * Send 6-digit OTP to mobile phone number
   * @param {string} phone - e.g. "9876543210" or "+919876543210"
   * @param {string} otp - 6-digit numeric OTP code
   */
  async sendOtpSms(phone, otp) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID || 'TURFBK';

    // Normalize phone number (E.164 without '+' or standard 10/12 digit format)
    const cleanPhone = phone.replace(/\D/g, '');
    const mobileWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    if (!authKey || !templateId) {
      console.log(`\n========================================`);
      console.log(`📱 [MOCK MSG91 SMS OTP] To: +${mobileWithCountry}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`⏱️ Expiry: 5 minutes`);
      console.log(`========================================\n`);
      return { success: true, mock: true, message: 'Mock SMS sent' };
    }

    try {
      // MSG91 Send OTP endpoint
      const response = await axios.post(
        'https://api.msg91.com/api/v5/otp',
        {
          template_id: templateId,
          mobile: mobileWithCountry,
          authkey: authKey,
          otp: String(otp),
          sender: senderId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authkey: authKey,
          },
        }
      );

      return {
        success: response.data.type === 'success',
        data: response.data,
      };
    } catch (err) {
      console.error('❌ MSG91 SMS Error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.message || 'Failed to send SMS OTP via MSG91');
    }
  },
};

module.exports = msg91Service;
