// @theme-ready ✅
import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import { getImageUrl } from '../api/client';
import {
  fetchMyTurf, updateTurfInfo, updateTurfTiming,
  updateTurfPricing, updateTurfAmenities,
} from '../redux/vendorSlice';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const TABS = [
  { key: 'info', title: 'Basic Info', icon: 'info' },
  { key: 'time', title: 'Timing & Slots', icon: 'clock' },
  { key: 'price', title: 'Pricing', icon: 'dollar-sign' },
  { key: 'amenities', title: 'Sports & Amenities', icon: 'grid' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  let h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
});

const DEFAULT_SPORTS = ['Cricket', 'Football', 'Basketball', 'Badminton', 'Tennis', 'Volleyball'];
const DEFAULT_AMENITIES = ['Floodlights', 'Parking', 'CCTV', 'Washroom', 'Water', 'Seating', 'Changing Room'];

const TimePickerModal = ({ visible, initial, onClose, onSelect, colors, styles }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalSheet, { backgroundColor: colors.card }, SHADOWS.md]}>
        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.modalTitle, { color: colors.text }]}>Select Time</Text>
        <FlatList
          data={TIME_OPTIONS}
          keyExtractor={(t) => t}
          initialNumToRender={48}
          style={{ maxHeight: 320 }}
          renderItem={({ item }) => {
            const isSelected = item === initial;
            return (
              <TouchableOpacity
                style={[
                  styles.timeOption,
                  { borderBottomColor: colors.border },
                  isSelected && { backgroundColor: colors.primaryLight, borderRadius: 8 },
                ]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.timeOptionText, { color: isSelected ? colors.primary : colors.text }]}>{item}</Text>
                {isSelected && <Feather name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
          <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const TurfProfileScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const dispatch = useDispatch();
  const { turf, loading } = useSelector((s) => s.vendor);

  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);

  const [logo, setLogo] = useState(null);
  const [turfName, setTurfName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');

  const [openingTime, setOpeningTime] = useState('06:00 AM');
  const [closingTime, setClosingTime] = useState('11:00 PM');
  const [slotDuration, setSlotDuration] = useState('60');
  const [pickerFor, setPickerFor] = useState(null);

  const [basePrice, setBasePrice] = useState('');
  const [eveningPrice, setEveningPrice] = useState('');
  const [weekendPrice, setWeekendPrice] = useState('');
  const [ballPrice, setBallPrice] = useState('');
  const [weekendEveningPrice, setWeekendEveningPrice] = useState('');

  const [sports, setSports] = useState(DEFAULT_SPORTS);
  const [selectedSports, setSelectedSports] = useState(['Cricket', 'Football']);
  const [amenities, setAmenities] = useState(DEFAULT_AMENITIES);
  const [selectedAmenities, setSelectedAmenities] = useState(['Floodlights', 'Parking', 'Washroom', 'Water']);
  const [turfImages, setTurfImages] = useState([]);
  const [amenitiesEditMode, setAmenitiesEditMode] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchMyTurf());
  }, []);

  const logoDirtyRef = React.useRef(false);

  useEffect(() => {
    if (!turf) return;
    if (!logoDirtyRef.current) {
      setLogo(turf.logo || null);
    }
    setTurfName(turf.name || '');
    setAddress(turf.location?.address || turf.address || '');
    setCity(turf.location?.city || turf.city || '');
    setPinCode(turf.location?.pincode || turf.pinCode || '');
    setOpeningTime(turf.openingTime || '06:00 AM');
    setClosingTime(turf.closingTime || '11:00 PM');
    setSlotDuration(turf.slotDuration || '60');
    setBasePrice(String(turf.basePrice ?? '800'));
    setEveningPrice(String(turf.eveningPrice ?? '1000'));
    setWeekendPrice(String(turf.weekendPrice ?? '1200'));
    setBallPrice(String(turf.ballPrice ?? '50'));
    setWeekendEveningPrice(String(turf.weekendEveningPrice ?? '1400'));
    if (turf.sports?.length) setSports(turf.sports);
    if (turf.selectedSports?.length) setSelectedSports(turf.selectedSports);
    if (turf.amenities?.length) setAmenities(turf.amenities);
    if (turf.selectedAmenities?.length) setSelectedAmenities(turf.selectedAmenities);
    if (turf.images?.length) setTurfImages(turf.images);
  }, [turf]);

  const pickSingleImage = (onPicked) => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, selectionLimit: 1 },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        if (response.assets?.length) {
          logoDirtyRef.current = true;
          onPicked(response.assets[0].uri);
        }
      },
    );
  };

  const pickMultipleImages = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, selectionLimit: 0 },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        if (response.assets?.length) {
          setTurfImages((prev) => [...prev, ...response.assets.map((a) => a.uri)]);
        }
      },
    );
  };

  const handleSaveInfo = async () => {
    if (!turfName.trim() || !address.trim() || !city.trim() || !pinCode.trim()) {
      Alert.alert('Missing Details', 'Please complete all turf address and location fields.');
      return;
    }
    setSaving(true);
    try {
      await dispatch(updateTurfInfo({
        name: turfName.trim(), address: address.trim(), city: city.trim(), pinCode: pinCode.trim(),
        logo: logo && /^(file:|content:)/i.test(logo) ? logo : undefined,
      })).unwrap();
      logoDirtyRef.current = false;
      Alert.alert('Success', 'Basic turf info saved.');
      setActiveTab(1);
    } catch (err) {
      Alert.alert('Save Failed', typeof err === 'string' ? err : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTiming = async () => {
    setSaving(true);
    try {
      await dispatch(updateTurfTiming({ openingTime, closingTime, slotDuration })).unwrap();
      Alert.alert('Success', 'Operating schedule saved.');
      setActiveTab(2);
    } catch (err) {
      Alert.alert('Save Failed', typeof err === 'string' ? err : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      await dispatch(updateTurfPricing({
        basePrice: Number(basePrice), eveningPrice: Number(eveningPrice),
        weekendPrice: Number(weekendPrice), ballPrice: Number(ballPrice),
        weekendEveningPrice: Number(weekendEveningPrice),
      })).unwrap();
      Alert.alert('Success', 'Pricing structure saved.');
      setActiveTab(3);
    } catch (err) {
      Alert.alert('Save Failed', typeof err === 'string' ? err : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAmenities = async () => {
    setSaving(true);
    try {
      await dispatch(updateTurfAmenities({
        sports, amenities, selectedSports, selectedAmenities,
        images: turfImages,
      })).unwrap();
      Alert.alert('Profile Saved', 'Your turf facilities and amenities have been updated.');
      setAmenitiesEditMode(false);
    } catch (err) {
      Alert.alert('Save Failed', typeof err === 'string' ? err : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelected = (list, setList, key) => {
    setList((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Turf Profile & Facilities</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Turf Header Banner Card */}
        <View style={[styles.heroCard, SHADOWS.md]}>
          <TouchableOpacity onPress={() => pickSingleImage(setLogo)} activeOpacity={0.85} style={styles.heroLogoWrap}>
            {logo ? (
              <Image source={{ uri: getImageUrl(logo) }} style={styles.heroLogo} />
            ) : (
              <View style={styles.heroLogoFallback}>
                <Ionicons name="football" size={28} color="#00C566" />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.heroInfo}>
            <View style={styles.liveTagRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>{turf?.status?.toUpperCase() || 'ACTIVE'}</Text>
            </View>
            <Text style={styles.heroTurfName} numberOfLines={1}>{turfName || 'Your Sports Arena'}</Text>
            <Text style={styles.heroCity} numberOfLines={1}>
              <Feather name="map-pin" size={12} color="#94A3B8" /> {city || address || 'Location not specified'}
            </Text>
          </View>
        </View>

        {/* Segmented Tab Pill Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {TABS.map((t, i) => {
            const isActive = activeTab === i;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tabChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.8}
              >
                <Feather name={t.icon} size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.tabChipText, { color: isActive ? '#FFFFFF' : colors.text }]}>{t.title}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab 0: Basic Info */}
        {activeTab === 0 && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Turf Information</Text>

            <Text style={[styles.label, { color: colors.text }]}>Turf Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={turfName}
              onChangeText={setTurfName}
              placeholder="e.g. Green Arena Sports Hub"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Street Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 124 Main Sports Road"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>City</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Chennai"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Postal Pin Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={pinCode}
              onChangeText={(t) => setPinCode(t.replace(/[^0-9]/g, ''))}
              placeholder="600001"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSaveInfo} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>Save & Next</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 1: Timing & Slots */}
        {activeTab === 1 && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Operating Hours</Text>

            <Text style={[styles.label, { color: colors.text }]}>Opening Time</Text>
            <TouchableOpacity
              style={[styles.timeBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setPickerFor('open')}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeBtnText, { color: colors.text }]}>{openingTime}</Text>
              <Feather name="clock" size={16} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Closing Time</Text>
            <TouchableOpacity
              style={[styles.timeBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setPickerFor('close')}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeBtnText, { color: colors.text }]}>{closingTime}</Text>
              <Feather name="clock" size={16} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Standard Slot Duration</Text>
            <View style={styles.slotDurationRow}>
              <TouchableOpacity
                style={[
                  styles.slotDurationBtn,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  slotDuration === '60' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSlotDuration('60')}
                activeOpacity={0.85}
              >
                <Text style={[styles.slotDurationText, { color: slotDuration === '60' ? '#FFFFFF' : colors.text }]}>60 Minutes (1 Hour)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.slotDurationBtn,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  slotDuration === '30' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSlotDuration('30')}
                activeOpacity={0.85}
              >
                <Text style={[styles.slotDurationText, { color: slotDuration === '30' ? '#FFFFFF' : colors.text }]}>30 Minutes</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSaveTiming} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>Save & Next</Text>}
            </TouchableOpacity>

            <TimePickerModal
              visible={pickerFor !== null}
              initial={pickerFor === 'open' ? openingTime : closingTime}
              onClose={() => setPickerFor(null)}
              onSelect={(val) => (pickerFor === 'open' ? setOpeningTime(val) : setClosingTime(val))}
              colors={colors}
              styles={styles}
            />
          </View>
        )}

        {/* Tab 2: Pricing */}
        {activeTab === 2 && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Hourly Rates (₹)</Text>

            <Text style={[styles.label, { color: colors.text }]}>Base Price (Regular Hours)</Text>
            <View style={[styles.priceInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput style={[styles.priceTextInput, { color: colors.text }]} value={basePrice} onChangeText={setBasePrice} keyboardType="numeric" placeholder="800" placeholderTextColor={colors.textSecondary} />
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Evening Price (After 6 PM)</Text>
            <View style={[styles.priceInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput style={[styles.priceTextInput, { color: colors.text }]} value={eveningPrice} onChangeText={setEveningPrice} keyboardType="numeric" placeholder="1000" placeholderTextColor={colors.textSecondary} />
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Weekend Price</Text>
            <View style={[styles.priceInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput style={[styles.priceTextInput, { color: colors.text }]} value={weekendPrice} onChangeText={setWeekendPrice} keyboardType="numeric" placeholder="1200" placeholderTextColor={colors.textSecondary} />
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Equipment / Ball Addon Price</Text>
            <View style={[styles.priceInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput style={[styles.priceTextInput, { color: colors.text }]} value={ballPrice} onChangeText={setBallPrice} keyboardType="numeric" placeholder="50" placeholderTextColor={colors.textSecondary} />
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSavePricing} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>Save & Next</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 3: Sports & Amenities */}
        {activeTab === 3 && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Sports Offered</Text>
            <View style={styles.chipGrid}>
              {sports.map((s) => {
                const isSelected = selectedSports.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.sportPill,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => toggleSelected(selectedSports, setSelectedSports, s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sportPillText, { color: isSelected ? '#FFFFFF' : colors.text }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 22 }]}>Turf Amenities</Text>
            <View style={styles.chipGrid}>
              {amenities.map((a) => {
                const isSelected = selectedAmenities.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    style={[
                      styles.sportPill,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => toggleSelected(selectedAmenities, setSelectedAmenities, a)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sportPillText, { color: isSelected ? '#FFFFFF' : colors.text }]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.imagesHeaderRow}>
              <Text style={[styles.cardTitle, { color: colors.text, marginTop: 22 }]}>Gallery Photos</Text>
              <TouchableOpacity style={styles.addPhotosBtn} onPress={pickMultipleImages} activeOpacity={0.7}>
                <Feather name="plus-circle" size={15} color={colors.primary} />
                <Text style={[styles.addPhotosText, { color: colors.primary }]}>Add Photos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.imageGalleryGrid}>
              {turfImages.map((uri, idx) => (
                <View key={`${uri}-${idx}`} style={styles.galleryItem}>
                  <Image source={{ uri: getImageUrl(uri) }} style={styles.galleryThumb} />
                  <TouchableOpacity
                    style={styles.galleryRemoveBtn}
                    onPress={() => setTurfImages((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Feather name="x" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSaveAmenities} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>Save Turf Profile</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 40,
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 16,
  },
  heroLogoWrap: {
    position: 'relative',
    marginRight: 14,
  },
  heroLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  heroLogoFallback: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00C566',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  heroInfo: {
    flex: 1,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C566',
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00C566',
    letterSpacing: 0.5,
  },
  heroTurfName: {
    fontSize: SIZES.base + 1,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroCity: {
    fontSize: SIZES.xs,
    color: '#94A3B8',
    marginTop: 2,
  },

  tabScroll: {
    marginBottom: 16,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabChipText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  formCard: {
    borderRadius: SIZES.radiusLg,
    padding: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginBottom: 12,
  },
  label: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderRadius: SIZES.radius,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: SIZES.sm,
  },
  timeBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  slotDurationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  slotDurationBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1,
  },
  slotDurationText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  rupeeSign: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: '#00C566',
    marginRight: 8,
  },
  priceTextInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sportPillText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  imagesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addPhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 22,
  },
  addPhotosText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
  imageGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  galleryItem: {
    position: 'relative',
  },
  galleryThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  galleryRemoveBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    marginTop: 24,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginBottom: 10,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  timeOptionText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
});

export default TurfProfileScreen;