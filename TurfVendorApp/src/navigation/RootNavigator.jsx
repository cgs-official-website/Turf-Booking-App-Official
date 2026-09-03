import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTurfStatus, bootstrapAuth } from '../redux/authSlice';
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

  const [splashDone, setSplashDone] = useState(false);
  const { isAuthenticated, bootstrapping, vendor, turfStatus, turfApprovalAcknowledged } = useSelector((s) => s.auth);
  const { mySubscription, subscriptionChecked } = useSelector((s) => s.vendor);

  // Bootstrap authentication once on app mount
  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  // Determine vendor application & review status
  const isApproved = turfStatus === 'active' || vendor?.kycStatus === 'approved';
  const isPending = turfStatus === 'pending' || vendor?.kycStatus === 'pending';
  const hasPaid = !!vendor?.hasPaidSubscription || !!vendor?.hasPaidOnboarding || !!vendor?.subscription?.active || !!mySubscription?.active;

  // Vendor has finished onboarding only if approved OR (KYC submitted AND paid)
  const hasSubmittedOnboarding =
    isApproved ||
    (isPending && hasPaid) ||
    (!!vendor?.turfOnboardingComplete && hasPaid);

  const needsOnboarding = isAuthenticated && !hasSubmittedOnboarding;

  useEffect(() => {
    if (!bootstrapping && isAuthenticated && turfStatus === null) {
      dispatch(fetchTurfStatus());
    }
  }, [bootstrapping, isAuthenticated, turfStatus, dispatch]);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Under review screen — shown after KYC & Payment while waiting for super admin approval
  const needsReview =
    isAuthenticated &&
    !needsOnboarding &&
    !isApproved &&
    (isPending || turfStatus === 'pending' || turfStatus === null || turfStatus === 'rejected');

  const needsApprovalAck =
    isAuthenticated && !needsOnboarding && isApproved && !turfApprovalAcknowledged;

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
          // Onboarding & Registration Payment Stack — turf setup, vendor KYC, turf KYC, Plan selection & payment
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
            <Stack.Screen
              name="SubscriptionPlans"
              component={SubscriptionPlansScreen}
              options={{ title: 'Choose Partner Plan' }}
            />
            <Stack.Screen
              name="Subscribe"
              component={SubscribeScreen}
              options={{ title: 'Complete Registration Payment' }}
            />
          </>
        ) : needsReview ? (
          // Review Stack — waiting for super admin approval (Home screen is inaccessible)
          <Stack.Screen
            name="TurfUnderReview"
            component={TurfUnderReviewScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          />
        ) : (
          // Main App Stack (Active status -> Vendor Dashboard)
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