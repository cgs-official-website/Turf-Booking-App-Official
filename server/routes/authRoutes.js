const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifySessionToken = require('../middleware/verifySessionToken');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const { otpRateLimiter } = require('../middleware/rateLimiter');

// Registration & Login (Email + Password)
router.post('/register', authController.register);
router.post('/login', authController.login);

// OTP Endpoints (rate-limited)
router.post('/otp/send', otpRateLimiter, authController.sendPhoneOtp);
router.post('/otp/verify', authController.verifyPhoneOtp);
router.post('/send-otp', otpRateLimiter, authController.sendPhoneOtp); // Alias for mobile app
router.post('/verify-otp', authController.verifyPhoneOtp); // Alias for mobile app
router.post('/otp/send-email', otpRateLimiter, authController.sendEmailOtp);
router.post('/otp/verify-email', authController.verifyEmailOtp);

// Google Sign-In Endpoint
router.post('/google', verifyFirebaseToken, authController.googleAuth);

// Profile & Session Endpoints
router.get('/me', verifySessionToken, authController.getMe);
router.patch('/me', verifySessionToken, authController.updateMe);
router.post('/sync-profile', verifySessionToken, authController.syncProfile);
router.post('/refresh', verifySessionToken, authController.refreshToken);
router.post('/logout', verifySessionToken, authController.logout);

module.exports = router;
