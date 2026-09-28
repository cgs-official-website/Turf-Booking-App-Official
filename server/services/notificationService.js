const { db, messaging } = require('../config/firebaseAdmin');
const firestoreService = require('./firestoreService');

/**
 * Production Firebase Cloud Messaging (FCM) & In-App Notification Service
 */
const notificationService = {
  /**
   * Register device FCM token for user or vendor
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
        updatedAt: new Date(),
      }, true);
      return true;
    } catch (err) {
      console.warn(`⚠️ Failed to register FCM token for ${recipientId}:`, err.message);
      return false;
    }
  },

  /**
   * Remove/detach device FCM token on logout
   */
  async removeToken({ recipientId, recipientRole = 'user', token }) {
    if (!recipientId || !token) return null;
    const collectionName = recipientRole === 'vendor' ? 'vendors' : 'users';
    try {
      const userDoc = await firestoreService.getDoc(collectionName, recipientId);
      const currentTokens = (userDoc?.fcmTokens || []).filter((t) => t !== token);
      await firestoreService.setDoc(collectionName, recipientId, {
        fcmTokens: currentTokens,
        updatedAt: new Date(),
      }, true);
      return true;
    } catch (err) {
      console.warn(`⚠️ Failed to remove FCM token for ${recipientId}:`, err.message);
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

    // 1. Create In-App Notification document in Firestore
    let notificationDoc = null;
    try {
      if (db) {
        notificationDoc = await firestoreService.createDoc('notifications', {
          recipientId,
          recipientRole,
          title: finalTitle,
          body: finalBody,
          type,
          data,
          read: false,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.warn('⚠️ In-app notification save warning:', err.message);
    }

    // 2. Dispatch FCM Push Notification
    try {
      if (!messaging || !db) return notificationDoc;

      const collectionName = recipientRole === 'vendor' ? 'vendors' : 'users';
      const userDoc = await firestoreService.getDoc(collectionName, recipientId);
      const fcmTokens = Array.isArray(userDoc?.fcmTokens) ? userDoc.fcmTokens : [];

      if (fcmTokens.length === 0) {
        return notificationDoc;
      }

      const stringData = {
        type: String(type),
        notificationId: notificationDoc?.id || '',
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v ?? '')])
        ),
      };

      const message = {
        tokens: fcmTokens,
        notification: {
          title: finalTitle,
          body: finalBody,
        },
        data: stringData,
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#00B761',
            sound: 'default',
            channelId: 'turf_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`📡 FCM push dispatched to ${recipientRole} ${recipientId} (${response.successCount} sent, ${response.failureCount} failed)`);

      // 3. Stale token cleanup
      if (response.failureCount > 0) {
        const deadTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              deadTokens.push(fcmTokens[idx]);
            }
          }
        });

        if (deadTokens.length > 0) {
          const validTokens = fcmTokens.filter((t) => !deadTokens.includes(t));
          await firestoreService.setDoc(collectionName, recipientId, {
            fcmTokens: validTokens,
          }, true);
          console.log(`🧹 Cleaned ${deadTokens.length} stale FCM tokens for ${recipientId}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ FCM push dispatch warning for ${recipientId}:`, err.message);
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
