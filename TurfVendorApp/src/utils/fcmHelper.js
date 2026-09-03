// src/utils/fcmHelper.js
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsApi } from '../api/notifications';

const VENDOR_FCM_TOKEN_KEY = '@vendor_fcm_token';

export const fcmHelper = {
  /**
   * Request notification permission on Android 13+
   */
  async requestPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('⚠️ Vendor notification permission error:', err.message);
        return false;
      }
    }
    return true;
  },

  /**
   * Register vendor device token with backend
   */
  async registerDeviceToken(token) {
    if (!token) return;
    try {
      await AsyncStorage.setItem(VENDOR_FCM_TOKEN_KEY, token);
      await notificationsApi.registerToken(token);
      console.log('✅ Vendor FCM device token registered');
    } catch (err) {
      console.warn('⚠️ Failed to register vendor FCM token:', err.message);
    }
  },

  /**
   * Unregister vendor device token on logout
   */
  async unregisterDeviceToken() {
    try {
      const token = await AsyncStorage.getItem(VENDOR_FCM_TOKEN_KEY);
      if (token) {
        await notificationsApi.removeToken(token);
        await AsyncStorage.removeItem(VENDOR_FCM_TOKEN_KEY);
        console.log('🚪 Vendor FCM token removed on logout');
      }
    } catch (err) {
      console.warn('⚠️ Failed to remove vendor FCM token:', err.message);
    }
  },

  /**
   * Handle deep-linking navigation from notification payload for vendor
   */
  handleNotificationNavigation(navigation, payload = {}) {
    if (!navigation || !payload) return;

    const { type, bookingId, kycStatus } = payload;

    if (type === 'booking') {
      navigation.navigate('Bookings', { bookingId });
    } else if (type === 'kyc') {
      if (kycStatus === 'approved') {
        navigation.navigate('Subscription');
      } else {
        navigation.navigate('KYCPending');
      }
    }
  },
};
