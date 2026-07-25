import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTurfStatus } from '../redux/authSlice';
import { fetchMySubscription } from '../redux/vendorSlice';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TermsScreen from '../screens/TermsScreen';
import MainTabs from './MainTabs';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import AddTurfScreen from '../screens/AddTurfScreen';
import EditTurfScreen from '../screens/EditTurfScreen';
import MyTurfsScreen from '../screens/MyTurfsScreen';
import TurfDetailScreen from '../screens/TurfDetailScreen';
import TurfBookingsScreen from '../screens/TurfBookingsScreen';
import SubscriptionPlansScreen from '../screens/SubscriptionPlansScreen';
import SubscribeScreen from '../screens/SubscribeScreen';
import MySubscriptionScreen from '../screens/MySubscriptionScreen';
import NotificationScreen from '../screens/NotificationScreen';
import PersonalInformationScreen from '../screens/PersonalInformationScreen';
import UserReviewsScreen from '../screens/UserReviewsScreen';
import TurfProfileScreen from '../screens/TurfProfileScreen';
import LocationSearchScreen from '../screens/LocationSearchScreen';
import ReportIssuesScreen from '../screens/ReportIssuesScreen';
import SubscriptionDetailScreen from '../screens/SubscriptionDetailScreen';

// Vendor onboarding flow (Turf+Vendor setup -> Vendor KYC -> Turf KYC) — shown
// once, right after login, before the vendor reaches Home/MainTabs.
import TurfSetupScreen from '../screens/TurfSetupScreen';
import VendorVerificationScreen from '../screens/VendorVerificationScreen';
import TurfVerificationScreen from '../screens/TurfVerificationScreen';

// Post-onboarding review flow — shown after Turf+Vendor+KYC submission,
// while the super admin is checking the documents, and once after approval.
import TurfUnderReviewScreen from '../screens/TurfUnderReviewScreen';
import TurfApprovedScreen from '../screens/TurfApprovedScreen';

import { useTheme } from '../context/ThemeContext'; // ✅ replaced deprecated COLORS import

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { colors } = useTheme(); // ✅ theme-aware colors
  const dispatch = useDispatch();

  // Splash must play its full 5-frame animation at least once, regardless of
  // how fast bootstrapAuth/turfStatus/subscription checks resolve. Only
  // SplashScreen's onFinish (fired after its own animation completes) flips
  // this — bootstrapping/checkingReviewStatus/checkingSubscription becoming
  // false is NOT allowed to unmount SplashScreen early anymore. ✅
  const [splashDone, setSplashDone] = useState(false);
  const { isAuthenticated, bootstrapping, vendor, turfStatus, turfApprovalAcknowledged } = useSelector((s) => s.auth);
  const { mySubscription, subscriptionChecked } = useSelector((s) => s.vendor);

  // Vendor must complete turf registration (all 5 onboarding screens) before
  // they can reach Home. Backend should return this flag as part of the
  // vendor object on login/getMe response, e.g. vendor.hasCompletedTurfOnboarding.
  const needsOnboarding = isAuthenticated && !vendor?.hasCompletedTurfOnboarding;

  // Fetch the turf's review status once, right when the vendor lands past
  // onboarding, so we know whether to show Under Review / Approved / Home
  // instead of flashing the wrong screen. TurfUnderReviewScreen re-polls
  // this on its own afterwards to auto-advance once the admin approves.
  // NOTE: this hook must run unconditionally on every render (Rules of
  // Hooks), so it's declared before the bootstrapping/checkingReviewStatus
  // early returns below. Guarded with `!bootstrapping` so it doesn't fire
  // on a stale/undefined `vendor` object during the initial auth check. ✅
  useEffect(() => {
    if (!bootstrapping && isAuthenticated && !needsOnboarding && turfStatus === null) {
      dispatch(fetchTurfStatus());
    }
  }, [bootstrapping, isAuthenticated, needsOnboarding, turfStatus, dispatch]);

  // Once the turf is approved and acknowledged, the vendor still needs an
  // active subscription before Home — check that here, once per session,
  // the same way turf review status is checked above. This hook must also
  // run unconditionally on every render (Rules of Hooks), so it stays
  // above the bootstrapping/checkingReviewStatus early returns. Same
  // `!bootstrapping` guard applied here. ✅
  const isPastApproval =
    isAuthenticated && !needsOnboarding && turfStatus === 'active' && turfApprovalAcknowledged;

  useEffect(() => {
    if (!bootstrapping && isPastApproval && !subscriptionChecked) {
      dispatch(fetchMySubscription());
    }
  }, [bootstrapping, isPastApproval, subscriptionChecked, dispatch]);

  if (bootstrapping || !splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Also show the splash while we check turf review status for the first
  // time this session, so we don't briefly flash "Under Review" for a
  // vendor whose turf was actually approved ages ago.
  const checkingReviewStatus =
    isAuthenticated && !!vendor?.hasCompletedTurfOnboarding && turfStatus === null;
  if (checkingReviewStatus || !splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Once onboarding is done, the turf still needs the super admin's OK before
  // the vendor is allowed into Home. `turfStatus` is fetched in
  // TurfUnderReviewScreen/TurfApprovedScreen (and re-checked on every login
  // via bootstrapAuth + the polling inside those screens).
  //   turfStatus === null              -> not fetched yet, show under-review screen
  //                                        (it fetches on mount) rather than flashing Home
  //   turfStatus === 'pending'/'rejected' -> keep showing the Under Review screen
  //   turfStatus === 'active' && !turfApprovalAcknowledged -> show the Approved screen once
  //   turfStatus === 'active' && turfApprovalAcknowledged  -> go to Home
  const needsReview =
    isAuthenticated &&
    !needsOnboarding &&
    (turfStatus === null || turfStatus === 'pending' || turfStatus === 'rejected');

  const needsApprovalAck =
    isAuthenticated && !needsOnboarding && turfStatus === 'active' && !turfApprovalAcknowledged;

  // Show the splash while we check subscription status for the first time
  // this session, so we don't briefly flash Home for a vendor who actually
  // has no active plan yet.
  const checkingSubscription = isPastApproval && !subscriptionChecked;
  if (checkingSubscription || !splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Vendor is approved but has no active subscription — must pick a plan
  // and pay before reaching Home. This is a hard gate, same pattern as
  // needsReview/needsApprovalAck above: no "skip" path exists in the stack
  // below, so there's no way to swipe/back into Home without subscribing.
  const needsSubscription = isPastApproval && subscriptionChecked && !mySubscription;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },   // ✅ theme-aware, was COLORS.white
          headerTintColor: colors.text,                     // ✅ theme-aware, was COLORS.text
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Vendor Registration' }} />
            <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
          </>
        ) : needsOnboarding ? (
          // Onboarding Stack — turf+vendor setup, vendor KYC, turf KYC.
          // gestureEnabled: false on step 1 so the vendor can't swipe-back out
          // of the flow entirely; steps 2 & 3 use an in-screen Back button
          // that navigates normally within the stack.
          <>
            <Stack.Screen
              name="TurfSetup"
              component={TurfSetupScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="VendorVerification"
              component={VendorVerificationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TurfVerification"
              component={TurfVerificationScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : needsReview ? (
          // Review Stack — waiting for / just received super admin approval
          <Stack.Screen
            name="TurfUnderReview"
            component={TurfUnderReviewScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          />
        ) : needsApprovalAck ? (
          <Stack.Screen
            name="TurfApproved"
            component={TurfApprovedScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          />
        ) : needsSubscription ? (
          // Subscription paywall — shown once right after turf approval,
          // before Home. gestureEnabled: false on the plans screen so the
          // vendor can't swipe back out of it; there's no Main/BookingDetail/
          // etc. screen registered in this branch, so there is no way to
          // reach Home without completing a real Razorpay payment.
          <>
            <Stack.Screen
              name="SubscriptionPlans"
              component={SubscriptionPlansScreen}
              options={{ title: 'Choose a Plan', gestureEnabled: false, headerBackVisible: false }}
            />
            <Stack.Screen
              name="Subscribe"
              component={SubscribeScreen}
              options={{ title: 'Subscribe' }}
            />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
            <Stack.Screen name="AddTurf" component={AddTurfScreen} options={{ title: 'Add New Turf' }} />
            <Stack.Screen name="EditTurf" component={EditTurfScreen} options={{ title: 'Edit Turf' }} />
            <Stack.Screen name="MyTurfs" component={MyTurfsScreen} options={{ title: 'My Turfs' }} />
            <Stack.Screen name="TurfDetail" component={TurfDetailScreen} options={{ title: 'Turf Details' }} />
            <Stack.Screen name="Bookings" component={TurfBookingsScreen} options={{ title: 'All Bookings' }} />
            <Stack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} options={{ title: 'Subscription Plans' }} />
            <Stack.Screen name="Subscribe" component={SubscribeScreen} options={{ title: 'Subscribe' }} />
            <Stack.Screen name="MySubscription" component={MySubscriptionScreen} options={{ title: 'My Subscription' }} />
            <Stack.Screen name="Notifications" component={NotificationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="UserReviews" component={UserReviewsScreen} options={{ title: 'Reviews' }} />
            <Stack.Screen name="TurfProfile" component={TurfProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LocationSearch" component={LocationSearchScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ReportIssues" component={ReportIssuesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;