import React, { useEffect, useCallback, useLayoutEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Linking, AppState, ActivityIndicator, Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTurfStatus, logoutVendor } from '../redux/authSlice';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const POLL_INTERVAL_MS = 10000;

export default function TurfUnderReviewScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const dispatch = useDispatch();
  const turfInfo = useSelector((s) => s.auth.turfInfo);
  const vendor = useSelector((s) => s.auth.vendor);
  const subscription = useSelector((s) => s.auth.subscription) || vendor?.subscription;
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  // Pulse animation for pending status dot
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const poll = useCallback(async () => {
    try {
      await dispatch(fetchTurfStatus());
      setLastChecked(new Date());
    } catch (e) {}
  }, [dispatch]);

  const handleManualCheck = async () => {
    setChecking(true);
    await poll();
    setChecking(false);
  };

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [poll]);

  const handleLogout = () => dispatch(logoutVendor());

  const handleEmailUs = () => {
    Linking.openURL('mailto:support@zuna.com?subject=Turf%20Partner%20Verification%20Query');
  };

  const businessName = turfInfo?.name || vendor?.turfName || vendor?.businessName || 'Your Turf Facility';
  const ownerName = vendor?.name || 'Partner Owner';
  const planName = subscription?.planName || subscription?.plan?.name || (vendor?.hasPaidSubscription ? 'Starter Plan' : 'Free Trial Starter');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar with Logout */}
      <View style={styles.topBar}>
        <View style={styles.brandPill}>
          <MaterialCommunityIcons name="shield-airplane" size={16} color="#10B981" />
          <Text style={styles.brandPillText}>PARTNER ONBOARDING</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={14} color={colors.textSecondary} />
          <Text style={[styles.logoutBtnText, { color: colors.textSecondary }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hero Card */}
        <View style={[styles.heroCard, SHADOWS.md]}>
          <View style={styles.heroIconWrapper}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.heroIconCore}>
              <Feather name="clock" size={32} color="#F59E0B" />
            </View>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusBadgeText}>UNDER SUPER ADMIN REVIEW</Text>
          </View>

          <Text style={[styles.heroTitle, { color: colors.text }]}>Application Pending Approval</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            We've received your facility documents and partner registration. Our super admin team is currently verifying your KYC details.
          </Text>
        </View>

        {/* Verification Progress Stepper */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.cardSectionHeader, { color: colors.textSecondary }]}>VERIFICATION MILESTONES</Text>

          {/* Step 1: Submission */}
          <View style={styles.stepRow}>
            <View style={styles.stepIconCompleted}>
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Turf Profile & KYC Uploaded</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Address, ground photos & documents submitted</Text>
            </View>
          </View>
          <View style={styles.stepConnectorActive} />

          {/* Step 2: Subscription */}
          <View style={styles.stepRow}>
            <View style={styles.stepIconCompleted}>
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Partner Plan Activated</Text>
              <Text style={[styles.stepDesc, { color: '#10B981', fontWeight: '700' }]}>
                {planName} • Active
              </Text>
            </View>
          </View>
          <View style={styles.stepConnectorActive} />

          {/* Step 3: Admin Review */}
          <View style={styles.stepRow}>
            <View style={styles.stepIconPending}>
              <ActivityIndicator size="small" color="#F59E0B" />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: '#F59E0B', fontWeight: '800' }]}>Super Admin Verification</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Estimated review time: 15–30 mins</Text>
            </View>
          </View>
          <View style={styles.stepConnectorInactive} />

          {/* Step 4: Live Access */}
          <View style={styles.stepRow}>
            <View style={styles.stepIconLocked}>
              <Feather name="lock" size={12} color={colors.textSecondary} />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: colors.textSecondary }]}>Live Pitch & Online Bookings</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Unlocks instant slot management & customer reservations</Text>
            </View>
          </View>
        </View>

        {/* Facility Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.cardSectionHeader, { color: colors.textSecondary }]}>SUBMITTED FACILITY OVERVIEW</Text>
          
          <View style={styles.overviewRow}>
            <View style={styles.overviewIconWrap}>
              <Ionicons name="business" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Venue / Business Name</Text>
              <Text style={[styles.overviewValue, { color: colors.text }]}>{businessName}</Text>
            </View>
          </View>

          <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />

          <View style={styles.overviewRow}>
            <View style={styles.overviewIconWrap}>
              <Feather name="user" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Partner Owner & Contact</Text>
              <Text style={[styles.overviewValue, { color: colors.text }]}>
                {ownerName} • <Text style={{ fontFamily: 'monospace' }}>{vendor?.phone || vendor?.email}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Live Refresh CTA */}
        <TouchableOpacity
          style={[styles.checkBtn, { backgroundColor: colors.primary }, checking && { opacity: 0.8 }]}
          onPress={handleManualCheck}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <Feather name="refresh-cw" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.checkBtnText}>
            {checking ? 'Checking Status...' : 'Refresh Approval Status'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.autoRefreshText, { color: colors.textSecondary }]}>
          Auto-refreshing every 10s • Last checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>

        {/* Help Support Box */}
        <TouchableOpacity
          style={[styles.supportBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
          onPress={handleEmailUs}
          activeOpacity={0.75}
        >
          <Feather name="help-circle" size={18} color={colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.supportTitle, { color: colors.text }]}>Need expedite or have questions?</Text>
            <Text style={[styles.supportSub, { color: colors.textSecondary }]}>Tap to contact our 24/7 Super Admin partner desk</Text>
          </View>
          <Feather name="external-link" size={14} color={colors.textSecondary} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    brandPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    brandPillText: {
      color: '#10B981',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.6,
      marginLeft: 5,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    },
    logoutBtnText: {
      fontSize: 12,
      fontWeight: '700',
      marginLeft: 4,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 40,
    },
    heroCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? '#1E293B' : '#E2E8F0',
    },
    heroIconWrapper: {
      width: 76,
      height: 76,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginBottom: 16,
    },
    pulseRing: {
      position: 'absolute',
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
    },
    heroIconCore: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
      marginBottom: 12,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#F59E0B',
      marginRight: 6,
    },
    statusBadgeText: {
      color: '#D97706',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.4,
      textAlign: 'center',
      marginBottom: 8,
    },
    heroSub: {
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      fontWeight: '500',
    },
    card: {
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
    },
    cardSectionHeader: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
      marginBottom: 14,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stepIconCompleted: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    stepIconPending: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(245, 158, 11, 0.18)',
      borderWidth: 1.5,
      borderColor: '#F59E0B',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    stepIconLocked: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(148, 163, 184, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    stepConnectorActive: {
      width: 2,
      height: 16,
      backgroundColor: '#10B981',
      marginLeft: 13,
      marginVertical: 2,
    },
    stepConnectorInactive: {
      width: 2,
      height: 16,
      backgroundColor: 'rgba(148, 163, 184, 0.3)',
      marginLeft: 13,
      marginVertical: 2,
    },
    stepInfo: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    stepDesc: {
      fontSize: 11,
    },
    overviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    overviewIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    overviewLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 2,
    },
    overviewValue: {
      fontSize: 14,
      fontWeight: '800',
    },
    overviewDivider: {
      height: 1,
      marginVertical: 8,
    },
    checkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      paddingVertical: 15,
      marginBottom: 8,
      ...SHADOWS.md,
    },
    checkBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    autoRefreshText: {
      fontSize: 11,
      textAlign: 'center',
      fontWeight: '600',
      marginBottom: 16,
    },
    supportBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
    },
    supportTitle: {
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 2,
    },
    supportSub: {
      fontSize: 11,
    },
  });