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
import Icon from '../components/Icon';

const Tab = createBottomTabNavigator();

const TAB_ICON = {
  Dashboard: 'home',
  BookingsTab: 'file-plus',
  SlotsTab: 'calendar',
  Profile: 'user',
};

const TAB_LABEL = {
  Dashboard: 'Home',
  BookingsTab: 'Bookings',
  SlotsTab: 'Slots',
  Profile: 'Profile',
};

const CapsuleTabBar = ({ state, descriptors, navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const { bookings } = useSelector((s) => s.vendor);
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={[styles.capsule, SHADOWS.md]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
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
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View>
                <Icon
                  name={TAB_ICON[route.name]}
                  size={22}
                  color={focused ? colors.primary : (colors.textLight || colors.textSecondary)}
                />
                {showBadge && <View style={styles.badgeDot} />}
              </View>
              <Text style={[styles.label, { color: focused ? colors.primary : (colors.textLight || colors.textSecondary) }]}>
                {TAB_LABEL[route.name]}
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

const getStyles = (colors) => StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center', paddingHorizontal: SIZES.padding,
  },
  capsule: {
    flexDirection: 'row',
    backgroundColor: colors.card || colors.background,
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: '100%',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  label: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  badgeDot: {
    position: 'absolute', top: -3, right: -6, width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.card || colors.background,
  },
});

export default MainTabs;