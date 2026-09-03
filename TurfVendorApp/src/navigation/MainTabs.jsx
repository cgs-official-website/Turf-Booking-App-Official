// @theme-ready ✅
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import DashboardScreen from '../screens/DashboardScreen';
import TurfBookingsScreen from '../screens/TurfBookingsScreen';
import SlotsScreen from '../screens/SlotsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Dashboard: {
    label: 'Home',
    activeIcon: 'grid',
    inactiveIcon: 'grid',
  },
  BookingsTab: {
    label: 'Bookings',
    activeIcon: 'calendar',
    inactiveIcon: 'calendar',
  },
  SlotsTab: {
    label: 'Slots',
    activeIcon: 'clock',
    inactiveIcon: 'clock',
  },
  Profile: {
    label: 'Profile',
    activeIcon: 'user',
    inactiveIcon: 'user',
  },
};

const CapsuleTabBar = ({ state, descriptors, navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { bookings } = useSelector((s) => s.vendor);
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const pendingCount = safeBookings.filter((b) => b && b.status === 'pending').length;

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom + 4, Platform.OS === 'ios' ? 18 : 12) },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.capsule,
          {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          },
          SHADOWS.md,
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = TAB_CONFIG[route.name] || { label: route.name, activeIcon: 'circle' };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const showBadge = route.name === 'BookingsTab' && pendingCount > 0;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[
                styles.tabItem,
                focused && [
                  styles.tabItemActive,
                  { backgroundColor: isDark ? 'rgba(0, 197, 102, 0.15)' : 'rgba(0, 197, 102, 0.12)' },
                ],
              ]}
              activeOpacity={0.75}
            >
              <View style={styles.iconWrap}>
                <Feather
                  name={focused ? config.activeIcon : config.inactiveIcon}
                  size={20}
                  color={focused ? colors.primary : colors.textSecondary}
                />
                {showBadge && (
                  <View style={[styles.badgePill, { backgroundColor: colors.error || '#EF4444' }]}>
                    <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: focused ? colors.primary : colors.textSecondary,
                    fontWeight: focused ? '800' : '600',
                  },
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CapsuleTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="BookingsTab" component={TurfBookingsScreen} />
      <Tab.Screen name="SlotsTab" component={SlotsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  capsule: {
    flexDirection: 'row',
    borderRadius: 32,
    paddingVertical: 6,
    paddingHorizontal: 6,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 24,
  },
  tabItemActive: {
    paddingVertical: 8,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  badgePill: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
});

export default MainTabs;