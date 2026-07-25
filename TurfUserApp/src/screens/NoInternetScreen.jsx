// // src/screens/NoInternetScreen.jsx
// import React, { useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, Image,
//   Animated,
// } from 'react-native';
// import { COLORS, SPACING, RADIUS } from '../utils/theme';
// import Icon from 'react-native-vector-icons/Ionicons';

// const errorImg = require('../assets/error.png');

// export default function NoInternetScreen() {
//   const slideAnim = useRef(new Animated.Value(100)).current;

//   useEffect(() => {
//     Animated.spring(slideAnim, {
//       toValue: 0,
//       useNativeDriver: true,
//       tension: 50,
//       friction: 8,
//     }).start();
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.sorry}>Sorry, Page not found!</Text>
//       <Image source={errorImg} style={styles.image} resizeMode="contain" />
//       <Text style={styles.title}>Your Information Not Found</Text>
//       <View style={styles.netRow}>
//         <Icon name="wifi-outline" size={16} color={COLORS.subtext} />
//         <Text style={styles.netText}>Please Check your Network</Text>
//       </View>
//       <Animated.View style={[styles.offlineBanner, { transform: [{ translateY: slideAnim }] }]}>
//         <Icon name="wifi-outline" size={16} color="#fff" />
//         <Text style={styles.offlineText}>You are now offline</Text>
//       </Animated.View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container:     { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
//   sorry:         { fontSize: 14, color: COLORS.subtext, marginBottom: SPACING.lg },
//   image:         { width: 260, height: 200, marginBottom: SPACING.xl },
//   title:         { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.md },
//   netRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xl },
//   netText:       { color: COLORS.subtext, fontSize: 14 },
//   offlineBanner: { position: 'absolute', bottom: 60, backgroundColor: COLORS.red, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.round },
//   offlineText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
// });

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, StatusBar } from 'react-native';
import { SPACING, RADIUS } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/Ionicons';

const errorImg = require('../assets/error.png');

export default function NoInternetScreen() {
  const { C, dark } = useTheme();
  const slideAnim = useRef(new Animated.Value(100)).current;
  useEffect(() => { Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start(); }, []);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <Text style={[styles.sorry, { color: C.subtext }]}>Sorry, Page not found!</Text>
      <Image source={errorImg} style={styles.image} resizeMode="contain" />
      <Text style={[styles.title, { color: C.text }]}>Your Information Not Found</Text>
      <View style={styles.netRow}>
        <Icon name="wifi-outline" size={16} color={C.subtext} />
        <Text style={[styles.netText, { color: C.subtext }]}>Please Check your Network</Text>
      </View>
      <Animated.View style={[styles.offlineBanner, { backgroundColor: C.red, transform: [{ translateY: slideAnim }] }]}>
        <Icon name="wifi-outline" size={16} color="#fff" />
        <Text style={styles.offlineText}>You are now offline</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  sorry:         { fontSize: 14, marginBottom: SPACING.lg },
  image:         { width: 260, height: 200, marginBottom: SPACING.xl },
  title:         { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.md },
  netRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xl },
  netText:       { fontSize: 14 },
  offlineBanner: { position: 'absolute', bottom: 60, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.round },
  offlineText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});