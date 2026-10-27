import { AppRegistry, NativeModules } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Handle background & quit state push notifications for vendor
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('🌙 Background FCM vendor message handled:', remoteMessage?.notification?.title || remoteMessage?.data);
  // FCM already shows 'notification' messages itself while the app is closed or in the background.
  // Showing a second local notification here produced duplicates, so only handle data-only messages.
  if (remoteMessage?.notification) return;
  try {
    const data = remoteMessage?.data || {};
    const isReg = data.action === 'tournament_registration';
    const isTournament = data.type === 'tournament' || data.screen === 'TournamentDetail' || Boolean(data.tournamentId);

    const title =
      remoteMessage?.notification?.title ||
      data.title ||
      data.notificationText ||
      (isReg
        ? 'New Team Registration'
        : isTournament
          ? (data.action === 'tournament_request' ? 'Tournament Request Received' : 'Tournament Update')
          : 'New Booking');

    const body =
      remoteMessage?.notification?.body ||
      data.body ||
      data.message ||
      data.notificationText ||
      (isReg
        ? (data.teamName ? `Team "${data.teamName}" has registered for your tournament "${data.tournamentName || 'Tournament'}".` : 'A new team has registered for your tournament.')
        : isTournament
          ? 'You have an update for your tournament.'
          : 'You have a new booking update for your turf.');

    if (NativeModules.LocalNotificationModule) {
      NativeModules.LocalNotificationModule.showNotification(title, body, data);
    }
  } catch (err) {
    console.warn('⚠️ Background vendor notification error:', err.message);
  }
});

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('TurfVendorApp', () => App);
