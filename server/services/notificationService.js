const { db, messaging } = require('../config/firebaseAdmin');
const firestoreService = require('./firestoreService');

/**
 * Push & In-App Notification Service
 */
const notificationService = {
  /**
   * Send notification to a specific user/vendor
   * @param {Object} params
   * @param {string} params.recipientId - User or Vendor UID
   * @param {string} params.recipientRole - 'user' | 'vendor'
   * @param {string} params.title - Notification title
   * @param {string} params.body - Notification body
   * @param {string} params.type - 'booking' | 'kyc' | 'match' | 'subscription' | 'general'
   * @param {Object} params.data - Metadata payload
   */
  async sendNotification({
    recipientId,
    recipientRole = 'user',
    title,
    body,
    type = 'general',
    data = {},
  }) {
    // 1. Create In-App Notification document in Firestore
    let notificationDoc = null;
    try {
      if (db) {
        notificationDoc = await firestoreService.createDoc('notifications', {
          recipientId,
          recipientRole,
          title,
          body,
          type,
          data,
          read: false,
        });
      }
    } catch (err) {
      console.warn('Failed to save in-app notification doc:', err.message);
    }

    // 2. Fetch recipient's FCM tokens
    try {
      if (!messaging || !db) return notificationDoc;

      const collectionName = recipientRole === 'vendor' ? 'vendors' : 'users';
      const userDoc = await firestoreService.getDoc(collectionName, recipientId);
      const fcmTokens = userDoc?.fcmTokens || [];

      if (fcmTokens.length === 0) {
        return notificationDoc;
      }

      // 3. Send Multicast FCM Push
      const message = {
        tokens: fcmTokens,
        notification: {
          title,
          body,
        },
        data: {
          type,
          notificationId: notificationDoc?.id || '',
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
        },
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`📡 Sent FCM push to ${recipientId} (${response.successCount} succeeded, ${response.failureCount} failed)`);
    } catch (err) {
      console.warn(`⚠️ FCM push notification failed for ${recipientId}:`, err.message);
    }

    return notificationDoc;
  },
};

module.exports = notificationService;
