const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const msg91Service = require('../services/msg91Service');
const nodemailerService = require('../services/nodemailerService');
const cacheService = require('../services/cacheService');
const { generateOtp } = require('../utils/otp');
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

/**
 * Formats a user record to match the mobile app JSON schema
 */
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

/**
 * Formats a vendor record to match the mobile app JSON schema
 */
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
    role: 'vendor',
    kycStatus: vendor.kycStatus,
    turfOnboardingComplete: vendor.turfOnboardingComplete,
    turfApprovalAcknowledged: vendor.turfApprovalAcknowledged,
    rejectionReason: vendor.rejectionReason || null,
    reviewedAt: vendor.reviewedAt || null,
    hasPaidSubscription: hasActiveSub,
    subscription: vendor.subscription || { active: false },
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
}

const authController = {
  /**
   * POST /api/v1/auth/register (Email + Password sign up)
   */
  async register(req, res) {
    const { name, email, password, phone, avatar, photoURL } = req.body;
    const role = req.body.role === 'vendor' ? 'vendor' : 'user';

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'MISSING_FIELDS');
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPhone = phone ? String(phone).trim() : null;
    const uid = `${role}_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
    const passwordHash = await bcrypt.hash(password, 10);

    if (role === 'vendor') {
      const existing = await prisma.vendor.findFirst({
        where: {
          OR: [
            { email: cleanEmail },
            { id: uid },
          ],
        },
      });

      if (existing) {
        return sendError(res, 'An account with this email already exists', 400, 'USER_EXISTS');
      }

      const vendor = await prisma.vendor.create({
        data: {
          id: uid,
          name: name || 'Turf Partner',
          email: cleanEmail,
          phone: cleanPhone,
          passwordHash,
          kycStatus: 'pending',
          subscription: { active: false },
          turfOnboardingComplete: false,
          turfApprovalAcknowledged: false,
        },
      });

      const formatted = formatVendor(vendor);
      return sendSuccess(res, {
        message: 'Registration submitted successfully. Your account is pending Superadmin approval.',
        profile: formatted,
        vendor: formatted,
      });
    }

    // Role: User (Player)
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { id: uid },
        ],
      },
    });

    if (existing) {
      return sendError(res, 'An account with this email already exists', 400, 'USER_EXISTS');
    }

    const user = await prisma.user.create({
      data: {
        id: uid,
        name: name || 'Turf Player',
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
        avatar: avatar || photoURL || null,
        status: 'active',
      },
    });

    const token = generateSessionToken({ uid, role: 'user', email: cleanEmail, admin: false });
    const formatted = formatUser(user);

    return sendSuccess(res, {
      message: 'Account created successfully',
      token,
      profile: formatted,
      user: formatted,
    });
  },

  /**
   * POST /api/v1/auth/login (Email + Password sign in)
   */
  async login(req, res) {
    const { email, password } = req.body;
    const role = req.body.role === 'vendor' ? 'vendor' : 'user';

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'MISSING_FIELDS');
    }

    const cleanEmail = String(email).toLowerCase().trim();

    if (role === 'vendor') {
      let vendor = await prisma.vendor.findFirst({
        where: { email: cleanEmail },
      });

      if (!vendor) {
        if (process.env.NODE_ENV !== 'production') {
          // Dev convenience: auto-provision approved test vendor
          const newHash = await bcrypt.hash(password, 10);
          const vendorId = `vendor_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
          const vendorName = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          vendor = await prisma.vendor.create({
            data: {
              id: vendorId,
              name: vendorName || 'Turf Partner',
              email: cleanEmail,
              passwordHash: newHash,
              kycStatus: 'approved',
              turfOnboardingComplete: true,
              turfApprovalAcknowledged: true,
              subscription: { active: true, status: 'active' },
            },
          });
        } else {
          return sendError(
            res,
            'No vendor account found with this email. Please select "New Account" to register.',
            404,
            'ACCOUNT_NOT_FOUND'
          );
        }
      }

      const isDevPass = process.env.NODE_ENV !== 'production' &&
        (password === '12345678' || password === 'Password@123' || password === 'admin123' || password === '123456' || password === 'Cgs@001a');
      const isMatch = await bcrypt.compare(password, vendor.passwordHash);

      if (!isMatch && !isDevPass) {
        if (process.env.NODE_ENV !== 'production') {
          // Dev convenience: accept and sync vendor password so developers are never blocked
          const newHash = await bcrypt.hash(password, 10);
          await prisma.vendor.update({
            where: { id: vendor.id },
            data: { passwordHash: newHash },
          });
        } else {
          return sendError(res, 'Invalid password. Please check your credentials.', 401, 'INVALID_CREDENTIALS');
        }
      }

      if (vendor.kycStatus === 'suspended') {
        return sendError(
          res,
          'Your vendor account has been suspended. Please contact Super Admin support.',
          403,
          'ACCOUNT_SUSPENDED',
          { kycStatus: 'suspended', vendor: formatVendor(vendor) }
        );
      }

      if (vendor.kycStatus === 'rejected') {
        const reason = vendor.rejectionReason ? ` Reason: ${vendor.rejectionReason}` : '';
        return sendError(
          res,
          `Your account registration was not approved.${reason} Please contact support.`,
          403,
          'KYC_REJECTED',
          { kycStatus: 'rejected', rejectionReason: vendor.rejectionReason, vendor: formatVendor(vendor) }
        );
      }

      const token = generateSessionToken({
        uid: vendor.id,
        role: 'vendor',
        email: vendor.email,
        admin: false,
      });

      const formatted = formatVendor(vendor);
      return sendSuccess(res, {
        token,
        profile: formatted,
        vendor: formatted,
      });
    }

    // Role: User (Player)
    let user = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Auto-provision player on first valid email login
      const passwordHash = await bcrypt.hash(password, 10);
      const uid = `user_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      user = await prisma.user.create({
        data: {
          id: uid,
          name: 'Turf Player',
          email: cleanEmail,
          passwordHash,
          status: 'active',
        },
      });
    } else if (user.passwordHash) {
      const isDevPass = process.env.NODE_ENV !== 'production' &&
        (password === '12345678' || password === 'Password@123' || password === 'admin123' || password === '123456' || password === 'Cgs@001a');
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch && !isDevPass) {
        if (process.env.NODE_ENV !== 'production') {
          // Dev convenience: sync password hash
          const newHash = await bcrypt.hash(password, 10);
          user = await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
          });
        } else {
          return sendError(res, 'Invalid password. Please check your password.', 401, 'INVALID_CREDENTIALS');
        }
      }
    } else {
      // If user existed without password (e.g. from OTP), set password now
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }

    const token = generateSessionToken({
      uid: user.id,
      role: 'user',
      email: cleanEmail,
      admin: false,
    });

    const formatted = formatUser(user);
    return sendSuccess(res, {
      token,
      profile: formatted,
      user: formatted,
    });
  },

  /**
   * POST /api/v1/auth/otp/send (SMS OTP)
   */
  async sendPhoneOtp(req, res) {
    const parsed = sendPhoneOtpSchema.parse(req.body);
    const { phone, purpose = 'login', role = 'user' } = parsed;
    const cleanPhone = String(phone).replace(/\D/g, '');

    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit mobile OTP
    const otpHash = await bcrypt.hash(otp, 10);
    const ttlSeconds = 600; // 10 minutes

    // Store in Redis with key otp:{purpose}:{identifier}
    const redisKey = `otp:${purpose}:${cleanPhone}`;
    await cacheService.set(redisKey, {
      otpHash,
      attempts: 0,
      verified: false,
      role,
    }, ttlSeconds);

    try {
      await msg91Service.sendOtpSms(phone, otp);
    } catch (smsErr) {
      console.warn('⚠️ SMS Gateway notice:', smsErr.message);
    }

    return sendSuccess(res, {
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'production' ? undefined : otp,
      expiresInSeconds: ttlSeconds,
    });
  },

  /**
   * POST /api/v1/auth/otp/verify (Verify SMS OTP)
   */
  async verifyPhoneOtp(req, res) {
    const parsed = verifyPhoneOtpSchema.parse(req.body);
    const { phone, otp, role = 'user', name, purpose = 'login' } = parsed;
    const cleanPhone = String(phone).replace(/\D/g, '');

    const isDevBypass = process.env.NODE_ENV !== 'production' &&
      (otp === '1234' || otp === '123456' || otp === '0000');

    const redisKey = `otp:${purpose}:${cleanPhone}`;
    const record = await cacheService.get(redisKey);

    if (!record && !isDevBypass) {
      return sendError(res, 'No OTP request found for this phone number. Please click Send OTP.', 400, 'OTP_NOT_FOUND');
    }

    if (record) {
      if (record.verified) {
        return sendError(res, 'This OTP has already been used', 400, 'OTP_ALREADY_USED');
      }

      if (record.attempts >= 5) {
        await cacheService.del(redisKey);
        return sendError(res, 'Too many incorrect attempts. Please request a new OTP.', 400, 'OTP_MAX_ATTEMPTS');
      }

      const isMatch = record.otpHash ? await bcrypt.compare(otp, record.otpHash) : false;
      if (!isDevBypass && !isMatch) {
        record.attempts = (record.attempts || 0) + 1;
        await cacheService.set(redisKey, record, 600);
        return sendError(res, 'Invalid OTP. Please check the code and try again.', 400, 'INVALID_OTP');
      }

      // Mark verified
      record.verified = true;
      await cacheService.set(redisKey, record, 600);
    }

    // Find or create User / Vendor record
    let profile = null;
    let uid = `${role}_${cleanPhone}`;

    if (role === 'vendor') {
      let vendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { id: uid },
          ],
        },
      });

      if (vendor) {
        if (vendor.kycStatus === 'suspended') {
          return sendError(
            res,
            'Your vendor account has been suspended. Please contact Super Admin support.',
            403,
            'ACCOUNT_SUSPENDED',
            { kycStatus: 'suspended', vendor: formatVendor(vendor) }
          );
        }
        if (vendor.kycStatus === 'rejected') {
          const reason = vendor.rejectionReason ? ` Reason: ${vendor.rejectionReason}` : '';
          return sendError(
            res,
            `Your account registration was not approved.${reason} Please contact support.`,
            403,
            'KYC_REJECTED',
            { kycStatus: 'rejected', rejectionReason: vendor.rejectionReason, vendor: formatVendor(vendor) }
          );
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
          OR: [
            { phone: cleanPhone },
            { id: uid },
          ],
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

    const token = generateSessionToken({
      uid: profile.id,
      role,
      phone: cleanPhone,
      admin: false,
    });

    return sendSuccess(res, {
      token,
      profile,
      user: profile,
      vendor: profile,
    });
  },

  /**
   * POST /api/v1/auth/otp/send-email (Email OTP)
   */
  async sendEmailOtp(req, res) {
    const parsed = sendEmailOtpSchema.parse(req.body);
    const { email, purpose = 'login', role = 'user' } = parsed;
    const cleanEmail = String(email).toLowerCase().trim();

    const otp = generateOtp(); // 6-digit email OTP
    const otpHash = await bcrypt.hash(otp, 10);
    const ttlSeconds = 300; // 5 minutes

    const redisKey = `otp:${purpose}:${cleanEmail}`;
    await cacheService.set(redisKey, {
      otpHash,
      attempts: 0,
      verified: false,
      role,
    }, ttlSeconds);

    await nodemailerService.sendOtpEmail(cleanEmail, otp);

    return sendSuccess(res, {
      message: 'OTP sent successfully via Email',
      expiresInSeconds: ttlSeconds,
    });
  },

  /**
   * POST /api/v1/auth/otp/verify-email (Verify Email OTP)
   */
  async verifyEmailOtp(req, res) {
    const parsed = verifyEmailOtpSchema.parse(req.body);
    const { email, otp, role = 'user', name, purpose = 'login' } = parsed;
    const cleanEmail = String(email).toLowerCase().trim();

    const redisKey = `otp:${purpose}:${cleanEmail}`;
    const record = await cacheService.get(redisKey);

    if (!record) {
      return sendError(res, 'No OTP request found for this email', 400, 'OTP_NOT_FOUND');
    }

    if (record.verified) {
      return sendError(res, 'This OTP has already been used', 400, 'OTP_ALREADY_USED');
    }

    if (record.attempts >= 5) {
      await cacheService.del(redisKey);
      return sendError(res, 'Too many incorrect attempts. Please request a new OTP.', 400, 'OTP_MAX_ATTEMPTS');
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) {
      record.attempts = (record.attempts || 0) + 1;
      await cacheService.set(redisKey, record, 300);
      return sendError(res, 'Invalid OTP. Please check and try again.', 400, 'INVALID_OTP');
    }

    record.verified = true;
    await cacheService.set(redisKey, record, 300);

    const uid = `${role}_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
    let profile = null;

    if (role === 'vendor') {
      let vendor = await prisma.vendor.findFirst({
        where: {
          OR: [{ email: cleanEmail }, { id: uid }],
        },
      });

      if (vendor) {
        if (vendor.kycStatus === 'suspended') {
          return sendError(
            res,
            'Your vendor account has been suspended. Please contact Super Admin support.',
            403,
            'ACCOUNT_SUSPENDED',
            { kycStatus: 'suspended', vendor: formatVendor(vendor) }
          );
        }
        if (vendor.kycStatus === 'rejected') {
          const reason = vendor.rejectionReason ? ` Reason: ${vendor.rejectionReason}` : '';
          return sendError(
            res,
            `Your account registration was not approved.${reason} Please contact support.`,
            403,
            'KYC_REJECTED',
            { kycStatus: 'rejected', rejectionReason: vendor.rejectionReason, vendor: formatVendor(vendor) }
          );
        }
      } else {
        vendor = await prisma.vendor.create({
          data: {
            id: uid,
            email: cleanEmail,
            name: name || 'Turf Partner',
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
          OR: [{ email: cleanEmail }, { id: uid }],
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: uid,
            email: cleanEmail,
            name: name || 'Turf Player',
            status: 'active',
          },
        });
      }
      profile = formatUser(user);
    }

    const token = generateSessionToken({
      uid: profile.id,
      role,
      email: cleanEmail,
      admin: false,
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
    const { role = 'user' } = parsed;
    const firebaseUser = req.firebaseUser;

    if (!firebaseUser) {
      return sendError(res, 'Google authentication failed', 401, 'GOOGLE_AUTH_FAILED');
    }

    const { uid: firebaseUid, email, name, picture } = firebaseUser;
    const cleanEmail = email ? String(email).toLowerCase().trim() : null;
    const uid = `${role}_${firebaseUid}`;
    let profile = null;

    if (role === 'vendor') {
      let vendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            { id: uid },
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
        },
      });

      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            id: uid,
            email: cleanEmail || `${uid}@vendor.placeholder`,
            name: name || 'Google Partner',
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
          OR: [
            { id: uid },
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: uid,
            email: cleanEmail,
            name: name || 'Google User',
            avatar: picture || null,
            status: 'active',
          },
        });
      }
      profile = formatUser(user);
    }

    const token = generateSessionToken({
      uid: profile.id,
      role,
      email: cleanEmail,
      admin: false,
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

    if (role === 'vendor') {
      const vendor = await prisma.vendor.findUnique({
        where: { id: uid },
      });
      if (!vendor) {
        return sendError(res, 'Vendor profile not found', 404, 'NOT_FOUND');
      }
      const formatted = formatVendor(vendor);
      return sendSuccess(res, { profile: formatted, vendor: formatted });
    }

    const user = await prisma.user.findUnique({
      where: { id: uid },
    });
    if (!user) {
      return sendError(res, 'User profile not found', 404, 'NOT_FOUND');
    }
    const formatted = formatUser(user);
    return sendSuccess(res, { profile: formatted, user: formatted });
  },

  /**
   * PATCH /api/v1/auth/me or PUT /api/v1/auth/me (Update profile)
   */
  async updateMe(req, res) {
    const { uid, role } = req.user;
    const parsed = updateProfileSchema.parse(req.body);

    if (role === 'vendor') {
      const data = {};
      if (parsed.name !== undefined) data.name = parsed.name;
      if (parsed.phone !== undefined) data.phone = parsed.phone;
      if (parsed.turfOnboardingComplete !== undefined) data.turfOnboardingComplete = parsed.turfOnboardingComplete;
      if (parsed.turfApprovalAcknowledged !== undefined) data.turfApprovalAcknowledged = parsed.turfApprovalAcknowledged;

      const vendor = await prisma.vendor.update({
        where: { id: uid },
        data,
      });
      const formatted = formatVendor(vendor);
      return sendSuccess(res, { profile: formatted, vendor: formatted });
    }

    const data = {};
    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.phone !== undefined) data.phone = parsed.phone;
    if (parsed.avatar !== undefined || parsed.photoURL !== undefined) {
      data.avatar = parsed.avatar || parsed.photoURL;
    }
    if (parsed.location !== undefined) data.location = parsed.location;

    const user = await prisma.user.update({
      where: { id: uid },
      data,
    });
    const formatted = formatUser(user);
    return sendSuccess(res, { profile: formatted, user: formatted });
  },

  /**
   * POST /api/v1/auth/sync-profile (Client profile sync)
   */
  async syncProfile(req, res) {
    const { uid, role } = req.user;
    const body = req.body || {};

    if (role === 'vendor') {
      const data = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.phone !== undefined) data.phone = body.phone;
      const vendor = await prisma.vendor.update({ where: { id: uid }, data });
      return sendSuccess(res, { profile: formatVendor(vendor) });
    }

    const data = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.avatar !== undefined || body.photoURL !== undefined) data.avatar = body.avatar || body.photoURL;
    if (body.location !== undefined) data.location = body.location;
    const user = await prisma.user.update({ where: { id: uid }, data });
    return sendSuccess(res, { profile: formatUser(user) });
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
    return sendSuccess(res, { message: 'Logged out successfully' });
  },
};

module.exports = authController;
