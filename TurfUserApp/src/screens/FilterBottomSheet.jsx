// src/screens/FilterBottomSheet.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { turfsApi } from '../api/turfs';
import { SPACING, RADIUS } from '../utils/theme';
import useTheme from '../hooks/useTheme'; // <-- Dark mode hook import panniyachu

const SORT_OPTIONS = [
  { label: 'Top Rated',        value: 'topRated',        icon: 'star-outline' },
  { label: 'Price: Low to High', value: 'priceLowToHigh', icon: 'arrow-up-outline' },
  { label: 'Price: High to Low', value: 'priceHighToLow', icon: 'arrow-down-outline' },
];

const TIME_OPTIONS = [
  { label: 'Morning',   sub: '6AM - 12PM',  value: 'morning',   icon: '🌤️' },
  { label: 'Afternoon', sub: '12PM - 4PM',  value: 'afternoon', icon: '☀️' },
  { label: 'Evening',   sub: '4PM - 8PM',   value: 'evening',   icon: '🌥️' },
  { label: 'Night',     sub: '8PM - 12AM',  value: 'night',     icon: '🌙' },
];

export default function FilterBottomSheet({ visible, onClose, onApply, initialFilters = {} }) {
  const { C } = useTheme(); // <-- Dynamic theme colors use panniyachu[cite: 3]
  const [sort,    setSort]    = useState(initialFilters.sort || null);
  const [time,    setTime]    = useState(initialFilters.time || null);
  const [count,   setCount]   = useState(null);
  const [fetching, setFetching] = useState(false);

  const slideAnim = useRef(new Animated.Value(500)).current;

  // Sheet animation sequence unchanged[cite: 11]
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

  // Pure live count API tracking system stays fully intact[cite: 11]
  useEffect(() => {
    if (!visible) return;
    const params = {};
    if (sort) params.sort = sort;
    if (time) params.time = time;
    setFetching(true);
    turfsApi.getTurfs(params)
      .then((r) => setCount(r.turfs.length))
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
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.sheet, { backgroundColor: C.card, transform: [{ translateY: slideAnim }] }]}>
        {/* Handle bar */}
        <View style={[styles.handle, { backgroundColor: C.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.text }]}>Filter Turfs</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={[styles.resetTxt, { color: C.primary }]}>Reset All</Text>
          </TouchableOpacity>
        </View>

        {/* Sort By */}
        <Text style={[styles.sectionLabel, { color: C.subtext }]}>SORT BY</Text>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((o) => {
            const active = sort === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[
                  styles.sortChip, 
                  { borderColor: C.border, backgroundColor: C.card },
                  active && { borderColor: C.primary, backgroundColor: C.greenSoft }
                ]}
                onPress={() => setSort(active ? null : o.value)}
              >
                <Icon name={o.icon} size={13} color={active ? C.primary : C.text} />
                <Text style={[styles.sortChipTxt, { color: C.text }, active && { color: C.primary }]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Choose Time */}
        <Text style={[styles.sectionLabel, { color: C.subtext }]}>CHOOSE TIME</Text>
        <View style={styles.timeGrid}>
          {TIME_OPTIONS.map((o) => {
            const active = time === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[
                  styles.timeCard, 
                  { borderColor: C.border, backgroundColor: C.card },
                  active && { borderColor: C.primary, backgroundColor: C.greenSoft }
                ]}
                onPress={() => setTime(active ? null : o.value)}
              >
                <Text style={styles.timeIcon}>{o.icon}</Text>
                <Text style={[styles.timeLabel, { color: C.text }, active && { color: C.primary }]}>{o.label}</Text>
                <Text style={[styles.timeSub, { color: C.subtext }, active && { color: C.primary + 'aa' }]}>{o.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer — Found X Results + Apply */}
        <View style={[styles.footer, { borderTopColor: C.border }]}>
          <View>
            <Text style={[styles.foundLabel, { color: C.subtext }]}>Found</Text>
            {fetching
              ? <ActivityIndicator size="small" color={C.primary} />
              : <Text style={[styles.foundCount, { color: C.primary }]}>
                  {count !== null ? `${count} Results` : '— Results'}
                </Text>
            }
          </View>
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: C.primary }]} onPress={handleApply} activeOpacity={0.85}>
            <Text style={styles.applyTxt}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Structure values completely localized and adapted for theme configs[cite: 11]
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:          { position: 'absolute', bottom: 0, left: 0, right: 0,
                    borderTopLeftRadius: 24, borderTopRightRadius: 24, 
                    paddingHorizontal: SPACING.lg, paddingBottom: 34 },
  handle:         { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md },
  title:          { fontSize: 18, fontWeight: '800' },
  resetTxt:       { fontWeight: '600', fontSize: 14 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: SPACING.md, marginBottom: SPACING.md },
  sortRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sortChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: RADIUS.round, borderWidth: 1.5 },
  sortChipTxt:    { fontSize: 13, fontWeight: '600' },
  timeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.sm },
  timeCard:       { width: '47%', borderRadius: RADIUS.lg, borderWidth: 1.5, padding: SPACING.md, gap: 4 },
  timeIcon:       { fontSize: 22 },
  timeLabel:      { fontSize: 15, fontWeight: '700' },
  timeSub:        { fontSize: 12 },
  footer:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xl, paddingTop: SPACING.lg, borderTopWidth: 1 },
  foundLabel:     { fontSize: 12, fontWeight: '500' },
  foundCount:     { fontSize: 16, fontWeight: '800' },
  applyBtn:       { paddingHorizontal: SPACING.xl * 1.5, paddingVertical: 14, borderRadius: RADIUS.round },
  applyTxt:       { color: '#fff', fontWeight: '700', fontSize: 15 },
});