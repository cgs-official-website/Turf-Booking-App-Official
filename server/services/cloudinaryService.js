const cloudinary = require('cloudinary').v2;

// Configure Cloudinary using environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'Turf-App';

const isConfigured = Boolean(cloudName && (uploadPreset || (apiKey && apiSecret)));

if (cloudName) {
  cloudinary.config({
    cloud_name: cloudName,
    ...(apiKey && { api_key: apiKey }),
    ...(apiSecret && { api_secret: apiSecret }),
    secure: true,
  });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const cloudinaryService = {
  isConfigured() {
    return isConfigured;
  },

  /**
   * Upload file buffer directly to Cloudinary
   * @param {Buffer} buffer - File buffer from Multer
   * @param {Object} options - Upload options (folder, public_id, etc.)
   * @returns {Promise<{ url: string, public_id: string }>}
   */
  async uploadBuffer(buffer, options = {}) {
    if (!buffer) {
      throw new Error('No file buffer provided for Cloudinary upload');
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error('File size exceeds the 10MB limit');
    }

    if (!isConfigured) {
      throw new Error('Cloudinary credentials/preset not configured in environment variables');
    }

    const folder = options.folder || 'turf_app/general';
    const resourceType = options.resource_type || 'auto';

    return new Promise((resolve, reject) => {
      const uploadParams = {
        folder,
        resource_type: resourceType,
        ...(uploadPreset && !apiKey ? { upload_preset: uploadPreset } : {}),
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
    if (!apiKey || !apiSecret || !publicId) return false;
    try {
      const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return res.result === 'ok';
    } catch (err) {
      console.warn('⚠️ Cloudinary delete failed:', err.message);
      return false;
    }
  },
};

module.exports = cloudinaryService;
