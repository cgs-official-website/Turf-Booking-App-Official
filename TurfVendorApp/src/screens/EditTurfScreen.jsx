// @theme-ready ✅
import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTurfById, updateTurf, clearSuccessMessage } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const SPORTS_LIST = ['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Volleyball', 'Hockey'];
const AMENITIES_LIST = ['Parking', 'Changing Room', 'Shower', 'Floodlights', 'Cafeteria', 'WiFi', 'First Aid'];

const EditTurfScreen = ({ route, navigation }) => {
  const { turfId } = route.params;
  const dispatch = useDispatch();
  const { selectedTurf: turf, loading, error, successMessage } = useSelector((s) => s.vendor);
  
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  
  const [form, setForm] = useState(null);

  // Update Header Colors to fix the white space
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
        fontWeight: '700',
      },
    });
  }, [navigation, colors]);

  useEffect(() => { dispatch(fetchTurfById(turfId)); }, [turfId]);

  useEffect(() => {
    if (turf) {
      setForm({
        name: turf.name || '',
        address: turf.location?.address || '',
        city: turf.location?.city || '',
        state: turf.location?.state || '',
        pricePerHour: String(turf.pricePerHour || ''),
        description: turf.description || '',
        sports: turf.sports || [],
        amenities: turf.amenities || [],
        openTime: turf.operatingHours?.open || '06:00',
        closeTime: turf.operatingHours?.close || '22:00',
      });
    }
  }, [turf]);

  useEffect(() => {
    if (successMessage) {
      Alert.alert('Updated!', successMessage);
      dispatch(clearSuccessMessage());
      navigation.goBack();
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) Alert.alert('Error', error);
  }, [error]);

  if (!form) return <ActivityIndicator color={colors.primary} style={{ flex: 1, marginTop: 40, backgroundColor: colors.background }} />;

  const set = (k) => (v) => setForm({ ...form, [k]: v });
  
  const toggleItem = (key, item) => {
    const list = form[key];
    setForm({ ...form, [key]: list.includes(item) ? list.filter(i => i !== item) : [...list, item] });
  };

  const handleUpdate = () => {
    dispatch(updateTurf({
      id: turfId,
      data: {
        name: form.name,
        location: { address: form.address, city: form.city, state: form.state },
        pricePerHour: parseFloat(form.pricePerHour),
        description: form.description,
        sports: form.sports,
        amenities: form.amenities,
        operatingHours: { open: form.openTime, close: form.closeTime },
      },
    }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* Basic Info */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Feather name="info" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Basic Info</Text>
          </View>
          
          <Text style={styles.label}>Turf Name</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholderTextColor={colors.textSecondary} />
          
          <Text style={styles.label}>Price/Hour (₹)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={form.pricePerHour} onChangeText={set('pricePerHour')} placeholderTextColor={colors.textSecondary} />
          
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={4} value={form.description} onChangeText={set('description')} placeholderTextColor={colors.textSecondary} />
        </View>

        {/* Location */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={form.address} onChangeText={set('address')} placeholderTextColor={colors.textSecondary} />
          
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={form.city} onChangeText={set('city')} placeholderTextColor={colors.textSecondary} />
          
          <Text style={styles.label}>State</Text>
          <TextInput style={styles.input} value={form.state} onChangeText={set('state')} placeholderTextColor={colors.textSecondary} />
        </View>

        {/* Sports & Amenities */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Feather name="activity" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Sports & Amenities</Text>
          </View>

          <Text style={[styles.label, { marginTop: 4 }]}>Available Sports</Text>
          <View style={styles.toggleRow}>
            {SPORTS_LIST.map(item => (
              <TouchableOpacity key={item} style={[styles.chip, form.sports.includes(item) && styles.chipActive]} onPress={() => toggleItem('sports', item)}>
                <Text style={[styles.chipText, form.sports.includes(item) && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={[styles.label, { marginTop: 20 }]}>Available Amenities</Text>
          <View style={styles.toggleRow}>
            {AMENITIES_LIST.map(item => (
              <TouchableOpacity key={item} style={[styles.chip, form.amenities.includes(item) && styles.chipActive]} onPress={() => toggleItem('amenities', item)}>
                <Text style={[styles.chipText, form.amenities.includes(item) && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleUpdate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <Feather name="save" size={20} color={colors.onAccent} style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: SIZES.padding, paddingBottom: 40, gap: 16 },
  
  card: { 
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radius + 4, 
    padding: 20, 
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  sectionTitle: { 
    fontSize: SIZES.base + 2, 
    fontWeight: '700', 
    color: colors.text, 
    marginLeft: 10 
  },
  
  label: { 
    fontSize: SIZES.sm + 1, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 8, 
    marginTop: 12 
  },
  input: { 
    backgroundColor: colors.inputBg || colors.border, 
    borderRadius: SIZES.radius, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: SIZES.base, 
    color: colors.text 
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: colors.inputBg || colors.background, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: SIZES.sm, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.onAccent },
  
  submitBtn: { 
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius, 
    paddingVertical: 16, 
    alignItems: 'center',
    marginTop: 8
  },
  submitText: { color: colors.onAccent, fontSize: SIZES.base, fontWeight: '700' },
});

export default EditTurfScreen;