const jwt = require('jsonwebtoken');

/**
 * Optional Auth Middleware: If a token is provided, verify and attach req.user,
 * but do not block unauthenticated requests.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret_change_in_production');
    const userId = decoded.id || decoded.uid || decoded.userId;
    req.user = {
      id: userId,
      uid: userId,
      role: decoded.role || 'user',
      phone: decoded.phone,
      email: decoded.email,
      admin: decoded.admin || false,
    };
  } catch (err) {
    req.user = null;
  }
  next();
};

module.exports = optionalAuth;
