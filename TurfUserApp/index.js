import 'react-native-gesture-handler';
import {AppRegistry, NativeModules, LogBox} from 'react-native';
LogBox.ignoreAllLogs(true);
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// Handle background & quit state push notifications for user
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('🌙 Background FCM user message handled:', remoteMessage?.notification?.title || remoteMessage?.data);
  try {
    const data = remoteMessage?.data || {};
    const isTournament = data.type === 'tournament' || data.screen === 'TournamentDetail' || Boolean(data.tournamentId);

    const title =
      remoteMessage?.notification?.title ||
      data.title ||
      data.notificationText ||
      (isTournament
        ? (data.action === 'team_accepted'
            ? 'Team Accepted!'
            : data.action === 'team_rejected'
            ? 'Team Application Update'
            : data.action === 'tournament_created'
            ? 'Tournament Published'
            : 'Tournament Update')
        : 'Booking Update');

    const body =
      remoteMessage?.notification?.body ||
      data.body ||
      data.message ||
      data.notificationText ||
      (isTournament
        ? (data.action === 'team_accepted'
            ? (data.teamName ? `Your team "${data.teamName}" has been accepted!` : 'Your tournament team application has been accepted.')
            : data.action === 'team_rejected'
            ? `Your tournament application was declined.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`
            : data.action === 'tournament_created'
            ? `Registration is open for "${data.tournamentName || 'New Tournament'}". Tap to view details!`
            : 'You have an update on your tournament.')
        : 'Your turf booking status has been updated.');

    if (NativeModules.LocalNotificationModule) {
      NativeModules.LocalNotificationModule.showNotification(title, body, data);
    }
  } catch (err) {
    console.warn('⚠️ Background user notification error:', err.message);
  }
});

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('TurfUserApp', () => App);
