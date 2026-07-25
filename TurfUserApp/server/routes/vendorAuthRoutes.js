const express = require('express');
const router = express.Router();
const {
  registerVendor,
  loginVendor,
  getMe,
  updateProfile,
} = require('../controllers/vendorAuthController');
const vendorAuth = require('../middleware/vendorAuth');

// Public
router.post('/register', registerVendor);
router.post('/login', loginVendor);

// Protected
router.get('/me', vendorAuth, getMe);
router.put('/profile', vendorAuth, updateProfile);

module.exports = router;