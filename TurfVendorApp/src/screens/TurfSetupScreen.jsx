// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator, Platform, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { setField, toggleSport, toggleFacility, addCustomFacility, submitTurfDraft } from '../redux/onboardingSlice';
import { logoutVendor } from '../redux/authSlice';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';

const SPORTS = [
  { key: 'Football', icon: '⚽' },
  { key: 'Cricket', icon: '🏏' },
  { key: 'Volleyball', icon: '🏐' },
  { key: 'Badminton', icon: '🏸' },
  { key: 'Tennis', icon: '🎾' },
];

const FACILITIES = [
  { key: 'Parking', icon: '🅿️' },
  { key: 'Washroom', icon: '🚻' },
  { key: 'Changing Room', icon: '🚪' },
  { key: 'Refreshments', icon: '🥤' },
  { key: 'CCTV', icon: '📹' },
  { key: 'Seating Area', icon: '💺' },
];

function toDate(timeStr) {
  const d = new Date();
  const [time, meridiem] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  d.setHours(h, m, 0, 0);
  return d;
}

function toLabel(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const meridiem = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridiem}`;
}

function durationHours(fromLabel, toLabelStr) {
  const from = toDate(fromLabel);
  let to = toDate(toLabelStr);
  if (to <= from) to = new Date(to.getTime() + 24 * 60 * 60 * 1000);
  return Math.round(((to - from) / 3600000) * 10) / 10;
}

function Field({ label, colors, styles, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && { height: 90, textAlignVertical: 'top' }, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card || colors.background }]}
        placeholderTextColor={colors.textLight || colors.textSecondary}
        {...props}
      />
    </View>
  );
}

export default function TurfSetupScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const dispatch = useDispatch();
  const draft = useSelector((s) => s.onboarding);
  const loading = useSelector((s) => s.onboarding.loading);

  const [customFacility, setCustomFacility] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [pickerFor, setPickerFor] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const set = (key) => (value) => dispatch(setField({ key, value }));

  const totalDuration = durationHours(draft.openTime, draft.closeTime);

  const onTimeChange = (event, selectedDate) => {
    const field = pickerFor;
    setPickerFor(null);
    if (!selectedDate || event.type === 'dismissed') return;
    const label = toLabel(selectedDate);
    dispatch(setField({ key: field === 'open' ? 'openTime' : 'closeTime', value: label }));
  };

  const pickLogo = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];
    dispatch(setField({ key: 'logo', value: { uri: asset.uri, name: asset.fileName, type: asset.type } }));
  };

  const pickCoverImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];
    const newImg = { uri: asset.uri, name: asset.fileName, type: asset.type };
    dispatch(setField({ key: 'images', value: [newImg, ...draft.images.slice(1)] }));
  };

  const pickProductImage = async (index) => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];
    const newImg = { uri: asset.uri, name: asset.fileName, type: asset.type };
    const next = [...draft.images];
    next[index] = newImg;
    dispatch(setField({ key: 'images', value: next }));
  };

  const handleBackToLogin = () => {
    Alert.alert(
      'Go back to Login?',
      'You will be logged out and can continue this later after logging in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Logout', style: 'destructive', onPress: () => dispatch(logoutVendor()) },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!draft.name || !draft.city || !draft.phone || !draft.pincode || !draft.address) {
      Alert.alert('Missing details', 'Please fill all turf basic details.');
      return;
    }
    if (draft.sports.length === 0) {
      Alert.alert('Select sports', 'Please select at least one sport.');
      return;
    }
    if (!draft.price || !draft.eveningPrice || !draft.weekendPrice || !draft.weekendEveningPrice) {
      Alert.alert('Missing prices', 'Please fill all price fields.');
      return;
    }
    const res = await dispatch(submitTurfDraft());
    if (submitTurfDraft.fulfilled.match(res)) {
      navigation.navigate('VendorVerification');
    } else {
      Alert.alert('Error', res.payload || 'Could not save turf. Try again.');
    }
  };

  const cover = draft.images[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={handleBackToLogin} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turf & Vendor Setup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.stepLabel}>Step 1 out of 3</Text>
        <View style={styles.progressRow}>
          <View style={[styles.segment, { backgroundColor: colors.primary }]} />
          <View style={[styles.segment, { backgroundColor: colors.border }]} />
          <View style={[styles.segment, { backgroundColor: colors.border }]} />
        </View>

        <Text style={styles.sectionHeader}>1. Basic Setup</Text>

        <TouchableOpacity style={styles.logoBox} onPress={pickLogo}>
          {draft.logo ? (
            <Image source={{ uri: draft.logo.uri }} style={styles.logoImg} />
          ) : (
            <View style={styles.logoCircle}><Feather name="user" size={20} color={colors.textSecondary} /></View>
          )}
          <Text style={[styles.logoLabel, { color: colors.text }]}>Upload turf logo</Text>
          <Text style={styles.logoSub}>Tap to upload your Turf logo</Text>
        </TouchableOpacity>

        <Field label="Turf name" placeholder="Enter your turf name" value={draft.name} onChangeText={set('name')} colors={colors} styles={styles} />
        <Field label="City" placeholder="Enter your city" value={draft.city} onChangeText={set('city')} colors={colors} styles={styles} />
        <Field label="Phone Number" placeholder="Enter the Contact Number" value={draft.phone} onChangeText={set('phone')} keyboardType="phone-pad" colors={colors} styles={styles} />
        <Field label="Pin code" placeholder="Enter your pincode" value={draft.pincode} onChangeText={set('pincode')} keyboardType="number-pad" colors={colors} styles={styles} />
        <Field label="Address" placeholder="Enter your address" value={draft.address} onChangeText={set('address')} multiline numberOfLines={3} colors={colors} styles={styles} />

        <Text style={[styles.subLabel, { color: colors.text }]}>Select your sports</Text>
        <View style={styles.chipsWrap}>
          {SPORTS.map((s) => {
            const active = draft.sports.includes(s.key);
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.chip, active && styles.chipActive, { borderColor: colors.border, backgroundColor: colors.card || colors.background }]}
                onPress={() => dispatch(toggleSport(s.key))}
              >
                <Text style={active ? styles.chipTextActive : [styles.chipText, { color: colors.text }]}>{s.icon} {s.key}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card || colors.background }]} onPress={() => setShowCustomInput(true)}>
            <Text style={[styles.chipText, { color: colors.text }]}>+ Add Sports</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subLabel, { color: colors.text }]}>Facilities</Text>
        <View style={styles.facilityGrid}>
          {FACILITIES.map((f) => {
            const active = draft.facilities.includes(f.key);
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.facilityCard, active && styles.facilityCardActive, { borderColor: colors.border, backgroundColor: colors.card || colors.background }]}
                onPress={() => dispatch(toggleFacility(f.key))}
              >
                <Text style={{ fontSize: 18, marginBottom: 6 }}>{f.icon}</Text>
                <Text style={active ? styles.facilityTextActive : [styles.facilityText, { color: colors.text }]}>{f.key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showCustomInput ? (
          <View style={styles.customRow}>
            <TextInput
              style={[styles.customInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card || colors.background }]}
              placeholder="Custom facility name"
              placeholderTextColor={colors.textSecondary}
              value={customFacility}
              onChangeText={setCustomFacility}
            />
            <TouchableOpacity
              style={styles.customAddBtn}
              onPress={() => {
                if (customFacility.trim()) {
                  dispatch(addCustomFacility(customFacility.trim()));
                  setCustomFacility('');
                  setShowCustomInput(false);
                }
              }}
            >
              <Text style={{ color: colors.onAccent || '#fff', fontWeight: '600' }}>Add</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.addCustomBtn, { borderColor: colors.primary }]} onPress={() => setShowCustomInput(true)}>
            <Text style={[styles.addCustomText, { color: colors.primary }]}>Add Custom Facility</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionHeader}>2. Configure Turf</Text>

        <View style={[styles.card, SHADOWS.sm, { backgroundColor: colors.card || colors.background, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Feather name="clock" size={16} color={colors.primary} />
            <Text style={[styles.cardHeader, { color: colors.text }]}> Operating Hours</Text>
          </View>

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.timeLabel}>From Time</Text>
              <TouchableOpacity style={[styles.timeBox, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setPickerFor('open')}>
                <Text style={[styles.timeText, { color: colors.text }]}>{draft.openTime}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.timeLabel}>To Time</Text>
              <TouchableOpacity style={[styles.timeBox, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setPickerFor('close')}>
                <Text style={[styles.timeText, { color: colors.text }]}>{draft.closeTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>Total Duration</Text>
            <Text style={[styles.durationValue, { color: colors.primary }]}>{totalDuration} Hours</Text>
          </View>
        </View>

        <View style={[styles.card, SHADOWS.sm, { backgroundColor: colors.card || colors.background, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Feather name="clock" size={16} color={colors.primary} />
            <Text style={[styles.cardHeader, { color: colors.text }]}> Slot Duration</Text>
          </View>
          <Text style={styles.slotSub}>Select the Slot Duration</Text>
          <View style={styles.slotRow}>
            <TouchableOpacity
              style={[styles.slotBtn, draft.slotDuration === '1 hour' && styles.slotBtnActive, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => dispatch(setField({ key: 'slotDuration', value: '1 hour' }))}
            >
              <Text style={draft.slotDuration === '1 hour' ? styles.slotTextActive : [styles.slotText, { color: colors.text }]}>1 hours</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity
              style={[styles.slotBtn, draft.slotDuration === '30 min' && styles.slotBtnActive, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => dispatch(setField({ key: 'slotDuration', value: '30 min' }))}
            >
              <Text style={draft.slotDuration === '30 min' ? styles.slotTextActive : [styles.slotText, { color: colors.text }]}>30 Min</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionHeader}>3. Business Setup</Text>
        <Text style={[styles.subLabel, { color: colors.text }]}>Price Details</Text>

        <Field label="Turf Price (Per hour)" placeholder="700" value={draft.price} onChangeText={set('price')} keyboardType="numeric" colors={colors} styles={styles} />
        <Field label="Turf evening Price (Per hour)" placeholder="700" value={draft.eveningPrice} onChangeText={set('eveningPrice')} keyboardType="numeric" colors={colors} styles={styles} />

        <Text style={[styles.subLabel, { color: colors.text }]}>Weekend price</Text>
        <Field label="Turf Weekday price (Per hour)" placeholder="700" value={draft.weekendPrice} onChangeText={set('weekendPrice')} keyboardType="numeric" colors={colors} styles={styles} />
        <Field label="Turf Weekday evening price (Per hour)" placeholder="700" value={draft.weekendEveningPrice} onChangeText={set('weekendEveningPrice')} keyboardType="numeric" colors={colors} styles={styles} />

        <Text style={[styles.subLabel, { color: colors.text }]}>Turf Images</Text>
        <View style={[styles.imageCard, { backgroundColor: colors.card || colors.background, borderColor: colors.border }]}>
          <View style={styles.imageCardHeader}>
            <Text style={[styles.imageCardTitle, { color: colors.text }]}>Product Images</Text>
            <Feather name="image" size={16} color={colors.textSecondary} />
          </View>

          <TouchableOpacity style={[styles.coverBox, { backgroundColor: isDark ? '#064E3B' : '#F3FBF6', borderColor: colors.primary }]} onPress={pickCoverImage}>
            {cover ? (
              <Image source={{ uri: cover.uri }} style={styles.coverImg} />
            ) : (
              <>
                <Feather name="upload-cloud" size={22} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.coverLabel, { color: colors.text }]}>Upload Cover Image</Text>
                <Text style={styles.coverSub}>1200 x 1200 px recommended</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.thumbGrid}>
            {[1, 2, 3, 4].map((i) => {
              const img = draft.images[i];
              return (
                <TouchableOpacity key={i} style={[styles.thumbBox, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => pickProductImage(i)}>
                  {img ? (
                    <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                  ) : (
                    <Feather name="camera" size={16} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.onAccent || '#fff'} /> : <Text style={[styles.submitText, { color: colors.onAccent || '#fff' }]}>Continue</Text>}
        </TouchableOpacity>

        {pickerFor && (
          <DateTimePicker
            value={toDate(pickerFor === 'open' ? draft.openTime : draft.closeTime)}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
  container: { padding: 20, paddingBottom: 40 },
  stepLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  progressRow: { flexDirection: 'row', marginBottom: 16 },
  segment: { flex: 1, height: 4, borderRadius: 2, marginRight: 6 },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 22, marginBottom: 12 },
  logoBox: {
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 14,
    alignItems: 'center', paddingVertical: 24, marginBottom: 20, backgroundColor: colors.card || colors.background,
  },
  logoCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.inputBg || colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoImg: { width: 56, height: 56, borderRadius: 28, marginBottom: 10 },
  logoLabel: { fontWeight: '600', marginBottom: 2 },
  logoSub: { fontSize: 12, color: colors.textSecondary },
  fieldLabel: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  subLabel: { fontWeight: '700', marginTop: 6, marginBottom: 10 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13 },
  chipTextActive: { color: colors.onAccent || '#FFFFFF', fontSize: 13, fontWeight: '600' },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  facilityCard: { width: '48%', borderWidth: 1, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  facilityCardActive: { borderColor: colors.primary, backgroundColor: colors.isDark ? '#064E3B' : '#F0FBF3' },
  facilityText: { fontSize: 13 },
  facilityTextActive: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  addCustomBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  addCustomText: { fontWeight: '600' },
  customRow: { flexDirection: 'row', marginTop: 4, marginBottom: 8 },
  customInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginRight: 8 },
  customAddBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardHeader: { fontWeight: '700', fontSize: 14 },
  timeRow: { flexDirection: 'row' },
  timeLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  timeBox: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12 },
  timeText: { fontSize: 14 },
  durationRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  durationLabel: { fontSize: 13, color: colors.textSecondary },
  durationValue: { fontSize: 13, fontWeight: '700' },
  slotSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 14 },
  slotRow: { flexDirection: 'row' },
  slotBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  slotBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontWeight: '600' },
  slotTextActive: { color: '#fff', fontWeight: '700' },
  imageCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 4 },
  imageCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  imageCardTitle: { fontWeight: '700', fontSize: 13 },
  coverBox: {
    borderWidth: 1.5, borderStyle: 'dashed',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 22, marginBottom: 12,
  },
  coverImg: { width: '100%', height: 100, borderRadius: 10 },
  coverLabel: { fontWeight: '600' },
  coverSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  thumbBox: { width: '48%', height: 60, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  thumbImg: { width: '100%', height: '100%', borderRadius: 10 },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitText: { fontWeight: '700', fontSize: 15 },
});