// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useDispatch, useSelector } from 'react-redux';
import { createSubscriptionOrder, verifySubscriptionPayment, clearSuccessMessage, clearVendorError } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const SubscribeScreen = ({ route, navigation }) => {
  const { plan } = route.params;
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.vendor);
  const vendor = useSelector((s) => s.auth.vendor);
  
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [paying, setPaying] = useState(false);

  // Hide default navigation header to remove white space above custom layout
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleSubscribe = () => {
    Alert.alert(
      'Confirm Subscription',
      `Subscribe to ${plan.name} for ₹${plan.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: payNow },
      ]
    );
  };

  const payNow = async () => {
    setPaying(true);
    dispatch(clearVendorError());
    try {
      // Step 1 — ask backend to create a real Razorpay order for this plan.
      const orderResult = await dispatch(createSubscriptionOrder(plan._id)).unwrap();
      const { order, keyId, mock } = orderResult;

      let paymentResult;

      if (mock) {
        // TEMPORARY — backend has MOCK_PAYMENTS=true because there's no real
        // Razorpay test key configured yet. Skip the actual checkout sheet
        // and simulate a successful payment response so you can test the flow.
        paymentResult = {
          razorpay_order_id: order.id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'MOCK_SIGNATURE_FOR_TESTING',
        };
      } else {
        // Step 2 — open the actual Razorpay checkout sheet on-device.
        const checkoutOptions = {
          key: keyId,
          amount: order.amount, // paise, already set server-side
          currency: order.currency,
          order_id: order.id,
          name: 'Turf Vendor',
          description: `${plan.name} subscription`,
          prefill: {
            name: vendor?.name || vendor?.businessName || '',
            email: vendor?.email || '',
            contact: vendor?.phone || '',
          },
          theme: { color: colors.primary },
        };

        paymentResult = await RazorpayCheckout.open(checkoutOptions);
      }

      // Step 3 — send the payment response back for signature verification.
      const verifyResult = await dispatch(
        verifySubscriptionPayment({
          planId: plan._id,
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
        })
      ).unwrap();

      dispatch(clearSuccessMessage());
      Alert.alert('🎉 Subscribed!', verifyResult.message || 'Your subscription is now active.');
      
      const availableRoutes = navigation.getState()?.routeNames || [];
      if (availableRoutes.includes('MySubscription')) {
        navigation.navigate('MySubscription');
      }
    } catch (err) {
      const message = err?.description || err?.message || 'Payment was not completed. Please try again.';
      Alert.alert('Payment Failed', message);
    } finally {
      setPaying(false);
    }
  };

  const busy = paying || loading;

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscribe</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Summary */}
        <View style={[styles.planSummary, SHADOWS.sm]}>
          <View style={styles.planHeaderRow}>
            <View>
              <Text style={styles.summaryLabel}>You are subscribing to</Text>
              <Text style={styles.planName}>{plan.name}</Text>
            </View>
            <View style={styles.badgeIcon}>
              <Feather name="award" size={24} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.planPrice}>
            ₹{plan.price} <Text style={styles.planDuration}>/ {plan.durationDays} days</Text>
          </Text>

          <View style={styles.divider} />

          <Text style={styles.featuresHeader}>Included Features:</Text>
          {plan.features?.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check-circle" size={16} color={colors.success || colors.primary} style={styles.featureIcon} />
              <Text style={styles.feature}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.razorpayNotice}>
          <View style={styles.noticeIconWrap}>
            <Feather name="shield" size={20} color={colors.primary} />
          </View>
          <Text style={styles.razorpayNoticeText}>
            You'll be taken to Razorpay's secure checkout to pay by UPI, cards, or net banking.
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{plan.price}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payBtn, busy && { opacity: 0.7 }]}
          onPress={handleSubscribe}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <Feather name="lock" size={18} color={colors.onAccent} style={{ marginRight: 8 }} />
              <Text style={styles.payBtnText}>Pay ₹{plan.price} Now</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text },
  scrollView: { flex: 1 },
  content: { padding: SIZES.padding, paddingBottom: 40 },
  
  planSummary: {
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radiusLg, 
    padding: 20, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: { fontSize: SIZES.sm, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  planName: { fontSize: SIZES.xxl, fontWeight: '800', color: colors.text },
  badgeIcon: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
  },
  planPrice: { fontSize: SIZES.xl + 2, fontWeight: '800', color: colors.primary, marginTop: 10, marginBottom: 16 },
  planDuration: { fontSize: SIZES.sm, color: colors.textSecondary, fontWeight: '600' },
  
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  
  featuresHeader: { fontSize: SIZES.sm, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureIcon: { marginRight: 10 },
  feature: { fontSize: SIZES.sm + 1, color: colors.text, fontWeight: '500', flex: 1 },
  
  sectionTitle: { fontSize: SIZES.base, fontWeight: '800', color: colors.text, marginBottom: 12 },
  razorpayNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radius, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: colors.border,
  },
  noticeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  razorpayNoticeText: { fontSize: SIZES.sm, color: colors.textSecondary, lineHeight: 20, flex: 1, fontWeight: '500' },
  
  totalRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18, 
    marginBottom: 24, 
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalLabel: { fontSize: SIZES.base + 1, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: SIZES.xl, fontWeight: '800', color: colors.primary },
  
  payBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radiusLg,
    paddingVertical: 18, 
    alignItems: 'center',
  },
  payBtnText: { color: colors.onAccent, fontSize: SIZES.base + 1, fontWeight: '800' },
});

export default SubscribeScreen;