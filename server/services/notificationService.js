const firestoreService = require('./firestoreService');

/**
 * In-App Notification Service (PostgreSQL Backed)
 */
const notificationService = {
  /**
   * Register device notification token for user or vendor
   */
  async registerToken({ recipientId, recipientRole = 'user', token }) {
    if (!recipientId || !token) return null;
    const collectionName = recipientRole === 'vendor' ? 'vendors' : 'users';
    try {
      const userDoc = await firestoreService.getDoc(collectionName, recipientId);
      const currentTokens = new Set(userDoc?.fcmTokens || []);
      currentTokens.add(token);
      await firestoreService.setDoc(collectionName, recipientId, {
        fcmTokens: Array.from(currentTokens),
        updatedAt: new Date().toISOString(),
      }, true);
      return true;
    } catch (err) {
      console.warn(`⚠️ Failed to register token for ${recipientId}:`, err.message);
      return false;
    }
  },

  /**
   * Remove/detach device token on logout
   */
  async removeToken({ recipientId, recipientRole = 'user', token }) {
    if (!recipientId || !token) return null;
    const collectionName = recipientRole === 'vendor' ? 'vendors' : 'users';
    try {
      const userDoc = await firestoreService.getDoc(collectionName, recipientId);
      const currentTokens = (userDoc?.fcmTokens || []).filter((t) => t !== token);
      await firestoreService.setDoc(collectionName, recipientId, {
        fcmTokens: currentTokens,
        updatedAt: new Date().toISOString(),
      }, true);
      return true;
    } catch (err) {
      console.warn(`⚠️ Failed to remove token for ${recipientId}:`, err.message);
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

    // Sanitize title & body to remove emojis and keep text clean and professional
    const cleanText = (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{200D}\u{FE0F}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const finalTitle = cleanText(title) || 'Notification';
    const finalBody = cleanText(body) || '';

    // 1. Create In-App Notification record in PostgreSQL
    let notificationDoc = null;
    try {
      notificationDoc = await firestoreService.createDoc('notifications', {
        recipientId,
        recipientRole,
        title: finalTitle,
        body: finalBody,
        type,
        data,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('⚠️ In-app notification save warning:', err.message);
    }

    return notificationDoc;
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
