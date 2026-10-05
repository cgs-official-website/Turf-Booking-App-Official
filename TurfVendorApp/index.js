import {AppRegistry, NativeModules} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// Handle background & quit state push notifications for vendor
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('🌙 Background FCM vendor message handled:', remoteMessage?.notification?.title || remoteMessage?.data);
  try {
    const data = remoteMessage?.data || {};
    const title = remoteMessage?.notification?.title || data.title || data.notificationText || 'New Booking';
    const body = remoteMessage?.notification?.body || data.body || data.message || 'You have a new booking update for your turf.';
    if (NativeModules.LocalNotificationModule) {
      NativeModules.LocalNotificationModule.showNotification(title, body, data);
    }
  } catch (err) {
    console.warn('⚠️ Background vendor notification error:', err.message);
  }
});

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('TurfVendorApp', () => App);
AppRegistry.registerComponent('TurfUserApp', () => App);
