const { query } = require('../config/db');
const { encrypt, decrypt, maskSecret, isMasked } = require('../utils/cryptoUtils');

class IntegrationConfigService {
  constructor() {
    this.cache = new Map();
    this.listeners = [];
    this.initialized = false;
  }

  /**
   * Initialize service by loading saved configurations from PostgreSQL,
   * falling back to environment variables.
   */
  async init() {
    if (this.initialized) return;
    try {
      const res = await query('SELECT * FROM public.api_integrations');
      for (const row of res.rows) {
        this.cache.set(row.provider, {
          provider: row.provider,
          isEnabled: Boolean(row.is_enabled),
          status: row.status || 'not_configured',
          config: row.config || {},
          lastTestAt: row.last_test_at,
          lastError: row.last_error,
          lastSuccessAt: row.last_success_at,
          updatedAt: row.updated_at,
        });
      }
      this.initialized = true;
    } catch (err) {
      console.warn('⚠️ Could not load api_integrations from DB during init, using env vars fallback:', err.message);
    }
  }

  /**
   * Helper to ensure database table is checked
   */
  async ensureLoaded() {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Register a callback triggered whenever a provider configuration is saved
   */
  onConfigChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(provider, config) {
    for (const listener of this.listeners) {
      try {
        listener(provider, config);
      } catch (e) {
        console.warn(`⚠️ Error in integration config listener for ${provider}:`, e.message);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MSG91
  // ──────────────────────────────────────────────────────────────────────────
  async getMsg91Config() {
    await this.ensureLoaded();
    const stored = this.cache.get('msg91');
    const storedConfig = stored?.config || {};

    // Decrypt stored secret or fallback to process.env
    const authKey = storedConfig.authKey
      ? decrypt(storedConfig.authKey)
      : (process.env.MSG91_AUTH_KEY || '');

    const templateId = storedConfig.templateId || process.env.MSG91_TEMPLATE_ID || '6ad1ae899c8886fb2c0fd52';
    const senderId = storedConfig.senderId || process.env.MSG91_SENDER_ID || 'TURFBK';
    const widgetId = storedConfig.widgetId || '366a7065614c383633313238';
    const widgetName = storedConfig.widgetName || 'SecureOTPWidgetEJAO';
    const widgetToken = storedConfig.widgetToken
      ? decrypt(storedConfig.widgetToken)
      : (storedConfig.widgetToken || '');
    const isEnabled = stored ? stored.isEnabled : true;
    const status = stored?.status || (authKey && !authKey.includes('your_') ? 'connected' : 'not_configured');

    return {
      authKey,
      templateId,
      senderId,
      widgetId,
      widgetName,
      widgetToken,
      isEnabled,
      status,
      lastTestAt: stored?.lastTestAt,
      lastError: stored?.lastError,
      lastSuccessAt: stored?.lastSuccessAt,
      updatedAt: stored?.updatedAt,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CLOUDINARY
  // ──────────────────────────────────────────────────────────────────────────
  async getCloudinaryConfig() {
    await this.ensureLoaded();
    const stored = this.cache.get('cloudinary');
    const storedConfig = stored?.config || {};

    const cloudName = storedConfig.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '';
    const apiKey = storedConfig.apiKey || process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = storedConfig.apiSecret
      ? decrypt(storedConfig.apiSecret)
      : (process.env.CLOUDINARY_API_SECRET || '');
    const uploadPreset = storedConfig.uploadPreset || process.env.CLOUDINARY_UPLOAD_PRESET || 'Turf-App';
    const isEnabled = stored ? stored.isEnabled : true;
    const status = stored?.status || (cloudName && (apiSecret || uploadPreset) ? 'connected' : 'not_configured');

    return {
      cloudName,
      apiKey,
      apiSecret,
      uploadPreset,
      isEnabled,
      status,
      lastTestAt: stored?.lastTestAt,
      lastError: stored?.lastError,
      lastSuccessAt: stored?.lastSuccessAt,
      updatedAt: stored?.updatedAt,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RAZORPAY
  // ──────────────────────────────────────────────────────────────────────────
  async getRazorpayConfig() {
    await this.ensureLoaded();
    const stored = this.cache.get('razorpay');
    const storedConfig = stored?.config || {};

    const keyId = storedConfig.keyId || process.env.RAZORPAY_KEY_ID || '';
    const keySecret = storedConfig.keySecret
      ? decrypt(storedConfig.keySecret)
      : (process.env.RAZORPAY_KEY_SECRET || '');
    const webhookSecret = storedConfig.webhookSecret
      ? decrypt(storedConfig.webhookSecret)
      : (process.env.RAZORPAY_WEBHOOK_SECRET || '');

    const mode = storedConfig.mode || (keyId.startsWith('rzp_live') ? 'live' : 'test');
    const isEnabled = stored ? stored.isEnabled : true;
    const isConfigured = Boolean(keyId && keySecret && !keyId.includes('xxxx') && !keySecret.includes('your_'));
    const status = stored?.status || (isConfigured ? 'connected' : 'not_configured');

    return {
      keyId,
      keySecret,
      webhookSecret,
      mode,
      isEnabled,
      status,
      lastTestAt: stored?.lastTestAt,
      lastError: stored?.lastError,
      lastSuccessAt: stored?.lastSuccessAt,
      updatedAt: stored?.updatedAt,
    };
  }

  /**
   * Retrieve masked integration summaries for Super Admin UI presentation
   */
  async getAllMasked() {
    const [msg91, cloudinary, razorpay] = await Promise.all([
      this.getMsg91Config(),
      this.getCloudinaryConfig(),
      this.getRazorpayConfig(),
    ]);

    return {
      msg91: {
        provider: 'msg91',
        name: 'MSG91',
        category: 'SMS & OTP Authentication',
        isEnabled: msg91.isEnabled,
        status: msg91.status,
        lastTestAt: msg91.lastTestAt,
        lastError: msg91.lastError,
        lastSuccessAt: msg91.lastSuccessAt,
        updatedAt: msg91.updatedAt,
        credentials: {
          authKey: maskSecret(msg91.authKey),
          hasAuthKey: Boolean(msg91.authKey && !msg91.authKey.includes('your_')),
          templateId: msg91.templateId,
          senderId: msg91.senderId,
          widgetId: msg91.widgetId,
          widgetName: msg91.widgetName,
          widgetToken: maskSecret(msg91.widgetToken),
          hasWidgetToken: Boolean(msg91.widgetToken),
        },
      },
      cloudinary: {
        provider: 'cloudinary',
        name: 'Cloudinary',
        category: 'Media Storage & Image Delivery',
        isEnabled: cloudinary.isEnabled,
        status: cloudinary.status,
        lastTestAt: cloudinary.lastTestAt,
        lastError: cloudinary.lastError,
        lastSuccessAt: cloudinary.lastSuccessAt,
        updatedAt: cloudinary.updatedAt,
        credentials: {
          cloudName: cloudinary.cloudName,
          apiKey: cloudinary.apiKey,
          apiSecret: maskSecret(cloudinary.apiSecret),
          hasApiSecret: Boolean(cloudinary.apiSecret),
          uploadPreset: cloudinary.uploadPreset,
        },
      },
      razorpay: {
        provider: 'razorpay',
        name: 'Razorpay',
        category: 'Payment Gateway & Transactions',
        isEnabled: razorpay.isEnabled,
        status: razorpay.status,
        lastTestAt: razorpay.lastTestAt,
        lastError: razorpay.lastError,
        lastSuccessAt: razorpay.lastSuccessAt,
        updatedAt: razorpay.updatedAt,
        credentials: {
          keyId: razorpay.keyId,
          keySecret: maskSecret(razorpay.keySecret),
          hasKeySecret: Boolean(razorpay.keySecret && !razorpay.keySecret.includes('your_')),
          webhookSecret: maskSecret(razorpay.webhookSecret),
          hasWebhookSecret: Boolean(razorpay.webhookSecret && !razorpay.webhookSecret.includes('your_')),
          mode: razorpay.mode,
        },
      },
    };
  }

  /**
   * Save provider configuration with secret preservation and AES-256 encryption
   */
  async saveConfig(provider, incomingData) {
    await this.ensureLoaded();
    const { isEnabled = true, credentials = {} } = incomingData;

    let existingRaw;
    if (provider === 'msg91') existingRaw = await this.getMsg91Config();
    else if (provider === 'cloudinary') existingRaw = await this.getCloudinaryConfig();
    else if (provider === 'razorpay') existingRaw = await this.getRazorpayConfig();
    else throw new Error(`Unsupported integration provider: ${provider}`);

    const newConfig = {};

    if (provider === 'msg91') {
      const authKey = isMasked(credentials.authKey) || !credentials.authKey
        ? existingRaw.authKey
        : credentials.authKey.trim();
      newConfig.authKey = encrypt(authKey);

      newConfig.templateId = (credentials.templateId || existingRaw.templateId || '').trim();
      newConfig.senderId = (credentials.senderId || existingRaw.senderId || '').trim();
      newConfig.widgetId = (credentials.widgetId || existingRaw.widgetId || '').trim();
      newConfig.widgetName = (credentials.widgetName || existingRaw.widgetName || '').trim();

      const widgetToken = isMasked(credentials.widgetToken) || !credentials.widgetToken
        ? existingRaw.widgetToken
        : credentials.widgetToken.trim();
      newConfig.widgetToken = encrypt(widgetToken);
    } else if (provider === 'cloudinary') {
      newConfig.cloudName = (credentials.cloudName || existingRaw.cloudName || '').trim();
      newConfig.apiKey = (credentials.apiKey || existingRaw.apiKey || '').trim();

      const apiSecret = isMasked(credentials.apiSecret) || !credentials.apiSecret
        ? existingRaw.apiSecret
        : credentials.apiSecret.trim();
      newConfig.apiSecret = encrypt(apiSecret);

      newConfig.uploadPreset = (credentials.uploadPreset || existingRaw.uploadPreset || '').trim();
    } else if (provider === 'razorpay') {
      newConfig.keyId = (credentials.keyId || existingRaw.keyId || '').trim();

      const keySecret = isMasked(credentials.keySecret) || !credentials.keySecret
        ? existingRaw.keySecret
        : credentials.keySecret.trim();
      newConfig.keySecret = encrypt(keySecret);

      const webhookSecret = isMasked(credentials.webhookSecret) || !credentials.webhookSecret
        ? existingRaw.webhookSecret
        : credentials.webhookSecret.trim();
      newConfig.webhookSecret = encrypt(webhookSecret);

      newConfig.mode = credentials.mode || (newConfig.keyId.startsWith('rzp_live') ? 'live' : 'test');
    }

    const now = new Date();
    await query(
      `INSERT INTO public.api_integrations (provider, is_enabled, config, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider)
       DO UPDATE SET
         is_enabled = EXCLUDED.is_enabled,
         config = EXCLUDED.config,
         updated_at = EXCLUDED.updated_at`,
      [provider, Boolean(isEnabled), JSON.stringify(newConfig), now]
    );

    // Update internal cache
    const currentEntry = this.cache.get(provider) || {};
    this.cache.set(provider, {
      ...currentEntry,
      provider,
      isEnabled: Boolean(isEnabled),
      config: newConfig,
      updatedAt: now,
    });

    // Notify listeners for hot-reloading active clients
    const activeConfig = await (provider === 'msg91'
      ? this.getMsg91Config()
      : provider === 'cloudinary'
      ? this.getCloudinaryConfig()
      : this.getRazorpayConfig());

    this.notifyListeners(provider, activeConfig);

    return activeConfig;
  }

  /**
   * Update diagnostic status and timestamps after test connection or live error
   */
  async updateStatus(provider, { status, lastError = null, isSuccess = false }) {
    await this.ensureLoaded();
    const now = new Date();

    const updates = ['status = $2', 'updated_at = $3'];
    const values = [provider, status, now];
    let idx = 4;

    updates.push(`last_test_at = $${idx++}`);
    values.push(now);

    if (lastError !== undefined) {
      updates.push(`last_error = $${idx++}`);
      values.push(lastError);
    }

    if (isSuccess) {
      updates.push(`last_success_at = $${idx++}`);
      values.push(now);
    }

    const sql = `UPDATE public.api_integrations SET ${updates.join(', ')} WHERE provider = $1`;
    await query(sql, values);

    const cached = this.cache.get(provider) || {};
    this.cache.set(provider, {
      ...cached,
      status,
      lastTestAt: now,
      lastError,
      ...(isSuccess && { lastSuccessAt: now }),
      updatedAt: now,
    });
  }
}

const instance = new IntegrationConfigService();
module.exports = instance;
