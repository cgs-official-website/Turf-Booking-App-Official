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
import { SIZES, SHADOWS } from '../utils/theme';

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
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const dispatch = useDispatch();
  const { bookings, loading } = useSelector((s) => s.vendor);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);

  useEffect(() => { dispatch(fetchBookings()); }, []);

  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const counts = useMemo(() => {
    return {
      all: safeBookings.length,
      pending: safeBookings.filter((b) => b && b.status === 'pending').length,
      confirmed: safeBookings.filter((b) => b && ['confirmed', 'accepted', 'completed'].includes(b.status)).length,
      rejected: safeBookings.filter((b) => b && b.status === 'rejected').length,
    };
  }, [safeBookings]);

  const filtered = useMemo(() => {
    let result = safeBookings;
    if (filter === 'confirmed') {
      result = result.filter((b) => b && ['confirmed', 'accepted', 'completed'].includes(b.status));
    } else if (filter !== 'all') {
      result = result.filter((b) => b && b.status === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((b) => (b.user?.name || b.userName || '').toLowerCase().includes(q));
    }
    if (dateFilter !== 'all') result = result.filter((b) => matchesDateFilter(b.date, dateFilter));
    if (gameFilter !== 'all') {
      result = result.filter(
        (b) => (b.gameType || b.sport || '').toLowerCase() === gameFilter.toLowerCase()
      );
    }
    return result;
  }, [safeBookings, filter, search, dateFilter, gameFilter]);

  const dateLabel = DATE_OPTIONS.find((o) => o.key === dateFilter)?.label || 'Date';
  const gameLabel = gameFilter === 'all' ? 'All Games' : gameFilter;

  const handleAccept = (id) => dispatch(acceptBooking(id));
  const handleReject = (id) => dispatch(rejectBooking({ id, reason: '' }));

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bookings</Text>
          <Text style={styles.headerSub}>Real-time player reservations</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{safeBookings.length} Total</Text>
        </View>
      </View>

      {/* Search & Filter Row */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by player name..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterChipsRow}>
          <TouchableOpacity
            style={[styles.chip, dateFilter !== 'all' && styles.chipActive]}
            onPress={() => setDateMenuOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={14} color={dateFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.chipText, dateFilter !== 'all' && styles.chipTextActive]} numberOfLines={1}>{dateLabel}</Text>
            <Ionicons name="chevron-down" size={12} color={dateFilter !== 'all' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, gameFilter !== 'all' && styles.chipActive]}
            onPress={() => setGameMenuOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="football-outline" size={14} color={gameFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.chipText, gameFilter !== 'all' && styles.chipTextActive]} numberOfLines={1}>{gameLabel}</Text>
            <Ionicons name="chevron-down" size={12} color={gameFilter !== 'all' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Segmented Tabs */}
      <View style={styles.tabContainer}>
        {FILTERS.map((f) => {
          const active = filter === f;
          const count = counts[f] || 0;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bookings List */}
      <FlatList
        data={filtered}
        keyExtractor={(b) => b._id || b.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => dispatch(fetchBookings())} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, SHADOWS.sm]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No {filter === 'all' ? '' : filter} bookings</Text>
            <Text style={styles.emptySub}>
              {search || dateFilter !== 'all' || gameFilter !== 'all'
                ? 'Try adjusting your search or filters to see more results.'
                : 'Player requests for your turf will appear here in real-time.'}
            </Text>
            {(search || dateFilter !== 'all' || gameFilter !== 'all') ? (
              <TouchableOpacity
                style={styles.resetFiltersBtn}
                onPress={() => { setSearch(''); setDateFilter('all'); setGameFilter('all'); setFilter('all'); }}
                activeOpacity={0.7}
              >
                <Text style={styles.resetFiltersText}>Reset Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id || item.id })}
            onAccept={() => handleAccept(item._id || item.id)}
            onReject={() => handleReject(item._id || item.id)}
          />
        )}
      />

      {/* Date filter dropdown Modal */}
      <Modal visible={dateMenuOpen} transparent animationType="fade" onRequestClose={() => setDateMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDateMenuOpen(false)}>
          <View style={[styles.menuCard, SHADOWS.md]}>
            <Text style={styles.menuHeading}>Filter by Date</Text>
            {DATE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.menuRow, dateFilter === opt.key && styles.menuRowSelected]}
                onPress={() => { setDateFilter(opt.key); setDateMenuOpen(false); }}
              >
                <Text style={[styles.menuRowText, dateFilter === opt.key && styles.menuRowTextActive]}>
                  {opt.label}
                </Text>
                {dateFilter === opt.key && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Games filter dropdown Modal */}
      <Modal visible={gameMenuOpen} transparent animationType="fade" onRequestClose={() => setGameMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setGameMenuOpen(false)}>
          <View style={[styles.menuCard, SHADOWS.md]}>
            <Text style={styles.menuHeading}>Filter by Sport</Text>
            {GAME_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.menuRow, gameFilter === g && styles.menuRowSelected]}
                onPress={() => { setGameFilter(g); setGameMenuOpen(false); }}
              >
                <Text style={[styles.menuRowText, gameFilter === g && styles.menuRowTextActive]}>
                  {g === 'all' ? 'All Sports' : g}
                </Text>
                {gameFilter === g && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 197, 102, 0.25)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },

  searchSection: {
    paddingHorizontal: SIZES.padding,
    marginBottom: 12,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.sm,
    color: colors.text,
    padding: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.primary,
  },

  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    marginBottom: 12,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  list: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 110,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: SIZES.radiusLg,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  resetFiltersBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
  },
  resetFiltersText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: SIZES.xs,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  menuCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.card,
    borderRadius: SIZES.radiusLg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuHeading: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  menuRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  menuRowText: {
    fontSize: SIZES.sm,
    color: colors.text,
    fontWeight: '600',
  },
  menuRowTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});

export default TurfBookingsScreen;