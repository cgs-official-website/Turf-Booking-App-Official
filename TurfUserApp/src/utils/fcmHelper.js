// src/utils/fcmHelper.js
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsApi } from '../api/notifications';

const FCM_TOKEN_KEY = '@turf_fcm_token';

export const fcmHelper = {
  /**
   * Request notification permission on Android 13+ (POST_NOTIFICATIONS)
   */
  async requestPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('⚠️ Notification permission request error:', err.message);
        return false;
      }
    }
    return true;
  },

  /**
   * Register device token with backend
   */
  async registerDeviceToken(token) {
    if (!token) return;
    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      await notificationsApi.registerToken(token);
      console.log('✅ Device FCM token registered with backend');
    } catch (err) {
      console.warn('⚠️ Failed to register FCM token with backend:', err.message);
    }
  },

  /**
   * Unregister token on logout
   */
  async unregisterDeviceToken() {
    try {
      const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (token) {
        await notificationsApi.removeToken(token);
        await AsyncStorage.removeItem(FCM_TOKEN_KEY);
        console.log('🚪 FCM token detached on logout');
      }
    } catch (err) {
      console.warn('⚠️ Failed to remove FCM token on logout:', err.message);
    }
  },

  /**
   * Handle deep-linking navigation from notification payload
   */
  handleNotificationNavigation(navigation, payload = {}) {
    if (!navigation || !payload) return;

    const { type, bookingId, matchId } = payload;

    if (type === 'booking' && bookingId) {
      navigation.navigate('BookingDetail', { bookingId });
    } else if (type === 'match' && matchId) {
      navigation.navigate('MatchScreen', { matchId });
    } else if (type === 'notifications') {
      navigation.navigate('Notifications');
    }
  },
};
