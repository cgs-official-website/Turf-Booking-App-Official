// @theme-ready ✅
import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addTurf, clearSuccessMessage } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const SPORTS_LIST = ['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Volleyball', 'Hockey'];
const AMENITIES_LIST = ['Floodlights', 'Parking', 'Changing Room', 'Shower', 'Drinking Water', 'WiFi', 'First Aid'];

const AddTurfScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error, successMessage } = useSelector((s) => s.vendor);
  const { colors, isDark } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pricePerHour: '',
    description: '',
    sports: ['Football', 'Cricket'],
    amenities: ['Floodlights', 'Parking', 'Drinking Water'],
    openTime: '06:00',
    closeTime: '23:00',
  });

  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (successMessage) {
      Alert.alert('Turf Added', successMessage);
      dispatch(clearSuccessMessage());
      navigation.goBack();
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      Alert.alert('Submission Error', typeof error === 'string' ? error : 'Failed to add turf. Please check details.');
    }
  }, [error]);

  const set = (k) => (v) => setForm((prev) => ({ ...prev, [k]: v }));

  const toggleItem = (key, item) => {
    const list = form[key] || [];
    setForm((prev) => ({
      ...prev,
      [key]: list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.address.trim() || !form.pricePerHour.trim()) {
      Alert.alert('Required Fields', 'Please fill in turf name, street address, and price per hour.');
      return;
    }
    if ((form.sports || []).length === 0) {
      Alert.alert('Sports Required', 'Please select at least one sport available at your turf.');
      return;
    }

    dispatch(addTurf({
      name: form.name.trim(),
      location: {
        address: form.address.trim(),
        city: form.city.trim() || 'City',
        state: form.state.trim() || 'State',
      },
      pricePerHour: parseFloat(form.pricePerHour) || 800,
      description: form.description.trim(),
      sports: form.sports,
      amenities: form.amenities,
      operatingHours: { open: form.openTime, close: form.closeTime },
    }));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Navbar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Add New Turf</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Basic Info Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

            <Text style={[styles.label, { color: colors.text }]}>Turf Name *</Text>
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'name' ? colors.primary : colors.border },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Greenfield Sports Arena"
                placeholderTextColor={colors.textSecondary}
                value={form.name}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onChangeText={set('name')}
              />
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Base Price per Hour (₹) *</Text>
            <View
              style={[
                styles.priceInputWrap,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'price' ? colors.primary : colors.border },
              ]}
            >
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="800"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={form.pricePerHour}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
                onChangeText={set('pricePerHour')}
              />
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Turf Description</Text>
            <View
              style={[
                styles.textAreaWrap,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'desc' ? colors.primary : colors.border },
              ]}
            >
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="Tell players about your turf grass quality, lighting, and pitch dimensions..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={form.description}
                onFocus={() => setFocusedField('desc')}
                onBlur={() => setFocusedField(null)}
                onChangeText={set('description')}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Location Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Turf Location</Text>

            <Text style={[styles.label, { color: colors.text }]}>Street / Area Address *</Text>
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'address' ? colors.primary : colors.border },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. 45 Turf Road, Anna Nagar"
                placeholderTextColor={colors.textSecondary}
                value={form.address}
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField(null)}
                onChangeText={set('address')}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>City</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Chennai"
                    placeholderTextColor={colors.textSecondary}
                    value={form.city}
                    onChangeText={set('city')}
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>State</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Tamil Nadu"
                    placeholderTextColor={colors.textSecondary}
                    value={form.state}
                    onChangeText={set('state')}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Sports Offered Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sports Available *</Text>
            <View style={styles.chipGrid}>
              {SPORTS_LIST.map((sport) => {
                const isSelected = (form.sports || []).includes(sport);
                return (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => toggleItem('sports', sport)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>{sport}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 18 }]}>Amenities</Text>
            <View style={styles.chipGrid}>
              {AMENITIES_LIST.map((amenity) => {
                const isSelected = (form.amenities || []).includes(amenity);
                return (
                  <TouchableOpacity
                    key={amenity}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => toggleItem('amenities', amenity)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>{amenity}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Operating Hours Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Operating Hours</Text>
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Opening Time</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="06:00"
                    placeholderTextColor={colors.textSecondary}
                    value={form.openTime}
                    onChangeText={set('openTime')}
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Closing Time</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="23:00"
                    placeholderTextColor={colors.textSecondary}
                    value={form.closeTime}
                    onChangeText={set('closeTime')}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Submit CTA */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.75 }, SHADOWS.sm]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="plus-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Submit Turf for Review</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
    gap: 14,
  },

  card: {
    borderRadius: SIZES.radiusLg,
    padding: 18,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: SIZES.sm + 1,
    fontWeight: '800',
    marginBottom: 12,
  },
  label: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrap: {
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 46,
    justifyContent: 'center',
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 46,
  },
  rupeeSign: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: '#00C566',
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: SIZES.sm,
    paddingVertical: 0,
  },
  textAreaWrap: {
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    padding: 10,
  },
  textArea: {
    fontSize: SIZES.sm,
    minHeight: 70,
  },

  rowInputs: {
    flexDirection: 'row',
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 15,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default AddTurfScreen;