// src/utils/fcmHelper.js
import { Platform, PermissionsAndroid, Alert } from 'react-native';
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

    const showBookingPopup = ({ title, body, data }) => {
      const popupTitle = cleanText(title) || 'New Booking';
      const popupBody = cleanText(body) || 'Tap View Booking to check details.';

      Alert.alert(
        popupTitle,
        popupBody,
        [
          { text: 'Dismiss', style: 'cancel' },
          {
            text: 'View Booking',
            onPress: () => this.handleNotificationNavigation(navigationRef, data),
          },
        ],
        { cancelable: true }
      );
    };

    // 1. Foreground notification handler (FCM push)
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('🔔 Foreground FCM vendor notification received:', remoteMessage);

      const data = remoteMessage?.data || {};
      const notifId = data.notificationId || remoteMessage?.messageId;
      if (notifId) shownNotificationIds.add(notifId);

      const title =
        remoteMessage?.notification?.title ||
        data.notificationText ||
        data.title ||
        'New Booking';
      const body =
        remoteMessage?.notification?.body ||
        data.notificationText ||
        data.body ||
        data.message ||
        '';

      showBookingPopup({ title, body, data });
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

    // 4. Token refresh listener
    const unsubscribeOnTokenRefresh = this.setupTokenRefreshListener();

    // 5. Active In-App Poller (ensures popup notifications work in dev & foreground reliably)
    const pollInterval = setInterval(async () => {
      try {
        const res = await notificationsApi.getAll();
        const list = res?.data?.notifications || res?.notifications || [];
        const now = Date.now();

        // Check for fresh unread booking notifications in last 90 seconds
        for (const notif of list) {
          if (!notif.isRead && !notif.read && (notif.type === 'booking' || notif.data?.type === 'booking')) {
            const notifTime = new Date(notif.createdAt).getTime();
            if (now - notifTime < 90000 && !shownNotificationIds.has(notif.id)) {
              shownNotificationIds.add(notif.id);
              showBookingPopup({
                title: notif.title,
                body: notif.body,
                data: notif.data || { bookingId: notif.data?.bookingId, screen: 'BookingDetail', type: 'booking' },
              });
              break;
            }
          }
        }
      } catch {}
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  },
};
