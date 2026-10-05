const prisma = require('../config/prisma');
const { admin, firebaseApp, messaging } = require('../config/firebase');

/**
 * In-App & Remote Push Notification Service (PostgreSQL & FCM HTTP v1)
 */
const notificationService = {
  /**
   * Get notification preference for user or vendor
   * Returns boolean (default: true)
   */
  async getNotificationPreference(ownerId, ownerType = 'user') {
    if (!ownerId) return true;
    try {
      const doc = await prisma.document.findUnique({
        where: {
          collection_id: {
            collection: `pref_${ownerType}`,
            id: String(ownerId),
          },
        },
      });
      if (doc?.data && typeof doc.data.pushNotifications === 'boolean') {
        return doc.data.pushNotifications;
      }
      return true;
    } catch (err) {
      console.warn(`⚠️ Error reading preference for ${ownerType}:${ownerId}:`, err.message);
      return true;
    }
  },

  /**
   * Set notification preference for user or vendor in PostgreSQL documents table
   */
  async setNotificationPreference(ownerId, ownerType = 'user', enabled = true) {
    if (!ownerId) return null;
    try {
      const boolVal = Boolean(enabled);
      await prisma.document.upsert({
        where: {
          collection_id: {
            collection: `pref_${ownerType}`,
            id: String(ownerId),
          },
        },
        update: {
          data: { pushNotifications: boolVal },
          updatedAt: new Date(),
        },
        create: {
          collection: `pref_${ownerType}`,
          id: String(ownerId),
          data: { pushNotifications: boolVal },
        },
      });
      return boolVal;
    } catch (err) {
      console.warn(`⚠️ Error setting preference for ${ownerType}:${ownerId}:`, err.message);
      throw err;
    }
  },

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
          ownerId: String(recipientId),
          updatedAt: new Date(),
        },
        create: {
          token,
          ownerType: recipientRole,
          ownerId: String(recipientId),
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
          ...(recipientId ? { ownerId: String(recipientId) } : {}),
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
          recipientId: String(recipientId),
          recipientType: recipientRole === 'vendor' ? 'vendor' : (recipientRole === 'admin' ? 'admin' : 'user'),
          title: finalTitle,
          body: finalBody,
          type: ['general', 'booking', 'kyc', 'match'].includes(type) ? type : 'general',
          data: data || {},
          isRead: false,
        },
      });

      // 1. Check if recipient has push notifications enabled in profile preferences
      const isPushEnabled = await this.getNotificationPreference(recipientId, recipientRole);
      if (!isPushEnabled) {
        console.log(`🔕 [FCM Push Skipped] Recipient ${recipientRole}:${recipientId} has Push Notifications turned OFF.`);
        return notif;
      }

      // 2. Dispatch FCM Push Notification to registered devices
      try {
        const deviceTokens = await prisma.deviceToken.findMany({
          where: {
            ownerId: String(recipientId),
            ownerType: recipientRole,
          },
          select: { token: true },
        });

        if (deviceTokens.length > 0) {
          const tokens = deviceTokens.map((t) => t.token).filter(Boolean);
          await this.sendFcmPush({
            tokens,
            title: finalTitle,
            body: finalBody,
            data: {
              ...data,
              notificationId: notifId,
              title: finalTitle,
              body: finalBody,
              type: String(type || 'general'),
            },
          });
        }
      } catch (pushErr) {
        console.warn('⚠️ FCM push dispatch warning:', pushErr.message);
      }

      return notif;
    } catch (err) {
      console.warn('⚠️ Notification record creation warning:', err.message);
      return null;
    }
  },

  /**
   * Dispatch push notification via FCM to device tokens
   * Uses Firebase Admin SDK HTTP v1 Multicast with automatic invalid token cleanup
   */
  async sendFcmPush({ tokens = [], title, body, data = {} }) {
    if (!tokens.length) return;

    // Convert all data values to strings for FCM payload compliance
    const stringData = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) {
        stringData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
    }

    const msgClient = messaging || (admin && typeof admin.messaging === 'function' ? admin.messaging() : null);

    if (msgClient) {
      try {
        const message = {
          tokens,
          notification: {
            title,
            body,
          },
          data: stringData,
          android: {
            priority: 'high',
            notification: {
              channelId: 'turf_notifications',
              sound: 'default',
              icon: 'ic_notification',
              color: '#00C566',
              priority: 'high',
              visibility: 'public',
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
        };

        const response = await msgClient.sendEachForMulticast(message);
        console.log(`📡 [FCM HTTP v1] Sent ${response.successCount}/${tokens.length} messages successfully.`);

        // Handle invalid/unregistered tokens automatically
        if (response.failureCount > 0) {
          const tokensToDelete = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              if (
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered'
              ) {
                tokensToDelete.push(tokens[idx]);
              }
            }
          });
          if (tokensToDelete.length > 0) {
            await prisma.deviceToken.deleteMany({
              where: { token: { in: tokensToDelete } },
            }).catch(() => {});
            console.log(`🧹 Cleaned up ${tokensToDelete.length} unregistered/invalid FCM token(s).`);
          }
        }
      } catch (fcmErr) {
        console.warn('⚠️ FCM HTTP v1 multicast error:', fcmErr.message);
      }
    } else {
      tokens.forEach((t) => {
        console.log(`📱 [FCM Push Ready] Notification to token (${t.slice(0, 12)}...): "${title}"`);
      });
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
