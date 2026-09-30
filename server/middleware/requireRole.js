const { sendError } = require('../utils/response');
const prisma = require('../config/prisma');

/**
 * Checks if the authenticated user has the required role ('user', 'vendor', 'admin', 'superadmin')
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

    if (!roles.includes(role) && !req.user.admin && role !== 'superadmin') {
      return sendError(res, `Access forbidden for role '${role}'`, 403, 'FORBIDDEN_ROLE');
    }

    // Vendor specific checks
    if (role === 'vendor' && (options.requireApprovedKyc || options.requireActiveSubscription)) {
      try {
        const vendor = await prisma.vendor.findUnique({
          where: { id: uid },
          include: {
            subscriptions: {
              where: {
                status: 'active',
                expiresAt: { gt: new Date() },
              },
              take: 1,
            },
          },
        });

        if (!vendor) {
          return sendError(res, 'Vendor profile not found', 404, 'VENDOR_NOT_FOUND');
        }

        if (options.requireApprovedKyc && vendor.kycStatus !== 'approved') {
          return sendError(res, 'Vendor KYC is pending admin approval', 403, 'KYC_NOT_APPROVED');
        }

        if (options.requireActiveSubscription) {
          const hasActiveSub = vendor.subscriptions && vendor.subscriptions.length > 0;
          if (!hasActiveSub) {
            return sendError(res, 'Active subscription required to perform this action', 403, 'SUBSCRIPTION_REQUIRED');
          }
        }

        req.vendorData = vendor;
      } catch (err) {
        console.error('requireRole vendor check error:', err.message);
        return sendError(res, 'Failed to verify vendor permissions', 500, 'INTERNAL_ERROR');
      }
    }

    next();
  };
};

module.exports = requireRole;
