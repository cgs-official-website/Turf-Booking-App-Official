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
import Icon from '../components/Icon';
import Feather from 'react-native-vector-icons/Feather';

const TABS = ['Turf Info', 'Turf Time', 'Price', 'Amenities'];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  let h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
});

const SPORT_ICON = { Cricket: 'cricket', Football: 'soccer' };
const DEFAULT_SPORTS = [
  { key: 'Cricket', icon: 'cricket' },
  { key: 'Football', icon: 'soccer' },
];
const DEFAULT_AMENITIES = [
  { key: 'Floodlights', icon: 'floor-lamp' },
  { key: 'Parking', icon: 'parking' },
  { key: 'CCTV', icon: 'cctv' },
  { key: 'Washroom', icon: 'human-male-female' },
  { key: 'Water', icon: 'water' },
  { key: 'Seating', icon: 'seat' },
];

const TimePickerModal = ({ visible, initial, onClose, onSelect, colors, styles }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Select time</Text>
        <FlatList
          data={TIME_OPTIONS}
          keyExtractor={(t) => t}
          initialNumToRender={48}
          style={{ maxHeight: 320 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.timeOption, item === initial && styles.timeOptionActive]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[styles.timeOptionText, item === initial && styles.timeOptionTextActive]}>{item}</Text>
              {item === initial && <Icon name="check" size={16} color={colors.primary} />}
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const AddItemModal = ({ visible, title, onClose, onAdd, colors, styles }) => {
  const [value, setValue] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.addItemSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TextInput
            style={styles.addItemInput}
            placeholder="Enter name"
            placeholderTextColor={colors.textLight || colors.textSecondary}
            value={value}
            onChangeText={setValue}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={styles.modalCancelBtnSmall} onPress={() => { setValue(''); onClose(); }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalAddBtn}
              onPress={() => {
                if (!value.trim()) return;
                onAdd(value.trim());
                setValue('');
                onClose();
              }}
            >
              <Text style={styles.modalAddBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TurfHeaderCard = ({ turf, onEditLogo, onEditLocation, colors, styles }) => (
  <View style={styles.headerCard}>
    <TouchableOpacity onPress={onEditLogo} activeOpacity={0.85} style={styles.headerLogoWrap}>
      {turf.logo ? (
        <Image source={{ uri: getImageUrl(turf.logo) }} style={styles.headerLogo} />
      ) : (
        <View style={styles.headerLogoFallback}>
          <Icon name="image" size={20} color={colors.onAccent || '#FFFFFF'} />
        </View>
      )}
      <View style={styles.headerLogoEditBadge}>
        <Icon name="edit-2" size={11} color={colors.text} />
      </View>
    </TouchableOpacity>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{turf.status || 'ACTIVE'}</Text>
      </View>
      <Text style={styles.headerName} numberOfLines={1}>{turf.name || 'Your Turf'}</Text>
      <TouchableOpacity style={styles.locationRow} onPress={onEditLocation} activeOpacity={0.7}>
        <Feather name="map-pin" size={12} color="rgba(255,255,255,0.8)" />
        <Text style={styles.locationText} numberOfLines={1}>{turf.city ? `${turf.city}` : 'Add location'}</Text>
      </TouchableOpacity>
    </View>
  </View>
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
  const [closingTime, setClosingTime] = useState('06:00 PM');
  const [slotDuration, setSlotDuration] = useState('60');
  const [pickerFor, setPickerFor] = useState(null);

  const [basePrice, setBasePrice] = useState('');
  const [eveningPrice, setEveningPrice] = useState('');
  const [weekendPrice, setWeekendPrice] = useState('');
  const [ballPrice, setBallPrice] = useState('');
  const [weekendEveningPrice, setWeekendEveningPrice] = useState('');

  const [sports, setSports] = useState(DEFAULT_SPORTS.map((s) => s.key));
  const [amenities, setAmenities] = useState(DEFAULT_AMENITIES.map((a) => a.key));
  const [selectedSports, setSelectedSports] = useState(['Cricket', 'Football']);
  const [selectedAmenities, setSelectedAmenities] = useState(DEFAULT_AMENITIES.map((a) => a.key));
  const [turfImages, setTurfImages] = useState([]);
  const [amenitiesEditMode, setAmenitiesEditMode] = useState(false);
  const [addModal, setAddModal] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
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
    setClosingTime(turf.closingTime || '06:00 PM');
    setSlotDuration(turf.slotDuration || '60');
    setBasePrice(String(turf.basePrice ?? ''));
    setEveningPrice(String(turf.eveningPrice ?? ''));
    setWeekendPrice(String(turf.weekendPrice ?? ''));
    setBallPrice(String(turf.ballPrice ?? ''));
    setWeekendEveningPrice(String(turf.weekendEveningPrice ?? ''));
    if (turf.sports?.length) setSports(turf.sports);
    if (turf.selectedSports?.length) setSelectedSports(turf.selectedSports);
    if (turf.amenities?.length) setAmenities(turf.amenities);
    if (turf.selectedAmenities?.length) setSelectedAmenities(turf.selectedAmenities);
    if (turf.images?.length) setTurfImages(turf.images);
  }, [turf]);

  const headerTurf = { logo, name: turfName, city: city || address, status: turf?.status || 'ACTIVE' };

  const pickSingleImage = (onPicked) => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, selectionLimit: 1 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Permission needed', response.errorMessage || 'Please allow photo library access.');
          return;
        }
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
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Permission needed', response.errorMessage || 'Please allow photo library access.');
          return;
        }
        if (response.assets?.length) {
          setTurfImages((prev) => [...prev, ...response.assets.map((a) => a.uri)]);
        }
      },
    );
  };

  const handlePickLocation = () => {
    navigation.navigate('LocationSearch', { returnTo: 'TurfProfile' });
  };

  useEffect(() => {
    const picked = route?.params?.pickedLocation;
    if (!picked) return;
    setAddress(picked.address || '');
    setCity(picked.city || '');
    if (picked.pinCode) setPinCode(picked.pinCode);
    navigation.setParams({ pickedLocation: undefined });
  }, [route?.params?.pickedLocation]);

  const goNextTab = () => setActiveTab((t) => Math.min(t + 1, TABS.length - 1));

  const handleSaveInfo = async () => {
    if (!turfName.trim() || !address.trim() || !city.trim() || !pinCode.trim()) {
      Alert.alert('Missing details', 'Please fill in all fields before continuing.');
      return;
    }
    if (!/^\d{6}$/.test(pinCode.trim())) {
      Alert.alert('Invalid pin code', 'Pin code must be 6 digits.');
      return;
    }
    setSaving(true);
    try {
      await dispatch(updateTurfInfo({
        name: turfName.trim(), address: address.trim(), city: city.trim(), pinCode: pinCode.trim(),
        logo: logo && /^(file:|content:)/i.test(logo) ? logo : undefined,
      })).unwrap();
      logoDirtyRef.current = false;
      goNextTab();
    } catch (err) {
      Alert.alert('Save failed', typeof err === 'string' ? err : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTiming = async () => {
    setSaving(true);
    try {
      await dispatch(updateTurfTiming({ openingTime, closingTime, slotDuration })).unwrap();
      goNextTab();
    } catch (err) {
      Alert.alert('Save failed', typeof err === 'string' ? err : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async () => {
    const values = { basePrice, eveningPrice, weekendPrice, ballPrice, weekendEveningPrice };
    const invalid = Object.entries(values).some(([, v]) => v === '' || isNaN(Number(v)) || Number(v) < 0);
    if (invalid) {
      Alert.alert('Invalid pricing', 'Please enter valid numbers for all price fields.');
      return;
    }
    setSaving(true);
    try {
      await dispatch(updateTurfPricing({
        basePrice: Number(basePrice), eveningPrice: Number(eveningPrice),
        weekendPrice: Number(weekendPrice), ballPrice: Number(ballPrice),
        weekendEveningPrice: Number(weekendEveningPrice),
      })).unwrap();
      goNextTab();
    } catch (err) {
      Alert.alert('Save failed', typeof err === 'string' ? err : 'Please try again.');
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
      Alert.alert('Saved', 'Your turf profile has been updated.');
      setAmenitiesEditMode(false);
    } catch (err) {
      Alert.alert('Save failed', typeof err === 'string' ? err : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelected = (list, setList, key) => {
    setList((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  if (loading && !turf) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1, marginTop: 60, backgroundColor: colors.background }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turf Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TurfHeaderCard turf={headerTurf} onEditLogo={() => pickSingleImage(setLogo)} onEditLocation={handlePickLocation} colors={colors} styles={styles} />

        <View style={styles.tabBar}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, activeTab === i && styles.tabBtnActive]}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === i && styles.tabBtnTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 0 && (
          <View>
            <Text style={styles.sectionTitle}>Basic information</Text>

            <Text style={styles.label}>Turf name</Text>
            <TextInput
              style={styles.input}
              value={turfName}
              onChangeText={setTurfName}
              placeholder="Greenfield Turf Arena"
              placeholderTextColor={colors.textLight || colors.textSecondary}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Chennai"
              placeholderTextColor={colors.textLight || colors.textSecondary}
            />

            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="RS Puram"
              placeholderTextColor={colors.textLight || colors.textSecondary}
            />

            <Text style={styles.label}>Pin code</Text>
            <TextInput
              style={styles.input}
              value={pinCode}
              onChangeText={(t) => setPinCode(t.replace(/[^0-9]/g, ''))}
              placeholder="638113"
              placeholderTextColor={colors.textLight || colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveInfo} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color={colors.onAccent || '#FFFFFF'} /> : <Text style={styles.primaryBtnText}>Save & Next</Text>}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Turf time</Text>

            <Text style={styles.labelCaps}>OPENING TIME</Text>
            <TouchableOpacity style={styles.timeField} onPress={() => setPickerFor('open')} activeOpacity={0.8}>
              <Text style={styles.timeFieldText}>{openingTime}</Text>
              <Feather name="edit-2" size={15} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.labelCaps, { marginTop: 16 }]}>CLOSING TIME</Text>
            <TouchableOpacity style={styles.timeField} onPress={() => setPickerFor('close')} activeOpacity={0.8}>
              <Text style={styles.timeFieldText}>{closingTime}</Text>
              <Feather name="edit-2" size={15} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.slotCard, SHADOWS.sm]}>
              <View style={styles.slotHeaderRow}>
                <Feather name="clock" size={16} color={colors.primary} />
                <Text style={styles.slotHeaderTitle}>Slot Duration</Text>
              </View>
              <Text style={styles.slotHeaderSub}>Select the Slot Duration</Text>
              <View style={styles.slotOptionsRow}>
                <TouchableOpacity
                  style={[styles.slotOption, slotDuration === '60' && styles.slotOptionActive]}
                  onPress={() => setSlotDuration('60')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.slotOptionText, slotDuration === '60' && styles.slotOptionTextActive]}>1 hours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.slotOption, slotDuration === '30' && styles.slotOptionActive]}
                  onPress={() => setSlotDuration('30')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.slotOptionText, slotDuration === '30' && styles.slotOptionTextActive]}>30 Min</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveTiming} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color={colors.onAccent || '#FFFFFF'} /> : <Text style={styles.primaryBtnText}>Save & Next</Text>}
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

        {activeTab === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Price Details</Text>

            <Text style={styles.label}>Base Price (per hour)</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceInput}
                value={basePrice}
                onChangeText={setBasePrice}
                keyboardType="decimal-pad"
                placeholder="100.00"
                placeholderTextColor={colors.textLight || colors.textSecondary}
              />
            </View>

            <Text style={styles.label}>Evening Price (After 6 PM)</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceInput}
                value={eveningPrice}
                onChangeText={setEveningPrice}
                keyboardType="decimal-pad"
                placeholder="100"
                placeholderTextColor={colors.textLight || colors.textSecondary}
              />
            </View>

            <Text style={styles.label}>Weekend Price</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceInput}
                value={weekendPrice}
                onChangeText={setWeekendPrice}
                keyboardType="decimal-pad"
                placeholder="100"
                placeholderTextColor={colors.textLight || colors.textSecondary}
              />
            </View>

            <Text style={styles.label}>Ball price</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceInput}
                value={ballPrice}
                onChangeText={setBallPrice}
                keyboardType="decimal-pad"
                placeholder="80"
                placeholderTextColor={colors.textLight || colors.textSecondary}
              />
            </View>

            <Text style={styles.label}>Weekend Evening (After 6 PM)</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.priceInput}
                value={weekendEveningPrice}
                onChangeText={setWeekendEveningPrice}
                keyboardType="decimal-pad"
                placeholder="100"
                placeholderTextColor={colors.textLight || colors.textSecondary}
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSavePricing} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color={colors.onAccent || '#FFFFFF'} /> : <Text style={styles.primaryBtnText}>Save & Next</Text>}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Available sport</Text>
            <View style={styles.chipGrid}>
              {sports.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chipBox, selectedSports.includes(s) && styles.chipBoxActive]}
                  onPress={() => toggleSelected(selectedSports, setSelectedSports, s)}
                  activeOpacity={0.8}
                >
                  <Icon family="mci" name={SPORT_ICON[s] || 'run'} size={18} color={selectedSports.includes(s) ? (colors.onAccent || '#FFFFFF') : colors.text} />
                  <Text style={[styles.chipBoxText, selectedSports.includes(s) && styles.chipBoxTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.chipBoxAdd} onPress={() => setAddModal('sport')} activeOpacity={0.8}>
                <Feather name="plus" size={18} color={colors.textSecondary} />
                <Text style={styles.chipBoxAddText}>Add new</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Amenities</Text>
            <View style={styles.chipGrid}>
              {amenities.map((a) => {
                const amenityDef = DEFAULT_AMENITIES.find((d) => d.key === a);
                const active = selectedAmenities.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chipBox, active && styles.chipBoxActive]}
                    onPress={() => toggleSelected(selectedAmenities, setSelectedAmenities, a)}
                    activeOpacity={0.8}
                  >
                    <Icon family="mci" name={amenityDef?.icon || 'check-circle'} size={18} color={active ? (colors.onAccent || '#FFFFFF') : colors.text} />
                    <Text style={[styles.chipBoxText, active && styles.chipBoxTextActive]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.chipBoxAdd} onPress={() => setAddModal('amenity')} activeOpacity={0.8}>
                <Feather name="plus" size={18} color={colors.textSecondary} />
                <Text style={styles.chipBoxAddText}>Add new</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.imagesHeaderRow}>
              <Text style={styles.sectionTitle}>Turf Images</Text>
              <TouchableOpacity style={styles.editImagesBtn} onPress={() => setAmenitiesEditMode((v) => !v)} activeOpacity={0.8}>
                <Feather name="edit-2" size={13} color={colors.primary} />
                <Text style={styles.editImagesBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.imageGrid}>
              {turfImages.map((uri, idx) => (
                <View key={`${uri}-${idx}`} style={styles.imageItemWrap}>
                  <Image source={{ uri: getImageUrl(uri) }} style={styles.imageItem} />
                  {amenitiesEditMode && (
                    <TouchableOpacity
                      style={styles.imageRemoveBtn}
                      onPress={() => setTurfImages((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Feather name="x" size={12} color={colors.onAccent || '#FFFFFF'} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {amenitiesEditMode && (
                <TouchableOpacity style={styles.imageAddBox} onPress={pickMultipleImages} activeOpacity={0.8}>
                  <Feather name="plus" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveAmenities} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color={colors.onAccent || '#FFFFFF'} /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
            </TouchableOpacity>

            <AddItemModal
              visible={addModal === 'sport'}
              title="Add a sport"
              onClose={() => setAddModal(null)}
              onAdd={(val) => {
                setSports((prev) => (prev.includes(val) ? prev : [...prev, val]));
                setSelectedSports((prev) => (prev.includes(val) ? prev : [...prev, val]));
              }}
              colors={colors}
              styles={styles}
            />
            <AddItemModal
              visible={addModal === 'amenity'}
              title="Add an amenity"
              onClose={() => setAddModal(null)}
              onAdd={(val) => {
                setAmenities((prev) => (prev.includes(val) ? prev : [...prev, val]));
                setSelectedAmenities((prev) => (prev.includes(val) ? prev : [...prev, val]));
              }}
              colors={colors}
              styles={styles}
            />
          </View>
        )}
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
  content: { paddingHorizontal: SIZES.padding, paddingBottom: 50, paddingTop: 14 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.isDark ? '#064E3B' : '#0F5132',
    borderRadius: SIZES.radiusLg, padding: 16, marginBottom: 18,
  },
  headerLogoWrap: { position: 'relative' },
  headerLogo: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.card || colors.background },
  headerLogoFallback: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogoEditBadge: {
    position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.card || '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  statusText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  headerName: { fontSize: SIZES.lg, fontWeight: '800', color: '#FFFFFF' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  locationText: { fontSize: SIZES.xs, color: 'rgba(255,255,255,0.8)' },

  tabBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card || colors.background,
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontSize: SIZES.sm, fontWeight: '600', color: colors.text },
  tabBtnTextActive: { color: colors.onAccent || '#FFFFFF' },

  sectionTitle: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text, marginBottom: 14 },
  label: { fontSize: SIZES.sm, color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  labelCaps: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: colors.card || colors.background, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 48, fontSize: SIZES.base, color: colors.text, marginBottom: 4,
  },

  timeField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card || colors.background, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 48,
  },
  timeFieldText: { fontSize: SIZES.base, fontWeight: '600', color: colors.text },
  slotCard: { backgroundColor: colors.card || colors.background, borderRadius: SIZES.radiusLg, padding: 16, marginTop: 20 },
  slotHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotHeaderTitle: { fontSize: SIZES.base, fontWeight: '700', color: colors.text },
  slotHeaderSub: { fontSize: SIZES.xs, color: colors.textSecondary, marginTop: 2, marginBottom: 14 },
  slotOptionsRow: { flexDirection: 'row', gap: 12 },
  slotOption: {
    flex: 1, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, alignItems: 'center', backgroundColor: colors.background,
  },
  slotOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotOptionText: { fontSize: SIZES.base, fontWeight: '700', color: colors.text },
  slotOptionTextActive: { color: colors.onAccent || '#FFFFFF' },

  priceInputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card || colors.background,
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 48, marginBottom: 4,
  },
  rupee: { fontSize: SIZES.base, color: colors.textSecondary, marginRight: 6 },
  priceInput: { flex: 1, fontSize: SIZES.base, color: colors.text },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chipBox: {
    width: 96, height: 76, borderRadius: SIZES.radius, backgroundColor: colors.card || colors.background,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  chipBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipBoxText: { fontSize: SIZES.xs, fontWeight: '600', color: colors.text },
  chipBoxTextActive: { color: colors.onAccent || '#FFFFFF' },
  chipBoxAdd: {
    width: 96, height: 76, borderRadius: SIZES.radius, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  chipBoxAddText: { fontSize: SIZES.xs, fontWeight: '600', color: colors.textSecondary },

  imagesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  editImagesBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  editImagesBtnText: { fontSize: SIZES.sm, fontWeight: '700', color: colors.primary },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  imageItemWrap: { position: 'relative' },
  imageItem: { width: 96, height: 96, borderRadius: SIZES.radius, backgroundColor: colors.border },
  imageRemoveBtn: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center',
  },
  imageAddBox: {
    width: 96, height: 96, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background,
  },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: SIZES.radiusLg,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  primaryBtnText: { color: colors.onAccent || '#FFFFFF', fontWeight: '700', fontSize: SIZES.base },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card || colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text, marginBottom: 10 },
  timeOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  timeOptionActive: { backgroundColor: colors.isDark ? '#064E3B' : '#D1FAE5', borderRadius: 8 },
  timeOptionText: { fontSize: SIZES.base, color: colors.text },
  timeOptionTextActive: { color: colors.primary, fontWeight: '700' },
  modalCancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { fontSize: SIZES.base, fontWeight: '700', color: colors.textSecondary },

  addItemSheet: { backgroundColor: colors.card || colors.background, borderRadius: SIZES.radiusLg, padding: 20, marginHorizontal: 24, marginBottom: 'auto', marginTop: 'auto' },
  addItemInput: {
    backgroundColor: colors.background, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 46, fontSize: SIZES.base, color: colors.text, marginTop: 10,
  },
  modalCancelBtnSmall: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: SIZES.radius, backgroundColor: colors.background },
  modalAddBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: SIZES.radius, backgroundColor: colors.primary },
  modalAddBtnText: { color: colors.onAccent || '#FFFFFF', fontWeight: '700' },
});

export default TurfProfileScreen;