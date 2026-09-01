const { db } = require('../config/firebaseAdmin');
const { sendError } = require('../utils/response');

/**
 * Checks if the authenticated user has the required role ('user', 'vendor', 'admin')
 * Optional options:
 * - requireApprovedKyc: boolean (for vendor actions)
 * - requireActiveSubscription: boolean (for vendor actions)
 */
const requireRole = (allowedRoles = [], options = {}) => {
  return async (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    const { role, uid } = req.user;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(role) && !req.user.admin) {
      return sendError(res, `Access forbidden for role '${role}'`, 403, 'FORBIDDEN_ROLE');
    }

    // Vendor specific checks if requested
    if (role === 'vendor' && (options.requireApprovedKyc || options.requireActiveSubscription)) {
      try {
        if (db) {
          const vendorDoc = await db.collection('vendors').doc(uid).get();
          if (!vendorDoc.exists) {
            return sendError(res, 'Vendor profile not found', 404, 'VENDOR_NOT_FOUND');
          }
          const vendor = vendorDoc.data();

          if (options.requireApprovedKyc && vendor.kycStatus !== 'approved') {
            return sendError(res, 'Vendor KYC is pending admin approval', 403, 'KYC_NOT_APPROVED');
          }

          if (options.requireActiveSubscription && !vendor.subscription?.active) {
            return sendError(res, 'Active subscription required to perform this action', 403, 'SUBSCRIPTION_REQUIRED');
          }

          req.vendorData = vendor;
        }
      } catch (err) {
        console.error('requireRole vendor check error:', err.message);
      }
    }

    next();
  };
};

module.exports = requireRole;
