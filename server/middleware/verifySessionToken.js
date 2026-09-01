const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

/**
 * Primary Auth Guard: Verifies the backend-issued session JWT
 */
const verifySessionToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return sendError(res, 'Authorization token missing', 401, 'AUTH_TOKEN_MISSING');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret_change_in_production');
    req.user = {
      uid: decoded.uid,
      role: decoded.role || 'user',
      phone: decoded.phone,
      email: decoded.email,
      admin: decoded.admin || false,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Session token expired. Please login again.', 401, 'TOKEN_EXPIRED');
    }
    return sendError(res, 'Invalid authorization token', 401, 'INVALID_TOKEN');
  }
};

module.exports = verifySessionToken;
