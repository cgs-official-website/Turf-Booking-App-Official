const { z } = require('zod');

// Phone OTP Validation
const sendPhoneOtpSchema = z.object({
  phone: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  purpose: z.enum(['login', 'signup', 'password_reset']).optional().default('login'),
  role: z.enum(['user', 'vendor']).optional().default('user'),
});

const verifyPhoneOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().min(4).max(6, 'OTP must be 4 to 6 digits'),
  role: z.enum(['user', 'vendor']).optional().default('user'),
  name: z.string().optional(),
});

// Email OTP Validation
const sendEmailOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  purpose: z.enum(['login', 'signup', 'password_reset']).optional().default('login'),
  role: z.enum(['user', 'vendor']).optional().default('user'),
});

const verifyEmailOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  role: z.enum(['user', 'vendor']).optional().default('user'),
  name: z.string().optional(),
});

// Google Auth Validation
const googleAuthSchema = z.object({
  idToken: z.string().min(10, 'Google ID token required'),
  role: z.enum(['user', 'vendor']).optional().default('user'),
});

// Profile Update
const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  fcmToken: z.string().optional(),
  photoURL: z.string().url().optional(),
});

// Slot Reservation Schema
const reserveSlotSchema = z.object({
  turfId: z.string().min(1, 'Turf ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'StartTime must be HH:mm format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'EndTime must be HH:mm format'),
  courtNumber: z.number().optional().default(1),
  sport: z.string().optional(),
});

// Razorpay Payment Verify Schema
const paymentVerifySchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  razorpay_order_id: z.string().min(1, 'Razorpay Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Razorpay Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Razorpay Signature is required'),
});

// Vendor Turf Setup (Step 1)
const vendorTurfSetupSchema = z.object({
  name: z.string().min(2, 'Turf name is required'),
  sportTypes: z.array(z.string()).min(1, 'At least one sport type required'),
  description: z.string().optional().default(''),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  geo: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  pricing: z.object({
    baseRate: z.number().min(0),
    weekendRate: z.number().min(0).optional(),
    peakHourRate: z.number().min(0).optional(),
  }),
  slotConfig: z.object({
    openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    slotDurationMins: z.number().min(15).max(180).default(60),
  }),
  amenities: z.array(z.string()).optional().default([]),
});

// Slot Override Schema
const slotOverrideSchema = z.object({
  blockedSlots: z.array(z.string()).optional().default([]),
  priceOverrides: z.record(z.string(), z.number()).optional().default({}),
});

// Match / Scorecard Schemas
const createMatchSchema = z.object({
  place: z.string().min(1, 'Venue / Place is required'),
  sport: z.string().min(1, 'Sport is required'),
  date: z.string().optional().default('Today'),
  time: z.string().optional().default('07:00 PM'),
  playWithStrangers: z.boolean().optional().default(false),
  turfId: z.string().optional(),
  bookingId: z.string().optional(),
});

const joinMatchSchema = z.object({
  joinCode: z.string().min(4, 'Valid 4-6 char join code is required'),
});

const updateTeamsSchema = z.object({
  teamA: z.object({
    name: z.string(),
    players: z.array(z.string()),
  }),
  teamB: z.object({
    name: z.string(),
    players: z.array(z.string()),
  }),
});

const tossSchema = z.object({
  winner: z.string().min(1),
  decision: z.enum(['bat', 'bowl']),
});

const updateScorecardSchema = z.object({
  status: z.enum(['created', 'live', 'completed']).optional(),
  scorecard: z.record(z.any()),
});

// Review Schema
const createReviewSchema = z.object({
  turfId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().optional().default(''),
});

// Report Issue Schema
const reportIssueSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(5),
});

// Admin Approval Schema
const adminReviewSchema = z.object({
  reason: z.string().optional(),
});

const setAdminClaimSchema = z.object({
  uid: z.string().min(1, 'UID is required'),
  admin: z.boolean().default(true),
});

module.exports = {
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  googleAuthSchema,
  updateProfileSchema,
  reserveSlotSchema,
  paymentVerifySchema,
  vendorTurfSetupSchema,
  slotOverrideSchema,
  createMatchSchema,
  joinMatchSchema,
  updateTeamsSchema,
  tossSchema,
  updateScorecardSchema,
  createReviewSchema,
  reportIssueSchema,
  adminReviewSchema,
  setAdminClaimSchema,
};
