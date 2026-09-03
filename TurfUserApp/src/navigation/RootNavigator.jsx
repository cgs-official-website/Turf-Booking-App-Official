import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { Platform } from 'react-native';
import { fcmHelper } from '../utils/fcmHelper';
import MainTabs              from './MainTabs';
import SplashScreen          from '../screens/SplashScreen';
import OnboardingScreen      from '../screens/OnboardingScreen';
import LoginScreen           from '../screens/LoginScreen';
import Login2Screen          from '../screens/Login2Screen';
import OTPScreen             from '../screens/OTPScreen';
import RegisterScreen        from '../screens/RegisterScreen';
import LocationScreen        from '../screens/LocationScreen';
import TurfDetailScreen      from '../screens/TurfDetailScreen';
import SlotPickerScreen      from '../screens/SlotPickerScreen';
import BookingConfirmScreen  from '../screens/BookingConfirmScreen';
import BookingDetailScreen   from '../screens/BookingDetailScreen';
import RequestPendingScreen  from '../screens/RequestPendingScreen';
import NotificationsScreen   from '../screens/NotificationsScreen';
import ExploreScreen         from '../screens/ExploreScreen';
import PersonalInfoScreen    from '../screens/PersonalInfoScreen';
import CreateMatchScreen     from '../screens/CreateMatchScreen';
import SelectPlayersScreen   from '../screens/SelectPlayersScreen';
import BuildTeamsScreen      from '../screens/BuildTeamsScreen';
import MatchScreen           from '../screens/MatchScreen';
import TossScreen            from '../screens/TossScreen';
import ScorecardScreen       from '../screens/ScorecardScreen';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { token, user, bootstrapped, splashDone, locationSet } = useSelector((s) => s.auth);

  useEffect(() => {
    if (token) {
      fcmHelper.requestPermission().then(() => {
        const deviceId = `fcm_${Platform.OS}_${user?.id || user?._id || 'device'}`;
        fcmHelper.registerDeviceToken(deviceId);
      });
    }
  }, [token, user]);

  // Wait for BOTH bootstrapAuth (data ready) AND splash animation (visual ready)
  const showSplash = !bootstrapped || !splashDone;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#fff' } }}
      >
        {showSplash ? (
          // ── Splash: shown until bootstrapAuth completes ──────────────────
          <Stack.Screen name="Splash" component={SplashScreen} />

        ) : !token ? (
          // ── Auth screens ─────────────────────────────────────────────────
          // Get Started(phone/Google) → OTP  |  Get Started → Register → Login
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login"      component={LoginScreen} />
            <Stack.Screen name="Login2"     component={Login2Screen} />
            <Stack.Screen name="OTP"        component={OTPScreen} />
            <Stack.Screen name="Register"   component={RegisterScreen} />
          </>

        ) : !locationSet ? (
          // ── First screen right after OTP/Google verify succeeds ──────────
          // (returning users who already picked a location skip straight to Main)
          <Stack.Screen name="Location" component={LocationScreen} />

        ) : (
          // ── App screens ──────────────────────────────────────────────────
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Location"       component={LocationScreen} />
            <Stack.Screen name="Explore"        component={ExploreScreen}        options={{ presentation: 'card' }} />
            <Stack.Screen name="TurfDetail"     component={TurfDetailScreen}     options={{ presentation: 'card' }} />
            <Stack.Screen name="SlotPicker"     component={SlotPickerScreen}     options={{ presentation: 'card' }} />
            <Stack.Screen name="RequestPending" component={RequestPendingScreen} options={{ presentation: 'card' }} />
            <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} options={{ presentation: 'card' }} />
            <Stack.Screen name="BookingDetail"  component={BookingDetailScreen}  options={{ presentation: 'modal' }} />
            <Stack.Screen name="Notifications"  component={NotificationsScreen}  options={{ presentation: 'card' }} />
            <Stack.Screen name="PersonalInfo"   component={PersonalInfoScreen} />

            {/* ── Match / Team / Toss / Live Scorecard ── */}
            <Stack.Screen name="CreateMatch"    component={CreateMatchScreen}    options={{ presentation: 'card' }} />
            <Stack.Screen name="SelectPlayers"  component={SelectPlayersScreen}  options={{ presentation: 'card' }} />
            <Stack.Screen name="BuildTeams"     component={BuildTeamsScreen}     options={{ presentation: 'card' }} />
            <Stack.Screen name="Match"          component={MatchScreen}          options={{ presentation: 'card' }} />
            <Stack.Screen name="Toss"           component={TossScreen}           options={{ presentation: 'card' }} />
            <Stack.Screen name="Scorecard"      component={ScorecardScreen}      options={{ presentation: 'card' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}