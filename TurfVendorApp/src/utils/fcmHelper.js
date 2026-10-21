import { Platform, PermissionsAndroid, Alert, AppState, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { notificationsApi } from '../api/notifications';

const VENDOR_FCM_TOKEN_KEY = '@vendor_fcm_token';

export const fcmHelper = {
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
            console.warn('⚠️ POST_NOTIFICATIONS permission not granted on Android 13+ for vendor');
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
      console.warn('⚠️ Vendor notification permission error:', err.message);
      return false;
    }
  },

  /**
   * Fetch vendor device FCM token from Firebase
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
      console.warn('⚠️ Failed to obtain vendor FCM token:', err.message);
      return null;
    }
  },

  /**
   * Register vendor device token with backend (/api/v1/notifications/register-token)
   */
  async registerDeviceToken(providedToken = null) {
    try {
      const token = providedToken || (await this.getDeviceToken());
      if (!token) {
        console.warn('⚠️ No FCM token available for vendor');
        return null;
      }

      await AsyncStorage.setItem(VENDOR_FCM_TOKEN_KEY, token);

      // Register with backend endpoint (authenticated with vendorToken)
      await notificationsApi.registerToken(token);
      console.log('✅ TurfVendorApp FCM token registered with backend:', token.substring(0, 16) + '...');
      return token;
    } catch (err) {
      console.warn('⚠️ Failed to register vendor FCM token with backend:', err.message);
      return null;
    }
  },

  /**
   * Unregister vendor device token on logout (/api/v1/notifications/remove-token)
   */
  async unregisterDeviceToken() {
    try {
      const token = await AsyncStorage.getItem(VENDOR_FCM_TOKEN_KEY);
      if (token) {
        try {
          await notificationsApi.removeToken(token);
        } catch (apiErr) {
          console.warn('⚠️ Backend removeToken warning for vendor:', apiErr.message);
        }
        await AsyncStorage.removeItem(VENDOR_FCM_TOKEN_KEY);
        console.log('🚪 TurfVendorApp FCM token removed on logout');
      }
    } catch (err) {
      console.warn('⚠️ Failed to remove vendor FCM token on logout:', err.message);
    }
  },

  /**
   * Listen for token refresh and automatically sync with backend
   */
  setupTokenRefreshListener() {
    return messaging().onTokenRefresh(async (newToken) => {
      console.log('🔄 FCM token refreshed for TurfVendorApp');
      if (newToken) {
        await this.registerDeviceToken(newToken);
      }
    });
  },

  /**
   * Deep-linking navigation from notification payload for vendor
   */
  /**
   * Deep-linking navigation from notification payload for vendor
   */
  handleNotificationNavigation(navigationRef, payload = {}) {
    if (!payload) return;

    const navigateAction = () => {
      if (!navigationRef) return false;
      const type = payload.type;
      const bookingId = payload.bookingId || payload.id;
      const kycStatus = payload.kycStatus;

      const nav = (name, params) => {
        try {
          if (navigationRef.isReady && navigationRef.isReady()) {
            navigationRef.navigate(name, params);
            return true;
          } else if (navigationRef.navigate) {
            navigationRef.navigate(name, params);
            return true;
          }
        } catch (e) {
          console.warn('Navigation error:', e.message);
        }
        return false;
      };

      if ((type === 'booking' || payload.screen === 'BookingDetail') && bookingId) {
        return nav('BookingDetail', { bookingId, id: bookingId });
      } else if (payload.screen === 'Bookings' || type === 'booking') {
        return nav('Bookings');
      } else if (type === 'kyc') {
        if (kycStatus === 'approved') {
          return nav('SubscriptionPlans');
        } else {
          return nav('TurfUnderReview');
        }
      } else if (type === 'tournament' || payload.screen === 'TournamentDetail') {
        const tournamentId = payload.tournamentId || payload.id;
        if (tournamentId) {
          return nav('TournamentDetail', { tournamentId, id: tournamentId });
        }
        return nav('Tournaments');
      } else {
        return nav('Notifications');
      }
    };

    if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
      navigateAction();
    } else {
      // Retry until navigationRef is ready (e.g. while splash or auth bootstraps)
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
          clearInterval(interval);
          navigateAction();
        } else if (attempts > 35) {
          clearInterval(interval);
        }
      }, 150);
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

    const showVendorPopup = ({ title, body, data }) => {
      const isTournament = data?.type === 'tournament' || data?.screen === 'TournamentDetail';
      const isReg = data?.action === 'tournament_registration';
      const defaultTitle = isReg ? 'New Team Registration' : (isTournament ? 'Tournament Request' : 'New Notification');
      const defaultBody = isReg ? 'A new team has registered for your tournament.' : (isTournament ? 'A user requested to host a tournament at your turf.' : 'Tap to check details.');
      const popupTitle = cleanText(title) || defaultTitle;
      const popupBody = cleanText(body) || defaultBody;

      // Mobile level system notification with logo.png (shown in background/quit or heads-up)
      triggerSystemNotification({ title: popupTitle, body: popupBody, data });

      // If user is currently in the app, also present interactive dialog
      if (AppState.currentState === 'active') {
        Alert.alert(
          popupTitle,
          popupBody,
          [
            { text: 'Dismiss', style: 'cancel' },
            {
              text: isReg ? 'Review Application' : (isTournament ? 'Review Request' : 'View Booking'),
              onPress: () => this.handleNotificationNavigation(navigationRef, data),
            },
          ],
          { cancelable: true }
        );
      }
    };

    // 1. Foreground notification handler (FCM push)
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('🔔 Foreground FCM vendor notification received:', remoteMessage);

      const data = remoteMessage?.data || {};
      const notifId = data.notificationId || remoteMessage?.messageId;
      if (notifId) shownNotificationIds.add(notifId);

      const isReg = data?.action === 'tournament_registration';
      const defaultTitle = isReg ? 'New Team Registration' : (data?.type === 'tournament' ? 'Tournament Request' : 'New Booking');
      const title =
        remoteMessage?.notification?.title ||
        data.notificationText ||
        data.title ||
        defaultTitle;
      const body =
        remoteMessage?.notification?.body ||
        data.notificationText ||
        data.body ||
        data.message ||
        '';

      showVendorPopup({ title, body, data });
    });

    // 2. Notification opened app while in background
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('📲 Notification opened TurfVendorApp from background:', remoteMessage);
      if (remoteMessage?.data) {
        this.handleNotificationNavigation(navigationRef, remoteMessage.data);
      }
    });

    // 3. Notification opened app from quit state
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data) {
          console.log('🚀 Notification opened TurfVendorApp from quit state:', remoteMessage);
          this.handleNotificationNavigation(navigationRef, remoteMessage.data);
        }
      })
      .catch((err) => console.warn('⚠️ getInitialNotification vendor error:', err.message));

    // 3b. Check native local notification launch / click if available
    const checkLocalNotificationLaunch = () => {
      try {
        if (NativeModules.LocalNotificationModule?.getInitialNotification) {
          NativeModules.LocalNotificationModule.getInitialNotification()
            .then((localData) => {
              if (localData && (localData.screen || localData.type || localData.tournamentId || localData.bookingId)) {
                console.log('🚀 Native local notification tapped:', localData);
                this.handleNotificationNavigation(navigationRef, localData);
              }
            })
            .catch(() => {});
        }
      } catch {}
    };

    checkLocalNotificationLaunch();
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkLocalNotificationLaunch();
      }
    });

    // 4. Token refresh listener
    const unsubscribeOnTokenRefresh = this.setupTokenRefreshListener();

    // 5. Active In-App Poller (ensures popup notifications work in dev & foreground reliably)
    const pollInterval = setInterval(async () => {
      try {
        const res = await notificationsApi.getAll();
        const list = res?.data?.notifications || res?.notifications || [];
        const now = Date.now();

        // Check for fresh unread booking or tournament notifications in last 90 seconds
        for (const notif of list) {
          const isTargetType =
            notif.type === 'booking' ||
            notif.data?.type === 'booking' ||
            notif.type === 'tournament' ||
            notif.data?.type === 'tournament';

          if (!notif.isRead && !notif.read && isTargetType) {
            const notifTime = new Date(notif.createdAt).getTime();
            if (now - notifTime < 90000 && !shownNotificationIds.has(notif.id)) {
              shownNotificationIds.add(notif.id);
              showVendorPopup({
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
      } catch {}
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (appStateSub && typeof appStateSub.remove === 'function') {
        appStateSub.remove();
      }
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  },
};
