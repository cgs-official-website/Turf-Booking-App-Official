// const asyncHandler = require('express-async-handler');
// const User = require('../models/User');
// const generateToken = require('../utils/generateToken');

// // @desc    Register new user
// // @route   POST /api/auth/register
// // @access  Public
// const registerUser = asyncHandler(async (req, res) => {
//   const { name, email, phone, password } = req.body;

//   if (!name || !email || !phone || !password) {
//     res.status(400);
//     throw new Error('Please provide name, email, phone and password');
//   }

//   const existingUser = await User.findOne({ email: email.toLowerCase() });
//   if (existingUser) {
//     res.status(400);
//     throw new Error('An account with this email already exists');
//   }

//   const user = await User.create({ name, email, phone, password });

//   res.status(201).json({
//     success: true,
//     token: generateToken(user._id),
//     user: {
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       role: user.role,
//       avatar: user.avatar,
//     },
//   });
// });

// // @desc    Login user
// // @route   POST /api/auth/login
// // @access  Public
// const loginUser = asyncHandler(async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     res.status(400);
//     throw new Error('Please provide email and password');
//   }

//   const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

//   if (!user || !(await user.matchPassword(password))) {
//     res.status(401);
//     throw new Error('Invalid email or password');
//   }

//   if (!user.isActive) {
//     res.status(403);
//     throw new Error('This account has been deactivated');
//   }

//   res.json({
//     success: true,
//     token: generateToken(user._id),
//     user: {
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       role: user.role,
//       avatar: user.avatar,
//       location: user.location,
//     },
//   });
// });

// // @desc    Get logged in user's profile
// // @route   GET /api/auth/me
// // @access  Private
// const getMe = asyncHandler(async (req, res) => {
//   res.json({ success: true, user: req.user });
// });

// // @desc    Update profile
// // @route   PUT /api/auth/me
// // @access  Private
// const updateMe = asyncHandler(async (req, res) => {
//   const { name, phone, avatar, location, favoriteSports } = req.body;
//   const user = await User.findById(req.user._id);

//   if (name) user.name = name;
//   if (phone) user.phone = phone;
//   if (avatar) user.avatar = avatar;
//   if (location) user.location = { ...user.location.toObject?.() ?? user.location, ...location };
//   if (favoriteSports) user.favoriteSports = favoriteSports;

//   const updated = await user.save();
//   res.json({ success: true, user: updated });
// });

// // @desc    Change password
// // @route   PUT /api/auth/change-password
// // @access  Private
// const changePassword = asyncHandler(async (req, res) => {
//   const { currentPassword, newPassword } = req.body;
//   const user = await User.findById(req.user._id).select('+password');

//   if (!(await user.matchPassword(currentPassword))) {
//     res.status(401);
//     throw new Error('Current password is incorrect');
//   }

//   user.password = newPassword;
//   await user.save();
//   res.json({ success: true, message: 'Password updated successfully' });
// });

// module.exports = { registerUser, loginUser, getMe, updateMe, changePassword };



const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4 digits
}

// @desc    Register with name, email, password — no auto login
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email and password');
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  // password gets hashed automatically by the pre('save') hook in User.js
  const user = await User.create({ name, email, password, authProvider: 'password' });

  res.status(201).json({
    success: true,
    message: 'Account created. Please sign in.',
    user: { id: user._id, name: user.name, email: user.email },
  });
});

// @desc    Send OTP to a phone number (creates the user record if new)
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.trim().length !== 10) {
    res.status(400);
    throw new Error('Please provide a valid 10 digit phone number');
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  let user = await User.findOne({ phone });
  if (!user) {
    // first-time phone user — bare-minimum record, filled in later via updateMe
    user = await User.create({ name: 'Turf User', phone, authProvider: 'phone' });
  }
  user.otp = { code: otp, expiresAt };
  await user.save();

  // TODO: replace with a real SMS gateway (MSG91 / Twilio) once available.
  // For now the OTP is logged server-side so it can be tested end-to-end.
  console.log(`📱 OTP for ${phone}: ${otp} (expires in 5 min)`);

  res.json({ success: true, message: 'OTP sent successfully' });
});

// @desc    Verify OTP and log the user in
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    res.status(400);
    throw new Error('Phone and OTP are required');
  }

  const user = await User.findOne({ phone }).select('+otp.code +otp.expiresAt');
  if (!user || !user.otp?.code) {
    res.status(400);
    throw new Error('Please request a new OTP');
  }
  if (user.otp.expiresAt < new Date()) {
    res.status(400);
    throw new Error('OTP has expired, please request a new one');
  }
  if (user.otp.code !== otp) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  user.otp = undefined;
  user.isPhoneVerified = true;
  await user.save();

  res.json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      location: user.location,
    },
  });
});

// @desc    Google Sign-In — find or create user, then log in
// @route   POST /api/auth/google
// @access  Public
//
// ⚠️ NOTE: This currently trusts the profile fields sent from the app after a
// successful on-device Google Sign-In. Once the Firebase **service account
// key** (Project Settings → Service Accounts → Generate new private key)
// arrives, swap this for a verified check using firebase-admin, e.g.:
//
//   const admin = require('firebase-admin');
//   const decoded = await admin.auth().verifyIdToken(idToken);
//   // then use decoded.uid / decoded.email instead of the raw body fields
//
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken, googleId, email, name, photo } = req.body;

  if (!idToken || !googleId || !email) {
    res.status(400);
    throw new Error('Missing Google profile information');
  }

  let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

  if (!user) {
    user = await User.create({
      name: name || 'Turf User',
      email: email.toLowerCase(),
      googleId,
      avatar: photo || '',
      authProvider: 'google',
    });
  } else if (!user.googleId) {
    // existing (e.g. phone) user signing in with Google for the first time — link accounts
    user.googleId = googleId;
    if (photo && !user.avatar) user.avatar = photo;
    await user.save();
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated');
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      location: user.location,
    },
  });
});

// @desc    Login user (legacy email/password — kept for backward compatibility)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated');
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      location: user.location,
    },
  });
});

// @desc    Get logged in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, avatar, location, favoriteSports } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (avatar) user.avatar = avatar;
  if (location) user.location = { ...user.location.toObject?.() ?? user.location, ...location };
  if (favoriteSports) user.favoriteSports = favoriteSports;

  const updated = await user.save();
  res.json({ success: true, user: updated });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});

module.exports = {
  registerUser, loginUser, getMe, updateMe, changePassword,
  sendOtp, verifyOtp, googleAuth,
};