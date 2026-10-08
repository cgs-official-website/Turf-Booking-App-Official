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
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Load live dynamic active turf locations from actual registered turfs
  const loadActiveLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const res = await turfsApi.getLocations();
      const locs = res.locations || res.data?.locations || [];
      if (Array.isArray(locs) && locs.length > 0) {
        setActiveLocations(locs);
      } else {
        // Fallback: Group dynamically directly from active turfs API
        const turfsRes = await turfsApi.getTurfs();
        const items = turfsRes.turfs || turfsRes.items || [];
        const locMap = new Map();
        items.forEach((t) => {
          const c = t.city || (typeof t.location === 'object' ? t.location?.city : '') || 'Local Area';
          const key = c.toLowerCase().trim();
          if (key) {
            if (!locMap.has(key)) {
              locMap.set(key, {
                id: `loc_${key.replace(/[^a-z0-9]/g, '_')}`,
                name: c,
                city: c,
                address: t.address || `${c}, Tamil Nadu`,
                count: 0,
              });
            }
            locMap.get(key).count += 1;
          }
        });
        setActiveLocations(Array.from(locMap.values()).filter((l) => l.count > 0));
      }
    } catch (err) {
      setActiveLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    loadActiveLocations();
  }, [loadActiveLocations]);

  // Google Places autocomplete search with fast 120ms debounce
  const fetchPredictions = useCallback(async (text) => {
    const q = text ? text.trim() : '';
    if (q.length < 2) {
      setPredictions([]);
      setSearching(false);
      return;
    }
    try {
      setSearching(true);
      const data = await placesApi.autocomplete(q);
      setPredictions(data.predictions || []);
    } catch {
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim() || search.trim().length < 2) {
      setPredictions([]);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchPredictions(search), 120);
    return () => clearTimeout(debounceRef.current);
  }, [search, fetchPredictions]);

  const handleSelect = (name) => {
    dispatch(setLocation(name));
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Main');
    }
  };

  const handleSelectPrediction = (prediction) => {
    const name = prediction.structured_formatting?.main_text || prediction.description;
    handleSelect(name);
  };

  // Instant in-memory filtering of locations on every keystroke
  const filteredActiveLocations = activeLocations.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.name || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.address || '').toLowerCase().includes(q)
    );
  });

  const hasSearch = search.trim().length > 0;

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
            placeholder="Search turf city or area (e.g. Chennai, Anna Nagar)..."
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

        {/* Quick Current Location Detection Button */}
        {!hasSearch && (
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
        )}

        {/* Main List */}
        <View style={{ flex: 1 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: C.subtext }]}>
              {hasSearch
                ? `RESULTS FOR "${search.toUpperCase()}" (${filteredActiveLocations.length + predictions.length})`
                : `POPULAR TURF HUBS & CITIES (${filteredActiveLocations.length})`}
            </Text>
            {loadingLocations && <ActivityIndicator size="small" color={C.primary} />}
          </View>

          <FlatList
            data={filteredActiveLocations}
            keyExtractor={(item) => item.id || item.name}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={loadingLocations} onRefresh={loadActiveLocations} colors={[C.primary]} />
            }
            ListFooterComponent={
              predictions.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.sectionTitle, { color: C.subtext, marginBottom: 8 }]}>
                    OTHER LOCATIONS & ADDRESSES
                  </Text>
                  {predictions.map((item) => (
                    <TouchableOpacity
                      key={item.place_id || item.description}
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
                  ))}
                </View>
              ) : null
            }
            ListEmptyComponent={
              filteredActiveLocations.length === 0 && predictions.length === 0 && !searching ? (
                <View style={styles.emptyWrap}>
                  <Feather name="map-pin" size={32} color={C.border} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyText, { color: C.text }]}>
                    {hasSearch ? `No matches found for "${search}"` : 'No turf facilities found in this area'}
                  </Text>
                  <Text style={[styles.emptySub, { color: C.subtext }]}>
                    Try searching another city or tap 'Use Current Location'.
                  </Text>
                  {hasSearch && (
                    <TouchableOpacity
                      style={[styles.customLocBtn, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
                      onPress={() => handleSelect(search.trim())}
                    >
                      <Text style={[styles.customLocBtnText, { color: C.primary }]}>
                        Select "{search.trim()}" directly
                      </Text>
                    </TouchableOpacity>
                  )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: { flex: 1, ...FONT.body, fontSize: 14, padding: 0 },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  gpsIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gpsTitle: { fontSize: 14, fontWeight: '700' },
  gpsSub: { fontSize: 11, marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  listContent: { paddingBottom: 32 },
  locItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  locIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locName: { fontSize: 14, fontWeight: '700' },
  locCity: { fontSize: 12, marginTop: 2 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.round },
  countText: { fontSize: 11, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  emptyText: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  emptySub: { fontSize: 12, textAlign: 'center' },
  customLocBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  customLocBtnText: { fontSize: 13, fontWeight: '700' },
});