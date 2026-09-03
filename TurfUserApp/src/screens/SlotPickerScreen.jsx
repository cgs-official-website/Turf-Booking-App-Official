import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal,
  Dimensions, Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { turfsApi } from '../api/turfs';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const nextDays = (n) => {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

const fmtDate = (d) => {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmtDisplay = (d) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

const to12h = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

const timeToMins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minsToTime = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function SlotPickerScreen({ route, navigation }) {
  const { turf } = route.params;
  const turfId = turf._id || turf.id;

  const days = useMemo(() => nextDays(7), []);

  const [selectedDate,  setSelectedDate]  = useState(fmtDate(days[0]));
  const [slots,         setSlots]         = useState([]);
  const [selectedSlot,  setSelectedSlot]  = useState(null);
  const [endSlot,       setEndSlot]       = useState(null);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [sport,         setSport]         = useState(turf.sports?.[0] || turf.sportTypes?.[0] || 'Football');
  const [loading,       setLoading]       = useState(true);

  const { C, dark } = useTheme();

  useEffect(() => {
    setLoading(true);
    setSelectedSlot(null);
    setEndSlot(null);
    turfsApi
      .getAvailability(turfId, selectedDate)
      .then((res) => setSlots(res.slots || []))
      .catch(() => setSlots([
        { start: '06:00', end: '07:00', available: true },
        { start: '07:00', end: '08:00', available: true },
        { start: '08:00', end: '09:00', available: false },
        { start: '09:00', end: '10:00', available: true },
        { start: '10:00', end: '11:00', available: true },
        { start: '11:00', end: '12:00', available: true },
        { start: '14:00', end: '15:00', available: true },
        { start: '15:00', end: '16:00', available: true },
        { start: '16:00', end: '17:00', available: false },
        { start: '17:00', end: '18:00', available: true },
        { start: '18:00', end: '19:00', available: true },
        { start: '19:00', end: '20:00', available: true },
        { start: '20:00', end: '21:00', available: true },
        { start: '21:00', end: '22:00', available: true },
      ]))
      .finally(() => setLoading(false));
  }, [selectedDate, turfId]);

  const endSlots = useMemo(() => {
    if (!selectedSlot) return [];
    const startMin = timeToMins(selectedSlot.start);
    const endMin   = timeToMins(selectedSlot.end);
    const options  = [];
    for (let t = startMin + 60; t <= endMin; t += 60) {
      options.push({
        end:      minsToTime(t),
        duration: (t - startMin) / 60,
      });
    }
    // Fallback 1hr if slot template is 1hr
    if (options.length === 0) {
      options.push({ end: selectedSlot.end, duration: 1 });
    }
    return options;
  }, [selectedSlot]);

  const handleSlotSelect = (slot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setEndSlot(null);
    setShowEndPicker(true);
  };

  const handleConfirm = () => {
    if (!selectedSlot) {
      Alert.alert('Pick a Slot', 'Please select a start time');
      return;
    }
    if (!endSlot) {
      Alert.alert('Pick Duration', 'Please select duration / end time');
      return;
    }
    navigation.navigate('BookingConfirm', {
      turfData:  { ...turf, _id: turfId },
      sport,
      date:      selectedDate,
      startTime: selectedSlot.start,
      endTime:   endSlot.end,
    });
  };

  const PLACEHOLDER = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Turf Hero Background */}
      <Image
        source={{ uri: turf.images?.[0] || PLACEHOLDER }}
        style={styles.heroBg}
        resizeMode="cover"
      />
      <View style={styles.heroOverlay} />

      {/* Hero Header Info */}
      <View style={styles.heroTop}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.heroInfo}>
          <Text style={styles.heroName} numberOfLines={1}>{turf.name}</Text>
          <View style={styles.heroLocRow}>
            <Feather name="map-pin" size={13} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
            <Text style={styles.heroLoc} numberOfLines={1}>
              {turf.location?.address || turf.location?.city || 'Local Stadium'}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Bottom Slot Selection Sheet */}
      <View style={[styles.sheet, { backgroundColor: dark ? '#131E2F' : '#FFFFFF' }, SHADOW.floating]}>
        <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

        <View style={styles.sheetHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="calendar" size={18} color={C.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sheetTitle, { color: C.text }]}>Select Date & Time</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
          {/* 7-Day Date Calendar Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScroll}
          >
            {days.map((d) => {
              const ds     = fmtDate(d);
              const active = ds === selectedDate;
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const monthName = d.toLocaleDateString('en-US', { month: 'short' });

              return (
                <TouchableOpacity
                  key={ds}
                  style={[
                    styles.dateBox,
                    {
                      borderColor: active ? C.primary : C.border,
                      backgroundColor: active ? C.primary : (dark ? '#18273D' : '#F8FAFC'),
                    },
                    active && SHADOW.glow,
                  ]}
                  onPress={() => setSelectedDate(ds)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dateMonth, { color: active ? 'rgba(255,255,255,0.85)' : C.subtext }]}>
                    {monthName}
                  </Text>
                  <Text style={[styles.dateNum, { color: active ? '#FFFFFF' : C.text }]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dateDay, { color: active ? '#FFFFFF' : C.subtext }]}>
                    {dayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Slot Banner */}
          {selectedSlot && endSlot && (
            <View style={[styles.selectedBanner, { backgroundColor: C.primaryLight, borderColor: C.primary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="clock" size={16} color={C.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.selectedTimeText, { color: C.primaryDark || C.primary }]}>
                  {to12h(selectedSlot.start)} → {to12h(endSlot.end)} ({endSlot.duration} Hour)
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedSlot(null); setEndSlot(null); }}>
                <Feather name="x-circle" size={18} color={C.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Time Slots Grid */}
          <Text style={[styles.sectionTitle, { color: C.text }]}>Available Game Slots</Text>

          {loading ? (
            <View style={styles.loadingSlots}>
              <ActivityIndicator color={C.primary} />
              <Text style={[styles.loadingText, { color: C.subtext }]}>Checking real-time court availability...</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.noSlotsWrap}>
              <Text style={[styles.noSlotsText, { color: C.subtext }]}>No slots available for this date.</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot?.start === slot.start;
                const isAvail = slot.available;

                return (
                  <TouchableOpacity
                    key={idx}
                    disabled={!isAvail}
                    style={[
                      styles.slotCard,
                      {
                        borderColor: isSelected
                          ? C.primary
                          : (isAvail ? C.border : C.borderSubtle),
                        backgroundColor: isSelected
                          ? C.primary
                          : (isAvail ? (dark ? '#18273D' : '#FFFFFF') : (dark ? '#121B29' : '#F1F5F9')),
                        opacity: isAvail ? 1 : 0.45,
                      },
                      isSelected && SHADOW.glow,
                    ]}
                    onPress={() => handleSlotSelect(slot)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.slotTime,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : (isAvail ? C.text : C.caption),
                        },
                      ]}
                    >
                      {to12h(slot.start)}
                    </Text>
                    <Text
                      style={[
                        styles.slotStatus,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : (isAvail ? '#10B981' : C.caption),
                        },
                      ]}
                    >
                      {isSelected ? 'SELECTED' : isAvail ? 'Available' : 'Booked'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Floating Confirm Footer */}
        <View style={[styles.footer, { backgroundColor: dark ? '#131E2F' : '#FFFFFF', borderTopColor: C.border }]}>
          <View>
            <Text style={[styles.footerLabel, { color: C.subtext }]}>Total Amount</Text>
            <Text style={[styles.footerPrice, { color: C.primary }]}>
              ₹{(turf.pricePerHour || 800) * (endSlot?.duration || 1)}
            </Text>
          </View>

          <PrimaryButton
            title="Continue to Confirm →"
            onPress={handleConfirm}
            disabled={!selectedSlot || !endSlot}
            style={{ minWidth: 200, height: 50 }}
          />
        </View>
      </View>

      {/* Duration Picker Modal */}
      <Modal visible={showEndPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: dark ? '#131E2F' : '#FFFFFF' }, SHADOW.floating]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Select Duration</Text>
            <Text style={[styles.modalSub, { color: C.subtext }]}>
              Start time: {selectedSlot ? to12h(selectedSlot.start) : ''}
            </Text>

            <View style={styles.durationOptions}>
              {endSlots.map((opt) => (
                <TouchableOpacity
                  key={opt.end}
                  style={[
                    styles.durationItem,
                    {
                      borderColor: endSlot?.end === opt.end ? C.primary : C.border,
                      backgroundColor: endSlot?.end === opt.end ? C.primaryLight : C.card,
                    },
                  ]}
                  onPress={() => {
                    setEndSlot(opt);
                    setShowEndPicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={[styles.durationHours, { color: C.text }]}>{opt.duration} Hour Play</Text>
                    <Text style={[styles.durationEnd, { color: C.subtext }]}>Until {to12h(opt.end)}</Text>
                  </View>
                  <Text style={[styles.durationPrice, { color: C.primary }]}>
                    ₹{(turf.pricePerHour || 800) * opt.duration}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: C.border }]}
              onPress={() => setShowEndPicker(false)}
            >
              <Text style={{ color: C.subtext, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  heroTop: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroInfo: { flex: 1 },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  heroLoc: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },

  sheet: {
    flex: 1,
    marginTop: 150,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    ...FONT.h2,
    fontSize: 17,
    fontWeight: '800',
  },
  dateScroll: {
    gap: 10,
    paddingBottom: 16,
  },
  dateBox: {
    width: 64,
    height: 80,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dateMonth: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dateNum: { fontSize: 20, fontWeight: '900' },
  dateDay: { fontSize: 11, fontWeight: '600' },

  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  selectedTimeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    ...FONT.h3,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    width: '31%',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTime: {
    fontSize: 13,
    fontWeight: '800',
  },
  slotStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  loadingSlots: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  noSlotsWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 13,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  footerLabel: { fontSize: 11, fontWeight: '600' },
  footerPrice: { fontSize: 22, fontWeight: '900' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: RADIUS.xxl,
    padding: 20,
  },
  modalTitle: { ...FONT.h2, fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 13, marginTop: 2, marginBottom: 16 },
  durationOptions: { gap: 10, marginBottom: 16 },
  durationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  durationHours: { fontSize: 14, fontWeight: '800' },
  durationEnd: { fontSize: 12, marginTop: 2 },
  durationPrice: { fontSize: 16, fontWeight: '900' },
  modalCancelBtn: {
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});