import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlans, fetchMySubscription, activateFreePlan } from '../redux/vendorSlice';
import { markTurfOnboardingComplete, fetchTurfStatus } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DEFAULT_PLANS = [
  {
    _id: 'plan_free_starter',
    id: 'plan_free_starter',
    name: 'Free Trial Starter',
    price: 0,
    durationDays: 30,
    description: '100% Free plan with full facility listing & slot management.',
    isFree: true,
    features: [
      '100% Free / Instant Activation',
      'Instant Application Submission',
      'Up to 1 Registered Turf Pitch',
      'Basic Slot Booking Management',
      'Direct WhatsApp Customer Support',
    ],
  },
  {
    _id: 'plan-basic',
    name: 'Starter Partner',
    price: 499,
    durationDays: 30,
    description: 'Ideal for single-pitch facilities starting online reservations.',
    features: [
      'Up to 1 Registered Turf',
      'Standard Slot Scheduling',
      'Customer Reviews & Ratings',
      'Weekly Payout Settlements',
    ],
  },
  {
    _id: 'plan-pro',
    name: 'Pro Growth',
    price: 999,
    durationDays: 30,
    description: 'Our most popular plan with unlimited slots, instant payouts & priority search ranking.',
    popular: true,
    features: [
      'Multiple Turfs Management',
      'Dynamic Peak & Weekend Pricing',
      'Verified Partner Badge',
      'Instant UPI / Bank Settlements',
      '24/7 Priority Partner Support',
    ],
  },
  {
    _id: 'plan-annual',
    name: 'Annual Elite',
    price: 8999,
    durationDays: 365,
    description: 'Maximum savings with 12 months full access and dedicated account manager.',
    features: [
      'Everything in Pro Growth',
      'Save 25% on Annual Billing',
      'Featured Banner on Player App',
      'Dedicated Partner Account Manager',
    ],
  },
];

const SubscriptionPlansScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const { plans = [], mySubscription, loading } = useSelector((s) => s.vendor);
  const vendor = useSelector((s) => s.auth.vendor);
  const turfStatus = useSelector((s) => s.auth.turfStatus);
  const { colors, isDark } = useTheme();
  const isOnboarding = route?.params?.isOnboarding;
  const [activatingFree, setActivatingFree] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchPlans());
    dispatch(fetchMySubscription());
  }, []);

  const handlePlanPress = async (plan) => {
    const planId = plan._id || plan.id;
    if (plan.price === 0 || plan.isFree) {
      setActivatingFree(true);
      try {
        await dispatch(activateFreePlan(planId)).unwrap();
        dispatch(markTurfOnboardingComplete());
        await dispatch(fetchTurfStatus());

        const isUnderReview = isOnboarding || turfStatus !== 'active';

        if (isUnderReview) {
          Alert.alert(
            '🎉 Free Plan Activated & Submitted!',
            'Your free partner subscription is active. Your turf registration has been submitted to the Super Admin for verification.\n\nYou will see the pending verification screen until approved.',
            [
              {
                text: 'View Status',
                onPress: () => {
                  dispatch(fetchTurfStatus());
                },
              },
            ]
          );
        } else {
          Alert.alert('🎉 Plan Activated', 'Your free partner subscription has been activated!');
          navigation.navigate('MySubscription');
        }
      } catch (err) {
        Alert.alert('Activation Error', err || 'Could not activate free plan. Try again.');
      } finally {
        setActivatingFree(false);
      }
    } else {
      navigation.navigate('Subscribe', { plan, isOnboarding });
    }
  };

  const displayPlans = Array.isArray(plans) && plans.length > 0 ? plans : DEFAULT_PLANS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Subscription Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Intro */}
        <View style={styles.headerHero}>
          <Text style={[styles.mainHeading, { color: colors.text }]}>Grow Your Turf Business</Text>
          <Text style={[styles.mainSubHeading, { color: colors.textSecondary }]}>
            Choose a partner plan tailored to your facility. Unlock online bookings and player discovery.
          </Text>
        </View>

        {/* Current Plan Banner */}
        {mySubscription && (
          <View style={[styles.activePlanCard, SHADOWS.md]}>
            <View style={styles.activePlanTop}>
              <View style={styles.activePill}>
                <Ionicons name="checkmark-circle" size={14} color="#00C566" />
                <Text style={styles.activePillText}>CURRENT ACTIVE PLAN</Text>
              </View>
              <Text style={styles.activeExpiry}>
                Renews: {new Date(mySubscription.expiryDate || mySubscription.renewalDate || Date.now()).toLocaleDateString('en-IN')}
              </Text>
            </View>

            <Text style={styles.activePlanTitle}>{mySubscription.plan?.name || mySubscription.planName || 'Pro Partner'}</Text>
            <Text style={styles.activePlanSub}>Your turfs are currently live and receiving online player reservations.</Text>
          </View>
        )}

        {/* Plans List */}
        {loading && !displayPlans.length ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          displayPlans.map((plan, index) => {
            const planId = plan._id || plan.id;
            const currentPlanId = mySubscription?.plan?._id || mySubscription?.plan?.id || mySubscription?.planId;
            const isCurrentPlan = currentPlanId === planId;
            const isPopular = plan.popular || index === 2;
            const isFree = plan.price === 0 || plan.isFree;

            return (
              <View
                key={planId || index}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isPopular ? (isDark ? '#0F172A' : '#FFFFFF') : colors.card,
                    borderColor: isPopular ? colors.primary : (isFree ? '#10B981' : colors.border),
                  },
                  isPopular && styles.popularPlanCard,
                  isFree && { borderWidth: 2 },
                  SHADOWS.md,
                ]}
              >
                {/* Free or Popular Ribbon */}
                {isFree ? (
                  <View style={[styles.popularBadge, { backgroundColor: '#10B981' }]}>
                    <Feather name="gift" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.popularBadgeText}>100% FREE STARTER</Text>
                  </View>
                ) : isPopular ? (
                  <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                    <Feather name="zap" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.popularBadgeText}>RECOMMENDED PARTNER</Text>
                  </View>
                ) : null}

                <View style={styles.cardHeader}>
                  <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                  <Text style={[styles.planDesc, { color: colors.textSecondary }]}>{plan.description}</Text>
                </View>

                {/* Price Display */}
                <View style={styles.priceRow}>
                  <Text style={[styles.currencySign, { color: isFree ? '#10B981' : colors.primary }]}>₹</Text>
                  <Text style={[styles.priceNumber, { color: colors.text }]}>{plan.price}</Text>
                  <Text style={[styles.priceCycle, { color: colors.textSecondary }]}>
                    /{plan.durationDays >= 365 ? 'year' : `${plan.durationDays || 30} days`}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Features List */}
                <View style={styles.featuresList}>
                  {(plan.features || []).map((feature, fIdx) => (
                    <View key={fIdx} style={styles.featureItem}>
                      <View style={[styles.checkCircle, { backgroundColor: isFree ? '#D1FAE5' : colors.primaryLight }]}>
                        <Feather name="check" size={13} color={isFree ? '#059669' : colors.primary} />
                      </View>
                      <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Subscribe CTA Button */}
                <TouchableOpacity
                  style={[
                    styles.subscribeBtn,
                    {
                      backgroundColor: isCurrentPlan
                        ? colors.inputBg
                        : (isFree ? '#10B981' : (isPopular ? colors.primary : colors.card)),
                      borderColor: isCurrentPlan ? colors.border : (isFree ? '#10B981' : colors.primary),
                    },
                    SHADOWS.sm,
                  ]}
                  onPress={() => !isCurrentPlan && handlePlanPress(plan)}
                  disabled={isCurrentPlan || activatingFree}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.subscribeBtnText,
                      {
                        color: isCurrentPlan
                          ? colors.textSecondary
                          : (isFree || isPopular ? '#FFFFFF' : colors.primary),
                      },
                    ]}
                  >
                    {isCurrentPlan ? 'Active Plan (Current)' : (isFree ? 'Activate Free Plan →' : `Choose ${plan.name}`)}
                  </Text>
                  {!isCurrentPlan && (
                    <Feather
                      name="arrow-right"
                      size={16}
                      color={isFree || isPopular ? '#FFFFFF' : colors.primary}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Guarantee / Support Strip */}
        <View style={[styles.trustStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={[styles.trustText, { color: colors.text }]}>Safe & Secure UPI / Card Checkout</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="flash" size={20} color="#F59E0B" />
            <Text style={[styles.trustText, { color: colors.text }]}>Instant Activation & Live Slot Sync</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    marginTop: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  content: {
    padding: SIZES.md,
    paddingBottom: 40,
  },
  headerHero: {
    marginBottom: 20,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  mainSubHeading: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  activePlanCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#00C566',
  },
  activePlanTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 197, 102, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activePillText: {
    color: '#00C566',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  activeExpiry: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  activePlanTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  activePlanSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  planCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  popularPlanCard: {
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardHeader: {
    marginBottom: 12,
    paddingRight: 40,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  currencySign: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: 2,
  },
  priceNumber: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  priceCycle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  featuresList: {
    marginBottom: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  subscribeBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  trustStrip: {
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 10,
  },
});

export default SubscriptionPlansScreen;