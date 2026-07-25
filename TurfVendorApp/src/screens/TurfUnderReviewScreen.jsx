// @theme-ready ✅
import React, { useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Image, Linking, AppState,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTurfStatus, logoutVendor } from '../redux/authSlice';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';

let illustration = null;
try { illustration = require('../assets/turf-under-review-illustration.png'); } catch (e) {}

const POLL_INTERVAL_MS = 15000;

export default function TurfUnderReviewScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const dispatch = useDispatch();
  const turfInfo = useSelector((s) => s.auth.turfInfo);
  const vendor = useSelector((s) => s.auth.vendor);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const poll = useCallback(() => {
    dispatch(fetchTurfStatus());
  }, [dispatch]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [poll]);

  const handleLogout = () => dispatch(logoutVendor());

  const handleEmailUs = () => {
    Linking.openURL('mailto:support@turfvendorapp.com?subject=Turf%20Verification%20Query');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.illustrationWrap}>
          {illustration ? (
            <Image source={illustration} style={styles.illustration} resizeMode="contain" />
          ) : (
            <Feather name="clock" size={64} color={colors.primary} />
          )}
        </View>

        <Text style={styles.title}>Your application is{'\n'}under review</Text>

        <View style={[styles.card, { backgroundColor: colors.card || colors.background, borderColor: colors.border }]}>
          <Text style={styles.cardLabel}>SUBMITTED TURF INFORMATION</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>{turfInfo?.name || vendor?.businessName || '—'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card || colors.background, borderColor: colors.border }]}>
          <Text style={styles.cardLabel}>REVIEW TIME</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>24 – 48 hours</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Need help? Contact our support team</Text>
          <TouchableOpacity style={[styles.emailBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={handleEmailUs}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="mail" size={16} color={colors.text} />
              <Text style={[styles.emailBtnText, { color: colors.text }]}>Email Us</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: SIZES.paddingLg, paddingTop: 24 },
  illustrationWrap: { alignItems: 'center', justifyContent: 'center', height: 200, marginBottom: 20 },
  illustration: { width: 220, height: 200 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 28 },
  card: {
    borderWidth: 1, borderRadius: SIZES.radius,
    padding: 16, marginBottom: 16,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.5, marginBottom: 8 },
  cardValue: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, marginTop: 8, marginBottom: 12 },
  emailBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  emailBtnText: { fontWeight: '600', fontSize: 14 },
  logoutRow: { alignItems: 'center', marginTop: 12 },
  logoutText: { fontSize: 13, textDecorationLine: 'underline' },
});