const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const cloudinaryService = require('./cloudinaryService');

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');

/**
 * Unified Storage Service (Cloudinary Cloud Storage + Local Static Mirror)
 */
const storageService = {
  /**
   * Upload file buffer to Cloudinary (Production) or Local Static Uploads (Dev/Fallback)
   * @param {Object} file - Express Multer file object { buffer, originalname, mimetype }
   * @param {string} destinationFolder - e.g. "kyc", "turfs", "users"
   * @returns {Promise<{ url: string, storagePath: string, public_id?: string }>}
   */
  async uploadFile(file, destinationFolder = 'general') {
    if (!file || !file.buffer) {
      throw new Error('No file buffer provided for upload');
    }

    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    const randomName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const storagePath = `${destinationFolder}/${randomName}`;

    // Always persist a local copy for dev fallback / serving
    try {
      const targetDir = path.join(UPLOADS_DIR, destinationFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const localFilePath = path.join(targetDir, randomName);
      fs.writeFileSync(localFilePath, file.buffer);
    } catch (localErr) {
      console.warn('⚠️ Local file save warning:', localErr.message);
    }

    // 1. Primary: Cloudinary Cloud Storage
    if (cloudinaryService.isConfigured()) {
      try {
        const cloudResult = await cloudinaryService.uploadBuffer(file.buffer, {
          folder: `turf_app/${destinationFolder}`,
          resource_type: file.mimetype?.includes('pdf') ? 'raw' : 'image',
        });

        return {
          url: cloudResult.url,
          storagePath: cloudResult.public_id || storagePath,
          public_id: cloudResult.public_id,
        };
      } catch (cloudErr) {
        console.warn('⚠️ Cloudinary upload failed, falling back to local storage:', cloudErr.message);
      }
    }

    // 2. Fallback / Local Static URL
    const localUrl = `/uploads/${destinationFolder}/${randomName}`;
    return {
      url: localUrl,
      storagePath,
    };
  },

  /**
   * Get public or signed URL for a storage path
   */
  async getSignedUrl(storagePath) {
    if (!storagePath) return null;
    if (/^(https?:|data:)/i.test(storagePath)) return storagePath;
    return `/uploads/${storagePath.replace(/^\/+/, '')}`;
  },
};

module.exports = storageService;
