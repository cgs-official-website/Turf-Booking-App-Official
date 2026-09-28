import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// Handle background & quit state push notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('🌙 Background FCM message handled:', remoteMessage?.notification?.title || remoteMessage?.data);
});

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('TurfUserApp', () => App);
AppRegistry.registerComponent('TurfVendorApp', () => App);
