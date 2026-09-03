import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import HomeScreen from '../screens/HomeScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import WishlistScreen from '../screens/WishlistScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { RADIUS, SHADOW } from '../utils/theme';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home:     { label: 'Explore',  icon: 'compass', activeIcon: 'compass' },
  Bookings: { label: 'Bookings', icon: 'calendar', activeIcon: 'calendar' },
  Wishlist: { label: 'Saved',    icon: 'heart',    activeIcon: 'heart' },
  Profile:  { label: 'Profile',  icon: 'user',     activeIcon: 'user' },
};

function TabBarIcon({ route, focused, colors }) {
  const conf = TAB_CONFIG[route.name] || TAB_CONFIG.Home;
  return (
    <View
      style={[
        styles.iconWrap,
        focused && {
          backgroundColor: colors.primaryLight,
        },
      ]}
    >
      <Feather
        name={conf.icon}
        size={20}
        color={focused ? colors.primary : colors.subtext}
      />
    </View>
  );
}

export default function MainTabs() {
  const { C, dark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.subtext,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 14,
          left: 16,
          right: 16,
          backgroundColor: dark ? '#131E2F' : '#FFFFFF',
          borderRadius: 32,
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
          borderTopWidth: 0,
          borderWidth: 1.5,
          borderColor: dark ? '#223249' : '#E2E8F0',
          ...SHADOW.floating,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarIcon: ({ focused }) => (
          <TabBarIcon route={route} focused={focused} colors={C} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Explore' }} />
      <Tab.Screen name="Bookings" component={MyBookingsScreen} options={{ tabBarLabel: 'Bookings' }} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} options={{ tabBarLabel: 'Saved' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});