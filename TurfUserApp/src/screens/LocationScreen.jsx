import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { setLocation } from '../redux/authSlice';
import { SPACING, RADIUS } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { placesApi } from '../api/places';

// Quick-pick chips shown when the search box is empty. These are NOT the
// only searchable locations anymore -- Google Places covers everything else.
const TOP_LOCATIONS = [
  { id: '1', name: 'Kodambakkam', city: 'Chennai',     count: 12 },
  { id: '2', name: 'Perundurai',  city: 'Erode',       count: 8  },
  { id: '3', name: 'Anna Nagar',  city: 'Chennai',     count: 15 },
  { id: '4', name: 'Coimbatore',  city: 'Coimbatore',  count: 10 },
  { id: '5', name: 'T. Nagar',    city: 'Chennai',     count: 9  },
  { id: '6', name: 'Velachery',   city: 'Chennai',     count: 7  },
];

export default function LocationScreen({ navigation }) {
  const dispatch = useDispatch();
  const { C, dark } = useTheme();
  const [search, setSearch]           = useState('');
  const [predictions, setPredictions] = useState([]);
  const [searching, setSearching]     = useState(false);
  const [searchError, setSearchError] = useState(false);
  const debounceRef = useRef(null);

  const topFiltered = TOP_LOCATIONS.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.city.toLowerCase().includes(search.toLowerCase())
  );

  // -- Global location search via OUR backend's /api/places/autocomplete --
  // Fires ~400ms after the user stops typing (debounced) so we don't spam
  // the API on every keystroke. The backend holds the Google Places key
  // and proxies the request -- nothing sensitive ships inside the app.
  const fetchPredictions = useCallback(async (text) => {
    if (!text || text.trim().length < 2) {
      setPredictions([]);
      return;
    }
    try {
      setSearching(true);
      setSearchError(false);
      const data = await placesApi.autocomplete(text);
      setPredictions(data.predictions || []);
    } catch {
      // Backend down, or GOOGLE_PLACES_API_KEY missing/billing not set up
      // on the server -- fall back to the top-locations list quietly.
      setPredictions([]);
      setSearchError(true);
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
    // ── FIX: on the very first location pick (right after OTP/Google
    // verify), RootNavigator only renders the "Location" screen while
    // locationSet is false -- "Main" isn't registered in the Stack yet.
    // dispatch() flips locationSet to true, but React batches that
    // re-render; if we call navigation.replace('Main') in the same tick,
    // it fires against the OLD screen list (no "Main" yet) -> the
    // "not handled by any navigator" error. Deferring with setTimeout(0)
    // lets RootNavigator's re-render (which adds "Main" to the Stack)
    // commit first, so by the time this runs, "Main" actually exists.
    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Main');
      }
    }, 0);
  };

  const handleSelectPrediction = (prediction) => {
    // main_text = "Anna Nagar", secondary_text = "Chennai, Tamil Nadu, India"
    // Only the short, matchable name is needed -- the backend regex-matches
    // it against address/city/state/pincode, so this alone is enough to
    // find turfs located anywhere within that area/city.
    const name = prediction.structured_formatting?.main_text || prediction.description;
    handleSelect(name);
  };

  const showingSearchResults = search.trim().length >= 2;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Choose Location</Text>
        <Text style={[styles.subtitle, { color: C.subtext }]}>Find and book turfs near you</Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: C.card, borderColor: C.border }]}>
        <Icon name="search-outline" size={18} color={C.subtext} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search any city, area or pincode"
          placeholderTextColor={C.subtext}
          value={search}
          onChangeText={setSearch}
        />
        {searching && <ActivityIndicator size="small" color={C.primary} />}
      </View>

      <TouchableOpacity
        style={[styles.currentLocBtn, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={() => handleSelect('Current Location')}
      >
        <View style={[styles.currentLocIcon, { backgroundColor: C.primary }]}>
          <Icon name="locate" size={22} color="#fff" />
        </View>
        <View style={styles.currentLocText}>
          <Text style={[styles.currentLocTitle, { color: C.primary }]}>Use Current Location</Text>
          <Text style={[styles.currentLocSub, { color: C.subtext }]}>Detect your location automatically</Text>
        </View>
        <Icon name="chevron-forward" size={18} color={C.subtext} />
      </TouchableOpacity>

      {showingSearchResults ? (
        <>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Search results</Text>
          {searchError && (
            <Text style={[styles.errorText, { color: C.subtext }]}>
              Couldn't load global results right now -- showing local matches instead.
            </Text>
          )}
          <FlatList
            data={predictions}
            keyExtractor={(i) => i.place_id}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.sm }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !searching ? (
                <View>
                  {topFiltered.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.locRow, { backgroundColor: C.card, borderColor: C.border, marginBottom: SPACING.sm }]}
                      onPress={() => handleSelect(item.name)}
                    >
                      <View style={[styles.locIcon, { backgroundColor: C.greenSoft }]}>
                        <Icon name="location-outline" size={18} color={C.primary} />
                      </View>
                      <View style={styles.locInfo}>
                        <Text style={[styles.locName, { color: C.text }]}>{item.name}</Text>
                        <Text style={[styles.locCount, { color: C.subtext }]}>{item.count} Turfs Available</Text>
                      </View>
                      <Icon name="chevron-forward" size={16} color={C.subtext} />
                    </TouchableOpacity>
                  ))}
                  {topFiltered.length === 0 && (
                    <Text style={[styles.errorText, { color: C.subtext }]}>No matches found. Try a different search.</Text>
                  )}
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.locRow, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => handleSelectPrediction(item)}
              >
                <View style={[styles.locIcon, { backgroundColor: C.greenSoft }]}>
                  <Icon name="earth-outline" size={18} color={C.primary} />
                </View>
                <View style={styles.locInfo}>
                  <Text style={[styles.locName, { color: C.text }]} numberOfLines={1}>
                    {item.structured_formatting?.main_text || item.description}
                  </Text>
                  <Text style={[styles.locCount, { color: C.subtext }]} numberOfLines={1}>
                    {item.structured_formatting?.secondary_text || ''}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={16} color={C.subtext} />
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Top locations</Text>
          <FlatList
            data={TOP_LOCATIONS}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.sm }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.locRow, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => handleSelect(item.name)}
              >
                <View style={[styles.locIcon, { backgroundColor: C.greenSoft }]}>
                  <Icon name="location-outline" size={18} color={C.primary} />
                </View>
                <View style={styles.locInfo}>
                  <Text style={[styles.locName, { color: C.text }]}>{item.name}</Text>
                  <Text style={[styles.locCount, { color: C.subtext }]}>{item.count} Turfs Available</Text>
                </View>
                <Icon name="chevron-forward" size={16} color={C.subtext} />
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1 },
  header:          { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, marginBottom: SPACING.lg },
  title:           { fontSize: 28, fontWeight: '800' },
  subtitle:        { fontSize: 14, marginTop: 4 },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, borderRadius: RADIUS.round, paddingHorizontal: SPACING.lg, paddingVertical: 12, borderWidth: 1, gap: SPACING.sm, marginBottom: SPACING.lg },
  searchInput:     { flex: 1, fontSize: 14 },
  currentLocBtn:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, gap: SPACING.md, marginBottom: SPACING.xl },
  currentLocIcon:  { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  currentLocText:  { flex: 1 },
  currentLocTitle: { fontWeight: '700', fontSize: 15 },
  currentLocSub:   { fontSize: 12, marginTop: 2 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  errorText:       { fontSize: 12, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  locRow:          { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, gap: SPACING.md },
  locIcon:         { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  locInfo:         { flex: 1 },
  locName:         { fontWeight: '700', fontSize: 14 },
  locCount:        { fontSize: 12, marginTop: 2 },
});