const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');

const generateVendorToken = (id) => {
  return jwt.sign(
    { id, role: 'vendor' },
    process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// POST /api/vendor/auth/register
exports.registerVendor = async (req, res) => {
  try {
    const { name, email, phone, password, businessName, gstNumber } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    const exists = await Vendor.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const vendor = await Vendor.create({ name, email, phone, password, businessName, gstNumber });
    const token = generateVendorToken(vendor._id);

    res.status(201).json({
      success: true,
      token,
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.businessName,
        status: vendor.status,
        isVerified: vendor.isVerified,
        hasCompletedTurfOnboarding: vendor.hasCompletedTurfOnboarding,
      },
    });
  } catch (err) {
    console.error('registerVendor error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/vendor/auth/login
exports.loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const vendor = await Vendor.findOne({ email }).select('+password');
    if (!vendor || !(await vendor.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!vendor.isActive) {
      return res.status(403).json({ success: false, message: 'Account suspended. Contact support.' });
    }

    const token = generateVendorToken(vendor._id);

    res.json({
      success: true,
      token,
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.businessName,
        gstNumber: vendor.gstNumber,
        status: vendor.status,
        isVerified: vendor.isVerified,
        hasCompletedTurfOnboarding: vendor.hasCompletedTurfOnboarding,
      },
    });
  } catch (err) {
    console.error('loginVendor error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/auth/me
exports.getMe = async (req, res) => {
  try {
    const vendor = req.vendor;
    res.json({
      success: true,
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.businessName,
        gstNumber: vendor.gstNumber,
        status: vendor.status,
        isVerified: vendor.isVerified,
        hasCompletedTurfOnboarding: vendor.hasCompletedTurfOnboarding,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/vendor/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, businessName } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      { name, phone, businessName },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.businessName,
        status: vendor.status,
        isVerified: vendor.isVerified,
        hasCompletedTurfOnboarding: vendor.hasCompletedTurfOnboarding,
      },
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};