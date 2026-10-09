import 'react-native-gesture-handler';
import {AppRegistry, NativeModules} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// Handle background & quit state push notifications for user
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('🌙 Background FCM user message handled:', remoteMessage?.notification?.title || remoteMessage?.data);
  try {
    const data = remoteMessage?.data || {};
    const title = remoteMessage?.notification?.title || data.title || data.notificationText || 'Booking Update';
    const body = remoteMessage?.notification?.body || data.body || data.message || 'Your turf booking status has been updated.';
    if (NativeModules.LocalNotificationModule) {
      NativeModules.LocalNotificationModule.showNotification(title, body, data);
    }
  } catch (err) {
    console.warn('⚠️ Background user notification error:', err.message);
  }
});

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('TurfUserApp', () => App);
