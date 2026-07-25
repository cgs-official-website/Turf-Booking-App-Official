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

const SPORTS_LIST = ['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Volleyball', 'Hockey'];
const AMENITIES_LIST = ['Parking', 'Changing Room', 'Shower', 'Floodlights', 'Cafeteria', 'WiFi', 'First Aid'];

const AddTurfScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error, successMessage } = useSelector((s) => s.vendor);
  
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Update Header Colors based on Theme (White section fix machii!)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      headerTintColor: colors.text,
      headerTitleStyle: {
        color: colors.text,
      },
    });
  }, [navigation, colors]);

  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '',
    pricePerHour: '', description: '',
    sports: [], amenities: [],
    openTime: '06:00', closeTime: '22:00',
  });

  useEffect(() => {
    if (successMessage) {
      Alert.alert('Success', successMessage);
      dispatch(clearSuccessMessage());
      navigation.goBack();
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) { Alert.alert('Error', error); }
  }, [error]);

  const set = (k) => (v) => setForm({ ...form, [k]: v });

  const toggleItem = (key, item) => {
    const list = form[key];
    setForm({
      ...form,
      [key]: list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
    });
  };

  const handleSubmit = () => {
    if (!form.name || !form.address || !form.pricePerHour || form.sports.length === 0) {
      Alert.alert('Error', 'Please fill name, address, price and select at least one sport');
      return;
    }
    dispatch(addTurf({
      name: form.name,
      location: { address: form.address, city: form.city, state: form.state },
      pricePerHour: parseFloat(form.pricePerHour),
      description: form.description,
      sports: form.sports,
      amenities: form.amenities,
      operatingHours: { open: form.openTime, close: form.closeTime },
    }));
  };

  const ToggleGroup = ({ label, items, selected, onToggle }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.toggleRow}>
        {items.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, selected.includes(item) && styles.chipActive]}
            onPress={() => onToggle(item)}
          >
            <Text style={[styles.chipText, selected.includes(item) && styles.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, SHADOWS.sm]}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Text style={styles.label}>Turf Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Green Field Turf" placeholderTextColor={colors.textSecondary} value={form.name} onChangeText={set('name')} />

          <Text style={styles.label}>Price per Hour (₹) *</Text>
          <TextInput style={styles.input} placeholder="e.g. 800" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={form.pricePerHour} onChangeText={set('pricePerHour')} />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe your turf..."
            placeholderTextColor={colors.textSecondary}
            multiline numberOfLines={4}
            value={form.description}
            onChangeText={set('description')}
          />
        </View>

        <View style={[styles.card, SHADOWS.sm]}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.label}>Street Address *</Text>
          <TextInput style={styles.input} placeholder="Street / Area" placeholderTextColor={colors.textSecondary} value={form.address} onChangeText={set('address')} />
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} placeholder="City" placeholderTextColor={colors.textSecondary} value={form.city} onChangeText={set('city')} />
          <Text style={styles.label}>State</Text>
          <TextInput style={styles.input} placeholder="State" placeholderTextColor={colors.textSecondary} value={form.state} onChangeText={set('state')} />
        </View>

        <View style={[styles.card, SHADOWS.sm]}>
          <Text style={styles.sectionTitle}>Sports & Amenities</Text>
          <ToggleGroup label="Sports Available *" items={SPORTS_LIST} selected={form.sports} onToggle={(i) => toggleItem('sports', i)} />
          <ToggleGroup label="Amenities" items={AMENITIES_LIST} selected={form.amenities} onToggle={(i) => toggleItem('amenities', i)} />
        </View>

        <View style={[styles.card, SHADOWS.sm]}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Open Time</Text>
              <TextInput style={styles.input} placeholder="06:00" placeholderTextColor={colors.textSecondary} value={form.openTime} onChangeText={set('openTime')} />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Close Time</Text>
              <TextInput style={styles.input} placeholder="22:00" placeholderTextColor={colors.textSecondary} value={form.closeTime} onChangeText={set('closeTime')} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.submitText}>Submit for Review</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: SIZES.padding, paddingBottom: 40, gap: 14 },
  card: { backgroundColor: colors.card || colors.background, borderRadius: SIZES.radius, padding: 16 },
  sectionTitle: { fontSize: SIZES.base, fontWeight: '700', color: colors.text, marginBottom: 12 },
  label: { fontSize: SIZES.sm, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: colors.inputBg || colors.border, borderRadius: SIZES.radius,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: SIZES.base, color: colors.text,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.inputBg || colors.background, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: SIZES.sm, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.onAccent },
  timeRow: { flexDirection: 'row' },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: SIZES.radius,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitText: { color: colors.onAccent, fontSize: SIZES.base, fontWeight: '700' },
});

export default AddTurfScreen;