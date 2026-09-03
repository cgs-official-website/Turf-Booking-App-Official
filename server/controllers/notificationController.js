const notificationService = require('../services/notificationService');
const firestoreService = require('../services/firestoreService');
const { sendSuccess, sendError } = require('../utils/response');

const notificationController = {
  /**
   * POST /api/v1/notifications/register-token
   * Register device FCM token
   */
  async registerToken(req, res) {
    const { token } = req.body;
    const { uid, role } = req.user;

    if (!token) {
      return sendError(res, 'FCM token is required', 400, 'MISSING_TOKEN');
    }

    const success = await notificationService.registerToken({
      recipientId: uid,
      recipientRole: role,
      token,
    });

    return sendSuccess(res, {
      success,
      message: 'FCM device token registered successfully',
    });
  },

  /**
   * POST /api/v1/notifications/remove-token
   * Detach device FCM token on logout
   */
  async removeToken(req, res) {
    const { token } = req.body;
    const { uid, role } = req.user;

    if (!token) {
      return sendError(res, 'FCM token is required', 400, 'MISSING_TOKEN');
    }

    const success = await notificationService.removeToken({
      recipientId: uid,
      recipientRole: role,
      token,
    });

    return sendSuccess(res, {
      success,
      message: 'FCM device token removed successfully',
    });
  },

  /**
   * GET /api/v1/notifications
   * Fetch in-app notifications for authenticated user/vendor
   */
  async getNotifications(req, res) {
    const { uid } = req.user;
    const result = await firestoreService.queryWithCursor('notifications', {
      filters: [['recipientId', '==', uid]],
      limit: 50,
      orderByField: 'createdAt',
      orderDirection: 'desc',
    });

    return sendSuccess(res, {
      notifications: result.items || [],
      unreadCount: (result.items || []).filter((n) => !n.read).length,
    });
  },

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark single notification as read
   */
  async markRead(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    const notif = await firestoreService.getDoc('notifications', id);
    if (!notif || notif.recipientId !== uid) {
      return sendError(res, 'Notification not found', 404, 'NOT_FOUND');
    }

    const updated = await firestoreService.updateDoc('notifications', id, {
      read: true,
      readAt: new Date(),
    });

    return sendSuccess(res, { notification: updated });
  },

  /**
   * PATCH /api/v1/notifications/read-all
   * Mark all notifications as read for current user
   */
  async markAllRead(req, res) {
    const { uid } = req.user;
    const result = await firestoreService.queryWithCursor('notifications', {
      filters: [
        ['recipientId', '==', uid],
        ['read', '==', false],
      ],
      limit: 100,
    });

    await Promise.all(
      (result.items || []).map((n) =>
        firestoreService.updateDoc('notifications', n.id, { read: true, readAt: new Date() })
      )
    );

    return sendSuccess(res, { message: 'All notifications marked as read' });
  },
};

module.exports = notificationController;
