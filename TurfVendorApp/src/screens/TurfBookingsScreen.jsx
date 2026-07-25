// @theme-ready ✅
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Modal, Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookings, acceptBooking, rejectBooking } from '../redux/vendorSlice';
import BookingCard from '../components/BookingCard';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../utils/theme';

const FILTERS = ['all', 'pending', 'confirmed', 'rejected'];

const DATE_OPTIONS = [
  { key: 'all', label: 'All Dates' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This Week' },
];

const GAME_OPTIONS = ['all', 'Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball', 'Volleyball'];

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const matchesDateFilter = (dateStr, key) => {
  if (key === 'all' || !dateStr) return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (key === 'today') return isSameDay(d, now);
  if (key === 'tomorrow') {
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    return isSameDay(d, t);
  }
  if (key === 'week') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  }
  return true;
};

const TurfBookingsScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const dispatch = useDispatch();
  const { bookings, loading } = useSelector((s) => s.vendor);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);

  useEffect(() => { dispatch(fetchBookings()); }, []);

  const filtered = useMemo(() => {
    let result = bookings;
    if (filter !== 'all') result = result.filter((b) => b.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((b) => (b.user?.name || '').toLowerCase().includes(q));
    }
    if (dateFilter !== 'all') result = result.filter((b) => matchesDateFilter(b.date, dateFilter));
    if (gameFilter !== 'all') {
      result = result.filter(
        (b) => (b.gameType || '').toLowerCase() === gameFilter.toLowerCase()
      );
    }
    return result;
  }, [bookings, filter, search, dateFilter, gameFilter]);

  const dateLabel = DATE_OPTIONS.find((o) => o.key === dateFilter)?.label || 'Date';
  const gameLabel = gameFilter === 'all' ? 'Games' : gameFilter;

  const handleAccept = (id) => dispatch(acceptBooking(id));
  const handleReject = (id) => dispatch(rejectBooking({ id, reason: '' }));

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search user"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.chip} onPress={() => setDateMenuOpen(true)}>
          <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.chipText} numberOfLines={1}>{dateLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.chip} onPress={() => setGameMenuOpen(true)}>
          <Ionicons name="football-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.chipText} numberOfLines={1}>{gameLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => dispatch(fetchBookings())} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No {filter} bookings</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id })}
            onAccept={() => handleAccept(item._id)}
            onReject={() => handleReject(item._id)}
          />
        )}
      />

      {/* Date filter dropdown */}
      <Modal visible={dateMenuOpen} transparent animationType="fade" onRequestClose={() => setDateMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDateMenuOpen(false)}>
          <View style={styles.menuCard}>
            {DATE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.menuRow}
                onPress={() => { setDateFilter(opt.key); setDateMenuOpen(false); }}
              >
                <Text style={[styles.menuRowText, dateFilter === opt.key && styles.menuRowTextActive]}>
                  {opt.label}
                </Text>
                {dateFilter === opt.key && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Games filter dropdown */}
      <Modal visible={gameMenuOpen} transparent animationType="fade" onRequestClose={() => setGameMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setGameMenuOpen(false)}>
          <View style={styles.menuCard}>
            {GAME_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g}
                style={styles.menuRow}
                onPress={() => { setGameFilter(g); setGameMenuOpen(false); }}
              >
                <Text style={[styles.menuRowText, gameFilter === g && styles.menuRowTextActive]}>
                  {g === 'all' ? 'All Games' : g}
                </Text>
                {gameFilter === g && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SIZES.padding, paddingTop: SIZES.padding, paddingBottom: 4,
    backgroundColor: colors.card || colors.background,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.inputBg || colors.border, borderRadius: 20,
    paddingHorizontal: 12, height: 38,
  },
  searchInput: { flex: 1, fontSize: SIZES.sm, color: colors.text, padding: 0 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.inputBg || colors.border, borderRadius: 20,
    paddingHorizontal: 10, height: 38, maxWidth: 100,
  },
  chipText: { fontSize: SIZES.xs, color: colors.textSecondary, fontWeight: '600', flexShrink: 1 },
  filterRow: { flexDirection: 'row', padding: SIZES.padding, gap: 8, backgroundColor: colors.card || colors.background },
  filterTab: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.inputBg || colors.border, alignItems: 'center',
  },
  filterTabActive: { backgroundColor: colors.primary },
  filterText: { fontSize: SIZES.xs, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.onAccent || '#FFFFFF' },
  list: { padding: SIZES.padding, paddingBottom: 110 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textSecondary, fontSize: SIZES.base, marginTop: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuCard: {
    width: 220, backgroundColor: colors.card || colors.background, borderRadius: SIZES.radius,
    paddingVertical: 6, elevation: 6,
  },
  menuRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  menuRowText: { fontSize: SIZES.sm, color: colors.text },
  menuRowTextActive: { color: colors.primary, fontWeight: '700' },
});

export default TurfBookingsScreen;