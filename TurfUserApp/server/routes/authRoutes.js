// const express = require('express');
// const router = express.Router();
// const { registerUser, loginUser, getMe, updateMe, changePassword } = require('../controllers/authController');
// const { protect } = require('../middleware/auth');

// router.post('/register', registerUser);
// router.post('/login', loginUser);
// router.get('/me', protect, getMe);
// router.put('/me', protect, updateMe);
// router.put('/change-password', protect, changePassword);

// module.exports = router;

const express = require('express');
const router = express.Router();
const {
  registerUser, loginUser, getMe, updateMe, changePassword,
  sendOtp, verifyOtp, googleAuth,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// New flow
router.post('/register',    registerUser);
router.post('/send-otp',    sendOtp);
router.post('/verify-otp',  verifyOtp);
router.post('/google',      googleAuth);

// Legacy (kept for backward compatibility)
router.post('/login', loginUser);

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);

module.exports = router;