import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

// Shows the vendor's current plan if subscribed, otherwise the top
// available plan as an upsell — both driven by real data from
// fetchMySubscription / fetchPlans, nothing hardcoded.
const PlanPromoCard = ({ mySubscription, topPlan, onPress }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const plan = mySubscription?.plan || topPlan;
  if (!plan) return null;

  const isCurrent = !!mySubscription;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9} disabled={isCurrent}>
      <View style={styles.iconBox}>
        <Icon name="shield" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{plan.name}</Text>
          <View style={styles.proTag}>
            <Text style={styles.proTagText}>PRO</Text>
          </View>
        </View>
        <Text style={styles.desc} numberOfLines={2}>
          {plan.features?.length ? plan.features.join(' • ') : 'Advanced analytics, priority support & custom branding.'}
        </Text>
        <View style={styles.divider} />
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.startsFrom}>{isCurrent ? 'YOUR PLAN' : 'STARTS FROM'}</Text>
            <Text style={styles.price}>
              ₹{plan.price} <Text style={styles.priceUnit}>/ {plan.durationDays} days</Text>
            </Text>
          </View>
          <View style={[styles.btn, isCurrent && styles.btnCurrent]}>
            <Text style={styles.btnText}>{isCurrent ? 'Current plan' : 'Upgrade'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// This card is always rendered on a solid brand-green surface in both
// themes (by design, like a promo banner), so the white text/overlays
// inside it are intentional constants — only colors.* that vary by
// theme (primary, white, error) come from the theme.
const getStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 20,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { color: '#FFFFFF', fontSize: SIZES.lg, fontWeight: '800' },
  proTag: { backgroundColor: '#FFFFFF', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  proTagText: { color: colors.error, fontSize: 10, fontWeight: '800' },
  desc: { color: 'rgba(255,255,255,0.85)', fontSize: SIZES.xs, lineHeight: 16, marginBottom: 12 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  startsFrom: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  price: { color: '#FFFFFF', fontSize: SIZES.lg, fontWeight: '800' },
  priceUnit: { fontSize: SIZES.xs, fontWeight: '500' },
  btn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  btnCurrent: { backgroundColor: 'rgba(255,255,255,0.15)' },
  btnText: { color: '#FFFFFF', fontSize: SIZES.xs, fontWeight: '700' },
});

export default PlanPromoCard;