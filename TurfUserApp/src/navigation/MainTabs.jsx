
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import HomeScreen       from '../screens/HomeScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import WishlistScreen   from '../screens/WishlistScreen';
import ProfileScreen    from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home:     { active: 'home',     inactive: 'home-outline'     },
  Bookings: { active: 'calendar', inactive: 'calendar-outline' },
  Wishlist: { active: 'heart',    inactive: 'heart-outline'    },
  Profile:  { active: 'person',   inactive: 'person-outline'   },
};

// Wrapper — hooks inside Tab.Navigator screenOptions செய்ய முடியாது
// So ஒரு wrapper component use பண்றோம்
function TabBarIcon({ route, color, focused }) {
  const icons = TAB_ICONS[route.name];
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Icon name={focused ? icons.active : icons.inactive} size={22} color={color} />
    </View>
  );
}

export default function MainTabs() {
  const { C, dark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.subtext,
        tabBarStyle: {
          // ── Capsule style ──
          position:        'absolute',
          bottom:          20,
          left:            20,
          right:           20,
          backgroundColor: dark ? C.card : '#fff',
          borderRadius:    32,
          height:          64,
          paddingBottom:   8,
          paddingTop:      8,
          borderTopWidth:  0,
          // Shadow
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 4 },
          shadowOpacity:   dark ? 0.4 : 0.12,
          shadowRadius:    16,
          elevation:       10,
          borderWidth:     dark ? 1 : 0,
          borderColor:     dark ? C.border : 'transparent',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, focused }) => (
          <TabBarIcon route={route} color={color} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Bookings" component={MyBookingsScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  iconWrap:       { padding: 4, borderRadius: 10 },
  iconWrapActive: { backgroundColor: 'rgba(12,176,83,0.12)' },
});