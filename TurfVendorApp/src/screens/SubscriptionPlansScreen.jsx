// @theme-ready ✅
import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlans, fetchMySubscription } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const SubscriptionPlansScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { plans, mySubscription, loading } = useSelector((s) => s.vendor);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  // Hide default navigation header to remove white space above custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchPlans());
    dispatch(fetchMySubscription());
  }, []);

  if (loading && !plans.length) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1, marginTop: 40, backgroundColor: colors.background }} />;
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Unlock more features with a premium plan</Text>

        {mySubscription && (
          <View style={[styles.currentPlan, SHADOWS.sm]}>
            <View style={styles.currentPlanIcon}>
              <Feather name="award" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentLabel}>Current Active Plan</Text>
              <Text style={styles.currentName}>{mySubscription.plan?.name}</Text>
              <Text style={styles.currentExpiry}>
                Expires: {new Date(mySubscription.expiryDate).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {plans.map((plan, index) => {
          const isCurrentPlan = mySubscription?.plan?._id === plan._id;
          const isPopular = index === 1;

          return (
            <View key={plan._id} style={[styles.planCard, SHADOWS.md, isPopular && styles.popularCard]}>
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Feather name="star" size={12} color={colors.onAccent} style={{ marginRight: 4 }} />
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>
                ₹{plan.price}<Text style={styles.planDuration}>/{plan.durationDays} days</Text>
              </Text>
              
              <View style={styles.divider} />
              
              {plan.features?.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <View style={styles.checkIconWrap}>
                    <Feather name="check" size={14} color={isPopular ? (colors.success || colors.primary) : colors.primary} />
                  </View>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              
              <TouchableOpacity
                style={[
                  styles.subscribeBtn, 
                  isPopular && styles.subscribeBtnPrimary,
                  isCurrentPlan && styles.subscribeBtnCurrent
                ]}
                onPress={() => !isCurrentPlan && navigation.navigate('Subscribe', { plan })}
                disabled={isCurrentPlan}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.subscribeBtnText, 
                  isPopular && { color: colors.onAccent },
                  isCurrentPlan && styles.subscribeBtnTextCurrent
                ]}>
                  {isCurrentPlan ? 'Current Plan' : 'Subscribe Now'}
                </Text>
                {!isCurrentPlan && (
                  <Feather 
                    name="arrow-right" 
                    size={18} 
                    color={isPopular ? colors.onAccent : colors.primary} 
                    style={{ marginLeft: 8 }} 
                  />
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: SIZES.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, marginTop: 4 },
  
  currentPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    // Explicit per-theme colors instead of colors.primary + hex-opacity,
    // which rendered as a muddy olive tone in light mode.
    backgroundColor: isDark ? colors.primary + '22' : '#EAF8EF',
    borderRadius: SIZES.radiusLg,
    padding: 16, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDark ? colors.primary + '55' : '#BFE8CC',
  },
  currentPlanIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card || colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentLabel: { fontSize: SIZES.xs, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  currentName: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text, marginTop: 2 },
  currentExpiry: { fontSize: SIZES.sm, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  
  planCard: {
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radiusLg,
    padding: 22, 
    marginBottom: 20, 
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  popularCard: { 
    borderWidth: 2, 
    borderColor: colors.primary,
    backgroundColor: colors.card || colors.background,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute', 
    top: -14, 
    alignSelf: 'center',
    backgroundColor: colors.primary, 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 20,
  },
  popularText: { color: colors.onAccent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  
  planName: { fontSize: SIZES.lg + 2, fontWeight: '800', color: colors.text, marginBottom: 6, marginTop: 4 },
  planPrice: { fontSize: 34, fontWeight: '800', color: colors.primary, marginBottom: 18 },
  planDuration: { fontSize: SIZES.sm, color: colors.textSecondary, fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 18 },
  
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: { fontSize: SIZES.sm + 1, color: colors.text, fontWeight: '500', flex: 1 },
  
  subscribeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20, 
    borderRadius: SIZES.radius, 
    paddingVertical: 16,
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  subscribeBtnPrimary: { backgroundColor: colors.primary },
  subscribeBtnCurrent: { 
    borderColor: colors.border, 
    backgroundColor: colors.inputBg || colors.border,
  },
  subscribeBtnText: { fontWeight: '700', fontSize: SIZES.base, color: colors.primary },
  subscribeBtnTextCurrent: { color: colors.textSecondary },
});

export default SubscriptionPlansScreen;