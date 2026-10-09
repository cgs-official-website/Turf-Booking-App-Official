const axios = require('axios');

/**
 * MSG91 SMS OTP Service (DLT compliant)
 */
const msg91Service = {
  /**
   * Send 4-digit OTP to mobile phone number
   * @param {string} phone - e.g. "9876543210" or "+919876543210"
   * @param {string} otp - 4-digit numeric OTP code
   */
  async sendOtpSms(phone, otp) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID || 'TURFBK';

    // Normalize phone number (E.164 without '+' or standard 10/12 digit format)
    const cleanPhone = String(phone).replace(/\D/g, '');
    const mobileWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const isDummyKey = !authKey || !templateId || authKey.includes('your_') || templateId.includes('your_');

    if (isDummyKey) {
      console.log(`\n========================================`);
      console.log(`📱 [MSG91 SMS OTP SERVICE] To: +${mobileWithCountry}`);
      console.log(`🔑 Real Generated OTP Code: ${otp}`);
      console.log(`⏱️ Expiry: 10 minutes`);
      console.log(`ℹ️ Provide MSG91_AUTH_KEY & MSG91_TEMPLATE_ID in server/.env for live DLT SMS`);
      console.log(`========================================\n`);
      return {
        success: true,
        mock: true,
        message: 'Mock SMS logged to server console. Configure MSG91 env vars for live SMS delivery.',
      };
    }

    try {
      // MSG91 Send OTP endpoint (control.msg91.com API v5)
      const response = await axios.post(
        `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${mobileWithCountry}`,
        {
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

      const resData = response.data || {};
      const isSuccess = resData.type === 'success' || resData.status === 'success';

      if (!isSuccess) {
        throw new Error(resData.message || 'MSG91 provider returned an error while delivering SMS');
      }

      return {
        success: true,
        data: resData,
      };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to send SMS OTP via MSG91';
      console.error('❌ MSG91 SMS Error:', err.response?.data || err.message);
      throw new Error(errMsg);
    }
  },
};

module.exports = msg91Service;
