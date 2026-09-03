import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, StatusBar, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { turfsApi } from '../api/turfs';
import { fetchWishlist, toggleWishlist } from '../redux/wishlistSlice';
import useTheme from '../hooks/useTheme';
import SearchBar from '../components/SearchBar';
import SportChip from '../components/SportChip';
import TurfCard from '../components/TurfCard';
import { TurfCardSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import FilterBottomSheet from './FilterBottomSheet';
import { SPACING, RADIUS, FONT } from '../utils/theme';

const SPORTS = [
  { name: 'All' },
  { name: 'Football' },
  { name: 'Cricket' },
  { name: 'Badminton' },
  { name: 'Tennis' },
  { name: 'Basketball' },
  { name: 'Volleyball' },
];

const SORT_OPTIONS = [
  { label: 'Recommended', value: ''               },
  { label: 'Top Rated',   value: 'topRated'       },
  { label: 'Price: Low',  value: 'priceLowToHigh' },
  { label: 'Price: High', value: 'priceHighToLow' },
];

export default function ExploreScreen({ navigation }) {
  const dispatch = useDispatch();
  const { C, dark } = useTheme();

  const wishlist = useSelector((s) => s.wishlist.wishlist);
  const location = useSelector((s) => s.auth.location);

  const [turfs,         setTurfs]         = useState([]);
  const [query,         setQuery]         = useState('');
  const [sport,         setSport]         = useState('All');
  const [sort,          setSort]          = useState('');
  const [loading,       setLoading]       = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ sort: null, time: null });

  const load = () => {
    setLoading(true);
    const params = {};
    if (sport !== 'All') params.sport  = sport;
    if (sort)            params.sort   = sort;
    if (activeFilters.sort) params.sort = activeFilters.sort;
    if (activeFilters.time) params.time = activeFilters.time;
    if (location && location !== 'Current Location') params.location = location;
    if (query.trim()) params.search = query.trim();

    turfsApi.getTurfs(params)
      .then((r) => setTurfs(r.turfs || r.items || []))
      .catch(() => setTurfs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [sport, sort, activeFilters, location, query]);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const filtered = turfs.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const nameMatch = (t.name || '').toLowerCase().includes(q);
    const cityMatch =
      (t.city || '').toLowerCase().includes(q) ||
      (t.address || '').toLowerCase().includes(q) ||
      (t.location?.city || '').toLowerCase().includes(q) ||
      (t.location?.address || '').toLowerCase().includes(q);
    const sportMatch = (t.sportTypes || t.sports || []).some((s) => s.toLowerCase().includes(q));
    const amenMatch = (t.amenities || []).some((a) => a.toLowerCase().includes(q));
    return nameMatch || cityMatch || sportMatch || amenMatch;
  });

  const isWishlisted = (id) => wishlist.some((t) => (t._id || t.id) === id);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={C.bg} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header & Sticky Search Bar */}
        <View style={styles.topBar}>
          <View style={styles.titleRow}>
            {navigation.canGoBack() && (
              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={18} color={C.text} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>Discover Grounds</Text>
              <Text style={[styles.headerSub, { color: C.subtext }]} numberOfLines={1}>
                {filtered.length} pitches available for booking
              </Text>
            </View>
          </View>

          <SearchBar
            value={query}
            onChangeText={setQuery}
            onFilterPress={() => setFilterVisible(true)}
            placeholder="Search venue name, sport, or city..."
          />
        </View>

        {/* Sports Horizontal Filter Chips */}
        <View style={styles.sportsWrap}>
          <FlatList
            data={SPORTS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.name}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
            renderItem={({ item }) => (
              <SportChip
                name={item.name}
                icon={item.icon}
                selected={sport === item.name}
                onPress={() => setSport(item.name)}
              />
            )}
          />
        </View>

        {/* Sort Pill Row - Properly Aligned */}
        <View style={styles.sortRow}>
          <View style={styles.sortLabelWrap}>
            <Feather name="sliders" size={12} color={C.subtext} style={{ marginRight: 4 }} />
            <Text style={[styles.sortLabel, { color: C.subtext }]}>SORT:</Text>
          </View>
          <FlatList
            data={SORT_OPTIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.label}
            contentContainerStyle={styles.sortListContent}
            renderItem={({ item }) => {
              const active = sort === item.value;
              return (
                <TouchableOpacity
                  onPress={() => setSort(item.value)}
                  style={[
                    styles.sortPill,
                    {
                      backgroundColor: active ? C.primaryLight : C.card,
                      borderColor: active ? C.primary : C.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.sortPillText,
                      { color: active ? C.primary : C.subtext, fontWeight: active ? '800' : '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Turfs List */}
        {loading ? (
          <View style={{ paddingHorizontal: SPACING.lg, paddingTop: 10 }}>
            <TurfCardSkeleton />
            <TurfCardSkeleton />
            <TurfCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id || item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 90, paddingTop: 4 }}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={load} colors={[C.primary]} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="search"
                title="No Turfs Found"
                description={
                  query
                    ? `No grounds found matching "${query}". Try searching a different sport or city.`
                    : 'No stadiums match the selected filters.'
                }
                actionText="Reset Filters"
                onActionPress={() => {
                  setQuery('');
                  setSport('All');
                  setSort('');
                  setActiveFilters({ sort: null, time: null });
                }}
              />
            }
            renderItem={({ item }) => (
              <TurfCard
                turf={item}
                variant="vertical"
                isFavorite={isWishlisted(item._id || item.id)}
                onToggleFavorite={() => dispatch(toggleWishlist(item))}
                onPress={() => navigation.navigate('TurfDetail', { id: item._id || item.id })}
              />
            )}
          />
        )}
      </SafeAreaView>

      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={(filters) => setActiveFilters(filters)}
        initialFilters={activeFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    ...FONT.h2,
    fontSize: 20,
    fontWeight: '800',
  },
  headerSub: {
    ...FONT.caption,
    fontSize: 12,
    marginTop: 1,
  },
  sportsWrap: {
    marginTop: 2,
    marginBottom: 8,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.lg,
    marginBottom: 8,
  },
  sortLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  sortLabel: {
    ...FONT.tiny,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sortListContent: {
    gap: 8,
    paddingRight: 20,
    alignItems: 'center',
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortPillText: {
    fontSize: 12,
    lineHeight: 16,
  },
});