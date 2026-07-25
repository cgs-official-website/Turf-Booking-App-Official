// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Switch, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutVendor } from '../redux/authSlice';
import { deleteTurf as deleteTurfAction } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// ---- small building blocks -------------------------------------------------

const SectionLabel = ({ children }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return <Text style={styles.sectionLabel}>{children}</Text>;
};

const MenuRow = ({ icon, label, onPress, showChevron = true, toggle, toggleValue, onToggle, isFirst, isLast }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity
      style={[styles.menuRow, isFirst && styles.menuRowFirst, isLast && styles.menuRowLast]}
      activeOpacity={toggle ? 1 : 0.6}
      onPress={toggle ? undefined : onPress}
      disabled={!!toggle}
    >
      <View style={styles.menuIconBox}>
        <Feather name={icon} size={18} color={colors.text} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.success || colors.primary }}
          thumbColor={colors.onAccent}
        />
      ) : showChevron ? (
        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );
};

// ---- screen -----------------------------------------------------------------

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { vendor } = useSelector((s) => s.auth);
  const { mySubscription } = useSelector((s) => s.vendor);
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);

  const [notificationsOn, setNotificationsOn] = useState(true);

  // Hide default navigation header to remove white space above the custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logoutVendor()) },
    ]);
  };

  const handleDeleteTurf = () => {
    Alert.alert(
      'Delete Turf',
      'This will permanently delete your turf, along with all its bookings and history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteTurfAction()),
        },
      ]
    );
  };

  const planName = mySubscription?.plan?.name || 'No Active Plan';
  const planPrice = mySubscription?.plan?.price ?? mySubscription?.price;
  const planDesc = mySubscription
    ? 'Unlocked turf bookings and enjoy upcoming bookings'
    : 'Subscribe to a plan to start receiving bookings';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vendor card */}
        <TouchableOpacity
          style={[styles.vendorCard, SHADOWS.sm]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('PersonalInformation')}
        >
          {vendor?.avatar ? (
            <Image source={{ uri: vendor.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{vendor?.name?.[0]?.toUpperCase() || 'V'}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.vendorName}>{vendor?.name || 'Vendor'}</Text>
            <Text style={styles.vendorEmail}>{vendor?.email}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Plan banner */}
        <TouchableOpacity
          style={[styles.planCard, SHADOWS.md]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SubscriptionPlans')}
        >
          <View style={styles.planTopRow}>
            <View style={styles.planIconBox}>
              <Feather name="plus" size={16} color={colors.onAccent} />
            </View>
            {planPrice != null && (
              <View style={styles.planPricePill}>
                <Text style={styles.planPriceText}>₹{planPrice}</Text>
              </View>
            )}
          </View>
          <Text style={styles.planTitle}>{planName}</Text>
          <View style={styles.planBottomRow}>
            <Text style={styles.planDesc}>{planDesc}</Text>
            <Text style={styles.planLink}>View all plans</Text>
          </View>
        </TouchableOpacity>

        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <View style={[styles.menuCard, SHADOWS.sm]}>
          <MenuRow
            icon="user"
            label="Personal information"
            onPress={() => navigation.navigate('PersonalInformation')}
            isFirst
          />
          <MenuRow
            icon="image"
            label="Turf profile"
            onPress={() => navigation.navigate('TurfProfile')}
          />
          <MenuRow
            icon="dollar-sign"
            label="Subscription plans"
            onPress={() => navigation.navigate('SubscriptionPlans')}
          />
          <MenuRow
            icon="award"
            label="User reviews"
            onPress={() => navigation.navigate('UserReviews')}
            isLast
          />
        </View>

        {/* Preferences */}
        <SectionLabel>Preferences</SectionLabel>
        <View style={[styles.menuCard, SHADOWS.sm]}>
          <MenuRow
            icon="help-circle"
            label="Report issues"
            onPress={() => navigation.navigate('ReportIssues')}
            isFirst
          />
          <MenuRow
            icon="dollar-sign"
            label="Subscription History"
            onPress={() => navigation.navigate('MySubscription')}
          />
          <MenuRow
            icon="lock"
            label="Privacy Policy"
            onPress={() => navigation.navigate('Terms')}
          />
          <MenuRow
            icon="sun"
            label="Dark Mode"
            toggle
            toggleValue={isDark}
            onToggle={toggleTheme}
          />
          <MenuRow
            icon="bell"
            label="Notification"
            toggle
            toggleValue={notificationsOn}
            onToggle={setNotificationsOn}
            isLast
          />
        </View>

        {/* Account (logout) */}
        <SectionLabel>Account</SectionLabel>
        <View style={[styles.menuCard, SHADOWS.sm]}>
          <MenuRow
            icon="log-out"
            label="Log out"
            onPress={handleLogout}
            showChevron={false}
            isFirst
            isLast
          />
        </View>

        {/* Delete turf */}
        <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.85} onPress={handleDeleteTurf}>
          <Feather name="trash-2" size={18} color={colors.onAccent} />
          <Text style={styles.deleteText}>Delete Turf</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
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

  content: { paddingHorizontal: SIZES.padding, paddingBottom: 110 },

  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card || colors.background,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { color: colors.onAccent, fontSize: 20, fontWeight: '700' },
  vendorName: { fontSize: SIZES.base + 1, fontWeight: '700', color: colors.text },
  vendorEmail: { fontSize: SIZES.sm, color: colors.textSecondary, marginTop: 2 },

  planCard: {
    backgroundColor: colors.primary,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 24,
  },
  planTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planIconBox: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success || colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  // Pill always sits on top of the green plan card, so its colors must NOT
  // depend on light/dark theme (that was the bug: colors.inputBg turned
  // near-white in light mode, making the white text invisible).
  planPricePill: { backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  planPriceText: { color: '#FFFFFF', fontWeight: '700', fontSize: SIZES.sm },
  planTitle: { color: colors.onAccent, fontSize: SIZES.lg + 2, fontWeight: '800', marginBottom: 6 },
  planBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  planDesc: { flex: 1, color: colors.onAccent, fontSize: SIZES.xs, lineHeight: 18, marginRight: 10, opacity: 0.9 },
  planLink: { color: colors.onAccent, fontSize: SIZES.xs, fontWeight: '700', textDecorationLine: 'underline' },

  sectionLabel: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text, marginBottom: 10, marginTop: 4 },

  menuCard: {
    backgroundColor: colors.card || colors.background,
    borderRadius: SIZES.radiusLg,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowFirst: {},
  menuRowLast: { borderBottomWidth: 0 },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.inputBg || colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: SIZES.base, fontWeight: '600', color: colors.text },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: SIZES.radiusLg,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  deleteText: { color: colors.onAccent, fontWeight: '700', fontSize: SIZES.base },
});

export default ProfileScreen;