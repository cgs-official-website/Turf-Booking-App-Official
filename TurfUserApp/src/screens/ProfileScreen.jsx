import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Image, Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { logout, toggleTheme } from '../redux/authSlice';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import { getImageUrl } from '../api/client';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SectionHeader = ({ title, icon, colors }) => (
  <View style={styles.sectionHeaderRow}>
    {icon && <Feather name={icon} size={14} color={colors.primary} style={{ marginRight: 6 }} />}
    <Text style={[styles.sectionTitleText, { color: colors.text }]}>{title}</Text>
  </View>
);

const MenuItem = ({
  icon,
  iconBg = 'rgba(12, 176, 83, 0.12)',
  iconColor = '#0CB053',
  label,
  subLabel,
  onPress,
  toggle,
  toggleVal,
  onToggle,
  isLast,
  colors,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !isLast && [styles.menuItemBorder, { borderBottomColor: colors.border }],
      ]}
      onPress={!toggle ? onPress : undefined}
      activeOpacity={toggle ? 1 : 0.75}
    >
      <View style={[styles.menuIconBox, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.menuTextWrap}>
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
        {!!subLabel && (
          <Text style={[styles.menuSubLabel, { color: colors.subtext }]}>{subLabel}</Text>
        )}
      </View>

      {toggle ? (
        <Switch
          value={toggleVal}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <Feather name="chevron-right" size={17} color={colors.subtext} />
      )}
    </TouchableOpacity>
  );
};

export default function ProfileScreen({ navigation }) {
  const user = useSelector((s) => s.auth?.user || s.auth?.profile);
  const bookings = useSelector((s) => s.booking?.bookings);
  const wishlist = useSelector((s) => s.wishlist?.wishlist);
  const notifOn = useSelector((s) => s.auth?.notificationsOn ?? true);

  const dispatch = useDispatch();
  const { C, dark } = useTheme();

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out of your player account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  const avatarUri = (user?.avatar || user?.photoURL) ? getImageUrl(user.avatar || user.photoURL) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Top Navbar */}
      <View style={styles.topBar}>
        <Text style={[styles.topTitle, { color: C.text }]}>Player Profile</Text>
        <TouchableOpacity
          style={[styles.editIconBtn, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => navigation.navigate('PersonalInfo')}
          activeOpacity={0.7}
        >
          <Feather name="edit-3" size={16} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Player Hero Identity Card */}
        <View style={[styles.heroCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.avatarTxt, { color: C.primary }]}>
                    {(user?.name || 'P')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.verifiedBadge, { backgroundColor: '#FFFFFF' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#0CB053" />
              </View>
            </View>

            <Text style={[styles.profileName, { color: C.text }]} numberOfLines={1}>
              {user?.name || 'Sports Enthusiast'}
            </Text>
            <Text style={[styles.profileEmail, { color: C.subtext }]} numberOfLines={1}>
              {user?.email || user?.phone || 'Verified Player'}
            </Text>
          </View>

          {/* Quick Metrics Strip */}
          <View style={[styles.statsStrip, { backgroundColor: C.bgSoft || '#F8FAFC' }]}>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => navigation.navigate('Bookings')}
              activeOpacity={0.75}
            >
              <Text style={[styles.statValue, { color: C.primary }]}>{bookings?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: C.subtext }]}>Bookings</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: C.border }]} />

            <TouchableOpacity
              style={styles.statBox}
              onPress={() => navigation.navigate('Wishlist')}
              activeOpacity={0.75}
            >
              <Text style={[styles.statValue, { color: C.primary }]}>{wishlist?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: C.subtext }]}>Favorites</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: C.border }]} />

            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: C.primary }]}>Active</Text>
              <Text style={[styles.statLabel, { color: C.subtext }]}>Pass Status</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Account Management */}
        <SectionHeader title="ACCOUNT & BOOKINGS" icon="user" colors={C} />
        <View style={[styles.menuCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <MenuItem
            icon="user"
            label="Personal Information"
            subLabel="Name, contact details & avatar"
            colors={C}
            onPress={() => navigation.navigate('PersonalInfo')}
          />
          <MenuItem
            icon="calendar"
            label="My Slot Bookings"
            subLabel="Upcoming reservations & invoices"
            iconBg="rgba(59, 130, 246, 0.12)"
            iconColor="#3B82F6"
            colors={C}
            onPress={() => navigation.navigate('Bookings')}
          />
          <MenuItem
            icon="heart"
            label="Saved Arenas & Wishlist"
            subLabel="Your favorite turf facilities"
            iconBg="rgba(239, 68, 68, 0.12)"
            iconColor="#EF4444"
            colors={C}
            onPress={() => navigation.navigate('Wishlist')}
            isLast
          />
        </View>

        {/* Section 2: App Preferences */}
        <SectionHeader title="PREFERENCES & DISPLAY" icon="settings" colors={C} />
        <View style={[styles.menuCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <MenuItem
            icon="bell"
            label="Push Notifications"
            subLabel="Match alerts & booking reminders"
            iconBg="rgba(245, 158, 11, 0.12)"
            iconColor="#F59E0B"
            colors={C}
            toggle
            toggleVal={notifOn}
            onToggle={() => {}}
          />
          <MenuItem
            icon={dark ? 'moon' : 'sun'}
            label="Dark Mode"
            subLabel={dark ? 'Dark slate theme enabled' : 'Clean light theme enabled'}
            iconBg="rgba(168, 85, 247, 0.12)"
            iconColor="#A855F7"
            colors={C}
            toggle
            toggleVal={dark}
            onToggle={() => dispatch(toggleTheme())}
            isLast
          />
        </View>

        {/* Section 3: Logout Action */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: '#EF4444' }]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  editIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    paddingTop: 8,
  },

  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: {
    fontSize: 32,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '500',
  },

  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  menuCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 12,
  },
  logoutTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});