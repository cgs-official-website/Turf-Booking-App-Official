// @theme-ready ✅
import React, { useState, useLayoutEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Switch, Image, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutVendor } from '../redux/authSlice';
import { deleteTurf as deleteTurfAction } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { getImageUrl } from '../api/client';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SectionHeader = ({ title, icon, colors }) => (
  <View style={styles.sectionHeaderRow}>
    {icon && <Feather name={icon} size={15} color={colors.primary} style={{ marginRight: 6 }} />}
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
  </View>
);

const MenuItem = ({
  icon,
  iconBg = 'rgba(0, 197, 102, 0.1)',
  iconColor = '#00C566',
  label,
  subLabel,
  onPress,
  toggle,
  toggleValue,
  onToggle,
  isFirst,
  isLast,
  colors,
  badgeText,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        isFirst && styles.menuItemFirst,
        isLast && styles.menuItemLast,
        { borderBottomColor: colors.border },
      ]}
      activeOpacity={toggle ? 1 : 0.65}
      onPress={toggle ? undefined : onPress}
      disabled={!!toggle}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.menuLabelWrap}>
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
        {!!subLabel && <Text style={[styles.menuSubLabel, { color: colors.textSecondary }]}>{subLabel}</Text>}
      </View>

      {badgeText && (
        <View style={[styles.menuBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.menuBadgeText, { color: colors.primary }]}>{badgeText}</Text>
        </View>
      )}

      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
        />
      ) : (
        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
};

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { vendor, turfStatus } = useSelector((s) => s.auth);
  const { mySubscription, turfs, bookings } = useSelector((s) => s.vendor);
  const { colors, isDark, toggleTheme } = useTheme();

  const [notificationsOn, setNotificationsOn] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const safeTurfs = Array.isArray(turfs) ? turfs : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your vendor account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => dispatch(logoutVendor()) },
    ]);
  };

  const handleDeleteTurf = () => {
    Alert.alert(
      'Delete Turf',
      'This will permanently delete your active turf, along with all scheduled slots and bookings history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => dispatch(deleteTurfAction()),
        },
      ]
    );
  };

  const planName = mySubscription?.plan?.name || (mySubscription ? 'Active Plan' : 'Free Partner');
  const planPrice = mySubscription?.plan?.price ?? mySubscription?.price ?? '0';
  const isSubscribed = !!mySubscription;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Text style={[styles.screenHeading, { color: colors.text }]}>Vendor Profile</Text>
          <TouchableOpacity
            style={[styles.settingsIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('PersonalInformation')}
            activeOpacity={0.7}
          >
            <Feather name="edit-3" size={17} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Vendor Hero Identity Card */}
        <View style={[styles.profileHeroCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.avatarSection}>
            {(vendor?.avatar || vendor?.photoURL) ? (
              <Image source={{ uri: getImageUrl(vendor.avatar || vendor.photoURL) }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {vendor?.name?.charAt(0)?.toUpperCase() || 'V'}
                </Text>
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#00C566" />
            </View>
          </View>

          <Text style={[styles.vendorDisplayName, { color: colors.text }]} numberOfLines={1}>
            {vendor?.name || 'Turf Partner'}
          </Text>

          <Text style={[styles.vendorEmailText, { color: colors.textSecondary }]}>
            {vendor?.email || 'vendor@turfbooking.com'}
          </Text>

          <View style={styles.badgeRow}>
            <View style={[styles.statusPill, { backgroundColor: 'rgba(0, 197, 102, 0.12)', borderColor: 'rgba(0, 197, 102, 0.3)' }]}>
              <View style={[styles.statusDot, { backgroundColor: '#00C566' }]} />
              <Text style={[styles.statusPillText, { color: '#00C566' }]}>
                {turfStatus === 'active' ? 'VERIFIED PARTNER' : 'VENDOR ACCOUNT'}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Strip */}
          <View style={[styles.metricsStrip, { borderTopColor: colors.border }]}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.text }]}>{safeTurfs.length || 1}</Text>
              <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>ACTIVE TURFS</Text>
            </View>
            <View style={[styles.metricDiv, { backgroundColor: colors.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.text }]}>{safeBookings.length}</Text>
              <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>TOTAL BOOKINGS</Text>
            </View>
            <View style={[styles.metricDiv, { backgroundColor: colors.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#F59E0B' }]}>4.9 ★</Text>
              <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>RATING</Text>
            </View>
          </View>
        </View>

        {/* Subscription Plan Card */}
        <TouchableOpacity
          style={[styles.subscriptionCard, SHADOWS.md]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SubscriptionPlans')}
        >
          <View style={styles.subCardTop}>
            <View style={styles.subBadgeWrap}>
              <Feather name="zap" size={13} color="#FFFFFF" />
              <Text style={styles.subBadgeText}>{isSubscribed ? 'ACTIVE SUBSCRIPTION' : 'UPGRADE TO PRO'}</Text>
            </View>
            <Text style={styles.subPriceText}>₹{planPrice}<Text style={styles.subPriceSub}>/mo</Text></Text>
          </View>

          <Text style={styles.subPlanTitle}>{planName}</Text>
          <Text style={styles.subPlanDesc}>
            {isSubscribed
              ? 'Enjoy seamless customer reservations, instant payouts, and premium visibility.'
              : 'Unlock unlimited slot bookings and turf management with a Pro subscription.'}
          </Text>

          <View style={styles.subCardFooter}>
            <Text style={styles.subManageText}>{isSubscribed ? 'Manage Subscription' : 'Explore All Plans'}</Text>
            <Feather name="arrow-right" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Business & Turf Management */}
        <SectionHeader title="Turf & Business" icon="briefcase" colors={colors} />
        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <MenuItem
            icon="user"
            iconBg="rgba(59, 130, 246, 0.12)"
            iconColor="#3B82F6"
            label="Personal Information"
            subLabel="Manage owner details & contact info"
            onPress={() => navigation.navigate('PersonalInformation')}
            isFirst
            colors={colors}
          />
          <MenuItem
            icon="map-pin"
            iconBg="rgba(16, 185, 129, 0.12)"
            iconColor="#10B981"
            label="Turf Profile & Facilities"
            subLabel="Photos, sports, opening hours & pricing"
            onPress={() => navigation.navigate('TurfProfile')}
            colors={colors}
          />
          <MenuItem
            icon="award"
            iconBg="rgba(245, 158, 11, 0.12)"
            iconColor="#F59E0B"
            label="Customer Reviews"
            subLabel="View ratings & player feedback"
            onPress={() => navigation.navigate('UserReviews')}
            colors={colors}
          />
          <MenuItem
            icon="credit-card"
            iconBg="rgba(168, 85, 247, 0.12)"
            iconColor="#A855F7"
            label="Subscription History"
            subLabel="Invoices and billing receipts"
            onPress={() => navigation.navigate('MySubscription')}
            isLast
            colors={colors}
          />
        </View>

        {/* App Preferences */}
        <SectionHeader title="App Preferences" icon="sliders" colors={colors} />
        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <MenuItem
            icon={isDark ? 'moon' : 'sun'}
            iconBg="rgba(245, 158, 11, 0.12)"
            iconColor="#F59E0B"
            label="Dark Mode"
            subLabel="Toggle app visual theme"
            toggle
            toggleValue={isDark}
            onToggle={toggleTheme}
            isFirst
            colors={colors}
          />
          <MenuItem
            icon="bell"
            iconBg="rgba(59, 130, 246, 0.12)"
            iconColor="#3B82F6"
            label="Push Notifications"
            subLabel="Booking alerts and reminders"
            toggle
            toggleValue={notificationsOn}
            onToggle={setNotificationsOn}
            colors={colors}
          />
          <MenuItem
            icon="alert-triangle"
            iconBg="rgba(239, 68, 68, 0.12)"
            iconColor="#EF4444"
            label="Report an Issue"
            subLabel="Get 24/7 vendor partner support"
            onPress={() => navigation.navigate('ReportIssues')}
            isLast
            colors={colors}
          />
        </View>

        {/* Legal & Policies */}
        <SectionHeader title="Legal & Information" icon="shield" colors={colors} />
        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <MenuItem
            icon="file-text"
            iconBg="rgba(107, 114, 128, 0.12)"
            iconColor="#6B7280"
            label="Terms of Service"
            onPress={() => navigation.navigate('Terms')}
            isFirst
            colors={colors}
          />
          <MenuItem
            icon="lock"
            iconBg="rgba(107, 114, 128, 0.12)"
            iconColor="#6B7280"
            label="Privacy Policy"
            onPress={() => navigation.navigate('Terms')}
            isLast
            colors={colors}
          />
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={17} color={colors.error || '#EF4444'} />
          <Text style={[styles.logoutBtnText, { color: colors.error || '#EF4444' }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Danger Zone: Delete Turf */}
        <TouchableOpacity style={styles.deleteTurfBtn} activeOpacity={0.8} onPress={handleDeleteTurf}>
          <Feather name="trash-2" size={15} color="#EF4444" />
          <Text style={styles.deleteTurfText}>Delete Turf & Reset Data</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>Turf Vendor App v2.1.0 (Official)</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SIZES.padding, paddingTop: 16, paddingBottom: 100 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenHeading: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  profileHeroCard: {
    borderRadius: SIZES.radiusLg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  vendorDisplayName: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  vendorEmailText: {
    fontSize: SIZES.xs,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 10,
  },
  badgeRow: {
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  metricsStrip: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 14,
    borderTopWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  metricLbl: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  metricDiv: {
    width: 1,
    height: 24,
  },

  subscriptionCard: {
    backgroundColor: '#0F172A',
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 24,
  },
  subCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 197, 102, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  subBadgeText: {
    color: '#00C566',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subPriceText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  subPriceSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  subPlanTitle: {
    color: '#FFFFFF',
    fontSize: SIZES.lg,
    fontWeight: '800',
    marginBottom: 4,
  },
  subPlanDesc: {
    color: '#94A3B8',
    fontSize: SIZES.xs,
    lineHeight: 18,
    marginBottom: 14,
  },
  subCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subManageText: {
    color: '#FFFFFF',
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  menuContainer: {
    borderRadius: SIZES.radiusLg,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuItemFirst: {},
  menuItemLast: { borderBottomWidth: 0 },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabelWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  menuSubLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radiusLg,
    paddingVertical: 15,
    gap: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  logoutBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },

  deleteTurfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    marginBottom: 16,
  },
  deleteTurfText: {
    color: '#EF4444',
    fontSize: SIZES.xs,
    fontWeight: '600',
  },

  versionText: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default ProfileScreen;