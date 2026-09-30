import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

const PERMISSIONS_ASKED_KEY = '@turf_vendor_first_launch_permissions_asked';

/**
 * Open device system settings for this application
 */
export const openAppSettings = () => {
  Linking.openSettings().catch((err) => {
    console.warn('⚠️ Could not open app settings:', err?.message);
  });
};

/**
 * Checks whether the initial permission flow has already been completed on first launch.
 */
export const hasPermissionsBeenAsked = async () => {
  try {
    const val = await AsyncStorage.getItem(PERMISSIONS_ASKED_KEY);
    return val === 'true';
  } catch (e) {
    return false;
  }
};

/**
 * Marks that the initial permission flow has been completed.
 */
export const markPermissionsAsAsked = async () => {
  try {
    await AsyncStorage.setItem(PERMISSIONS_ASKED_KEY, 'true');
  } catch (e) {
    console.warn('⚠️ Failed to save permissionsAsked flag:', e?.message);
  }
};

/**
 * Request Notifications Permission
 * Returns: { status: 'granted' | 'denied' | 'never_ask_again' }
 */
export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const isGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (isGranted) return { status: 'granted' };

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return { status: 'granted' };
        }
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return { status: 'never_ask_again' };
        }
        return { status: 'denied' };
      }
      return { status: 'granted' };
    }

    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const isGranted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return { status: isGranted ? 'granted' : 'denied' };
    }

    return { status: 'granted' };
  } catch (err) {
    console.warn('⚠️ Error requesting notification permission:', err?.message);
    return { status: 'denied' };
  }
};

/**
 * Request Location Permission
 * Returns: { status: 'granted' | 'denied' | 'never_ask_again' }
 */
export const requestLocationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      const isGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (isGranted) return { status: 'granted' };

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return { status: 'granted' };
      }
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return { status: 'never_ask_again' };
      }
      return { status: 'denied' };
    }

    // On iOS, location permission prompt is triggered when location is accessed
    return { status: 'granted' };
  } catch (err) {
    console.warn('⚠️ Error requesting location permission:', err?.message);
    return { status: 'denied' };
  }
};

/**
 * Request Photos / Files Permission
 * Returns: { status: 'granted' | 'denied' | 'never_ask_again' }
 */
export const requestPhotosPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      const permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const isGranted = await PermissionsAndroid.check(permission);
      if (isGranted) return { status: 'granted' };

      const result = await PermissionsAndroid.request(permission);

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return { status: 'granted' };
      }
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return { status: 'never_ask_again' };
      }
      return { status: 'denied' };
    }

    // iOS handles photo library permission dialog automatically on access
    return { status: 'granted' };
  } catch (err) {
    console.warn('⚠️ Error requesting photos permission:', err?.message);
    return { status: 'denied' };
  }
};

/**
 * On-demand check for Photos when feature is accessed later.
 * Prompts user if not granted, or directs to Settings if permanently denied.
 */
export const ensurePhotoPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) return true;

    const result = await PermissionsAndroid.request(permission);
    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Required',
        'Photo and media access is permanently denied. Please enable it in Settings to upload turf images.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
        ]
      );
    }
    return false;
  } catch (err) {
    console.warn('⚠️ ensurePhotoPermission error:', err?.message);
    return false;
  }
};

/**
 * On-demand check for Location when feature is accessed later.
 */
export const ensureLocationPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (alreadyGranted) return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Location Required',
        'Location access is permanently denied. Please enable it in Settings to show turfs near you.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
        ]
      );
    }
    return false;
  } catch (err) {
    console.warn('⚠️ ensureLocationPermission error:', err?.message);
    return false;
  }
};

/**
 * On-demand check for Notifications when feature is accessed later.
 */
export const ensureNotificationPermission = async () => {
  try {
    const res = await requestNotificationPermission();
    if (res.status === 'granted') return true;

    if (res.status === 'never_ask_again') {
      Alert.alert(
        'Notifications Disabled',
        'Notifications are disabled. Please enable notifications in Settings to receive real-time booking alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
        ]
      );
    }
    return false;
  } catch (err) {
    console.warn('⚠️ ensureNotificationPermission error:', err?.message);
    return false;
  }
};
