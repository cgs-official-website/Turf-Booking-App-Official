const notificationService = require('../services/notificationService');
const prisma = require('../config/prisma');
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

    try {
      const items = await prisma.notification.findMany({
        where: { recipientId: uid },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const unreadCount = await prisma.notification.count({
        where: { recipientId: uid, isRead: false },
      });

      const notifications = items.map((n) => ({
        ...n,
        read: n.isRead,
      }));

      return sendSuccess(res, {
        notifications,
        unreadCount,
      });
    } catch (err) {
      console.error('getNotifications error:', err);
      return sendError(res, 'Failed to fetch notifications', 500, 'FETCH_FAILED');
    }
  },

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark single notification as read
   */
  async markRead(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    try {
      const notif = await prisma.notification.findUnique({ where: { id } });
      if (!notif || notif.recipientId !== uid) {
        return sendError(res, 'Notification not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return sendSuccess(res, {
        notification: {
          ...updated,
          read: updated.isRead,
        },
      });
    } catch (err) {
      console.error('markRead error:', err);
      return sendError(res, 'Failed to mark notification as read', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * PATCH /api/v1/notifications/read-all
   * Mark all notifications as read for current user
   */
  async markAllRead(req, res) {
    const { uid } = req.user;

    try {
      await prisma.notification.updateMany({
        where: {
          recipientId: uid,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (err) {
      console.error('markAllRead error:', err);
      return sendError(res, 'Failed to mark all notifications as read', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * GET /api/v1/notifications/preferences
   * Fetch push notification ON/OFF preference for authenticated user/vendor
   */
  async getPreferences(req, res) {
    const { uid, role } = req.user;
    try {
      const pushNotifications = await notificationService.getNotificationPreference(uid, role);
      return sendSuccess(res, { pushNotifications });
    } catch (err) {
      console.error('getPreferences error:', err);
      return sendError(res, 'Failed to fetch preferences', 500, 'FETCH_FAILED');
    }
  },

  /**
   * PUT /api/v1/notifications/preferences
   * Update push notification ON/OFF preference for authenticated user/vendor
   */
  async updatePreferences(req, res) {
    const { uid, role } = req.user;
    const { pushNotifications } = req.body;

    if (typeof pushNotifications !== 'boolean') {
      return sendError(res, 'pushNotifications boolean field is required', 400, 'INVALID_BODY');
    }

    try {
      const updated = await notificationService.setNotificationPreference(uid, role, pushNotifications);
      return sendSuccess(res, {
        pushNotifications: updated,
        message: `Push notifications ${updated ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (err) {
      console.error('updatePreferences error:', err);
      return sendError(res, 'Failed to update preferences', 500, 'UPDATE_FAILED');
    }
  },
};

module.exports = notificationController;
