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

      // Dispatch FCM Push Notification to registered devices
      try {
        const deviceTokens = await prisma.deviceToken.findMany({
          where: {
            ownerId: recipientId,
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
      console.warn('⚠️ In-app notification save warning:', err.message);
      return null;
    }
  },

  /**
   * Dispatch push notification via FCM to device tokens
   */
  async sendFcmPush({ tokens = [], title, body, data = {} }) {
    if (!tokens.length) return;

    const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
    const https = require('https');

    for (const token of tokens) {
      try {
        if (fcmServerKey) {
          const payload = JSON.stringify({
            to: token,
            priority: 'high',
            notification: {
              title,
              body,
              sound: 'default',
              android_channel_id: 'turf_notifications',
            },
            data: {
              ...data,
              title,
              body,
            },
          });

          const req = https.request(
            'https://fcm.googleapis.com/fcm/send',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `key=${fcmServerKey}`,
                'Content-Length': Buffer.byteLength(payload),
              },
            },
            (res) => {
              let resData = '';
              res.on('data', (chunk) => { resData += chunk; });
              res.on('end', async () => {
                if (res.statusCode === 200) {
                  try {
                    const parsed = JSON.parse(resData);
                    if (parsed.results && parsed.results[0]?.error) {
                      const errName = parsed.results[0].error;
                      if (errName === 'NotRegistered' || errName === 'InvalidRegistration') {
                        await prisma.deviceToken.deleteMany({ where: { token } }).catch(() => {});
                      }
                    }
                  } catch {}
                }
              });
            }
          );

          req.on('error', (e) => console.warn('⚠️ FCM send request error:', e.message));
          req.write(payload);
          req.end();
        } else {
          console.log(`📱 [FCM Push Ready] Notification to token (${token.slice(0, 12)}...): "${title}"`);
        }
      } catch (err) {
        console.warn('⚠️ Error sending to token:', err.message);
      }
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
