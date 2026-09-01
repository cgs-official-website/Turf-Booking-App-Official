const path = require('path');
const crypto = require('crypto');
const { storage } = require('../config/firebaseAdmin');

/**
 * Firebase Cloud Storage Service
 */
const storageService = {
  /**
   * Upload file buffer to Firebase Cloud Storage
   * @param {Object} file - Express Multer file object { buffer, originalname, mimetype }
   * @param {string} destinationFolder - e.g. "kyc", "turfs", "users"
   * @returns {Promise<{ url: string, storagePath: string }>}
   */
  async uploadFile(file, destinationFolder = 'general') {
    if (!file || !file.buffer) {
      throw new Error('No file buffer provided for upload');
    }

    if (!storage) {
      console.warn('⚠️ Firebase Storage is not configured. Returning fallback placeholder URL.');
      return {
        url: `https://storage.googleapis.com/placeholder-bucket/${destinationFolder}/${Date.now()}-${file.originalname || 'file.jpg'}`,
        storagePath: `${destinationFolder}/${Date.now()}-${file.originalname || 'file.jpg'}`,
      };
    }

    const bucket = storage.bucket();
    const ext = path.extname(file.originalname || '.jpg');
    const randomName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const storagePath = `${destinationFolder}/${randomName}`;
    const fileRef = bucket.file(storagePath);

    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype || 'application/octet-stream',
      },
      resumable: false,
    });

    // Option A: Make public for turf images
    // Option B: Signed URL for private KYC docs
    let downloadUrl;
    if (destinationFolder === 'kyc') {
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      downloadUrl = signedUrl;
    } else {
      // Public accessible URL for turfs/avatars
      try {
        await fileRef.makePublic();
        downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      } catch {
        const [signedUrl] = await fileRef.getSignedUrl({
          action: 'read',
          expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
        });
        downloadUrl = signedUrl;
      }
    }

    return {
      url: downloadUrl,
      storagePath,
    };
  },

  /**
   * Get fresh signed URL for a private storage path
   */
  async getSignedUrl(storagePath, expiresInMinutes = 60) {
    if (!storage) return null;
    try {
      const bucket = storage.bucket();
      const fileRef = bucket.file(storagePath);
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      });
      return signedUrl;
    } catch (err) {
      console.error('getSignedUrl error:', err.message);
      return null;
    }
  },
};

module.exports = storageService;
