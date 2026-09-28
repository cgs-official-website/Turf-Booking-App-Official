// src/utils/fcmHelper.js
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { notificationsApi } from '../api/notifications';

const FCM_TOKEN_KEY = '@turf_fcm_token';

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
      navigate('BookingDetail', { bookingId });
    } else if (type === 'match' && matchId) {
      navigate('Match', { matchId });
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
    // 1. Foreground message handler
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('🔔 Foreground FCM notification received:', remoteMessage);

      const title = remoteMessage?.notification?.title || 'Notification';
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
          setTimeout(() => {
            this.handleNotificationNavigation(navigationRef, remoteMessage.data);
          }, 1200); // Allow navigation stack to mount
        }
      })
      .catch((err) => console.warn('⚠️ getInitialNotification error:', err.message));

    // 4. Token refresh listener
    const unsubscribeOnTokenRefresh = this.setupTokenRefreshListener();

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  },
};
