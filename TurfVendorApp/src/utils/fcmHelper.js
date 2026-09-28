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
    const kycStatus = payload.kycStatus;

    if (type === 'booking' && bookingId) {
      navigate('BookingDetail', { bookingId, id: bookingId });
    } else if (payload.screen === 'Bookings' || type === 'booking') {
      navigate('Bookings');
    } else if (type === 'kyc') {
      if (kycStatus === 'approved') {
        navigate('SubscriptionPlans');
      } else {
        navigate('TurfUnderReview');
      }
    } else {
      navigate('Notifications');
    }
  },

  /**
   * Setup listeners for foreground notifications, background taps, and quit-state opens
   */
  setupNotificationListeners(navigationRef) {
    // 1. Foreground notification handler
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('🔔 Foreground FCM vendor notification received:', remoteMessage);

      const title = remoteMessage?.notification?.title || 'Vendor Notification';
      const body = remoteMessage?.notification?.body || '';
      const data = remoteMessage?.data || {};

      Alert.alert(
        title,
        body,
        [
          { text: 'Dismiss', style: 'cancel' },
          {
            text: 'View',
            onPress: () => this.handleNotificationNavigation(navigationRef, data),
          },
        ],
        { cancelable: true }
      );
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
          setTimeout(() => {
            this.handleNotificationNavigation(navigationRef, remoteMessage.data);
          }, 1200); // Allow navigation stack to mount
        }
      })
      .catch((err) => console.warn('⚠️ getInitialNotification vendor error:', err.message));

    // 4. Token refresh listener
    const unsubscribeOnTokenRefresh = this.setupTokenRefreshListener();

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  },
};
