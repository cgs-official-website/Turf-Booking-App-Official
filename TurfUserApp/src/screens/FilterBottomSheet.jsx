import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { turfsApi } from '../api/turfs';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';

const SORT_OPTIONS = [
  { label: 'Top Rated',          value: 'topRated',        icon: 'star' },
  { label: 'Price: Low to High', value: 'priceLowToHigh',  icon: 'trending-up' },
  { label: 'Price: High to Low', value: 'priceHighToLow',  icon: 'trending-down' },
];

const TIME_OPTIONS = [
  { label: 'Morning',   sub: '6 AM - 12 PM', value: 'morning',   icon: 'sunrise' },
  { label: 'Afternoon', sub: '12 PM - 4 PM', value: 'afternoon', icon: 'sun' },
  { label: 'Evening',   sub: '4 PM - 8 PM',  value: 'evening',   icon: 'sunset' },
  { label: 'Night',     sub: '8 PM - 12 AM', value: 'night',     icon: 'moon' },
];

export default function FilterBottomSheet({ visible, onClose, onApply, initialFilters = {} }) {
  const { C, dark } = useTheme();
  const [sort,    setSort]    = useState(initialFilters.sort || null);
  const [time,    setTime]    = useState(initialFilters.time || null);
  const [count,   setCount]   = useState(null);
  const [fetching, setFetching] = useState(false);

  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setSort(initialFilters.sort || null);
      setTime(initialFilters.time || null);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500, duration: 250, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const params = {};
    if (sort) params.sort = sort;
    if (time) params.time = time;
    setFetching(true);
    turfsApi.getTurfs(params)
      .then((r) => setCount(r.turfs?.length ?? 0))
      .catch(() => setCount(null))
      .finally(() => setFetching(false));
  }, [sort, time, visible]);

  const handleApply = () => {
    onApply({ sort, time });
    onClose();
  };

  const handleReset = () => {
    setSort(null);
    setTime(null);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: dark ? '#131E2F' : '#FFFFFF',
            transform: [{ translateY: slideAnim }],
          },
          SHADOW.floating,
        ]}
      >
        {/* Handle bar */}
        <View style={[styles.handle, { backgroundColor: C.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.text }]}>Filter Turfs</Text>
          <TouchableOpacity onPress={handleReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.resetTxt, { color: C.primary }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Sort By Section */}
        <Text style={[styles.sectionLabel, { color: C.subtext }]}>SORT CRITERIA</Text>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((o) => {
            const active = sort === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[
                  styles.sortChip,
                  {
                    borderColor: active ? C.primary : C.border,
                    backgroundColor: active ? C.primaryLight : C.card,
                  },
                ]}
                onPress={() => setSort(active ? null : o.value)}
                activeOpacity={0.75}
              >
                <Feather name={o.icon} size={14} color={active ? C.primary : C.subtext} />
                <Text style={[styles.sortChipTxt, { color: active ? C.primary : C.text, fontWeight: active ? '800' : '600' }]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Choose Time Section */}
        <Text style={[styles.sectionLabel, { color: C.subtext }]}>PREFERRED TIME SLOT</Text>
        <View style={styles.timeGrid}>
          {TIME_OPTIONS.map((o) => {
            const active = time === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[
                  styles.timeCard,
                  {
                    borderColor: active ? C.primary : C.border,
                    backgroundColor: active ? C.primaryLight : C.card,
                  },
                ]}
                onPress={() => setTime(active ? null : o.value)}
                activeOpacity={0.75}
              >
                <View style={[styles.timeIconWrap, { backgroundColor: active ? C.primary : C.bgSoft }]}>
                  <Feather name={o.icon} size={18} color={active ? '#FFFFFF' : C.primary} />
                </View>
                <Text style={[styles.timeLabel, { color: active ? C.primary : C.text }]}>{o.label}</Text>
                <Text style={[styles.timeSub, { color: active ? C.primary : C.subtext }]}>{o.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer with Result Counter & Apply CTA */}
        <View style={[styles.footer, { borderTopColor: C.border }]}>
          <View>
            <Text style={[styles.foundLabel, { color: C.subtext }]}>Matched Grounds</Text>
            {fetching ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Text style={[styles.foundCount, { color: C.primary }]}>
                {count !== null ? `${count} Pitches` : '— Pitches'}
              </Text>
            )}
          </View>

          <PrimaryButton
            title="Apply Filters"
            onPress={handleApply}
            style={{ minWidth: 160, height: 48 }}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)' },
  sheet:        { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: SPACING.lg, paddingBottom: 36, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  handle:       { width: 44, height: 5, borderRadius: 2.5, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md },
  title:        { ...FONT.h2, fontSize: 18, fontWeight: '800' },
  resetTxt:     { fontWeight: '700', fontSize: 14 },
  sectionLabel: { ...FONT.tiny, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 14, marginBottom: 10 },
  sortRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.round, borderWidth: 1.5 },
  sortChipTxt:  { fontSize: 13 },
  timeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  timeCard:     { width: '48%', borderRadius: RADIUS.xl, borderWidth: 1.5, padding: 12 },
  timeIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  timeLabel:    { fontSize: 14, fontWeight: '700' },
  timeSub:      { fontSize: 11, marginTop: 1 },
  footer:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTopWidth: 1 },
  foundLabel:   { fontSize: 11, fontWeight: '600' },
  foundCount:   { fontSize: 17, fontWeight: '900' },
});