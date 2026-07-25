// @theme-ready ✅
import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  fetchMyTurfs, setActiveTurf, fetchSlotCalendar, toggleFreezeSlot,
  addSlot, deleteSlot,
} from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// "HH:MM" 24hr sanity check — used by the "Edit Slot Template" form.
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const to12h = (t) => {
  if (!TIME_RE.test(t)) return t;
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDisplayDate = (d) => `${pad(d.getDate())} / ${pad(d.getMonth() + 1)} / ${d.getFullYear()}`;

const getStatusMeta = (colors) => ({
  available: { label: 'Available', color: colors.success || '#10B981' },
  requested: { label: 'Requested', color: colors.warning || '#F59E0B' },
  booked:    { label: 'Booked', color: colors.error || '#EF4444' },
  frozen:    { label: 'Frozen (blocked by you)', color: colors.error || '#EF4444' },
});

const SlotsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    turfs, activeTurfId, loading,
    slotCalendar, slotCounts, slotCalendarLoading, slotActionLoading,
  } = useSelector((s) => s.vendor);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const STATUS_META = getStatusMeta(colors);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalSlot, setModalSlot] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectAllConfirmOpen, setSelectAllConfirmOpen] = useState(false);

  // Hide default navigation header to remove white space above custom layout
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => { dispatch(fetchMyTurfs()); }, []);

  const activeTurf = turfs.find((t) => t._id === activeTurfId) || turfs[0] || null;
  const dateStr = toDateStr(selectedDate);

  useEffect(() => {
    if (activeTurf) dispatch(fetchSlotCalendar({ turfId: activeTurf._id, dateStr }));
  }, [activeTurf?._id, dateStr]);

  const refresh = () => activeTurf && dispatch(fetchSlotCalendar({ turfId: activeTurf._id, dateStr }));

  const availableSlots = useMemo(
    () => slotCalendar.filter((s) => s.status === 'available'),
    [slotCalendar],
  );
  const frozenSlots = useMemo(
    () => slotCalendar.filter((s) => s.status === 'frozen'),
    [slotCalendar],
  );
  // Slots that can be toggled via Select All (booked/requested slots are left alone).
  const freezableSlots = useMemo(
    () => slotCalendar.filter((s) => s.status === 'available' || s.status === 'frozen'),
    [slotCalendar],
  );
  // Checkbox is "checked" (green) only once every freezable slot for the day is frozen.
  const allFrozen = freezableSlots.length > 0 && freezableSlots.every((s) => s.status === 'frozen');

  const [selectAllMode, setSelectAllMode] = useState('freeze'); // 'freeze' | 'unfreeze' — which action the confirm popup will perform

  const onSelectAll = () => {
    if (allFrozen) {
      if (!frozenSlots.length || !activeTurf) return;
      setSelectAllMode('unfreeze');
      setSelectAllConfirmOpen(true);
      return;
    }
    if (!availableSlots.length || !activeTurf) return;
    setSelectAllMode('freeze');
    setSelectAllConfirmOpen(true);
  };

  const confirmSelectAllAction = async () => {
    setSelectAllConfirmOpen(false);
    if (!activeTurf) return;
    const isUnfreeze = selectAllMode === 'unfreeze';
    const targets = isUnfreeze ? frozenSlots : availableSlots;
    if (!targets.length) return;

    // Reflect the selection immediately so the grid highlight right away.
    setSelectedSlots(new Set(targets.map((s) => s.startTime)));

    setBulkBusy(true);
    try {
      await Promise.all(targets.map((slot) => dispatch(toggleFreezeSlot({
        turfId: activeTurf._id, date: dateStr, startTime: slot.startTime, endTime: slot.endTime,
        action: isUnfreeze ? 'unfreeze' : 'freeze',
      })).unwrap()));
      setSelectedSlots(new Set());
    } catch (e) {
      Alert.alert(`Some slots could not be ${isUnfreeze ? 'unfrozen' : 'frozen'}`, e || 'Please try again.');
      refresh();
    } finally {
      setBulkBusy(false);
    }
  };

  const onDateChange = (event, picked) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') { setShowDatePicker(false); return; }
    if (picked) {
      setSelectedDate(picked);
      setSelectedSlots(new Set());
    }
    if (Platform.OS === 'android') setShowDatePicker(false);
  };

  const onSlotPress = (slot) => {
    if (selectedSlots.size > 0) {
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        if (next.has(slot.startTime)) next.delete(slot.startTime);
        else next.add(slot.startTime);
        return next;
      });
      return;
    }
    setModalSlot(slot);
  };

  const doFreeze = async (slot, action) => {
    if (!activeTurf) return;
    try {
      await dispatch(toggleFreezeSlot({
        turfId: activeTurf._id, date: dateStr, startTime: slot.startTime, endTime: slot.endTime, action,
      })).unwrap();
      setModalSlot(null);
    } catch (e) {
      Alert.alert('Could not update slot', e || 'Please try again.');
    }
  };

  const doBulkFreeze = async () => {
    if (!activeTurf || selectedSlots.size === 0) return;
    setBulkBusy(true);
    try {
      const targets = slotCalendar.filter((s) => selectedSlots.has(s.startTime));
      await Promise.all(targets.map((slot) => dispatch(toggleFreezeSlot({
        turfId: activeTurf._id, date: dateStr, startTime: slot.startTime, endTime: slot.endTime, action: 'freeze',
      })).unwrap()));
      setSelectedSlots(new Set());
    } catch (e) {
      Alert.alert('Some slots could not be frozen', e || 'Please try again.');
      refresh();
    } finally {
      setBulkBusy(false);
    }
  };

  if (!turfs.length && !loading) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Feather name="calendar" size={40} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No turfs yet</Text>
        <Text style={styles.emptyText}>Add a turf first to start managing its time slots.</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddTurf')} activeOpacity={0.85}>
          <Text style={styles.emptyBtnText}>Add Turf</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerTop}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color={colors.text} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setTemplateOpen(true)} activeOpacity={0.7}>
            <Text style={styles.editLink}>Edit Slots</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Slot Calendar</Text>
        <Text style={styles.subtitle}>Manage availability, block slots, and add offline bookings.</Text>

        {/* Turf picker */}
        {turfs.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.turfPicker}>
            {turfs.map((t) => (
              <TouchableOpacity
                key={t._id}
                style={[styles.turfChip, t._id === activeTurf?._id && styles.turfChipActive]}
                onPress={() => dispatch(setActiveTurf(t._id))}
                activeOpacity={0.8}
              >
                <Text style={[styles.turfChipText, t._id === activeTurf?._id && styles.turfChipTextActive]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stat cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, SHADOWS.sm]}>
            <Text style={[styles.statNum, { color: colors.success || '#10B981' }]}>{String(slotCounts.available).padStart(2, '0')}</Text>
            <Text style={styles.statLabel}>AVAILABLE</Text>
          </View>
          <View style={[styles.statCard, SHADOWS.sm]}>
            <Text style={[styles.statNum, { color: colors.warning || '#F59E0B' }]}>{String(slotCounts.requested).padStart(2, '0')}</Text>
            <Text style={styles.statLabel}>REQUESTED</Text>
          </View>
          <View style={[styles.statCard, SHADOWS.sm]}>
            <Text style={[styles.statNum, { color: colors.error || '#EF4444' }]}>{String(slotCounts.booked).padStart(2, '0')}</Text>
            <Text style={styles.statLabel}>BOOKED</Text>
          </View>
        </View>

        {/* Date selector */}
        <View style={styles.dateHeaderRow}>
          <Text style={styles.sectionTitle}>Select Your Date</Text>
          <TouchableOpacity style={styles.selectAllRow} onPress={onSelectAll} activeOpacity={0.7} disabled={bulkBusy}>
            {bulkBusy ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <View style={[styles.checkbox, allFrozen && styles.checkboxFrozen]}>
                {allFrozen && <Feather name="check" size={12} color={colors.onAccent} />}
              </View>
            )}
            <Text style={styles.selectAllText}>
              {bulkBusy ? (selectAllMode === 'unfreeze' ? 'Unfreezing...' : 'Freezing...') : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
          <Text style={styles.dateInputText}>{toDisplayDate(selectedDate)}</Text>
          <Feather name="calendar" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}

        {/* Slot grid */}
        <Text style={styles.sectionTitle2}>Select Start Time</Text>
        {slotCalendarLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : slotCalendar.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Feather name="clock" size={32} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyListText}>No time slots configured yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setTemplateOpen(true)} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Add Slots</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {slotCalendar.map((slot) => {
              const isAvailable = slot.status === 'available';
              const isSelected = selectedSlots.has(slot.startTime);
              return (
                <TouchableOpacity
                  key={slot.startTime}
                  style={[
                    styles.slotBtn,
                    isAvailable ? styles.slotAvailable : styles.slotUnavailable,
                    isSelected && styles.slotSelected,
                  ]}
                  onPress={() => onSlotPress(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.slotBtnText, isAvailable ? styles.slotAvailableText : styles.slotUnavailableText]}>
                    {to12h(slot.startTime)}
                  </Text>
                  {isSelected && (
                    <View style={styles.slotCheckDot}>
                      <Feather name="check" size={10} color={colors.onAccent} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bulk-freeze bar */}
      {selectedSlots.size > 0 && (
        <View style={[styles.bulkBar, SHADOWS.md]}>
          <Text style={styles.bulkText}>{selectedSlots.size} slot{selectedSlots.size > 1 ? 's' : ''} selected</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.bulkCancelBtn} onPress={() => setSelectedSlots(new Set())} activeOpacity={0.7}>
              <Text style={styles.bulkCancelText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bulkFreezeBtn} onPress={doBulkFreeze} disabled={bulkBusy} activeOpacity={0.85}>
              {bulkBusy ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Text style={styles.bulkFreezeText}>Freeze Selected</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Slot detail / freeze modal */}
      <Modal visible={!!modalSlot} transparent animationType="fade" onRequestClose={() => setModalSlot(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, SHADOWS.md]}>
            {modalSlot && (
              <>
                <Text style={styles.modalTitle}>Slot : {dateStr}</Text>
                <Text style={styles.modalTime}>({modalSlot.startTime} - {modalSlot.endTime})</Text>
                <Text style={styles.modalStatusRow}>
                  Status : <Text style={{ color: STATUS_META[modalSlot.status]?.color || colors.text, fontWeight: '800' }}>
                    {STATUS_META[modalSlot.status]?.label || modalSlot.status}
                  </Text>
                </Text>

                {(modalSlot.status === 'requested' || modalSlot.status === 'booked') ? (
                  <>
                    <Text style={styles.modalHint}>
                      This slot already has a customer booking — it can't be frozen from here.
                    </Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalSlot(null)} activeOpacity={0.8}>
                        <Text style={styles.modalCancelText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalSlot(null)} activeOpacity={0.8}>
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalFreezeBtn}
                      disabled={slotActionLoading}
                      onPress={() => doFreeze(modalSlot, modalSlot.status === 'frozen' ? 'unfreeze' : 'freeze')}
                      activeOpacity={0.85}
                    >
                      {slotActionLoading ? (
                        <ActivityIndicator color={colors.onAccent} size="small" />
                      ) : (
                        <Text style={styles.modalFreezeText}>
                          {modalSlot.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Select-All confirmation popup */}
      <Modal visible={selectAllConfirmOpen} transparent animationType="fade" onRequestClose={() => setSelectAllConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, SHADOWS.md]}>
            <Text style={styles.modalTitle}>
              {selectAllMode === 'unfreeze' ? 'Unfreeze all slots?' : 'Freeze all slots?'}
            </Text>
            <Text style={styles.modalHint}>
              {selectAllMode === 'unfreeze'
                ? `This will unfreeze all ${frozenSlots.length} frozen slot${frozenSlots.length > 1 ? 's' : ''} for ${toDisplayDate(selectedDate)}, making them available for booking again.`
                : `This will freeze all ${availableSlots.length} available slot${availableSlots.length > 1 ? 's' : ''} for ${toDisplayDate(selectedDate)}. Customers won't be able to book these slots until you unfreeze them.`}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectAllConfirmOpen(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalFreezeBtn} onPress={confirmSelectAllAction} activeOpacity={0.85}>
                <Text style={styles.modalFreezeText}>
                  {selectAllMode === 'unfreeze' ? 'Unfreeze' : 'Freeze'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Slot template editor (defines the recurring daily time-grid) */}
      <SlotTemplateModal
        visible={templateOpen}
        onClose={() => setTemplateOpen(false)}
        activeTurf={activeTurf}
        onChanged={refresh}
        colors={colors}
        styles={styles}
      />
    </View>
  );
};

// Simple add/remove list for the turf's slot template. Every slot added
// here is saved to turf.slots in the DB and is exactly what shows up as a
// green box on the calendar above — nothing is auto-generated.
const SlotTemplateModal = ({ visible, onClose, activeTurf, onChanged, colors, styles }) => {
  const dispatch = useDispatch();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);

  const slots = activeTurf?.slots || [];

  const handleAdd = async () => {
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      Alert.alert('Invalid time', 'Enter times as 24-hour HH:MM, e.g. 14:00');
      return;
    }
    if (!activeTurf) return;
    setBusy(true);
    try {
      await dispatch(addSlot({ turfId: activeTurf._id, slot: { startTime: start, endTime: end } })).unwrap();
      setStart(''); setEnd('');
      onChanged();
    } catch (e) {
      Alert.alert('Could not add slot', e || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (slotId) => {
    Alert.alert('Remove Slot', 'Remove this time slot from the template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(deleteSlot({ turfId: activeTurf._id, slotId })).unwrap();
            onChanged();
          } catch (e) {
            Alert.alert('Could not remove slot', e || 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.templateCard, SHADOWS.md]}>
          <View style={styles.templateHeaderRow}>
            <Text style={styles.templateTitle}>Slot Template</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}><Feather name="x" size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <Text style={styles.templateSub}>
            Add the time ranges you want to open up for booking. Slots you add here will appear on the calendar for every date until you remove them.
          </Text>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {slots.map((s) => (
              <View key={s._id} style={styles.templateRow}>
                <Text style={styles.templateRowText}>{to12h(s.startTime)} - {to12h(s.endTime)}</Text>
                <TouchableOpacity onPress={() => handleDelete(s._id)} activeOpacity={0.7}>
                  <Feather name="trash-2" size={18} color={colors.error || '#EF4444'} />
                </TouchableOpacity>
              </View>
            ))}
            {!slots.length && <Text style={styles.templateEmpty}>No slots added yet — add one below.</Text>}
          </ScrollView>

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="Start (14:00)"
              placeholderTextColor={colors.textSecondary}
              value={start}
              onChangeText={setStart}
              maxLength={5}
            />
            <Text style={styles.toText}>to</Text>
            <TextInput
              style={styles.input}
              placeholder="End (15:00)"
              placeholderTextColor={colors.textSecondary}
              value={end}
              onChangeText={setEnd}
              maxLength={5}
            />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Text style={styles.saveText}>Add Slot</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: SIZES.padding, paddingTop: 20 },

  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: colors.text, fontSize: SIZES.sm, fontWeight: '600' },
  editLink: { color: colors.primary, fontWeight: '700', fontSize: SIZES.sm },

  title: { fontSize: SIZES.xxl, fontWeight: '800', color: colors.text, marginTop: 14 },
  subtitle: { fontSize: SIZES.sm, color: colors.textSecondary, marginTop: 4, marginBottom: 18 },

  turfPicker: { marginBottom: 16 },
  turfChip: {
    backgroundColor: colors.card || colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    marginRight: 8, borderWidth: 1, borderColor: colors.border,
  },
  turfChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  turfChipText: { color: colors.text, fontWeight: '600', fontSize: SIZES.sm },
  turfChipTextActive: { color: colors.onAccent },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: colors.card || colors.background, borderRadius: SIZES.radius,
    alignItems: 'center', paddingVertical: 16, borderWidth: 1, borderColor: colors.border,
  },
  statNum: { fontSize: SIZES.xxl, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },

  dateHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: SIZES.base, fontWeight: '800', color: colors.text },
  sectionTitle2: { fontSize: SIZES.base, fontWeight: '800', color: colors.text, marginTop: 24, marginBottom: 14 },

  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg || colors.background,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxFrozen: { backgroundColor: colors.success || '#10B981', borderColor: colors.success || '#10B981' },
  selectAllText: { fontSize: SIZES.sm, color: colors.textSecondary, fontWeight: '600' },

  dateInput: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card || colors.background, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dateInputText: { fontSize: SIZES.base, color: colors.text, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: {
    width: '31%', borderRadius: SIZES.radiusLg, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent',
  },
  slotAvailable: { backgroundColor: colors.success ? `${colors.success}25` : '#B7EFC5', borderColor: colors.success || '#10B981' },
  slotUnavailable: { backgroundColor: colors.error ? `${colors.error}25` : '#FF6B6B', borderColor: colors.error || '#EF4444' },
  slotSelected: { borderWidth: 2, borderColor: colors.primary },
  slotBtnText: { fontWeight: '700', fontSize: SIZES.sm },
  slotAvailableText: { color: colors.success || '#12603A' },
  slotUnavailableText: { color: colors.error || '#EF4444' },
  slotCheckDot: {
    position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIconContainer: {
    backgroundColor: colors.inputBg || colors.border,
    padding: 20,
    borderRadius: 50,
    marginBottom: 10,
  },
  emptyListText: { color: colors.textSecondary, fontSize: SIZES.base, marginTop: 10, marginBottom: 16 },

  bulkBar: {
    position: 'absolute', bottom: 20, left: SIZES.padding, right: SIZES.padding,
    backgroundColor: colors.card || colors.background, borderRadius: SIZES.radiusLg, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  bulkText: { fontWeight: '700', color: colors.text, fontSize: SIZES.sm },
  bulkCancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: SIZES.radius, backgroundColor: colors.inputBg || colors.border },
  bulkCancelText: { color: colors.textSecondary, fontWeight: '700' },
  bulkFreezeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radius, backgroundColor: colors.error || '#EF4444' },
  bulkFreezeText: { color: colors.onAccent, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: colors.card || colors.background, borderRadius: SIZES.radiusLg, padding: 22, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text },
  modalTime: { fontSize: SIZES.base, color: colors.textSecondary, marginTop: 4 },
  modalStatusRow: { fontSize: SIZES.base, color: colors.textSecondary, marginTop: 12, fontWeight: '600' },
  modalHint: { fontSize: SIZES.sm, color: colors.textSecondary, marginTop: 14, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: SIZES.radius, backgroundColor: colors.inputBg || colors.border },
  modalCancelText: { color: colors.text, fontWeight: '700' },
  modalFreezeBtn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: SIZES.radius, backgroundColor: colors.success || '#10B981' },
  modalFreezeText: { color: colors.onAccent, fontWeight: '700' },

  templateCard: { width: '100%', backgroundColor: colors.card || colors.background, borderRadius: SIZES.radiusLg, padding: 20, borderWidth: 1, borderColor: colors.border },
  templateHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  templateTitle: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text },
  templateSub: { fontSize: SIZES.sm, color: colors.textSecondary, marginTop: 6, marginBottom: 14, lineHeight: 18 },
  templateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  templateRowText: { fontSize: SIZES.sm, color: colors.text, fontWeight: '600' },
  templateEmpty: { fontSize: SIZES.sm, color: colors.textSecondary, paddingVertical: 12, textAlign: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 14 },
  input: {
    flex: 1, backgroundColor: colors.inputBg || colors.border, borderRadius: SIZES.radius,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: SIZES.base, color: colors.text,
  },
  toText: { color: colors.textSecondary, fontSize: SIZES.sm, fontWeight: '600' },
  saveBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: SIZES.radius, backgroundColor: colors.primary },
  saveText: { color: colors.onAccent, fontWeight: '700' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyText: { fontSize: SIZES.sm, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: SIZES.radius, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: colors.onAccent, fontWeight: '700' },
});

export default SlotsScreen;