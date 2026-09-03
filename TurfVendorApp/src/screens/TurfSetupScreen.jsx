// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator, Platform, Image, Modal, FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { setField, toggleSport, toggleFacility, addCustomFacility, submitTurfDraft } from '../redux/onboardingSlice';
import { logoutVendor } from '../redux/authSlice';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';

const SPORTS = [
  { key: 'Football', icon: (color) => <Ionicons name="football" size={18} color={color} /> },
  { key: 'Cricket', icon: (color) => <MaterialCommunityIcons name="cricket" size={18} color={color} /> },
  { key: 'Badminton', icon: (color) => <MaterialCommunityIcons name="badminton" size={18} color={color} /> },
  { key: 'Tennis', icon: (color) => <Ionicons name="tennisball-outline" size={18} color={color} /> },
  { key: 'Volleyball', icon: (color) => <MaterialCommunityIcons name="volleyball" size={18} color={color} /> },
  { key: 'Basketball', icon: (color) => <Ionicons name="basketball-outline" size={18} color={color} /> },
];

const FACILITIES = [
  { key: 'Parking', icon: (color) => <Feather name="truck" size={18} color={color} /> },
  { key: 'Washroom', icon: (color) => <Feather name="user-check" size={18} color={color} /> },
  { key: 'Changing Room', icon: (color) => <Feather name="shield" size={18} color={color} /> },
  { key: 'Refreshments', icon: (color) => <Feather name="coffee" size={18} color={color} /> },
  { key: 'CCTV', icon: (color) => <Feather name="video" size={18} color={color} /> },
  { key: 'Seating Area', icon: (color) => <Feather name="grid" size={18} color={color} /> },
  { key: 'Floodlights', icon: (color) => <Feather name="sun" size={18} color={color} /> },
  { key: 'First Aid', icon: (color) => <Feather name="plus-circle" size={18} color={color} /> },
];

const TIME_OPTIONS = [
  '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM',
];

function toDate(timeStr) {
  const d = new Date();
  const [time, meridiem] = (timeStr || '06:00 AM').split(' ');
  let [h, m] = (time || '06:00').split(':').map(Number);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  d.setHours(h || 6, m || 0, 0, 0);
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

export default function TurfSetupScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const dispatch = useDispatch();
  const draft = useSelector((s) => s.onboarding);
  const loading = useSelector((s) => s.onboarding.loading);

  const [customFacility, setCustomFacility] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [timePickerField, setTimePickerField] = useState(null); // 'open' | 'close' | null

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const set = (key) => (value) => dispatch(setField({ key, value }));

  const totalDuration = durationHours(draft.openTime, draft.closeTime);

  const showTimePicker = (field) => {
    setTimePickerField(field);
  };

  const selectTime = (time) => {
    if (timePickerField) {
      dispatch(setField({ key: timePickerField === 'open' ? 'openTime' : 'closeTime', value: time }));
      setTimePickerField(null);
    }
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
    const next = Array.isArray(draft.images) ? [...draft.images] : [];
    next[0] = newImg;
    dispatch(setField({ key: 'images', value: next }));
  };

  const pickProductImage = async (index) => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];
    const newImg = { uri: asset.uri, name: asset.fileName, type: asset.type };
    const next = Array.isArray(draft.images) ? [...draft.images] : [];
    next[index] = newImg;
    dispatch(setField({ key: 'images', value: next }));
  };

  const handleBackToLogin = () => {
    Alert.alert(
      'Go back to Login?',
      'You will be logged out and can resume your turf onboarding later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Logout', style: 'destructive', onPress: () => dispatch(logoutVendor()) },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!draft.name || !draft.city || !draft.phone || !draft.pincode || !draft.address) {
      Alert.alert('Missing Details', 'Please fill in all venue basic details to continue.');
      return;
    }
    if (!draft.sports || draft.sports.length === 0) {
      Alert.alert('Select Sports', 'Please select at least one sport category for your venue.');
      return;
    }
    if (!draft.price) {
      Alert.alert('Pricing Required', 'Please set the base hourly rate for your turf.');
      return;
    }
    const res = await dispatch(submitTurfDraft());
    if (submitTurfDraft.fulfilled.match(res)) {
      navigation.navigate('VendorVerification');
    } else {
      Alert.alert('Error', res.payload || 'Could not save turf draft. Try again.');
    }
  };

  const cover = draft.images?.[0];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header Bar */}
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={handleBackToLogin} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Pitch & Venue Setup</Text>
          <Text style={styles.headerSubtitle}>Step 1 of 3</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Modern Stepper Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressPill, styles.progressActive]} />
        <View style={styles.progressPill} />
        <View style={styles.progressPill} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner Card */}
        <View style={styles.heroBanner}>
          <View style={styles.heroIconCircle}>
            <MaterialCommunityIcons name="stadium-variant" size={26} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.heroTitle}>List Your Venue</Text>
            <Text style={styles.heroSubtitle}>
              Configure your pitch profile, sports facilities, and booking pricing.
            </Text>
          </View>
        </View>

        {/* ── Section 1: Basic Information ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          {/* Logo Upload */}
          <TouchableOpacity style={styles.logoPicker} onPress={pickLogo} activeOpacity={0.8}>
            {draft.logo ? (
              <Image source={{ uri: draft.logo.uri }} style={styles.logoPreview} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Feather name="camera" size={22} color={colors.primary} />
                <Text style={styles.logoUploadText}>Upload Venue Logo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form Inputs */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Venue / Turf Name *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="shield" size={17} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Champions Turf Arena"
                placeholderTextColor={colors.textSecondary}
                value={draft.name}
                onChangeText={set('name')}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>City *</Text>
              <View style={styles.inputWrapper}>
                <Feather name="map-pin" size={16} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Chennai"
                  placeholderTextColor={colors.textSecondary}
                  value={draft.city}
                  onChangeText={set('city')}
                />
              </View>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Pin Code *</Text>
              <View style={styles.inputWrapper}>
                <Feather name="hash" size={16} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="600028"
                  placeholderTextColor={colors.textSecondary}
                  value={draft.pincode}
                  onChangeText={set('pincode')}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Contact Phone Number *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="phone" size={17} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.textSecondary}
                value={draft.phone}
                onChangeText={set('phone')}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Full Venue Address *</Text>
            <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
              <Feather name="map" size={17} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Door No, Street Name, Area, Landmark"
                placeholderTextColor={colors.textSecondary}
                value={draft.address}
                onChangeText={set('address')}
                multiline
              />
            </View>
          </View>
        </View>

        {/* ── Section 2: Sports Categories ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Sports Available</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Select all sports facilities supported at your facility.
          </Text>

          <View style={styles.chipsGrid}>
            {SPORTS.map((s) => {
              const active = (draft.sports || []).includes(s.key);
              const iconColor = active ? '#FFFFFF' : colors.primary;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sportChip, active && styles.sportChipActive]}
                  onPress={() => dispatch(toggleSport(s.key))}
                  activeOpacity={0.7}
                >
                  {s.icon(iconColor)}
                  <Text style={[styles.sportChipText, active && styles.sportChipTextActive]}>
                    {s.key}
                  </Text>
                  {active && <Feather name="check" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Section 3: Ground Amenities & Facilities ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>Amenities & Features</Text>
          </View>

          <View style={styles.facilityGrid}>
            {FACILITIES.map((f) => {
              const active = (draft.facilities || []).includes(f.key);
              const iconColor = active ? '#FFFFFF' : colors.primary;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.facilityCard, active && styles.facilityCardActive]}
                  onPress={() => dispatch(toggleFacility(f.key))}
                  activeOpacity={0.7}
                >
                  <View style={[styles.facilityIconCircle, active && styles.facilityIconActive]}>
                    {f.icon(iconColor)}
                  </View>
                  <Text style={[styles.facilityText, active && styles.facilityTextActive]}>
                    {f.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {showCustomInput ? (
            <View style={styles.customFacilityRow}>
              <TextInput
                style={styles.customInput}
                placeholder="e.g. Lockers, Cafe, Sound System"
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
                <Text style={styles.customAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addCustomTrigger} onPress={() => setShowCustomInput(true)}>
              <Feather name="plus-circle" size={16} color={colors.primary} />
              <Text style={styles.addCustomTriggerText}>Add Custom Amenity</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section 4: Operating Hours & Slots ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>Operating Hours & Slots</Text>
          </View>

          <View style={styles.timeSelectorRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Opens At</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => showTimePicker('open')}
                activeOpacity={0.8}
              >
                <Feather name="sunrise" size={16} color={colors.primary} />
                <Text style={styles.timePickerText}>{draft.openTime || '06:00 AM'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Closes At</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => showTimePicker('close')}
                activeOpacity={0.8}
              >
                <Feather name="sunset" size={16} color={colors.primary} />
                <Text style={styles.timePickerText}>{draft.closeTime || '11:00 PM'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.durationBadgeRow}>
            <Feather name="clock" size={14} color={colors.primary} />
            <Text style={styles.durationBadgeText}>
              Total Operating Window: <Text style={{ fontWeight: '800' }}>{totalDuration} Hours / Day</Text>
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Default Slot Duration</Text>
          <View style={styles.slotOptionRow}>
            {['1 hour', '30 min'].map((dur) => {
              const active = draft.slotDuration === dur || (!draft.slotDuration && dur === '1 hour');
              return (
                <TouchableOpacity
                  key={dur}
                  style={[styles.slotOptionBtn, active && styles.slotOptionBtnActive]}
                  onPress={() => dispatch(setField({ key: 'slotDuration', value: dur }))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.slotOptionText, active && styles.slotOptionTextActive]}>
                    {dur === '1 hour' ? '60 Minutes (Standard)' : '30 Minutes (Fast Match)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Section 5: Hourly Pricing ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>5</Text>
            </View>
            <Text style={styles.sectionTitle}>Hourly Pricing</Text>
          </View>

          <View style={styles.pricingGrid}>
            <View style={styles.pricingItem}>
              <Text style={styles.pricingLabel}>Base Rate (Weekday Day)</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="800"
                  placeholderTextColor={colors.textSecondary}
                  value={draft.price ? String(draft.price) : ''}
                  onChangeText={set('price')}
                  keyboardType="numeric"
                />
                <Text style={styles.priceUnit}>/hr</Text>
              </View>
            </View>

            <View style={styles.pricingItem}>
              <Text style={styles.pricingLabel}>Evening Rate (Peak Lights)</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="1000"
                  placeholderTextColor={colors.textSecondary}
                  value={draft.eveningPrice ? String(draft.eveningPrice) : ''}
                  onChangeText={set('eveningPrice')}
                  keyboardType="numeric"
                />
                <Text style={styles.priceUnit}>/hr</Text>
              </View>
            </View>

            <View style={styles.pricingItem}>
              <Text style={styles.pricingLabel}>Weekend Rate (Saturday/Sunday)</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="1200"
                  placeholderTextColor={colors.textSecondary}
                  value={draft.weekendPrice ? String(draft.weekendPrice) : ''}
                  onChangeText={set('weekendPrice')}
                  keyboardType="numeric"
                />
                <Text style={styles.priceUnit}>/hr</Text>
              </View>
            </View>

            <View style={styles.pricingItem}>
              <Text style={styles.pricingLabel}>Weekend Evening Rate (Peak)</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="1400"
                  placeholderTextColor={colors.textSecondary}
                  value={draft.weekendEveningPrice ? String(draft.weekendEveningPrice) : ''}
                  onChangeText={set('weekendEveningPrice')}
                  keyboardType="numeric"
                />
                <Text style={styles.priceUnit}>/hr</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Section 6: Ground Gallery Photos ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>6</Text>
            </View>
            <Text style={styles.sectionTitle}>Ground Gallery Photos</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Upload high quality photos of your turf, lighting, and spectator areas.
          </Text>

          {/* Primary Cover Image */}
          <TouchableOpacity style={styles.coverUploadZone} onPress={pickCoverImage} activeOpacity={0.85}>
            {cover ? (
              <Image source={{ uri: cover.uri }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <View style={styles.uploadIconCircle}>
                  <Feather name="image" size={24} color={colors.primary} />
                </View>
                <Text style={styles.coverUploadTitle}>Upload Pitch Cover Photo</Text>
                <Text style={styles.coverUploadSubtitle}>Tap to browse gallery (1200 x 800 recommended)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Additional Gallery Strip */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Additional Venue Photos (Optional)</Text>
          <View style={styles.thumbRow}>
            {[1, 2, 3, 4].map((i) => {
              const img = draft.images?.[i];
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.thumbnailBox}
                  onPress={() => pickProductImage(i)}
                  activeOpacity={0.8}
                >
                  {img ? (
                    <Image source={{ uri: img.uri }} style={styles.thumbnailImage} />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Feather name="plus" size={20} color={colors.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Save & Continue CTA ── */}
        <TouchableOpacity
          style={[styles.continueButton, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Save & Proceed to Verification →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Built-in Pure-JS Time Picker Modal ── */}
      <Modal
        visible={!!timePickerField}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerField(null)}
      >
        <TouchableOpacity
          style={styles.timeModalOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerField(null)}
        >
          <View style={[styles.timeModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.timeModalHeader}>
              <Text style={[styles.timeModalTitle, { color: colors.text }]}>
                Select {timePickerField === 'open' ? 'Opening Time' : 'Closing Time'}
              </Text>
              <TouchableOpacity onPress={() => setTimePickerField(null)}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.timeGrid} showsVerticalScrollIndicator={false}>
              {TIME_OPTIONS.map((t) => {
                const current = timePickerField === 'open' ? draft.openTime : draft.closeTime;
                const isSelected = current === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.timeOptionChip,
                      { borderColor: colors.border, backgroundColor: colors.background },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => selectTime(t)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        { color: colors.text },
                        isSelected && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    customHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 48,
      paddingBottom: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginTop: 2,
    },
    progressContainer: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.card,
    },
    progressPill: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    progressActive: {
      backgroundColor: colors.primary,
    },
    container: {
      padding: 16,
      paddingBottom: 60,
    },
    heroBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#064E3B' : '#E8F8EE',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? '#059669' : '#A7F3D0',
    },
    heroIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#065F46',
    },
    heroSubtitle: {
      fontSize: 12,
      color: isDark ? '#D1FAE5' : '#047857',
      marginTop: 2,
      lineHeight: 16,
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.sm,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionNumberCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    sectionNumberText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 14,
      marginTop: -4,
    },
    logoPicker: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      marginBottom: 14,
    },
    logoPreview: {
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    logoPlaceholder: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    logoUploadText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
      marginTop: 4,
    },
    inputGroup: {
      marginBottom: 12,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 48,
    },
    inputIcon: {
      marginRight: 10,
    },
    textInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    row2: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    chipsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    sportChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 24,
      borderWidth: 1.2,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    sportChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sportChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginLeft: 6,
    },
    sportChipTextActive: {
      color: '#FFFFFF',
    },
    facilityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    facilityCard: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 14,
      borderWidth: 1.2,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    facilityCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    facilityIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    facilityIconActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    facilityText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    facilityTextActive: {
      color: '#FFFFFF',
    },
    addCustomTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      borderRadius: 12,
    },
    addCustomTriggerText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 6,
    },
    customFacilityRow: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    customInput: {
      flex: 1,
      height: 44,
      backgroundColor: colors.background,
      borderWidth: 1.2,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      fontSize: 13,
      color: colors.text,
    },
    customAddBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    customAddBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
    timeSelectorRow: {
      flexDirection: 'row',
    },
    timePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: colors.border,
      height: 48,
      gap: 8,
    },
    timePickerText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    durationBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
      borderRadius: 10,
      paddingVertical: 8,
      marginTop: 10,
      gap: 6,
    },
    durationBadgeText: {
      fontSize: 12,
      color: colors.text,
    },
    slotOptionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    slotOptionBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    slotOptionBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    slotOptionText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    slotOptionTextActive: {
      color: '#FFFFFF',
    },
    pricingGrid: {
      gap: 12,
    },
    pricingItem: {},
    pricingLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    priceInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 48,
    },
    rupeeSymbol: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.primary,
      marginRight: 6,
    },
    priceInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    priceUnit: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    coverUploadZone: {
      height: 160,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      overflow: 'hidden',
      backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
    },
    coverImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    coverPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    uploadIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? '#064E3B' : '#E0F2FE',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    coverUploadTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    coverUploadSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    thumbRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    thumbnailBox: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 1.2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    thumbnailPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      ...SHADOWS.md,
    },
    continueButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    timeModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      padding: 20,
    },
    timeModalContent: {
      borderRadius: 20,
      borderWidth: 1,
      maxHeight: 450,
      padding: 18,
      ...SHADOWS.floating,
    },
    timeModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 12,
    },
    timeModalTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    timeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingVertical: 6,
    },
    timeOptionChip: {
      width: '30%',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeOptionText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });