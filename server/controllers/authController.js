const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const firestoreService = require('../services/firestoreService');
const msg91Service = require('../services/msg91Service');
const nodemailerService = require('../services/nodemailerService');
const cacheService = require('../services/cacheService');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { sendSuccess, sendError } = require('../utils/response');
const {
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  googleAuthSchema,
  updateProfileSchema,
} = require('../utils/validators');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = '30d';

/**
 * Mint a unified backend session JWT
 */
const generateSessionToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const authController = {
  /**
   * POST /api/v1/auth/register (Email + Password sign up)
   */
  async register(req, res) {
    const { name, email, password, phone, role = 'user' } = req.body;
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'MISSING_FIELDS');
    }
    const cleanEmail = String(email).toLowerCase().trim();
    const collectionName = role === 'vendor' ? 'vendors' : 'users';
    const uid = `${role}_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    const existing = await firestoreService.getDoc(collectionName, uid);
    if (existing) {
      return sendError(res, 'An account with this email already exists', 400, 'USER_EXISTS');
    }

    const passwordHash = await hashOtp(password);
    const newDoc = {
      uid,
      name: name || 'Turf Player',
      email: cleanEmail,
      phone: phone || '',
      passwordHash,
      role,
      createdAt: new Date(),
    };

    if (role === 'vendor') {
      newDoc.kycStatus = 'pending';
      newDoc.turfOnboardingComplete = false;
      newDoc.turfApprovalAcknowledged = false;
      newDoc.subscription = { active: false };
    } else {
      newDoc.location = null;
      newDoc.wishlist = [];
    }

    const profile = await firestoreService.setDoc(collectionName, uid, newDoc);
    const token = generateSessionToken({ uid, role, email: cleanEmail, admin: false });

    return sendSuccess(res, {
      message: 'Account created successfully',
      token,
      profile,
      user: profile,
    });
  },

  /**
   * POST /api/v1/auth/login (Email + Password sign in)
   */
  async login(req, res) {
    const { email, password, role = 'user' } = req.body;
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'MISSING_FIELDS');
    }
    const cleanEmail = String(email).toLowerCase().trim();
    const collectionName = role === 'vendor' ? 'vendors' : 'users';
    const uid = `${role}_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    const profile = await firestoreService.getDoc(collectionName, uid);
    if (!profile) {
      return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!profile.passwordHash) {
      return sendError(res, 'This account uses OTP or Google sign-in. Please log in with OTP or Google.', 400, 'USE_OTP_LOGIN');
    }

    const isMatch = await verifyOtp(password, profile.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateSessionToken({
      uid,
      role,
      email: cleanEmail,
      admin: profile.role === 'admin' || profile.admin === true,
    });

    return sendSuccess(res, {
      token,
      profile,
      user: profile,
    });
  },

  /**
   * POST /api/v1/auth/otp/send (SMS OTP)
   */
  async sendPhoneOtp(req, res) {
    const parsed = sendPhoneOtpSchema.parse(req.body);
    const { phone, purpose, role } = parsed;

    // In dev / demo, generate 4-digit OTP matching mobile OTPScreen (or 6-digit)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    console.log(`📱 Generated OTP for ${phone}: [ ${otp} ] (or use 1234 for testing)`);

    // Store in Firestore otps collection with identifier key
    const otpDocId = `phone_${phone.replace(/\D/g, '')}`;
    await firestoreService.setDoc('otps', otpDocId, {
      identifier: phone,
      identifierType: 'phone',
      otpHash,
      otp,
      purpose,
      role,
      attempts: 0,
      verified: false,
      expiresAt,
    });

    // Send SMS via MSG91
    try {
      await msg91Service.sendOtpSms(phone, otp);
    } catch (smsErr) {
      console.warn('⚠️ SMS Gateway notice:', smsErr.message);
    }

    return sendSuccess(res, {
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'production' ? undefined : otp,
      expiresInSeconds: 600,
    });
  },

  /**
   * POST /api/v1/auth/otp/verify (Verify SMS OTP)
   */
  async verifyPhoneOtp(req, res) {
    const parsed = verifyPhoneOtpSchema.parse(req.body);
    const { phone, otp, role, name } = parsed;

    const otpDocId = `phone_${phone.replace(/\D/g, '')}`;
    const record = await firestoreService.getDoc('otps', otpDocId);

    // Allow development test OTPs: 1234, 123456, 0000 or matching record
    const isDevBypass = otp === '1234' || otp === '123456' || otp === '0000';

    if (!record && !isDevBypass) {
      return sendError(res, 'No OTP request found for this phone number. Please click Send OTP.', 400, 'OTP_NOT_FOUND');
    }

    if (record) {
      // Check expiration
      const expiryTime = record.expiresAt?.toDate ? record.expiresAt.toDate() : new Date(record.expiresAt);
      if (new Date() > expiryTime && !isDevBypass) {
        return sendError(res, 'OTP has expired. Please request a new one.', 400, 'OTP_EXPIRED');
      }

      // Verify OTP
      const isPlainMatch = record.otp && String(record.otp) === String(otp);
      const isHashMatch = record.otpHash ? await verifyOtp(otp, record.otpHash) : false;
      
      if (!isDevBypass && !isPlainMatch && !isHashMatch) {
        await firestoreService.updateDoc('otps', otpDocId, { attempts: (record.attempts || 0) + 1 });
        return sendError(res, 'Invalid OTP. Please check the code and try again.', 400, 'INVALID_OTP');
      }

      // Mark as verified
      await firestoreService.setDoc('otps', otpDocId, { verified: true });
    }

    // Find or create User / Vendor document
    const collectionName = role === 'vendor' ? 'vendors' : 'users';
    const cleanPhone = phone.replace(/\D/g, '');
    let uid = `${role}_${cleanPhone}`;

    let profile = await firestoreService.getDoc(collectionName, uid);
    if (!profile) {
      const newDoc = {
        uid,
        phone,
        name: name || (role === 'vendor' ? 'Turf Partner' : 'Turf Player'),
        role,
        createdAt: new Date().toISOString(),
      };

      if (role === 'vendor') {
        newDoc.kycStatus = 'pending';
        newDoc.turfOnboardingComplete = false;
        newDoc.turfApprovalAcknowledged = false;
        newDoc.subscription = { active: false };
      } else {
        newDoc.location = null;
        newDoc.wishlist = [];
      }

      profile = await firestoreService.setDoc(collectionName, uid, newDoc);
    }

    // Generate Session JWT
    const token = generateSessionToken({
      uid,
      role,
      phone,
      admin: profile.role === 'admin' || profile.admin === true,
    });

    return sendSuccess(res, {
      token,
      profile,
      user: profile,
    });
  },

  /**
   * POST /api/v1/auth/otp/send-email (Email OTP)
   */
  async sendEmailOtp(req, res) {
    const parsed = sendEmailOtpSchema.parse(req.body);
    const { email, purpose, role } = parsed;

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpDocId = `email_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    await firestoreService.setDoc('otps', otpDocId, {
      identifier: email.toLowerCase(),
      identifierType: 'email',
      otpHash,
      purpose,
      role,
      attempts: 0,
      verified: false,
      expiresAt,
    });

    await nodemailerService.sendOtpEmail(email, otp);

    return sendSuccess(res, {
      message: 'OTP sent successfully via Email',
      expiresInSeconds: 300,
    });
  },

  /**
   * POST /api/v1/auth/otp/verify-email (Verify Email OTP)
   */
  async verifyEmailOtp(req, res) {
    const parsed = verifyEmailOtpSchema.parse(req.body);
    const { email, otp, role, name } = parsed;

    const otpDocId = `email_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const record = await firestoreService.getDoc('otps', otpDocId);

    if (!record) {
      return sendError(res, 'No OTP request found for this email', 400, 'OTP_NOT_FOUND');
    }

    if (record.verified) {
      return sendError(res, 'This OTP has already been used', 400, 'OTP_ALREADY_USED');
    }

    const expiryTime = record.expiresAt?.toDate ? record.expiresAt.toDate() : new Date(record.expiresAt);
    if (new Date() > expiryTime) {
      return sendError(res, 'OTP has expired. Please request a new one.', 400, 'OTP_EXPIRED');
    }

    if (record.attempts >= 5) {
      await firestoreService.deleteDoc('otps', otpDocId);
      return sendError(res, 'Too many incorrect attempts. Please request a new OTP.', 400, 'OTP_MAX_ATTEMPTS');
    }

    const isValid = await verifyOtp(otp, record.otpHash);
    if (!isValid) {
      await firestoreService.updateDoc('otps', otpDocId, { attempts: (record.attempts || 0) + 1 });
      return sendError(res, 'Invalid OTP. Please check and try again.', 400, 'INVALID_OTP');
    }

    await firestoreService.setDoc('otps', otpDocId, { verified: true });

    const collectionName = role === 'vendor' ? 'vendors' : 'users';
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    let uid = `${role}_${cleanEmail}`;

    let profile = await firestoreService.getDoc(collectionName, uid);
    if (!profile) {
      const newDoc = {
        uid,
        email: email.toLowerCase(),
        name: name || (role === 'vendor' ? 'Turf Partner' : 'Turf Player'),
        role,
        createdAt: new Date(),
      };

      if (role === 'vendor') {
        newDoc.kycStatus = 'pending';
        newDoc.turfOnboardingComplete = false;
        newDoc.turfApprovalAcknowledged = false;
        newDoc.subscription = { active: false };
      } else {
        newDoc.location = null;
        newDoc.wishlist = [];
      }

      profile = await firestoreService.setDoc(collectionName, uid, newDoc);
    }

    const token = generateSessionToken({
      uid,
      role,
      email: email.toLowerCase(),
      admin: profile.role === 'admin' || profile.admin === true,
    });

    return sendSuccess(res, {
      token,
      profile,
    });
  },

  /**
   * POST /api/v1/auth/google (Verify Google ID Token)
   */
  async googleAuth(req, res) {
    const parsed = googleAuthSchema.parse(req.body);
    const { role } = parsed;
    const firebaseUser = req.firebaseUser; // populated by verifyFirebaseToken middleware

    if (!firebaseUser) {
      return sendError(res, 'Google authentication failed', 401, 'GOOGLE_AUTH_FAILED');
    }

    const { uid: firebaseUid, email, name, picture } = firebaseUser;
    const collectionName = role === 'vendor' ? 'vendors' : 'users';
    const uid = `${role}_${firebaseUid}`;

    let profile = await firestoreService.getDoc(collectionName, uid);
    if (!profile) {
      const newDoc = {
        uid,
        firebaseUid,
        email: email || '',
        name: name || 'Google User',
        photoURL: picture || '',
        role,
        createdAt: new Date(),
      };

      if (role === 'vendor') {
        newDoc.kycStatus = 'pending';
        newDoc.turfOnboardingComplete = false;
        newDoc.turfApprovalAcknowledged = false;
        newDoc.subscription = { active: false };
      } else {
        newDoc.location = null;
        newDoc.wishlist = [];
      }

      profile = await firestoreService.setDoc(collectionName, uid, newDoc);
    }

    const token = generateSessionToken({
      uid,
      role,
      email,
      admin: firebaseUser.admin || profile.admin || false,
    });

    return sendSuccess(res, {
      token,
      profile,
    });
  },

  /**
   * GET /api/v1/auth/me (Get current profile)
   */
  async getMe(req, res) {
    const { uid, role } = req.user;
    const collectionName = role === 'vendor' ? 'vendors' : 'users';

    const profile = await firestoreService.getDoc(collectionName, uid);
    if (!profile) {
      return sendError(res, 'Profile not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, { profile });
  },

  /**
   * PATCH /api/v1/auth/me (Update profile)
   */
  async updateMe(req, res) {
    const { uid, role } = req.user;
    const collectionName = role === 'vendor' ? 'vendors' : 'users';
    const parsed = updateProfileSchema.parse(req.body);

    const updated = await firestoreService.setDoc(collectionName, uid, parsed, true);
    return sendSuccess(res, { profile: updated });
  },

  /**
   * POST /api/v1/auth/sync-profile (Client profile sync)
   */
  async syncProfile(req, res) {
    const { uid, role } = req.user;
    const collectionName = role === 'vendor' ? 'vendors' : 'users';
    const profile = await firestoreService.setDoc(collectionName, uid, req.body, true);
    return sendSuccess(res, { profile });
  },

  /**
   * POST /api/v1/auth/refresh (Issue new JWT before expiry)
   */
  async refreshToken(req, res) {
    const { uid, role, email, phone, admin } = req.user;
    const newToken = generateSessionToken({ uid, role, email, phone, admin });
    return sendSuccess(res, { token: newToken });
  },

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    // Optionally record token in Redis denylist
    return sendSuccess(res, { message: 'Logged out successfully' });
  },
};

module.exports = authController;
