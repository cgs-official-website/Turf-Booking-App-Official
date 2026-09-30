const prisma = require('../config/prisma');

/**
 * In-App Notification Service (Prisma & PostgreSQL Backed)
 */
const notificationService = {
  /**
   * Register device notification token for user or vendor.
   * Upsert by token: a token moving to another account safely reassigns ownership.
   */
  async registerToken({ recipientId, recipientRole = 'user', token }) {
    if (!recipientId || !token) return null;
    try {
      await prisma.deviceToken.upsert({
        where: { token },
        update: {
          ownerType: recipientRole,
          ownerId: recipientId,
          updatedAt: new Date(),
        },
        create: {
          token,
          ownerType: recipientRole,
          ownerId: recipientId,
        },
      });
      return true;
    } catch (err) {
      console.warn(`⚠️ Failed to register token for ${recipientId}:`, err.message);
      return false;
    }
  },

  /**
   * Remove/detach device token on logout
   */
  async removeToken({ recipientId, token }) {
    if (!token) return null;
    try {
      await prisma.deviceToken.deleteMany({
        where: {
          token,
          ...(recipientId ? { ownerId: recipientId } : {}),
        },
      });
      return true;
    } catch (err) {
      console.warn('⚠️ Failed to remove token:', err.message);
      return false;
    }
  },

  /**
   * Send notification to a single user/vendor
   */
  async sendNotification({
    recipientId,
    recipientRole = 'user',
    title,
    body,
    type = 'general',
    data = {},
  }) {
    if (!recipientId) return null;

    const cleanText = (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{200D}\u{FE0F}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const finalTitle = cleanText(title) || 'Notification';
    const finalBody = cleanText(body) || '';

    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const notif = await prisma.notification.create({
        data: {
          id: notifId,
          recipientId,
          recipientType: recipientRole === 'vendor' ? 'vendor' : (recipientRole === 'admin' ? 'admin' : 'user'),
          title: finalTitle,
          body: finalBody,
          type: ['general', 'booking', 'kyc', 'match'].includes(type) ? type : 'general',
          data: data || {},
          isRead: false,
        },
      });
      return notif;
    } catch (err) {
      console.warn('⚠️ In-app notification save warning:', err.message);
      return null;
    }
  },

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds = [], params = {}) {
    return Promise.all(
      userIds.map((uid) =>
        this.sendNotification({ ...params, recipientId: uid, recipientRole: 'user' })
      )
    );
  },

  /**
   * Send notification to multiple vendors
   */
  async sendToVendors(vendorIds = [], params = {}) {
    return Promise.all(
      vendorIds.map((vid) =>
        this.sendNotification({ ...params, recipientId: vid, recipientRole: 'vendor' })
      )
    );
  },
};

module.exports = notificationService;
