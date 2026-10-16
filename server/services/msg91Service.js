const axios = require('axios');
const integrationConfigService = require('./integrationConfigService');

/**
 * MSG91 SMS & OTP Service (DLT compliant + OTP Widget Verification)
 */
const msg91Service = {
  /**
   * Send 4-digit OTP to mobile phone number via MSG91 API v5
   * @param {string} phone - e.g. "9876543210" or "+919876543210"
   * @param {string} otp - 4-digit numeric OTP code
   */
  async sendOtpSms(phone, otp) {
    const config = await integrationConfigService.getMsg91Config();
    const authKey = config.authKey;
    const templateId = config.templateId;
    const senderId = config.senderId || 'TURFBK';

    // Normalize phone number (E.164 without '+' or standard 10/12 digit format)
    const cleanPhone = String(phone).replace(/\D/g, '');
    const mobileWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const isDummyKey = !authKey || !templateId || authKey.includes('your_') || templateId.includes('your_');

    if (isDummyKey) {
      console.log(`\n========================================`);
      console.log(`📱 [MSG91 SMS OTP SERVICE] To: +${mobileWithCountry}`);
      console.log(`🔑 Real Generated OTP Code: ${otp}`);
      console.log(`⏱️ Expiry: 10 minutes`);
      console.log(`ℹ️ Provide active MSG91 credentials in Super Admin for live DLT SMS`);
      console.log(`========================================\n`);
      return {
        success: true,
        mock: true,
        message: 'Mock SMS logged to server console. Configure MSG91 in Super Admin for live SMS delivery.',
      };
    }

    try {
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
          timeout: 10000,
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

  /**
   * Verify MSG91 OTP Widget Access Token Server-Side
   * Official Endpoint: https://control.msg91.com/api/v5/widget/verifyAccessToken
   * @param {string} accessToken - Token returned by MSG91 frontend widget
   * @returns {Promise<{ success: boolean, mobile: string, raw: Object }>}
   */
  async verifyWidgetAccessToken(accessToken) {
    if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new Error('Access token is required for MSG91 widget verification');
    }

    const config = await integrationConfigService.getMsg91Config();
    const authKey = config.authKey;

    if (!authKey || authKey.includes('your_')) {
      throw new Error('MSG91 AuthKey is not configured on the backend. Please configure MSG91 in Super Admin.');
    }

    try {
      // MSG91 official verifyAccessToken endpoint
      const response = await axios.post(
        'https://control.msg91.com/api/v5/widget/verifyAccessToken',
        {
          token: accessToken.trim(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authkey: authKey,
          },
          timeout: 10000,
        }
      );

      const resData = response.data || {};
      const isSuccess = resData.type === 'success' || resData.status === 'success' || resData.message === 'Access token verified successfully';

      if (!isSuccess) {
        throw new Error(resData.message || 'Access token verification failed at MSG91');
      }

      // Extract verified mobile number from response
      // MSG91 typically returns { type: 'success', message: '...', data: { mobile: '919876543210' } } or resData.mobile
      let rawPhone = resData.data?.mobile || resData.data?.phone || resData.mobile || resData.number || '';
      if (!rawPhone && typeof resData.message === 'string') {
        const match = resData.message.match(/\d{10,12}/);
        if (match) rawPhone = match[0];
      }

      const cleanDigits = String(rawPhone).replace(/\D/g, '');
      const standard10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      return {
        success: true,
        verified: true,
        mobile: standard10,
        fullMobileWithCountry: cleanDigits,
        raw: resData,
      };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to verify MSG91 widget access token';
      console.error('❌ MSG91 Widget Verification Error:', err.response?.data || err.message);
      throw new Error(errMsg);
    }
  },

  /**
   * Non-destructive test of MSG91 credentials using the balance API
   */
  async testConnection(overrideCredentials = null) {
    const creds = overrideCredentials || (await integrationConfigService.getMsg91Config());
    const authKey = creds.authKey;

    if (!authKey || authKey.includes('your_')) {
      throw new Error('Valid MSG91 AuthKey is required to test MSG91 connection.');
    }

    try {
      // MSG91 Balance API provides a non-destructive check of the AuthKey
      const response = await axios.get('https://control.msg91.com/api/v5/balance', {
        headers: {
          authkey: authKey,
        },
        timeout: 10000,
      });

      const resData = response.data || {};
      return {
        success: true,
        message: 'Successfully verified MSG91 AuthKey with provider API.',
        data: resData,
      };
    } catch (err) {
      // Handle 401 specifically
      if (err.response?.status === 401) {
        throw new Error('Invalid MSG91 AuthKey: Provider returned 401 Unauthorized.');
      }
      const errMsg = err.response?.data?.message || err.message || 'MSG91 connection test failed.';
      throw new Error(errMsg);
    }
  },

  /**
   * Retrieve live usage metrics and account balance from MSG91
   */
  async getUsage() {
    const config = await integrationConfigService.getMsg91Config();
    const authKey = config.authKey;

    if (!authKey || authKey.includes('your_')) {
      return {
        available: false,
        reason: 'MSG91 AuthKey not configured in Super Admin.',
      };
    }

    try {
      const balanceRes = await axios.get('https://control.msg91.com/api/v5/balance', {
        headers: {
          authkey: authKey,
        },
        timeout: 10000,
      });

      return {
        available: true,
        widgetId: config.widgetId,
        widgetName: config.widgetName,
        senderId: config.senderId,
        templateId: config.templateId,
        balances: balanceRes.data || {},
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        available: false,
        error: err.response?.data?.message || err.message || 'Failed to fetch MSG91 account balance.',
      };
    }
  },
};

module.exports = msg91Service;
