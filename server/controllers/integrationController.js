const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const integrationConfigService = require('../services/integrationConfigService');
const cloudinaryService = require('../services/cloudinaryService');
const razorpayService = require('../services/razorpayService');
const msg91Service = require('../services/msg91Service');
const { sendSuccess, sendError } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = '30d';

function formatUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    uid: user.id,
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    avatar: user.avatar || '',
    photoURL: user.avatar || '',
    location: user.location || null,
    status: user.status,
    role: 'user',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function formatVendor(vendor) {
  if (!vendor) return null;
  const sub = vendor.subscription || {};
  const hasActiveSub = Boolean(sub.active || sub.status === 'active');
  return {
    id: vendor.id,
    uid: vendor.id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone || '',
    avatar: vendor.avatar || '',
    photoURL: vendor.avatar || '',
    role: 'vendor',
    kycStatus: vendor.kycStatus,
    turfOnboardingComplete: vendor.turfOnboardingComplete,
    turfApprovalAcknowledged: vendor.turfApprovalAcknowledged,
    rejectionReason: vendor.rejectionReason || null,
    reviewedAt: vendor.reviewedAt || null,
    hasPaidSubscription: hasActiveSub,
    subscription: vendor.subscription || { active: false },
    createdAt: vendor.createdAt,
  };
}

const integrationController = {
  /**
   * GET /api/v1/admin/integrations
   * Retrieve all integration configs with masked credentials for Super Admin dashboard
   */
  async getAllIntegrations(req, res) {
    try {
      const data = await integrationConfigService.getAllMasked();
      return sendSuccess(res, data);
    } catch (err) {
      console.error('Failed to get integrations:', err);
      return sendError(res, 'Failed to retrieve integration configurations', 500);
    }
  },

  /**
   * PUT /api/v1/admin/integrations/:provider
   * Save provider configuration with secret encryption and preservation
   */
  async updateIntegration(req, res) {
    const { provider } = req.params;
    const { isEnabled, credentials } = req.body;

    if (!['msg91', 'cloudinary', 'razorpay'].includes(provider)) {
      return sendError(res, `Unknown provider: ${provider}`, 400);
    }

    try {
      await integrationConfigService.saveConfig(provider, { isEnabled, credentials });

      // Run an automatic non-destructive connection check if enabled
      let testResult = null;
      let status = isEnabled ? 'connected' : 'disabled';
      let lastError = null;

      if (isEnabled) {
        try {
          if (provider === 'cloudinary') {
            testResult = await cloudinaryService.testConnection();
          } else if (provider === 'razorpay') {
            testResult = await razorpayService.testConnection();
          } else if (provider === 'msg91') {
            testResult = await msg91Service.testConnection();
          }
          await integrationConfigService.updateStatus(provider, {
            status: 'connected',
            lastError: null,
            isSuccess: true,
          });
        } catch (testErr) {
          status = 'error';
          lastError = testErr.message;
          await integrationConfigService.updateStatus(provider, {
            status: 'error',
            lastError: testErr.message,
            isSuccess: false,
          });
        }
      } else {
        await integrationConfigService.updateStatus(provider, {
          status: 'disabled',
          lastError: null,
          isSuccess: false,
        });
      }

      const updated = await integrationConfigService.getAllMasked();
      return sendSuccess(res, {
        message: `${provider.toUpperCase()} configuration saved successfully.`,
        provider: updated[provider],
        testResult,
        status,
        lastError,
      });
    } catch (err) {
      console.error(`Failed to update ${provider} integration:`, err);
      return sendError(res, err.message || 'Failed to update integration configuration', 500);
    }
  },

  /**
   * POST /api/v1/admin/integrations/:provider/test
   * Non-destructively test connection without changing data or sending real customer SMS
   */
  async testIntegration(req, res) {
    const { provider } = req.params;
    const incomingCredentials = req.body?.credentials;

    try {
      let result;
      if (provider === 'cloudinary') {
        result = await cloudinaryService.testConnection(incomingCredentials);
      } else if (provider === 'razorpay') {
        result = await razorpayService.testConnection(incomingCredentials);
      } else if (provider === 'msg91') {
        result = await msg91Service.testConnection(incomingCredentials);
      } else {
        return sendError(res, `Unknown provider: ${provider}`, 400);
      }

      await integrationConfigService.updateStatus(provider, {
        status: 'connected',
        lastError: null,
        isSuccess: true,
      });

      return sendSuccess(res, {
        provider,
        connected: true,
        details: result,
      });
    } catch (err) {
      const safeErrorMsg = err.message || 'Connection test failed';
      await integrationConfigService.updateStatus(provider, {
        status: 'error',
        lastError: safeErrorMsg,
        isSuccess: false,
      });

      return sendError(res, safeErrorMsg, 400, 'CONNECTION_TEST_FAILED', {
        provider,
        connected: false,
      });
    }
  },

  /**
   * GET /api/v1/admin/integrations/:provider/usage
   * Fetch live usage, limits, and operational metrics
   */
  async getUsage(req, res) {
    const { provider } = req.params;

    try {
      let usage;
      if (provider === 'cloudinary') {
        usage = await cloudinaryService.getUsage();
      } else if (provider === 'razorpay') {
        usage = await razorpayService.getPaymentStats();
      } else if (provider === 'msg91') {
        usage = await msg91Service.getUsage();
      } else {
        return sendError(res, `Unknown provider: ${provider}`, 400);
      }

      return sendSuccess(res, {
        provider,
        timestamp: new Date().toISOString(),
        usage,
      });
    } catch (err) {
      console.error(`Failed to get usage for ${provider}:`, err);
      return sendError(res, err.message || 'Failed to fetch usage metrics', 500);
    }
  },

  /**
   * GET /api/v1/auth/msg91-widget/config
   * Public endpoint providing safe client-side widget parameters (No secrets)
   */
  async getWidgetConfig(req, res) {
    try {
      const config = await integrationConfigService.getMsg91Config();
      return sendSuccess(res, {
        widgetId: config.widgetId || '366a7065614c383633313238',
        widgetName: config.widgetName || 'SecureOTPWidgetEJAO',
        isEnabled: config.isEnabled,
        isConfigured: Boolean(config.authKey && !config.authKey.includes('your_')),
      });
    } catch (err) {
      return sendError(res, 'Failed to fetch widget configuration', 500);
    }
  },

  /**
   * POST /api/v1/auth/msg91-widget/verify
   * Verify MSG91 Widget Access Token server-side and complete Customer / Partner sign in
   */
  async verifyWidgetOtp(req, res) {
    const { accessToken, role = 'user', name } = req.body;

    if (!accessToken) {
      return sendError(res, 'MSG91 Widget accessToken is required', 400, 'MISSING_ACCESS_TOKEN');
    }

    try {
      // 1. Verify token server-side with MSG91 verifyAccessToken API
      const verification = await msg91Service.verifyWidgetAccessToken(accessToken);
      const cleanPhone = verification.mobile;

      if (!cleanPhone || cleanPhone.length < 10) {
        return sendError(res, 'Verified phone number could not be extracted from provider response', 400, 'PHONE_EXTRACT_FAILED');
      }

      // 2. Locate or provision player / vendor account
      let profile = null;
      const uid = `${role}_${cleanPhone}`;

      if (role === 'vendor') {
        let vendor = await prisma.vendor.findFirst({
          where: {
            OR: [{ phone: cleanPhone }, { id: uid }],
          },
        });

        if (vendor) {
          if (vendor.kycStatus === 'suspended') {
            return sendError(res, 'Your vendor account has been suspended. Please contact Super Admin support.', 403, 'ACCOUNT_SUSPENDED');
          }
          if (vendor.kycStatus === 'rejected') {
            const reason = vendor.rejectionReason ? ` Reason: ${vendor.rejectionReason}` : '';
            return sendError(res, `Your account registration was not approved.${reason} Please contact support.`, 403, 'KYC_REJECTED');
          }
        } else {
          vendor = await prisma.vendor.create({
            data: {
              id: uid,
              name: name || 'Turf Partner',
              email: `${cleanPhone}@vendor.placeholder`,
              phone: cleanPhone,
              passwordHash: '',
              kycStatus: 'pending',
              subscription: { active: false },
            },
          });
        }
        profile = formatVendor(vendor);
      } else {
        let user = await prisma.user.findFirst({
          where: {
            OR: [{ phone: cleanPhone }, { id: uid }],
          },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              id: uid,
              name: name || 'Turf Player',
              phone: cleanPhone,
              status: 'active',
            },
          });
        }
        profile = formatUser(user);
      }

      // 3. Issue unified session token
      const token = jwt.sign(
        {
          uid: profile.id,
          role,
          phone: cleanPhone,
          admin: false,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return sendSuccess(res, {
        token,
        profile,
        user: profile,
        vendor: profile,
        message: 'Successfully verified and authenticated via MSG91 OTP Widget.',
      });
    } catch (err) {
      console.error('Widget verification failed:', err.message);
      return sendError(res, err.message || 'MSG91 OTP Widget verification failed', 400, 'WIDGET_VERIFICATION_FAILED');
    }
  },
};

module.exports = integrationController;
