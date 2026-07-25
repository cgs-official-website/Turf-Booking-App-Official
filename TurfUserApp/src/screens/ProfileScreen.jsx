// import React, { useState } from 'react';
// import {
//   View, Text, StyleSheet, ScrollView, TouchableOpacity,
//   Switch, Alert, Image,
// } from 'react-native';
// import { useSelector, useDispatch } from 'react-redux';
// import { logout } from '../redux/authSlice';
// import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { SafeAreaView } from 'react-native-safe-area-context';

// export default function ProfileScreen({ navigation }) {
//   const user = useSelector((s) => s.auth.user);
//   const dispatch = useDispatch();
  
//   const [notificationsOn, setNotificationsOn] = useState(true);
//   const [darkMode, setDarkMode] = useState(false);

//   // Dark Screen Colour CODE (1).png kulla irundha color codes mapping
//   const theme = {
//     bg: darkMode ? '#1E1E1E' : COLORS.bg,
//     card: darkMode ? '#2C2C2C' : '#fff',
//     text: darkMode ? '#F4F4F4' : COLORS.text,
//     subtext: darkMode ? '#ADADAD' : COLORS.subtext,
//     border: darkMode ? '#ADADAD' : COLORS.border,
//     brand: '#0CB053', // Brand colour
//   };

//   const handleLogout = () =>
//     Alert.alert('Log out', 'Are you sure you want to log out?', [
//       { text: 'Cancel', style: 'cancel' },
//       { text: 'Log out', style: 'destructive', onPress: () => dispatch(logout()) },
//     ]);

//   return (
//     <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
//       {/* ── Header ── */}
//       <View style={styles.topBar}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
//           <Icon name="arrow-back" size={22} color={theme.text} />
//         </TouchableOpacity>
//         <Text style={[styles.topTitle, { color: theme.text }]}>Profile</Text>
//         <View style={{ width: 40 }} />
//       </View>

//       <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
//         {/* ── Avatar ── */}
//         <View style={styles.avatarSection}>
//           <View style={styles.avatarWrap}>
//             {user?.avatar ? (
//               <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
//             ) : (
//               <View style={[styles.avatarFallback, { backgroundColor: darkMode ? '#2C2C2C' : COLORS.greenSoft, borderColor: theme.brand }]}>
//                 <Text style={[styles.avatarTxt, { color: theme.brand }]}>{(user?.name || 'P')[0].toUpperCase()}</Text>
//               </View>
//             )}
//             <TouchableOpacity
//               style={[styles.pencilBadge, { backgroundColor: theme.brand, borderColor: theme.card }]}
//               onPress={() => navigation.navigate('PersonalInfo')}
//             >
//               <Icon name="pencil" size={11} color="#fff" />
//             </TouchableOpacity>
//           </View>
//           <Text style={[styles.profileName, { color: theme.text }]}>{user?.name || 'Player'}</Text>
//         </View>

//         {/* ── Account ── */}
//         <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
//         <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
//           <MenuItem
//             icon="person-outline"
//             label="Personal information"
//             theme={theme}
//             onPress={() => navigation.navigate('PersonalInfo')}
//           />
//           <MenuItem
//             icon="grid-outline"
//             label="Turf bookings"
//             theme={theme}
//             onPress={() => navigation.navigate('Bookings')}
//             last={false}
//           />
//           <MenuItem
//             icon="heart-outline"
//             label="Wish list"
//             theme={theme}
//             onPress={() => navigation.navigate('Wishlist')}
//             last
//           />
//         </View>

//         {/* ── Preferences ── */}
//         <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
//         <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
//           <MenuItem
//             icon="notifications-outline"
//             label="Notifications"
//             theme={theme}
//             toggle
//             toggleVal={notificationsOn}
//             onToggle={() => setNotificationsOn((v) => !v)}
//           />
//           <MenuItem
//             icon={darkMode ? "moon-outline" : "sunny-outline"}
//             label="Theme"
//             theme={theme}
//             toggle
//             toggleVal={darkMode}
//             onToggle={() => setDarkMode((v) => !v)}
//             last
//           />
//         </View>

//         {/* ── Log out ── */}
//         <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.brand }]} onPress={handleLogout}>
//           <Icon name="log-out-outline" size={20} color="#fff" />
//           <Text style={styles.logoutTxt}>Log out</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// // ── Reusable menu row ──
// function MenuItem({ icon, label, onPress, toggle, toggleVal, onToggle, last, theme }) {
//   return (
//     <TouchableOpacity
//       activeOpacity={toggle ? 1 : 0.75}
//       style={[styles.menuItem, { borderBottomColor: theme.border }, last && { borderBottomWidth: 0 }]}
//       onPress={!toggle ? onPress : undefined}
//     >
//       <Icon name={icon} size={20} color={theme.text} />
//       <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
//       {toggle ? (
//         <Switch
//           value={toggleVal}
//           onValueChange={onToggle}
//           trackColor={{ false: theme.border, true: theme.brand }}
//           thumbColor="#fff"
//           style={{ marginLeft: 'auto' }}
//         />
//       ) : (
//         <Icon name="chevron-forward" size={18} color={theme.subtext} style={{ marginLeft: 'auto' }} />
//       )}
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   safe: { flex: 1 },

//   // header
//   topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
//   backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
//   topTitle: { ...FONT.h2 },

//   // avatar
//   avatarSection: { alignItems: 'center', paddingVertical: SPACING.xl },
//   avatarWrap: { position: 'relative', marginBottom: SPACING.md },
//   avatarImg: { width: 90, height: 90, borderRadius: 45 },
//   avatarFallback: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
//   avatarTxt: { fontSize: 36, fontWeight: '800' },
//   pencilBadge: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
//   profileName: { ...FONT.h2 },

//   // sections
//   sectionTitle: { ...FONT.h3, paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm },
//   menuCard: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
//   menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg, borderBottomWidth: 1 },
//   menuLabel: { fontSize: 15, fontWeight: '500' },

//   // logout
//   logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginTop: SPACING.xl, borderRadius: RADIUS.xl, paddingVertical: SPACING.lg + 2 },
//   logoutTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
// });

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { logout, toggleTheme } from '../redux/authSlice';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen({ navigation }) {
  const user     = useSelector((s) => s.auth.user);
  const notifOn  = useSelector((s) => s.auth.notificationsOn ?? true);
  const dispatch = useDispatch();
  const { C, dark } = useTheme();

  const handleLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <Text style={[styles.topTitle, { color: C.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: C.bgSoft, borderColor: C.primary }]}>
                <Text style={[styles.avatarTxt, { color: C.primary }]}>
                  {(user?.name || 'P')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.pencilBadge, { backgroundColor: C.primary, borderColor: C.card }]}
              onPress={() => navigation.navigate('PersonalInfo')}
            >
              <Icon name="pencil" size={11} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: C.text }]}>{user?.name || 'Player'}</Text>
          <Text style={[styles.profileEmail, { color: C.subtext }]}>{user?.email || ''}</Text>
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Account</Text>
        <View style={[styles.menuCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <MenuItem icon="person-outline"  label="Personal information" C={C}
            onPress={() => navigation.navigate('PersonalInfo')} />
          <MenuItem icon="grid-outline"    label="Turf bookings"        C={C}
            onPress={() => navigation.navigate('Bookings')} />
          <MenuItem icon="heart-outline"   label="Wish list"            C={C}
            onPress={() => navigation.navigate('Wishlist')} last />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Preferences</Text>
        <View style={[styles.menuCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            C={C}
            toggle
            toggleVal={notifOn}
            onToggle={() => {}} 
          />
          <MenuItem
            icon={dark ? 'moon' : 'sunny-outline'}
            label="Dark Mode"
            C={C}
            toggle
            toggleVal={dark}
            onToggle={() => dispatch(toggleTheme())}
            last
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: C.primary }]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Icon name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutTxt}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress, toggle, toggleVal, onToggle, last, C }) {
  return (
    <TouchableOpacity
      activeOpacity={toggle ? 1 : 0.75}
      style={[styles.menuItem, { borderBottomColor: C.border }, last && { borderBottomWidth: 0 }]}
      onPress={!toggle ? onPress : undefined}
    >
      <Icon name={icon} size={20} color={C.text} />
      <Text style={[styles.menuLabel, { color: C.text }]}>{label}</Text>
      {toggle ? (
        <Switch
          value={toggleVal}
          onValueChange={onToggle}
          trackColor={{ false: C.border, true: C.primary }}
          thumbColor="#fff"
          style={{ marginLeft: 'auto' }}
        />
      ) : (
        <Icon name="chevron-forward" size={18} color={C.subtext} style={{ marginLeft: 'auto' }} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  topTitle:       { ...FONT.h2 },
  avatarSection:  { alignItems: 'center', paddingVertical: SPACING.xl },
  avatarWrap:     { position: 'relative', marginBottom: SPACING.md },
  avatarImg:      { width: 90, height: 90, borderRadius: 45 },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, borderWidth: 2,
                    justifyContent: 'center', alignItems: 'center' },
  avatarTxt:      { fontSize: 36, fontWeight: '800' },
  pencilBadge:    { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24,
                    borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  profileName:    { ...FONT.h2, marginBottom: 4 },
  profileEmail:   { fontSize: 13 },
  sectionTitle:   { ...FONT.h3, paddingHorizontal: SPACING.lg,
                    marginTop: SPACING.lg, marginBottom: SPACING.sm },
  menuCard:       { marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl,
                    borderWidth: 1, overflow: 'hidden' },
  menuItem:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
                    paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg, borderBottomWidth: 1 },
  menuLabel:      { fontSize: 15, fontWeight: '500' },
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: SPACING.sm, marginHorizontal: SPACING.lg, marginTop: SPACING.xl,
                    borderRadius: RADIUS.xl, paddingVertical: SPACING.lg + 2 },
  logoutTxt:      { color: '#fff', fontWeight: '700', fontSize: 16 },
});