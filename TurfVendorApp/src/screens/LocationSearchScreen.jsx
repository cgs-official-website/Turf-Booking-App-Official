// @theme-ready ✅
import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// Free, no-API-key geocoding via OpenStreetMap's Nominatim. Nominatim asks
// that every request carry an identifying User-Agent (their usage policy —
// https://operations.osmfoundation.org/policies/nominatim/) and be rate
// limited to ~1 req/sec, hence the debounce below.[cite: 7]
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 600;

// Pulls a clean { address, city, pinCode } out of a Nominatim result so the
// caller can drop it straight into TurfProfileScreen's fields.[cite: 7]
const parseResult = (item) => {
  const a = item.address || {};
  const city = a.city || a.town || a.village || a.suburb || a.county || '';
  const pinCode = a.postcode || '';
  return {
    address: item.display_name,
    city,
    pinCode,
    lat: item.lat,
    lon: item.lon,
  };
};

const LocationSearchScreen = ({ navigation, route }) => {
  const returnTo = route?.params?.returnTo || 'TurfProfile';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Hide the default React Navigation header to remove the white space, 
  // since this screen has its own custom header built in below.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, 
    });
  }, [navigation]);

  const search = useCallback(async (text) => {
    if (!text.trim() || text.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TurfBookingVendorApp/1.0 (contact: support@turfapp.example)' },
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setError('Could not search right now. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const handlePick = (item) => {
    const parsed = parseResult(item);
    navigation.navigate(returnTo, { pickedLocation: parsed });
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set location</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search area, street, or city"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.place_id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultRow} onPress={() => handlePick(item)} activeOpacity={0.7}>
            <Feather name="map-pin" size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.resultText} numberOfLines={2}>{item.display_name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && query.trim().length >= 3 ? (
            <Text style={styles.emptyText}>No matches found.</Text>
          ) : null
        }
      />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding, paddingTop: 20, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.inputBg || colors.card, 
    borderRadius: SIZES.radius, 
    borderWidth: 1, 
    borderColor: colors.border,
    paddingHorizontal: 14, height: 50, 
    marginHorizontal: SIZES.padding, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: SIZES.base, color: colors.text },

  errorText: { color: colors.error, fontSize: SIZES.sm, paddingHorizontal: SIZES.padding, marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: SIZES.sm, textAlign: 'center', marginTop: 30 },

  resultRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: SIZES.padding, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  resultText: { flex: 1, fontSize: SIZES.sm, color: colors.text, lineHeight: 22 },
});

export default LocationSearchScreen;