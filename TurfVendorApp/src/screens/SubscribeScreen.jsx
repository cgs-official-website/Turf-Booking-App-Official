import React, { useState, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useDispatch, useSelector } from 'react-redux';
import { createSubscriptionOrder, verifySubscriptionPayment, clearSuccessMessage, clearVendorError, activateFreePlan } from '../redux/vendorSlice';
import { markTurfOnboardingComplete, fetchTurfStatus } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SubscribeScreen = ({ route, navigation }) => {
  const { plan, isOnboarding } = route.params || {};
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.vendor);
  const vendor = useSelector((s) => s.auth.vendor);
  const turfStatus = useSelector((s) => s.auth.turfStatus);

  const { colors, isDark } = useTheme();

  const [paying, setPaying] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text, fontSize: SIZES.base }}>Plan details not found.</Text>
        <TouchableOpacity style={[styles.payBtn, { backgroundColor: colors.primary, marginTop: 14 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.payBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSubscribe = () => {
    if (plan.price === 0 || plan.isFree) {
      payNow();
      return;
    }
    Alert.alert(
      'Confirm Subscription',
      `Activate ${plan.name} for ₹${plan.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed to Pay', onPress: payNow },
      ]
    );
  };

  const payNow = async () => {
    setPaying(true);
    dispatch(clearVendorError());
    try {
      if (plan.price === 0 || plan.isFree) {
        await dispatch(activateFreePlan(plan._id || plan.id)).unwrap();
        dispatch(clearSuccessMessage());
        dispatch(markTurfOnboardingComplete());
        dispatch(fetchTurfStatus());
        Alert.alert(
          '🎉 Free Starter Plan Activated!',
          'Your free partner subscription is active. Welcome to your Vendor Dashboard!',
          [
            {
              text: 'Go to Home Dashboard',
              onPress: () => {
                navigation.navigate('Dashboard');
              },
            },
          ]
        );
        return;
      }
      const orderResult = await dispatch(createSubscriptionOrder(plan._id)).unwrap();
      const { order, keyId, mock } = orderResult || {};

      let paymentResult;

      if (mock) {
        paymentResult = {
          razorpay_order_id: order?.id || `order_mock_${Date.now()}`,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'MOCK_SIGNATURE_FOR_TESTING',
        };
      } else {
        const checkoutOptions = {
          key: keyId,
          amount: order?.amount,
          currency: order?.currency || 'INR',
          order_id: order?.id,
          name: 'Turf Partner Portal',
          description: `${plan.name} Partner Membership`,
          prefill: {
            name: vendor?.name || '',
            email: vendor?.email || '',
            contact: vendor?.phone || vendor?.contact || '',
          },
          theme: { color: colors.primary },
        };

        paymentResult = await RazorpayCheckout.open(checkoutOptions);
      }

      const verifyResult = await dispatch(
        verifySubscriptionPayment({
          planId: plan._id,
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
        })
      ).unwrap();

      dispatch(clearSuccessMessage());
      dispatch(markTurfOnboardingComplete());
      dispatch(fetchTurfStatus());

      const isUnderReview = isOnboarding || turfStatus !== 'active';

      if (isUnderReview) {
        Alert.alert(
          '🎉 Registration Payment Complete!',
          'Your subscription has been activated and your turf registration has been submitted to the Super Admin for KYC approval.\n\nYou will be able to access the dashboard once approved.',
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
        Alert.alert('🎉 Subscribed!', verifyResult?.message || 'Your partner subscription has been activated!');
        navigation.navigate('MySubscription');
      }
    } catch (err) {
      const message = err?.description || err?.message || 'Payment was cancelled or failed. Please try again.';
      Alert.alert('Payment Status', message);
    } finally {
      setPaying(false);
    }
  };

  const busy = paying || loading;

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
        <Text style={[styles.navTitle, { color: colors.text }]}>Checkout & Activation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Summary Card */}
        <View style={[styles.planSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.planHeaderRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>SELECTED MEMBERSHIP</Text>
              <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
            </View>
            <View style={[styles.badgeIconBox, { backgroundColor: colors.primaryLight }]}>
              <Feather name="zap" size={20} color={colors.primary} />
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.priceTag, { color: colors.primary }]}>₹{plan.price}</Text>
            <Text style={[styles.durationTag, { color: colors.textSecondary }]}>
              /{plan.durationDays >= 365 ? '1 Year Access' : `${plan.durationDays || 30} Days Access`}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.featuresHeader, { color: colors.textSecondary }]}>INCLUDED BENEFITS:</Text>
          <View style={styles.featuresList}>
            {(plan.features || [
              'Unlimited slot booking listings',
              'Instant customer payouts',
              'Verified partner badge',
            ]).map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.featureText, { color: colors.text }]}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Gateway Notice */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Payment Protection</Text>
        <View style={[styles.securityCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={[styles.shieldBox, { backgroundColor: 'rgba(0, 197, 102, 0.12)' }]}>
            <Ionicons name="shield-checkmark" size={22} color="#00C566" />
          </View>
          <View style={styles.securityTextWrap}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>256-Bit Encrypted Checkout</Text>
            <Text style={[styles.securitySub, { color: colors.textSecondary }]}>
              Supports Google Pay, PhonePe, Paytm, All Major Cards & Net Banking via Razorpay.
            </Text>
          </View>
        </View>

        {/* Total Billing Box */}
        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <View>
            <Text style={[styles.totalSub, { color: colors.textSecondary }]}>Total Payable Now</Text>
            <Text style={[styles.taxIncluded, { color: colors.textSecondary }]}>Inclusive of all taxes & GST</Text>
          </View>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>₹{plan.price}</Text>
        </View>

        {/* Proceed CTA */}
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: colors.primary }, busy && { opacity: 0.75 }, SHADOWS.sm]}
          onPress={handleSubscribe}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Feather name="lock" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.payBtnText}>Pay ₹{plan.price} & Activate</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 40,
  },

  planSummaryCard: {
    borderRadius: SIZES.radiusLg,
    padding: 20,
    borderWidth: 1,
    marginVertical: 14,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  planName: {
    fontSize: SIZES.xl,
    fontWeight: '800',
  },
  badgeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 14,
  },
  priceTag: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  durationTag: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    marginLeft: 6,
  },

  divider: {
    height: 1,
    marginBottom: 14,
  },
  featuresHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '600',
  },

  sectionHeading: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 8,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusLg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  shieldBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  securityTextWrap: {
    flex: 1,
  },
  securityTitle: {
    fontSize: SIZES.xs + 1,
    fontWeight: '800',
    marginBottom: 2,
  },
  securitySub: {
    fontSize: 10,
    lineHeight: 15,
  },

  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: SIZES.radiusLg,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  totalSub: {
    fontSize: SIZES.sm,
    fontWeight: '800',
  },
  taxIncluded: {
    fontSize: 10,
    marginTop: 2,
  },
  totalAmount: {
    fontSize: SIZES.xxl,
    fontWeight: '900',
  },

  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 16,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.base,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default SubscribeScreen;