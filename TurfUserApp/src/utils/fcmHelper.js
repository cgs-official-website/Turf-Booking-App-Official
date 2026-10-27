import { Platform, PermissionsAndroid, Alert, AppState, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { notificationsApi } from '../api/notifications';

const FCM_TOKEN_KEY = '@turf_fcm_token';

export const fcmHelper = {
  /**
   * Android phones (Xiaomi, Oppo, Vivo, Realme, OnePlus, Samsung...) delay or drop pushes for apps
   * that are battery-optimised. Ask ONCE for the exemption so notifications arrive instantly,
   * even when the app is closed (this is what WhatsApp does).
   */
  async ensureBackgroundDelivery() {
    try {
      if (Platform.OS !== 'android') return;
      const FLAG = '@turf_battery_prompted_v1';
      if (await AsyncStorage.getItem(FLAG)) return;
      const mod = NativeModules.LocalNotificationModule;
      if (!mod?.isIgnoringBatteryOptimizations) return;
      const already = await mod.isIgnoringBatteryOptimizations();
      if (already) {
        await AsyncStorage.setItem(FLAG, '1');
        return;
      }
      Alert.alert(
        'Get notifications instantly',
        'To receive booking and tournament alerts immediately, even when the app is closed, allow it to run in the background. Tap "Allow" on the next screen.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Allow',
            onPress: async () => {
              await AsyncStorage.setItem(FLAG, '1');
              mod.requestIgnoreBatteryOptimizations();
            },
          },
        ],
        { cancelable: true }
      );
    } catch (err) {
      console.warn('⚠️ ensureBackgroundDelivery error:', err.message);
    }
  },

  /** Is push configured on the server and is this device registered? */
  async getPushStatus() {
    return notificationsApi.pushStatus();
  },

  /** Sends a real push to this account's devices; returns what Firebase answered. */
  async sendTestPush() {
    return notificationsApi.testPush();
  },

  /**
   * Request notification permission on Android (including Android 13+ POST_NOTIFICATIONS)
   */
  async requestPermission() {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('⚠️ POST_NOTIFICATIONS permission not granted on Android 13+');
            return false;
          }
        }
        return true;
      } else {
        const authStatus = await messaging().requestPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      }
    } catch (err) {
      console.warn('⚠️ Notification permission request error:', err.message);
      return false;
    }
  },

  /**
   * Fetch device FCM token from Firebase
   */
  async getDeviceToken() {
    try {
      await this.requestPermission();

      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }

      const token = await messaging().getToken();
      return token;
    } catch (err) {
      console.warn('⚠️ Failed to obtain FCM token:', err.message);
      return null;
    }
  },

  /**
   * Register device token with backend (/api/v1/notifications/register-token)
   */
  async registerDeviceToken(providedToken = null) {
    try {
      const token = providedToken || (await this.getDeviceToken());
      if (!token) {
        console.warn('⚠️ No FCM token available to register');
        return null;
      }

      const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

      // Register with backend endpoint
      await notificationsApi.registerToken(token);
      console.log('✅ TurfUserApp FCM token registered with backend:', token.substring(0, 16) + '...');
      return token;
    } catch (err) {
      console.warn('⚠️ Failed to register FCM token with backend:', err.message);
      return null;
    }
  },

  /**
   * Unregister token on logout (/api/v1/notifications/remove-token)
   */
  async unregisterDeviceToken() {
    try {
      const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (token) {
        try {
          await notificationsApi.removeToken(token);
        } catch (apiErr) {
          console.warn('⚠️ Backend removeToken warning:', apiErr.message);
        }
        await AsyncStorage.removeItem(FCM_TOKEN_KEY);
        console.log('🚪 TurfUserApp FCM token detached on logout');
      }
    } catch (err) {
      console.warn('⚠️ Failed to remove FCM token on logout:', err.message);
    }
  },

  /**
   * Listen for token refresh and automatically sync with backend
   */
  setupTokenRefreshListener() {
    return messaging().onTokenRefresh(async (newToken) => {
      console.log('🔄 FCM token refreshed for TurfUserApp');
      if (newToken) {
        await this.registerDeviceToken(newToken);
      }
    });
  },

  /**
   * Deep-linking navigation from notification payload
   */
  handleNotificationNavigation(navigationRef, payload = {}) {
    if (!navigationRef || !payload) return;

    const navigate = (name, params) => {
      if (navigationRef.isReady && navigationRef.isReady()) {
        navigationRef.navigate(name, params);
      } else if (navigationRef.navigate) {
        navigationRef.navigate(name, params);
      }
    };

    const type = payload.type;
    const bookingId = payload.bookingId || payload.id;
    const matchId = payload.matchId;

    if (type === 'booking' && bookingId) {
      navigate('BookingDetail', { bookingId, id: bookingId });
    } else if (type === 'match' && matchId) {
      navigate('Match', { matchId });
    } else if (
      type === 'tournament' ||
      payload.screen === 'TournamentDetail' ||
      payload.tournamentId ||
      payload.action?.startsWith?.('tournament') ||
      payload.action === 'bracket_generated'
    ) {
      const tournamentId = payload.tournamentId || payload.id;
      const initialTab = payload.tab || (payload.action === 'bracket_generated' ? 'bracket' : 'details');
      if (tournamentId) {
        navigate('TournamentDetail', { tournamentId, id: tournamentId, initialTab, tab: initialTab });
      } else {
        navigate('Tournament');
      }
    } else if (payload.screen === 'Bookings') {
      navigate('Main', { screen: 'Bookings' });
    } else {
      navigate('Notifications');
    }
  },

  /**
   * Setup listeners for foreground notifications, background taps, and quit-state opens
   */
  setupNotificationListeners(navigationRef) {
    const shownNotificationIds = new Set();

    const cleanText = (str) =>
      str
        ? String(str)
          .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{200D}\u{FE0F}]/gu, '')
          .replace(/\s+/g, ' ')
          .trim()
        : '';

    const triggerSystemNotification = ({ title, body, data }) => {
      try {
        if (NativeModules.LocalNotificationModule) {
          NativeModules.LocalNotificationModule.showNotification(
            title,
            body,
            data || {}
          );
        }
      } catch (err) {
        console.warn('⚠️ Native system notification error:', err.message);
      }
    };

    const showNotificationAlert = ({ title, body, data }) => {
      const isTournament = data?.type === 'tournament' || data?.screen === 'TournamentDetail';
      const notifTitle = cleanText(title) || (isTournament ? 'Tournament Update' : 'Booking Update');
      const notifBody = cleanText(body) || (isTournament ? 'You have an update on your tournament.' : 'You have an update on your turf booking.');

      // Mobile level system notification with logo.png (shown in background/quit or heads-up)
      triggerSystemNotification({ title: notifTitle, body: notifBody, data });

      // If user is currently in the app, also present interactive dialog
      if (AppState.currentState === 'active') {
        Alert.alert(
          notifTitle,
          notifBody,
          [
            { text: 'Dismiss', style: 'cancel' },
            {
              text: isTournament ? 'View Tournament' : 'View Booking',
              onPress: () => this.handleNotificationNavigation(navigationRef, data),
            },
          ],
          { cancelable: true }
        );
      }
    };

    // 1. Foreground message handler
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('🔔 Foreground FCM notification received:', remoteMessage);

      const title = remoteMessage?.notification?.title || remoteMessage?.data?.title || 'Booking Update';
      const body = remoteMessage?.notification?.body || remoteMessage?.data?.body || '';
      const data = remoteMessage?.data || {};

      const dedupeKey =
        data.notificationId ||
        remoteMessage?.messageId ||
        (data.tournamentId ? `${data.action || 'tournament'}_${data.tournamentId}` : null) ||
        (data.bookingId ? `booking_${data.bookingId}` : null);

      if (dedupeKey && shownNotificationIds.has(dedupeKey)) {
        console.log('Skipping duplicate foreground notification:', dedupeKey);
        return;
      }

      if (dedupeKey) shownNotificationIds.add(dedupeKey);
      if (data.notificationId) shownNotificationIds.add(data.notificationId);
      if (remoteMessage?.messageId) shownNotificationIds.add(remoteMessage.messageId);

      showNotificationAlert({ title, body, data });
    });

    // 2. Notification opened app while in background
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('📲 Notification opened app from background:', remoteMessage);
      if (remoteMessage?.data) {
        this.handleNotificationNavigation(navigationRef, remoteMessage.data);
      }
    });

    // 3. Notification opened app from quit state
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data) {
          console.log('🚀 Notification opened app from quit state:', remoteMessage);
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (navigationRef?.isReady && navigationRef.isReady()) {
              clearInterval(interval);
              this.handleNotificationNavigation(navigationRef, remoteMessage.data);
            } else if (attempts > 35) {
              clearInterval(interval);
              this.handleNotificationNavigation(navigationRef, remoteMessage.data);
            }
          }, 150);
        }
      })
      .catch((err) => console.warn('⚠️ getInitialNotification error:', err.message));

    // 3b. Check native local notification launch / click if available
    const checkLocalNotificationLaunch = () => {
      try {
        if (NativeModules.LocalNotificationModule?.getInitialNotification) {
          NativeModules.LocalNotificationModule.getInitialNotification()
            .then((localData) => {
              if (localData && (localData.screen || localData.type || localData.tournamentId || localData.bookingId)) {
                console.log('🚀 Native local notification tapped in TurfUserApp:', localData);
                let attempts = 0;
                const interval = setInterval(() => {
                  attempts++;
                  if (navigationRef?.isReady && navigationRef.isReady()) {
                    clearInterval(interval);
                    this.handleNotificationNavigation(navigationRef, localData);
                  } else if (attempts > 35) {
                    clearInterval(interval);
                    this.handleNotificationNavigation(navigationRef, localData);
                  }
                }, 150);
              }
            })
            .catch(() => { });
        }
      } catch { }
    };

    checkLocalNotificationLaunch();
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkLocalNotificationLaunch();
      }
    });

    // 4. Token refresh listener
    const unsubscribeOnTokenRefresh = this.setupTokenRefreshListener();

    // 5. Active In-App & Background Poller for real-time booking notifications
    const pollInterval = setInterval(async () => {
      try {
        if (AppState.currentState !== 'active') return;
        const res = await notificationsApi.getAll();
        const list = res?.data?.notifications || res?.notifications || [];
        const now = Date.now();

        // Check for fresh unread booking or tournament notifications in last 90 seconds
        for (const notif of list) {
          const isTargetType =
            notif.type === 'booking' ||
            notif.data?.type === 'booking' ||
            notif.type === 'tournament' ||
            notif.data?.type === 'tournament' ||
            notif.type === 'general';

          if (!notif.isRead && !notif.read && isTargetType) {
            const notifTime = new Date(notif.createdAt).getTime();
            const dedupeKey =
              notif.id ||
              notif._id ||
              (notif.data?.tournamentId ? `${notif.data?.action || 'tournament'}_${notif.data.tournamentId}` : null) ||
              (notif.data?.bookingId ? `booking_${notif.data.bookingId}` : null);

            if (
              now - notifTime < 90000 &&
              !shownNotificationIds.has(notif.id) &&
              !(dedupeKey && shownNotificationIds.has(dedupeKey))
            ) {
              if (notif.id) shownNotificationIds.add(notif.id);
              if (dedupeKey) shownNotificationIds.add(dedupeKey);
              showNotificationAlert({
                title: notif.title,
                body: notif.body,
                data: notif.data || {
                  id: notif.data?.tournamentId || notif.data?.bookingId,
                  tournamentId: notif.data?.tournamentId,
                  bookingId: notif.data?.bookingId,
                  screen: notif.data?.tournamentId ? 'TournamentDetail' : 'BookingDetail',
                  type: notif.type || notif.data?.type,
                },
              });
              break;
            }
          }
        }
      } catch { }
    }, 10000);

    return () => {
      appStateSub?.remove?.();
      clearInterval(pollInterval);
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  },
};
