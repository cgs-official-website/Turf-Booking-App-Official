// @theme-ready ✅
import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  fetchMyTurfs, setActiveTurf, fetchSlotCalendar, toggleFreezeSlot,
  addSlot, deleteSlot,
} from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

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

const getNextDays = (count = 14) => {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d);
  }
  return days;
};

const getStatusMeta = (colors) => ({
  available: {
    label: 'Available',
    color: colors.success || '#10B981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.28)',
    actionText: 'Block',
    actionColor: '#EF4444',
  },
  requested: {
    label: 'Requested',
    color: colors.warning || '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.28)',
    actionText: 'Review',
    actionColor: '#F59E0B',
  },
  booked: {
    label: 'Booked',
    color: colors.error || '#EF4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.28)',
    actionText: 'Details',
    actionColor: '#6B7280',
  },
  frozen: {
    label: 'Blocked',
    color: '#6B7280',
    bg: 'rgba(107, 114, 128, 0.1)',
    border: 'rgba(107, 114, 128, 0.25)',
    actionText: 'Unblock',
    actionColor: colors.success || '#10B981',
  },
});

const categorizeSlots = (slots = []) => {
  const sections = [
    { key: 'morning', title: 'Morning', icon: 'sun', range: '06:00 AM – 12:00 PM', slots: [] },
    { key: 'afternoon', title: 'Afternoon', icon: 'zap', range: '12:00 PM – 05:00 PM', slots: [] },
    { key: 'evening', title: 'Evening', icon: 'cloud', range: '05:00 PM – 09:00 PM', slots: [] },
    { key: 'night', title: 'Night', icon: 'moon', range: '09:00 PM onwards', slots: [] },
  ];

  slots.forEach((s) => {
    if (!s || !s.startTime) return;
    const hour = parseInt(s.startTime.split(':')[0], 10);
    if (hour < 12) sections[0].slots.push(s);
    else if (hour < 17) sections[1].slots.push(s);
    else if (hour < 21) sections[2].slots.push(s);
    else sections[3].slots.push(s);
  });

  return sections.filter((sec) => sec.slots.length > 0);
};

const SlotsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    turfs, activeTurfId, loading,
    slotCalendar, slotCounts, slotCalendarLoading, slotActionLoading,
  } = useSelector((s) => s.vendor);

  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const STATUS_META = getStatusMeta(colors);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalSlot, setModalSlot] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectAllConfirmOpen, setSelectAllConfirmOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => { dispatch(fetchMyTurfs()); }, []);

  const safeTurfs = Array.isArray(turfs) ? turfs : [];
  const activeTurf = safeTurfs.find((t) => (t._id || t.id) === activeTurfId) || safeTurfs[0] || null;
  const currentTurfId = activeTurf?._id || activeTurf?.id || 'default';
  const dateStr = toDateStr(selectedDate);
  const dateList = useMemo(() => getNextDays(14), []);

  useEffect(() => {
    dispatch(fetchSlotCalendar({ turfId: currentTurfId, dateStr }));
  }, [currentTurfId, dateStr]);

  const refresh = () => dispatch(fetchSlotCalendar({ turfId: currentTurfId, dateStr }));

  const safeCalendar = Array.isArray(slotCalendar) ? slotCalendar : [];

  const availableSlots = useMemo(
    () => safeCalendar.filter((s) => s && s.status === 'available'),
    [safeCalendar],
  );
  const frozenSlots = useMemo(
    () => safeCalendar.filter((s) => s && s.status === 'frozen'),
    [safeCalendar],
  );
  const freezableSlots = useMemo(
    () => safeCalendar.filter((s) => s && (s.status === 'available' || s.status === 'frozen')),
    [safeCalendar],
  );
  const allFrozen = freezableSlots.length > 0 && freezableSlots.every((s) => s.status === 'frozen');

  const filteredCalendar = useMemo(() => {
    if (filterType === 'all') return safeCalendar;
    if (filterType === 'available') return availableSlots;
    if (filterType === 'frozen') return frozenSlots;
    if (filterType === 'booked') return safeCalendar.filter((s) => s && (s.status === 'booked' || s.status === 'requested'));
    return safeCalendar;
  }, [safeCalendar, filterType, availableSlots, frozenSlots]);

  const categorizedSections = useMemo(() => categorizeSlots(filteredCalendar), [filteredCalendar]);

  const [selectAllMode, setSelectAllMode] = useState('freeze');

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

    setSelectedSlots(new Set(targets.map((s) => s.startTime)));
    setBulkBusy(true);
    try {
      await Promise.all(targets.map((slot) => dispatch(toggleFreezeSlot({
        turfId: activeTurf._id || activeTurf.id, date: dateStr, startTime: slot.startTime, endTime: slot.endTime,
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

  const openDatePicker = () => {
    try {
      if (Platform.OS === 'android' && DateTimePickerAndroid) {
        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'date',
          onChange: (event, picked) => {
            if (event.type === 'dismissed' || !picked) return;
            setSelectedDate(picked);
            setSelectedSlots(new Set());
          },
        });
      } else {
        setShowDatePicker(true);
      }
    } catch {
      // Safe fallback if native module is not registered
      setShowDatePicker(false);
    }
  };

  const onDateChange = (event, picked) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !picked) return;
    setSelectedDate(picked);
    setSelectedSlots(new Set());
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
        turfId: activeTurf._id || activeTurf.id, date: dateStr, startTime: slot.startTime, endTime: slot.endTime, action,
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
      const targets = safeCalendar.filter((s) => selectedSlots.has(s.startTime));
      await Promise.all(targets.map((slot) => dispatch(toggleFreezeSlot({
        turfId: activeTurf._id || activeTurf.id, date: dateStr, startTime: slot.startTime, endTime: slot.endTime, action: 'freeze',
      })).unwrap()));
      setSelectedSlots(new Set());
    } catch (e) {
      Alert.alert('Some slots could not be frozen', e || 'Please try again.');
      refresh();
    } finally {
      setBulkBusy(false);
    }
  };

  if (!safeTurfs.length && !loading) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Feather name="calendar" size={40} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No Turfs Configured</Text>
        <Text style={styles.emptyText}>Add your turf first to manage daily opening hours and slot schedules.</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddTurf')} activeOpacity={0.85}>
          <Text style={styles.emptyBtnText}>Add Turf</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Screen Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Slot Calendar</Text>
            <Text style={styles.screenSub}>Real-time availability & block management</Text>
          </View>
          <TouchableOpacity
            style={styles.templateBtn}
            onPress={() => setTemplateOpen(true)}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={14} color={colors.primary} />
            <Text style={styles.templateBtnText}>Templates</Text>
          </TouchableOpacity>
        </View>

        {/* Turf Selector Strip (If Multiple Turfs) */}
        {safeTurfs.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.turfPicker}>
            {safeTurfs.map((t) => {
              const isActive = (t._id || t.id) === (activeTurf?._id || activeTurf?.id);
              return (
                <TouchableOpacity
                  key={t._id || t.id}
                  style={[styles.turfChip, isActive && styles.turfChipActive]}
                  onPress={() => dispatch(setActiveTurf(t._id || t.id))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.turfChipText, isActive && styles.turfChipTextActive]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 14-Day Horizontal Date Picker Strip */}
        <View style={styles.dateStripHeader}>
          <Text style={styles.sectionHeading}>Select Date</Text>
          <TouchableOpacity style={styles.calPickerBtn} onPress={openDatePicker} activeOpacity={0.7}>
            <Feather name="calendar" size={13} color={colors.primary} />
            <Text style={styles.calPickerText}>Pick Date</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateCarousel}>
          {dateList.map((d) => {
            const isSelected = toDateStr(d) === dateStr;
            const isToday = toDateStr(d) === toDateStr(new Date());
            const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
            const dayNum = d.getDate();
            const monthName = d.toLocaleDateString('en-IN', { month: 'short' });

            return (
              <TouchableOpacity
                key={toDateStr(d)}
                style={[styles.dateCard, isSelected && styles.dateCardActive]}
                onPress={() => {
                  setSelectedDate(d);
                  setSelectedSlots(new Set());
                }}
                activeOpacity={0.8}
              >
                {isToday && (
                  <View style={[styles.todayTag, isSelected && styles.todayTagActive]}>
                    <Text style={[styles.todayTagText, isSelected && styles.todayTagTextActive]}>TODAY</Text>
                  </View>
                )}
                <Text style={[styles.dateDayName, isSelected && styles.dateTextActive]}>{dayName}</Text>
                <Text style={[styles.dateDayNum, isSelected && styles.dateTextActive]}>{dayNum}</Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateTextActive]}>{monthName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Slot Statistics Summary Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statBox, filterType === 'available' && styles.statBoxActive, { borderColor: 'rgba(16, 185, 129, 0.35)' }, SHADOWS.sm]}
            onPress={() => setFilterType(filterType === 'available' ? 'all' : 'available')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Feather name="check-circle" size={14} color={colors.success || '#10B981'} />
            </View>
            <Text style={[styles.statNum, { color: colors.success || '#10B981' }]}>
              {String(slotCounts?.available ?? availableSlots.length).padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>AVAILABLE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, filterType === 'booked' && styles.statBoxActive, { borderColor: 'rgba(245, 158, 11, 0.35)' }, SHADOWS.sm]}
            onPress={() => setFilterType(filterType === 'booked' ? 'all' : 'booked')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Feather name="clock" size={14} color={colors.warning || '#F59E0B'} />
            </View>
            <Text style={[styles.statNum, { color: colors.warning || '#F59E0B' }]}>
              {String(slotCounts?.requested ?? 0).padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>REQUESTED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, filterType === 'frozen' && styles.statBoxActive, { borderColor: 'rgba(239, 68, 68, 0.35)' }, SHADOWS.sm]}
            onPress={() => setFilterType(filterType === 'frozen' ? 'all' : 'frozen')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Feather name="slash" size={14} color={colors.error || '#EF4444'} />
            </View>
            <Text style={[styles.statNum, { color: colors.error || '#EF4444' }]}>
              {String((slotCounts?.booked ?? 0) + (slotCounts?.frozen ?? frozenSlots.length)).padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>BOOKED/BLOCKED</Text>
          </TouchableOpacity>
        </View>

        {/* Section Header & Bulk Block */}
        <View style={styles.gridHeaderRow}>
          <View>
            <Text style={styles.sectionHeading}>Time Slots Schedule</Text>
            <Text style={styles.gridSub}>Tap any slot to block or view details</Text>
          </View>
          <TouchableOpacity
            style={styles.selectAllBtn}
            onPress={onSelectAll}
            activeOpacity={0.7}
            disabled={bulkBusy}
          >
            {bulkBusy ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <View style={[styles.checkbox, allFrozen && styles.checkboxFrozen]}>
                {allFrozen && <Feather name="check" size={11} color="#FFFFFF" />}
              </View>
            )}
            <Text style={styles.selectAllText}>
              {allFrozen ? 'Unblock All' : 'Block All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Slot Grid by Day Part */}
        {slotCalendarLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading slot availability...</Text>
          </View>
        ) : safeCalendar.length === 0 ? (
          <View style={[styles.emptyGridCard, SHADOWS.sm]}>
            <View style={styles.emptyGridIcon}>
              <Feather name="clock" size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyGridTitle}>No Slots for this Date</Text>
            <Text style={styles.emptyGridSub}>Add opening time ranges in the Slot Template to start accepting player bookings.</Text>
            <TouchableOpacity style={styles.addTemplateBtn} onPress={() => setTemplateOpen(true)} activeOpacity={0.85}>
              <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addTemplateText}>Configure Slots</Text>
            </TouchableOpacity>
          </View>
        ) : categorizedSections.length === 0 ? (
          <View style={[styles.emptyGridCard, SHADOWS.sm]}>
            <Text style={styles.emptyGridTitle}>No {filterType} slots found</Text>
            <TouchableOpacity style={{ marginTop: 10 }} onPress={() => setFilterType('all')}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Show All Slots</Text>
            </TouchableOpacity>
          </View>
        ) : (
          categorizedSections.map((section) => {
            const openCount = section.slots.filter((s) => s.status === 'available').length;
            return (
              <View key={section.key} style={styles.dayPartContainer}>
                {/* Day Part Section Title Card */}
                <View style={styles.dayPartBanner}>
                  <View style={styles.dayPartLeft}>
                    <View style={styles.dayPartIconWrap}>
                      <Feather name={section.icon} size={15} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.dayPartTitle}>{section.title} Slots</Text>
                      <Text style={styles.dayPartRange}>{section.range}</Text>
                    </View>
                  </View>
                  <View style={styles.dayPartBadge}>
                    <Text style={styles.dayPartBadgeText}>{openCount} / {section.slots.length} Open</Text>
                  </View>
                </View>

                {/* 2-Column Slot Cards Grid */}
                <View style={styles.twoColumnGrid}>
                  {section.slots.map((slot) => {
                    const meta = STATUS_META[slot.status] || STATUS_META.available;
                    const isSelected = selectedSlots.has(slot.startTime);

                    return (
                      <TouchableOpacity
                        key={slot.startTime}
                        style={[
                          styles.slotCard,
                          { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : meta.border },
                          isSelected && styles.slotCardSelected,
                          SHADOWS.sm,
                        ]}
                        onPress={() => onSlotPress(slot)}
                        activeOpacity={0.8}
                      >
                        {/* Top Row: Time + Icon */}
                        <View style={styles.slotCardHeader}>
                          <View style={styles.slotTimeWrap}>
                            <Text style={styles.slotStartTime}>{to12h(slot.startTime)}</Text>
                            <Text style={styles.slotEndTime}>to {to12h(slot.endTime)}</Text>
                          </View>
                          {isSelected ? (
                            <View style={styles.selectedBadge}>
                              <Feather name="check" size={11} color="#FFFFFF" />
                            </View>
                          ) : (
                            <View style={[styles.statusDotWrap, { backgroundColor: meta.bg }]}>
                              <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                            </View>
                          )}
                        </View>

                        <View style={styles.slotDivider} />

                        {/* Bottom Row: Status Tag + Action Pill */}
                        <View style={styles.slotCardFooter}>
                          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                            <Text style={[styles.statusPillText, { color: meta.color }]}>
                              {meta.label}
                            </Text>
                          </View>
                          <Text style={[styles.slotActionPrompt, { color: meta.actionColor }]}>
                            {meta.actionText}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Bulk Action Bar */}
      {selectedSlots.size > 0 && (
        <View style={[styles.bulkBar, SHADOWS.md]}>
          <Text style={styles.bulkText}>{selectedSlots.size} slot{selectedSlots.size > 1 ? 's' : ''} selected</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.bulkClearBtn} onPress={() => setSelectedSlots(new Set())} activeOpacity={0.7}>
              <Text style={styles.bulkClearText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bulkActionBtn} onPress={doBulkFreeze} disabled={bulkBusy} activeOpacity={0.85}>
              {bulkBusy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.bulkActionText}>Block Selected</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Slot Detail & Freeze Modal */}
      <Modal visible={!!modalSlot} transparent animationType="fade" onRequestClose={() => setModalSlot(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, SHADOWS.md]}>
            {modalSlot && (
              <>
                <Text style={styles.modalTitle}>Slot Details</Text>
                <Text style={styles.modalTime}>{to12h(modalSlot.startTime)} - {to12h(modalSlot.endTime)} ({dateStr})</Text>

                <View style={styles.modalStatusRow}>
                  <Text style={styles.modalStatusLabel}>Current Status: </Text>
                  <Text style={[styles.modalStatusValue, { color: STATUS_META[modalSlot.status]?.color || colors.text }]}>
                    {STATUS_META[modalSlot.status]?.label || modalSlot.status}
                  </Text>
                </View>

                {(modalSlot.status === 'requested' || modalSlot.status === 'booked') ? (
                  <>
                    <Text style={styles.modalHint}>
                      This slot is already linked to a customer booking and cannot be blocked manually.
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
                      style={[styles.modalActionBtn, modalSlot.status === 'frozen' ? { backgroundColor: colors.success || '#10B981' } : { backgroundColor: colors.error || '#EF4444' }]}
                      disabled={slotActionLoading}
                      onPress={() => doFreeze(modalSlot, modalSlot.status === 'frozen' ? 'unfreeze' : 'freeze')}
                      activeOpacity={0.85}
                    >
                      {slotActionLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.modalActionBtnText}>
                          {modalSlot.status === 'frozen' ? 'Unblock Slot' : 'Block Slot'}
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

      {/* Select All Confirmation Modal */}
      <Modal visible={selectAllConfirmOpen} transparent animationType="fade" onRequestClose={() => setSelectAllConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, SHADOWS.md]}>
            <Text style={styles.modalTitle}>
              {selectAllMode === 'unfreeze' ? 'Unblock All Slots?' : 'Block All Slots?'}
            </Text>
            <Text style={styles.modalHint}>
              {selectAllMode === 'unfreeze'
                ? `This will unblock all ${frozenSlots.length} blocked slots for ${dateStr}, opening them up for player bookings.`
                : `This will block all ${availableSlots.length} available slots for ${dateStr}. Players will not be able to book these times.`}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectAllConfirmOpen(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: colors.primary }]} onPress={confirmSelectAllAction} activeOpacity={0.85}>
                <Text style={styles.modalActionBtnText}>
                  {selectAllMode === 'unfreeze' ? 'Unblock All' : 'Block All'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Slot Template Editor Modal */}
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

const SlotTemplateModal = ({ visible, onClose, activeTurf, onChanged, colors, styles }) => {
  const dispatch = useDispatch();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);

  const slots = activeTurf?.slots || [];

  const handleAdd = async () => {
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      Alert.alert('Invalid time', 'Enter times as 24-hour HH:MM format, e.g. 14:00');
      return;
    }
    if (!activeTurf) return;
    setBusy(true);
    try {
      await dispatch(addSlot({ turfId: activeTurf._id || activeTurf.id, slot: { startTime: start, endTime: end } })).unwrap();
      setStart(''); setEnd('');
      onChanged();
    } catch (e) {
      Alert.alert('Could not add slot', e || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (slotId) => {
    Alert.alert('Remove Slot', 'Remove this time slot from your recurring daily schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(deleteSlot({ turfId: activeTurf._id || activeTurf.id, slotId })).unwrap();
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
            <Text style={styles.templateTitle}>Daily Slot Template</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}><Feather name="x" size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <Text style={styles.templateSub}>
            Configure standard recurring time slots. Slots added here appear across every date on your calendar.
          </Text>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {slots.map((s) => (
              <View key={s._id || s.id} style={styles.templateRow}>
                <Text style={styles.templateRowText}>{to12h(s.startTime)} - {to12h(s.endTime)}</Text>
                <TouchableOpacity onPress={() => handleDelete(s._id || s.id)} activeOpacity={0.7}>
                  <Feather name="trash-2" size={16} color={colors.error || '#EF4444'} />
                </TouchableOpacity>
              </View>
            ))}
            {!slots.length && <Text style={styles.templateEmpty}>No recurring slots configured yet.</Text>}
          </ScrollView>

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="06:00"
              placeholderTextColor={colors.textSecondary}
              value={start}
              onChangeText={setStart}
              maxLength={5}
            />
            <Text style={styles.toText}>to</Text>
            <TextInput
              style={styles.input}
              placeholder="07:00"
              placeholderTextColor={colors.textSecondary}
              value={end}
              onChangeText={setEnd}
              maxLength={5}
            />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveText}>Add Time Slot</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: SIZES.padding, paddingTop: 16 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 197, 102, 0.25)',
  },
  templateBtnText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: colors.primary,
  },

  turfPicker: { marginBottom: 16 },
  turfChip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  turfChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  turfChipText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: SIZES.xs,
  },
  turfChipTextActive: {
    color: '#FFFFFF',
  },

  dateStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  calPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calPickerText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: colors.primary,
  },

  dateCarousel: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 16,
  },
  dateCard: {
    width: 66,
    height: 84,
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
  },
  dateCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  todayTag: {
    position: 'absolute',
    top: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  todayTagActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  todayTagText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.primary,
  },
  todayTagTextActive: {
    color: '#FFFFFF',
  },
  dateDayName: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateDayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginVertical: 2,
  },
  dateMonth: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dateTextActive: {
    color: '#FFFFFF',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  statBoxActive: {
    backgroundColor: 'rgba(0, 197, 102, 0.08)',
    borderWidth: 2,
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  gridSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFrozen: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectAllText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },

  dayPartContainer: {
    marginBottom: 20,
  },
  dayPartBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayPartIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPartTitle: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  dayPartRange: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  dayPartBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayPartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark || colors.primary,
  },

  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    width: '48.5%',
    borderRadius: SIZES.radiusLg,
    padding: 12,
    borderWidth: 1.5,
  },
  slotCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  slotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTimeWrap: {
    flex: 1,
  },
  slotStartTime: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  slotEndTime: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statusDotWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  slotCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  slotActionPrompt: {
    fontSize: 10,
    fontWeight: '700',
  },

  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: SIZES.xs,
  },

  emptyGridCard: {
    backgroundColor: colors.card,
    borderRadius: SIZES.radiusLg,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyGridIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyGridTitle: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  emptyGridSub: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  addTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addTemplateText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: SIZES.xs,
  },

  bulkBar: {
    position: 'absolute',
    bottom: 24,
    left: SIZES.padding,
    right: SIZES.padding,
    backgroundColor: colors.card,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulkText: {
    fontWeight: '800',
    color: colors.text,
    fontSize: SIZES.sm,
  },
  bulkClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SIZES.radius,
    backgroundColor: colors.inputBg,
  },
  bulkClearText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: SIZES.xs,
  },
  bulkActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radius,
    backgroundColor: colors.error || '#EF4444',
  },
  bulkActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: SIZES.xs,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: SIZES.radiusLg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: colors.text,
  },
  modalTime: {
    fontSize: SIZES.sm,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  modalStatusLabel: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalStatusValue: {
    fontSize: SIZES.xs,
    fontWeight: '800',
  },
  modalHint: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    backgroundColor: colors.inputBg,
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: SIZES.sm,
  },
  modalActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radius,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: SIZES.sm,
  },

  templateCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: SIZES.radiusLg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: colors.text,
  },
  templateSub: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  templateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  templateRowText: {
    fontSize: SIZES.sm,
    color: colors.text,
    fontWeight: '700',
  },
  templateEmpty: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    paddingVertical: 12,
    textAlign: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: SIZES.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  toText: {
    color: colors.textSecondary,
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
  saveBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    backgroundColor: colors.primary,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: SIZES.sm,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: SIZES.sm,
  },
});

export default SlotsScreen;