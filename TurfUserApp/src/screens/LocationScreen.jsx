import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import { setLocation } from '../redux/authSlice';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { turfsApi } from '../api/turfs';
import { placesApi } from '../api/places';

export default function LocationScreen({ navigation }) {
  const dispatch = useDispatch();
  const { C, dark } = useTheme();

  const [search, setSearch] = useState('');
  const [activeLocations, setActiveLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Load live dynamic active turf locations from backend
  const loadActiveLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const res = await turfsApi.getLocations();
      const locs = res.locations || res.data?.locations || [];
      setActiveLocations(locs);
    } catch (err) {
      console.warn('Failed to load dynamic locations:', err.message);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    loadActiveLocations();
  }, [loadActiveLocations]);

  // Google Places autocomplete search (when search has 3+ chars)
  const fetchPredictions = useCallback(async (text) => {
    if (!text || text.trim().length < 2) {
      setPredictions([]);
      return;
    }
    try {
      setSearching(true);
      const data = await placesApi.autocomplete(text);
      setPredictions(data.predictions || []);
    } catch {
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(search), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search, fetchPredictions]);

  const handleSelect = (name) => {
    dispatch(setLocation(name));
    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Main');
      }
    }, 0);
  };

  const handleSelectPrediction = (prediction) => {
    const name = prediction.structured_formatting?.main_text || prediction.description;
    handleSelect(name);
  };

  // Filter dynamic turf locations by search query
  const filteredActiveLocations = activeLocations.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.name || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.address || '').toLowerCase().includes(q)
    );
  });

  const showingSearchResults = search.trim().length >= 2 && filteredActiveLocations.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={18} color={C.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Choose Your Location</Text>
            <Text style={[styles.subtitle, { color: C.subtext }]}>
              Select active area with available pitches
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <Feather name="search" size={18} color={C.primary} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search turf city or area..."
            placeholderTextColor={C.caption}
            value={search}
            onChangeText={setSearch}
            autoFocus={false}
          />
          {searching ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x-circle" size={16} color={C.caption} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick Location Detection Button */}
        <TouchableOpacity
          style={[styles.gpsBtn, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
          onPress={() => handleSelect('Current Location')}
          activeOpacity={0.8}
        >
          <View style={[styles.gpsIconCircle, { backgroundColor: C.primary }]}>
            <Feather name="navigation" size={14} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.gpsTitle, { color: C.primaryDark || C.primary }]}>
              Use Current Location
            </Text>
            <Text style={[styles.gpsSub, { color: C.subtext }]}>
              Auto-detect via GPS & show all nearby stadiums
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={C.primary} />
        </TouchableOpacity>

        {/* Dynamic Turf Locations List */}
        {!showingSearchResults ? (
          <View style={{ flex: 1 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: C.subtext }]}>
                TURF HUBS & CITIES ({filteredActiveLocations.length})
              </Text>
              {loadingLocations && <ActivityIndicator size="small" color={C.primary} />}
            </View>

            <FlatList
              data={filteredActiveLocations}
              keyExtractor={(item) => item.id || item.name}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={loadingLocations} onRefresh={loadActiveLocations} colors={[C.primary]} />
              }
              ListEmptyComponent={
                !loadingLocations ? (
                  <View style={styles.emptyWrap}>
                    <Feather name="map-pin" size={32} color={C.border} style={{ marginBottom: 8 }} />
                    <Text style={[styles.emptyText, { color: C.text }]}>No turf facilities found in this area</Text>
                    <Text style={[styles.emptySub, { color: C.subtext }]}>
                      Try selecting another city or tap 'Use Current Location'.
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.locItem, { backgroundColor: C.card, borderColor: C.border }]}
                  onPress={() => handleSelect(item.name)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.locIconWrap, { backgroundColor: C.primaryLight }]}>
                    <Feather name="map-pin" size={16} color={C.primary} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.locName, { color: C.text }]}>{item.name}</Text>
                    <Text style={[styles.locCity, { color: C.subtext }]} numberOfLines={1}>
                      {item.city}{item.city !== item.name ? `, ${item.address || 'Tamil Nadu'}` : ', Tamil Nadu'}
                    </Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.countText, { color: C.primary }]}>
                      {item.count} {item.count === 1 ? 'Turf' : 'Turfs'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          /* Google Places Autocomplete fallback */
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id || item.description}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !searching ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: C.subtext }]}>
                    No places found for "{search}".
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.locItem, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => handleSelectPrediction(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.locIconWrap, { backgroundColor: C.bgSoft }]}>
                  <Feather name="map-pin" size={16} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locName, { color: C.text }]}>
                    {item.structured_formatting?.main_text || item.description}
                  </Text>
                  <Text style={[styles.locCity, { color: C.subtext }]} numberOfLines={1}>
                    {item.structured_formatting?.secondary_text || ''}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={C.caption} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { ...FONT.h2, fontSize: 20, fontWeight: '800' },
  subtitle: { ...FONT.caption, fontSize: 13, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: RADIUS.xl, borderWidth: 1.5, paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, ...FONT.body, fontSize: 14, fontWeight: '500' },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.xl, padding: 12, marginBottom: 18 },
  gpsIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  gpsTitle: { ...FONT.caption, fontWeight: '800', fontSize: 13 },
  gpsSub: { fontSize: 11, marginTop: 1 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { ...FONT.tiny, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  listContent: { paddingBottom: 30 },
  locItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.lg, padding: 12, marginBottom: 10 },
  locIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locName: { ...FONT.caption, fontSize: 14, fontWeight: '700' },
  locCity: { fontSize: 12, marginTop: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.md },
  countText: { fontSize: 11, fontWeight: '800' },
  emptyWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 12, marginTop: 4, textAlign: 'center' },
});