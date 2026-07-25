import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, Linking, Platform, StatusBar,
  Modal, Pressable,
} from 'react-native';
import { turfsApi } from '../api/turfs';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const SPORTS = [
  { label: 'All',        icon: null,                                value: 'All'        },
  { label: 'Football',   icon: require('../assets/football.png'),   value: 'Football'   },
  { label: 'Cricket',    icon: require('../assets/cricket.png'),    value: 'Cricket'    },
  { label: 'Basketball', icon: require('../assets/basketball.png'), value: 'Basketball' },
  { label: 'Badminton',  icon: require('../assets/badminton.png'),  value: 'Badminton'  },
  { label: 'Tennis',     icon: require('../assets/tennis.png'),     value: 'Tennis'     },
  { label: 'Volleyball', icon: require('../assets/volleyball.png'), value: 'Volleyball' },
];

const SORT_OPTIONS = [
  { label: 'Newest',      value: ''               },
  { label: 'Top Rated',   value: 'topRated'       },
  { label: 'Price: Low',  value: 'priceLowToHigh' },
  { label: 'Price: High', value: 'priceHighToLow' },
];

const openMap = (address, lat, lng) => {
  const url = (lat && lng)
    ? Platform.select({
        ios:     `maps://app?ll=${lat},${lng}&q=${encodeURIComponent(address)}`,
        android: `geo:${lat},${lng}?q=${encodeURIComponent(address)}`,
      })
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
  );
};

// ── FIX: shows the vendor-uploaded turf logo from DB. Falls back to the
// generic app icon if the turf has no logo saved, or if the logo URL fails
// to load (e.g. broken/missing file on the server).
function TurfLogo({ uri, style }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <Image
        source={require('../assets/icon.png')}
        style={style || styles.appIcon}
        resizeMode="contain"
      />
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style || styles.appIcon}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function ExploreScreen({ navigation }) {
  const { C, dark } = useTheme();
  const [turfs,    setTurfs]    = useState([]);
  const [query,    setQuery]    = useState('');
  const [sport,    setSport]    = useState('All');
  const [sort,     setSort]     = useState('');
  const [showSort, setShowSort] = useState(false);
  const [loading,  setLoading]  = useState(true);

  const load = () => {
    setLoading(true);
    const params = {};
    if (sport !== 'All') params.sport  = sport;
    if (sort)            params.sort   = sort;
    if (query)           params.search = query;
    turfsApi.getTurfs(params)
      .then((r) => setTurfs(r.turfs))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [sport, sort]);

  const filtered = turfs.filter((t) =>
    !query ||
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.location.city.toLowerCase().includes(query.toLowerCase())
  );

  // ─── FIX: Search bar இன்னு தனியா வெளியே எடுக்கணும் ───────────────────────────
  // ListHeaderComponent-ஒட கிட்ட FlatList-ல TextInput வச்சா
  // FlatList scroll gesture keyboard-ஐ dismiss பண்ணிடும்.
  // Solution: Search bar-ஐ FlatList-க்கு வெளியே வை — அதுக்கு touch பண்ணாலும்
  // keyboard போகாது, ஏன்னா அது FlatList-ஓட scroll event-ஓட connection இல்ல.

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Sort Modal */}
        <Modal
          transparent
          visible={showSort}
          animationType="fade"
          onRequestClose={() => setShowSort(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSort(false)}>
            <View style={[styles.sortPopup, { backgroundColor: C.card }]}>
              <Text style={[styles.sortPopupTitle, { color: C.text }]}>Sort By</Text>
              {SORT_OPTIONS.map((o, i) => (
                <TouchableOpacity
                  key={o.value}
                  style={[
                    styles.sortOpt,
                    { borderBottomColor: C.border },
                    i === SORT_OPTIONS.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => { setSort(o.value); setShowSort(false); }}
                >
                  <Text style={[styles.sortOptTxt, { color: C.text }]}>{o.label}</Text>
                  <View style={[styles.radioCircle, { borderColor: sort === o.value ? C.primary : C.border }]}>
                    {sort === o.value && (
                      <View style={[styles.radioDot, { backgroundColor: C.primary }]} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>

        {/* ── FIXED: Header + Search bar OUTSIDE FlatList ─────────────────────── */}
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.bgSoft }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.text }]}>Explore</Text>
        </View>

        {/* Search bar — FlatList வெளியே இருக்கு, so keyboard dismiss ஆகாது */}
        <View style={[styles.searchWrap, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
          <Icon name="search" size={16} color={C.subtext} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search turf, sport or location"
            placeholderTextColor={C.subtext}
            value={query}
            onChangeText={(v) => { setQuery(v); if (!v) load(); }}
            onSubmitEditing={load}
            returnKeyType="search"
            // FIX: blurOnSubmit false — search submit பண்ணினாலும் keyboard இருக்கும்
            blurOnSubmit={false}
          />
          {query
            ? <TouchableOpacity onPress={() => { setQuery(''); load(); }}>
                <Icon name="close" size={16} color={C.subtext} />
              </TouchableOpacity>
            : <TouchableOpacity
                onPress={() => setShowSort(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="options-outline" size={16} color={C.primary} />
              </TouchableOpacity>
          }
        </View>

        {/* Sport chips — also OUTSIDE FlatList */}
        <FlatList
          data={SPORTS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.value}
          contentContainerStyle={styles.sportScroll}
          // FIX: horizontal FlatList-லயும் keyboardShouldPersistTaps வேணும்
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: s }) => {
            const active = sport === s.value;
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: C.card, borderColor: C.border },
                  active && { backgroundColor: C.primary, borderColor: C.primary },
                ]}
                onPress={() => setSport(s.value)}
              >
                {s.icon
                  ? <Image
                      source={s.icon}
                      style={[styles.chipIcon, active && { tintColor: '#fff' }]}
                      resizeMode="contain"
                    />
                  : <Icon name="apps-outline" size={13} color={active ? '#fff' : C.text} />
                }
                <Text style={[styles.chipTxt, { color: active ? '#fff' : C.text }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <Text style={[styles.resultCount, { color: C.subtext }]}>
          {filtered.length} turfs found
        </Text>

        {/* Main results FlatList */}
        <FlatList
          data={filtered}
          keyExtractor={(i) => i._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          // FIX: keyboard persist — chip select / result tap பண்ணினாலும் keyboard போகாது
          keyboardShouldPersistTaps="handled"
          // FIX: scroll பண்ணும்போது keyboard dismiss ஆகாது (none = never dismiss on scroll)
          keyboardDismissMode="none"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search" size={40} color={C.border} />
              <Text style={[styles.emptyTxt, { color: C.subtext }]}>No turfs found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const lat     = item.location?.lat || item.location?.latitude || null;
            const lng     = item.location?.lng || item.location?.longitude || null;
            const address = item.location?.address || `${item.location?.city}, ${item.location?.state}`;
            return (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => navigation.navigate('TurfDetail', { id: item._id })}
                activeOpacity={0.85}
              >
                <View style={[styles.rowIconBox, { backgroundColor: C.primaryLight }]}>
                  <TurfLogo uri={item.logo} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.rowSports, { color: C.primary }]} numberOfLines={1}>
                    {item.sports.join(' · ')}
                  </Text>
                  <View style={[styles.locBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Icon name="location-outline" size={10} color={C.subtext} />
                    <Text style={[styles.locTxt, { color: C.subtext }]} numberOfLines={1}>
                      {item.location?.city}, {item.location?.state || ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.mapBox, { backgroundColor: C.primaryLight }]}
                  onPress={() => openMap(address, lat, lng)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="navigate-outline" size={11} color={C.primary} />
                  <Text style={[styles.distTxt, { color: C.primary }]}>2.4 Km</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  backBtn:        { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  title:          { ...FONT.h1, fontSize: 20, flex: 1 },
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sortPopup:      { width: 280, borderRadius: RADIUS.xl, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  sortPopupTitle: { fontSize: 15, fontWeight: '700', padding: SPACING.lg, paddingBottom: SPACING.sm },
  sortOpt:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  sortOptTxt:     { fontSize: 14 },
  radioCircle:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot:       { width: 10, height: 10, borderRadius: 5 },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, paddingHorizontal: SPACING.md, paddingVertical: 9, borderRadius: RADIUS.lg, gap: SPACING.sm, borderWidth: 1, marginBottom: 6 },
  searchInput:    { flex: 1, fontSize: 13, paddingVertical: 0 },
  sportScroll:    { paddingHorizontal: SPACING.lg, gap: 6, paddingBottom: 6, paddingTop: 2 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.round, borderWidth: 1, height: 34 },
  chipIcon:       { width: 14, height: 14 },
  chipTxt:        { fontSize: 12, fontWeight: '600' },
  resultCount:    { paddingHorizontal: SPACING.lg, paddingVertical: 4, fontSize: 12 },
  list:           { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: 100 },
  row:            { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: SPACING.sm, borderWidth: 1, gap: SPACING.sm },
  rowIconBox:     { width: 46, height: 46, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  appIcon:        { width: 30, height: 30 },
  rowInfo:        { flex: 1, gap: 3 },
  rowName:        { fontSize: 13, fontWeight: '700' },
  rowSports:      { fontSize: 11, fontWeight: '600' },
  locBox:         { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  locTxt:         { fontSize: 11 },
  mapBox:         { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.round, flexShrink: 0 },
  distTxt:        { fontSize: 10, fontWeight: '700' },
  empty:          { alignItems: 'center', paddingTop: 20, gap: 12 },
  emptyTxt:       { fontSize: 15 },
});