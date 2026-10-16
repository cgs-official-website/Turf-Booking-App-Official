const cloudinary = require('cloudinary').v2;
const integrationConfigService = require('./integrationConfigService');

let activeConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'Turf-App',
  isEnabled: true,
};

function applyConfig(cfg) {
  if (!cfg) return;
  activeConfig = {
    cloudName: cfg.cloudName || '',
    apiKey: cfg.apiKey || '',
    apiSecret: cfg.apiSecret || '',
    uploadPreset: cfg.uploadPreset || 'Turf-App',
    isEnabled: cfg.isEnabled !== false,
  };

  if (activeConfig.cloudName) {
    cloudinary.config({
      cloud_name: activeConfig.cloudName,
      ...(activeConfig.apiKey && { api_key: activeConfig.apiKey }),
      ...(activeConfig.apiSecret && { api_secret: activeConfig.apiSecret }),
      secure: true,
    });
  }
}

// Initial configuration
applyConfig(activeConfig);

// Asynchronous sync with database config
(async () => {
  try {
    const dbConfig = await integrationConfigService.getCloudinaryConfig();
    applyConfig(dbConfig);
  } catch (e) {
    console.warn('⚠️ Cloudinary initial DB config sync deferred:', e.message);
  }
})();

// Listen for dynamic updates from Super Admin
integrationConfigService.onConfigChange((provider, newConfig) => {
  if (provider === 'cloudinary') {
    console.log('🔄 Hot-reloading Cloudinary configuration...');
    applyConfig(newConfig);
  }
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const cloudinaryService = {
  isConfigured() {
    return Boolean(
      activeConfig.isEnabled &&
      activeConfig.cloudName &&
      (activeConfig.uploadPreset || (activeConfig.apiKey && activeConfig.apiSecret))
    );
  },

  /**
   * Upload file buffer directly to Cloudinary
   */
  async uploadBuffer(buffer, options = {}) {
    if (!buffer) {
      throw new Error('No file buffer provided for Cloudinary upload');
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error('File size exceeds the 10MB limit');
    }

    if (!this.isConfigured()) {
      throw new Error('Cloudinary credentials/preset not configured or disabled');
    }

    const folder = options.folder || 'turf_app/general';
    const resourceType = options.resource_type || 'auto';

    return new Promise((resolve, reject) => {
      const uploadParams = {
        folder,
        resource_type: resourceType,
        ...(activeConfig.uploadPreset && !activeConfig.apiKey ? { upload_preset: activeConfig.uploadPreset } : {}),
        ...options,
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadParams,
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error.message);
            return reject(error);
          }
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(buffer);
    });
  },

  /**
   * Safe cleanup / deletion by public_id
   */
  async deleteFile(publicId, resourceType = 'image') {
    if (!activeConfig.apiKey || !activeConfig.apiSecret || !publicId) return false;
    try {
      const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return res.result === 'ok';
    } catch (err) {
      console.warn('⚠️ Cloudinary delete failed:', err.message);
      return false;
    }
  },

  /**
   * Test Cloudinary connection using API credentials
   */
  async testConnection(overrideCredentials = null) {
    const creds = overrideCredentials || activeConfig;
    if (!creds.cloudName || !creds.apiKey || !creds.apiSecret) {
      throw new Error('Cloud Name, API Key, and API Secret are all required to test Cloudinary connection.');
    }

    // Temporary instance for testing
    const testCloudinary = require('cloudinary').v2;
    testCloudinary.config({
      cloud_name: creds.cloudName,
      api_key: creds.apiKey,
      api_secret: creds.apiSecret,
      secure: true,
    });

    try {
      const pingRes = await testCloudinary.api.ping();
      return {
        success: true,
        status: pingRes.status || 'ok',
        cloudName: creds.cloudName,
        message: 'Successfully connected to Cloudinary API.',
      };
    } catch (err) {
      throw new Error(err.message || 'Cloudinary connection test failed. Verify credentials.');
    }
  },

  /**
   * Retrieve live usage metrics from official Cloudinary Admin API
   */
  async getUsage() {
    if (!activeConfig.cloudName || !activeConfig.apiKey || !activeConfig.apiSecret) {
      return {
        available: false,
        reason: 'API Key & Secret are required for Cloudinary usage metrics.',
      };
    }

    try {
      const usageData = await cloudinary.api.usage();
      return {
        available: true,
        plan: usageData.plan || 'Free',
        lastUpdated: usageData.last_updated || new Date().toISOString(),
        storage: {
          usedBytes: usageData.storage?.usage || 0,
          limitBytes: usageData.storage?.limit || 0,
          usedPercent: usageData.storage?.used_percent || 0,
          creditsUsed: usageData.storage?.credits_usage || 0,
        },
        bandwidth: {
          usedBytes: usageData.bandwidth?.usage || 0,
          limitBytes: usageData.bandwidth?.limit || 0,
          usedPercent: usageData.bandwidth?.used_percent || 0,
          creditsUsed: usageData.bandwidth?.credits_usage || 0,
        },
        transformations: {
          used: usageData.transformations?.usage || 0,
          limit: usageData.transformations?.limit || 0,
          usedPercent: usageData.transformations?.used_percent || 0,
          creditsUsed: usageData.transformations?.credits_usage || 0,
        },
        objects: {
          used: usageData.objects?.usage || 0,
          limit: usageData.objects?.limit || 0,
        },
        credits: {
          used: usageData.credits?.usage || 0,
          limit: usageData.credits?.limit || 0,
          remaining: usageData.credits?.remaining || 0,
        },
      };
    } catch (err) {
      return {
        available: false,
        error: err.message || 'Failed to fetch Cloudinary usage data',
      };
    }
  },
};

module.exports = cloudinaryService;
