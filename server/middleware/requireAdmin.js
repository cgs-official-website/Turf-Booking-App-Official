const { sendError } = require('../utils/response');

/**
 * Super Admin Gate: Requires Firebase custom claim admin: true or role 'admin'
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
  }

  if (req.user.admin === true || req.user.role === 'admin') {
    return next();
  }

  return sendError(res, 'Super Admin privileges required', 403, 'ADMIN_ACCESS_REQUIRED');
};

module.exports = requireAdmin;
