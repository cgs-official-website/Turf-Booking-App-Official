// @theme-ready ✅
import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTurfById, deleteTurf } from '../redux/vendorSlice';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';

const TurfDetailScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const { turfId } = route.params;
  const dispatch = useDispatch();
  const { selectedTurf: turf, loading } = useSelector((s) => s.vendor);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => { dispatch(fetchTurfById(turfId)); }, [turfId]);

  const handleDelete = () => {
    Alert.alert('Delete Turf', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { dispatch(deleteTurf(turfId)); navigation.goBack(); } },
    ]);
  };

  if (!turf || loading) return <ActivityIndicator color={colors.primary} style={{ flex: 1, marginTop: 40, backgroundColor: colors.background }} />;

  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turf Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{turf.name}</Text>
            <View style={[styles.badge, { backgroundColor: turf.status === 'active' ? (isDark ? '#064E3B' : '#D1FAE5') : (isDark ? '#78350F' : '#FEF3C7') }]}>
              <Text style={[styles.badgeText, { color: turf.status === 'active' ? colors.success : colors.warning }]}>
                {turf.status === 'active' ? '● Active' : '● Under Review'}
              </Text>
            </View>
          </View>
          <Text style={styles.price}>₹{turf.pricePerHour}/hr</Text>
          <View style={styles.rowItem}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            <Text style={styles.location}>{turf.location?.address}, {turf.location?.city}</Text>
          </View>
          {turf.description ? <Text style={styles.desc}>{turf.description}</Text> : null}
        </View>

        <View style={[styles.card, SHADOWS.sm]}>
          <Text style={styles.sectionTitle}>Sports</Text>
          <View style={styles.tags}>{turf.sports?.map(s => <View key={s} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>)}</View>
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Amenities</Text>
          <View style={styles.tags}>{turf.amenities?.map(a => <View key={a} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>)}</View>
        </View>

        <View style={[styles.card, SHADOWS.sm]}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          <View style={styles.rowItem}>
            <Feather name="clock" size={14} color={colors.textSecondary} />
            <Text style={styles.hours}>{turf.operatingHours?.open || '06:00'} – {turf.operatingHours?.close || '22:00'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditTurf', { turfId })}>
            <Feather name="edit-2" size={16} color={colors.onAccent || '#FFFFFF'} style={{ marginRight: 6 }} />
            <Text style={styles.editText}>Edit Turf</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Feather name="trash-2" size={16} color={colors.error} style={{ marginRight: 6 }} />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    backgroundColor: colors.card || colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg || colors.border,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: colors.text,
  },
  content: { padding: SIZES.padding, paddingBottom: 40, gap: 14 },
  card: { backgroundColor: colors.card || colors.background, borderRadius: SIZES.radius, padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: SIZES.xl, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  price: { fontSize: SIZES.lg, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  location: { fontSize: SIZES.sm, color: colors.textSecondary },
  desc: { fontSize: SIZES.sm, color: colors.text, lineHeight: 20, marginTop: 4 },
  sectionTitle: { fontSize: SIZES.base, fontWeight: '700', color: colors.text, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: colors.primaryLight || colors.border, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: SIZES.xs, color: colors.primary, fontWeight: '500' },
  hours: { fontSize: SIZES.base, color: colors.text, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  editText: { color: colors.onAccent || '#FFFFFF', fontWeight: '700' },
  deleteBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.isDark ? '#451A03' : '#FEE2E2', borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.error, fontWeight: '700' },
});

export default TurfDetailScreen;