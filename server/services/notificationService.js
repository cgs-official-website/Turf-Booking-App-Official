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
        const cleanRecipientId = String(recipientId || '');
        const idVariations = [cleanRecipientId];
        if (cleanRecipientId.startsWith('vendor_')) {
          idVariations.push(cleanRecipientId.replace(/^vendor_/, ''));
        } else if (cleanRecipientId.startsWith('user_')) {
          idVariations.push(cleanRecipientId.replace(/^user_/, ''));
        } else {
          idVariations.push(`${recipientRole}_${cleanRecipientId}`);
        }

        const deviceTokens = await prisma.deviceToken.findMany({
          where: {
            ownerId: { in: idVariations },
            ownerType: { in: [recipientRole, recipientRole.toLowerCase(), recipientRole.toUpperCase()] },
          },
          select: { token: true },
        });

        if (deviceTokens.length > 0) {
          const tokens = [...new Set(deviceTokens.map((t) => t.token).filter(Boolean))];
          await this.sendFcmPush({
            tokens,
            title: finalTitle,
            body: finalBody,
            data: {
              ...data,
              notificationId: notifId,
              title: finalTitle,
              body: finalBody,
              notificationText: finalBody,
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
    const result = { configured: false, attempted: tokens.length, sent: 0, failed: 0, errors: [] };
    if (!tokens.length) return result;

    // Convert all data values to strings for FCM payload compliance
    const stringData = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) {
        stringData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
    }
    if (!stringData.title && title) stringData.title = String(title);
    if (!stringData.body && body) stringData.body = String(body);
    if (!stringData.notificationText && body) stringData.notificationText = String(body);

    const msgClient = messaging || (admin && typeof admin.messaging === 'function' && firebaseApp ? admin.messaging() : null);

    if (!msgClient) {
      // Without Firebase credentials NO push can ever reach a phone. The in-app bell still works
      // (that is why notifications only appear while the app is open).
      console.warn(
        `🚫 [FCM NOT CONFIGURED] ${tokens.length} push(es) were NOT sent ("${title}"). ` +
        'Set FIREBASE_SERVICE_ACCOUNT_BASE64 (or FIREBASE_SERVICE_ACCOUNT_JSON) on the server that handles the request.'
      );
      result.errors.push('FCM_NOT_CONFIGURED');
      return result;
    }
    result.configured = true;

    const startedAt = Date.now();
    try {
      const message = {
        tokens,
        notification: { title, body },
        data: stringData,
        android: {
          // "high" wakes the device immediately (like WhatsApp) instead of waiting for the next
          // battery-optimised maintenance window.
          priority: 'high',
          ttl: 60 * 60 * 1000, // drop after 1 hour: a stale "match started" push is useless
          notification: {
            channelId: 'turf_notifications',
            sound: 'default',
            icon: 'ic_notification',
            color: '#00B761',
            priority: 'max',
            visibility: 'public',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: 'default' } },
        },
      };

      const response = await msgClient.sendEachForMulticast(message);
      result.sent = response.successCount;
      result.failed = response.failureCount;
      console.log(
        `📡 [FCM HTTP v1] Sent ${response.successCount}/${tokens.length} in ${Date.now() - startedAt}ms ("${title}")`
      );

      if (response.failureCount > 0) {
        const tokensToDelete = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code || 'unknown';
            result.errors.push(errorCode);
            console.warn(`⚠️ [FCM] token ${String(tokens[idx]).slice(0, 12)}... failed: ${errorCode}`);
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-argument'
            ) {
              tokensToDelete.push(tokens[idx]);
            }
          }
        });
        if (tokensToDelete.length > 0) {
          await prisma.deviceToken.deleteMany({ where: { token: { in: tokensToDelete } } }).catch(() => { });
          console.log(`🧹 Cleaned up ${tokensToDelete.length} unregistered/invalid FCM token(s).`);
        }
      }
    } catch (fcmErr) {
      result.errors.push(fcmErr.code || fcmErr.message);
      console.warn('⚠️ FCM HTTP v1 multicast error:', fcmErr.message);
    }
    return result;
  },

  /**
   * Is server-side push configured, and how many devices does this account have registered?
   */
  async getPushStatus({ recipientId, recipientRole = 'user' }) {
    const msgClient = messaging || (firebaseApp && admin && typeof admin.messaging === 'function' ? admin.messaging() : null);
    const raw = String(recipientId || '');
    const ids = [raw, raw.replace(/^(user_|vendor_)/, ''), `${recipientRole}_${raw.replace(/^(user_|vendor_)/, '')}`];
    let tokenCount = 0;
    try {
      tokenCount = await prisma.deviceToken.count({
        where: { ownerId: { in: ids }, ownerType: { in: [recipientRole, recipientRole.toLowerCase(), recipientRole.toUpperCase()] } },
      });
    } catch (_) { /* ignore */ }
    return {
      fcmConfigured: Boolean(msgClient),
      projectId: firebaseApp?.options?.projectId || firebaseApp?.options?.credential?.projectId || null,
      registeredDevices: tokenCount,
      pushPreferenceEnabled: await this.getNotificationPreference(recipientId, recipientRole),
    };
  },

  /**
   * Send a real push to the caller's own devices and report exactly what FCM said.
   */
  async sendTestPush({ recipientId, recipientRole = 'user' }) {
    const raw = String(recipientId || '');
    const bare = raw.replace(/^(user_|vendor_)/, '');
    const rows = await prisma.deviceToken.findMany({
      where: {
        ownerId: { in: [raw, bare, `${recipientRole}_${bare}`] },
        ownerType: { in: [recipientRole, recipientRole.toLowerCase(), recipientRole.toUpperCase()] },
      },
      select: { token: true },
    });
    const tokens = [...new Set(rows.map((r) => r.token).filter(Boolean))];
    if (!tokens.length) {
      return { configured: Boolean(messaging), attempted: 0, sent: 0, failed: 0, errors: ['NO_DEVICE_TOKEN_REGISTERED'] };
    }
    return this.sendFcmPush({
      tokens,
      title: 'Test notification',
      body: 'If you can read this with the app closed, push notifications are working.',
      data: { type: 'general', action: 'test_push' },
    });
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

  /**
   * Broadcast newly published tournament notification to all eligible registered users
   * - Saves in-app bell notification for all active users
   * - Dispatches high-priority FCM HTTP v1 push notification to valid device tokens
   * - Enforces idempotency via documents table so retried calls do not send duplicate notifications
   */
  async broadcastTournament({ tournament, venue }) {
    if (!tournament || !tournament.id || tournament.status !== 'published') {
      return { success: false, reason: 'Tournament is not published' };
    }

    const tournamentId = String(tournament.id);

    // 1. Idempotency check: prevent duplicate broadcast on retried create/publish API calls
    try {
      const alreadyBroadcast = await prisma.document.findUnique({
        where: {
          collection_id: {
            collection: 'tournament_broadcast',
            id: tournamentId,
          },
        },
      });

      if (alreadyBroadcast) {
        console.log(`ℹ️ [Broadcast Skipped] Tournament ${tournamentId} has already been broadcasted.`);
        return { success: true, duplicate: true };
      }

      await prisma.document.create({
        data: {
          collection: 'tournament_broadcast',
          id: tournamentId,
          data: {
            broadcastAt: new Date(),
            tournamentName: tournament.name,
            creatorType: tournament.creatorType,
          },
        },
      });
    } catch (idemErr) {
      // If concurrent insert occurred, treat as duplicate and skip
      console.log(`ℹ️ [Broadcast Guard] Duplicate broadcast avoided for tournament ${tournamentId}`);
      return { success: true, duplicate: true };
    }

    const cleanText = (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{200D}\u{FE0F}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const venueLabel = cleanText(venue || tournament.venueName || tournament.turf?.name || tournament.city || 'Turf Arena');
    const tournamentName = cleanText(tournament.name) || 'New Tournament';
    const finalTitle = `Tournament Published: ${tournamentName}`;
    const finalBody = `Registration is open for "${tournamentName}" at ${venueLabel}. Tap to view details and register!`;

    const notifData = {
      tournamentId,
      id: tournamentId,
      screen: 'TournamentDetail',
      type: 'tournament',
      action: 'tournament_created',
      tournamentName: tournament.name,
      venueName: venueLabel,
      title: finalTitle,
      body: finalBody,
      notificationText: finalBody,
    };

    try {
      // 2. Fetch all registered active users
      const allUsers = await prisma.user.findMany({
        where: { status: 'active' },
        select: { id: true },
      });

      const excludeIds = new Set();
      if (tournament.userId) {
        const raw = String(tournament.userId);
        excludeIds.add(raw);
        if (raw.startsWith('user_')) excludeIds.add(raw.replace(/^user_/, ''));
        else excludeIds.add(`user_${raw}`);
      }
      const targetUserIds = allUsers
        .map((u) => String(u.id))
        .filter((uid) => uid && !excludeIds.has(uid));

      if (!targetUserIds.length) {
        return { success: true, count: 0 };
      }

      // 3. Batch save in-app notification records for all recipients (UserApp bell icon)
      const notifRows = targetUserIds.map((uid) => ({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        recipientId: uid,
        recipientType: 'user',
        title: finalTitle,
        body: finalBody,
        type: 'general',
        data: notifData,
        isRead: false,
      }));

      try {
        await prisma.notification.createMany({
          data: notifRows,
          skipDuplicates: true,
        });
        console.log(`📝 [In-App Bell] Persisted ${notifRows.length} notifications for published tournament ${tournamentId}`);
      } catch (dbErr) {
        console.warn('⚠️ Bulk in-app notification creation warning:', dbErr.message);
      }

      // 4. Check push notification preferences
      const prefDocs = await prisma.document.findMany({
        where: { collection: 'pref_user' },
        select: { id: true, data: true },
      });
      const disabledUserIds = new Set();
      prefDocs.forEach((d) => {
        if (d.data && d.data.pushNotifications === false) {
          const raw = String(d.id);
          disabledUserIds.add(raw);
          if (raw.startsWith('user_')) disabledUserIds.add(raw.replace(/^user_/, ''));
          else disabledUserIds.add(`user_${raw}`);
        }
      });

      const eligibleUserIds = targetUserIds.filter((uid) => !disabledUserIds.has(uid));
      if (!eligibleUserIds.length) {
        return { success: true, inAppCount: notifRows.length, pushCount: 0 };
      }

      // 5. Gather registered device tokens for eligible users (including ID prefix variations)
      const eligibleIdVariations = new Set();
      eligibleUserIds.forEach((uid) => {
        eligibleIdVariations.add(uid);
        if (uid.startsWith('user_')) {
          eligibleIdVariations.add(uid.replace(/^user_/, ''));
        } else {
          eligibleIdVariations.add(`user_${uid}`);
        }
      });

      const deviceTokens = await prisma.deviceToken.findMany({
        where: {
          ownerType: { in: ['user', 'USER'] },
          ownerId: { in: Array.from(eligibleIdVariations) },
        },
        select: { token: true },
      });

      const uniqueTokens = [...new Set(deviceTokens.map((t) => t.token).filter(Boolean))];
      console.log(`📡 [FCM Multicast] Broadcasting tournament "${tournamentName}" to ${uniqueTokens.length} device tokens...`);

      // 6. Send FCM HTTP v1 multicast in batches of 500 tokens
      const batches = [];
      for (let i = 0; i < uniqueTokens.length; i += 500) batches.push(uniqueTokens.slice(i, i + 500));
      await Promise.all(
        batches.map((batch) =>
          this.sendFcmPush({ tokens: batch, title: finalTitle, body: finalBody, data: notifData })
        )
      );

      return {
        success: true,
        inAppCount: notifRows.length,
        pushedTokenCount: uniqueTokens.length,
      };
    } catch (err) {
      console.warn('⚠️ broadcastTournament error:', err.message);
      return { success: false, error: err.message };
    }
  },
};

module.exports = notificationService;
