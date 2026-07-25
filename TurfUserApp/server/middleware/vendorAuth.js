const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');

const vendorAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET);

    // Ensure it's a vendor token
    if (decoded.role !== 'vendor') {
      return res.status(403).json({ success: false, message: 'Access denied: vendor only' });
    }

    const vendor = await Vendor.findById(decoded.id);
    if (!vendor || !vendor.isActive) {
      return res.status(401).json({ success: false, message: 'Vendor not found or inactive' });
    }

    req.vendor = vendor;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = vendorAuth;