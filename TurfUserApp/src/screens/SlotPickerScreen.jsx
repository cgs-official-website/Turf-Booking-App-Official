import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal,
  Dimensions, Image,
} from 'react-native';
import { turfsApi }    from '../api/turfs';
import { bookingsApi } from '../api/bookings';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme'; // <-- Dark mode custom hook proper ah import panniyachu

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

// FIX: vendor "Slot Template" la 06:00-10:00 mari oru periya range ah
// single slot ah than DB save pandrudhu. Idha backend split panna maatengudhu
// (turfController.js athukku venumnu vera reason irukalam), so front-end
// thaan andha ஒரே slot oda start→end range ku ulla, ஒவ்வொரு mani ah
// end-time option ah generate panna vendiyathu (1hr, 2hr, 3hr... booking).
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

  // ── Fix: support both _id and id ──
  const turfId = turf._id || turf.id;

  const days = useMemo(() => nextDays(7), []);

  const [selectedDate,  setSelectedDate]  = useState(fmtDate(days[0]));
  const [slots,         setSlots]         = useState([]);
  const [selectedSlot,  setSelectedSlot]  = useState(null);
  const [endSlot,       setEndSlot]       = useState(null);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [sport,         setSport]         = useState(turf.sports?.[0] || '');
  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  
  const { C, dark } = useTheme(); // <-- Dynamic custom theme extract panniyachu

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
        { start: '12:00', end: '13:00', available: true },
        { start: '13:00', end: '14:00', available: true },
        { start: '14:00', end: '15:00', available: true },
        { start: '15:00', end: '16:00', available: true },
        { start: '16:00', end: '17:00', available: false },
        { start: '17:00', end: '18:00', available: true },
        { start: '18:00', my: '19:00', end: '19:00', available: true },
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
    // 1hr, 2hr, 3hr... varaikkum, andha slot oda end time varaikkum than
    for (let t = startMin + 60; t <= endMin; t += 60) {
      options.push({
        end:      minsToTime(t),
        duration: (t - startMin) / 60,
      });
    }
    return options;
  }, [selectedSlot]);

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setEndSlot(null);
    setShowEndPicker(true);
  };

  const handleConfirm = () => {
    if (!selectedSlot) {
      Alert.alert('Pick a slot', 'Please select a start time');
      return;
    }
    if (!endSlot) {
      Alert.alert('Pick end time', 'Please select an end time');
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

      {/* Turf hero image */}
      <Image
        source={{ uri: turf.images?.[0] || PLACEHOLDER }}
        style={styles.heroBg}
        resizeMode="cover"
      />

      {/* Hero overlay */}
      <View style={styles.heroOverlay}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{turf.name}</Text>
          <View style={styles.heroLocRow}>
            <Icon name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroLoc}>{turf.location?.address}</Text>
          </View>
          <Text style={styles.heroPrice}>
            ₹{turf.pricePerHour}
            <Text style={styles.heroPriceUnit}>/hour</Text>
          </Text>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={[styles.sheet, { backgroundColor: C.card }]}>
        <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

        <View style={styles.sheetHeader}>
          <Icon name="calendar-outline" size={20} color={C.primary} />
          <Text style={[styles.sheetTitle, { color: C.text }]}>Select your slot</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >

          {/* Sport selector */}
          {turf.sports?.length > 1 && (
            <View style={styles.sportRow}>
              {turf.sports.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sportPill, { borderColor: C.border }, sport === s && [styles.sportPillActive, { backgroundColor: C.primary, borderColor: C.primary }]]}
                  onPress={() => setSport(s)}
                >
                  <Text style={[styles.sportPillText, { color: C.text }, sport === s && styles.sportPillTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Date selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScroll}
          >
            {days.map((d) => {
              const ds     = fmtDate(d);
              const active = ds === selectedDate;
              const parts  = fmtDisplay(d).split(' ');
              return (
                <TouchableOpacity
                  key={ds}
                  style={[styles.dateBox, { borderColor: C.border }, active && [styles.dateBoxActive, { backgroundColor: C.primary, borderColor: C.primary }]]}
                  onPress={() => setSelectedDate(ds)}
                >
                  <Text style={[styles.dateMonth, { color: C.subtext }, active && styles.dateTextActive]}>
                    {parts[0]}
                  </Text>
                  <Text style={[styles.dateNum, { color: C.text }, active && styles.dateTextActive]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dateDay, { color: C.subtext }, active && styles.dateTextActive]}>
                    {parts[2]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected slot display */}
          {selectedSlot && endSlot && (
            <View style={[styles.selectedDisplay, { backgroundColor: C.greenSoft }]}>
              <Icon name="time-outline" size={16} color={C.primary} />
              <Text style={[styles.selectedText, { color: C.primary }]}>
                {to12h(selectedSlot.start)} → {to12h(endSlot.end)}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedSlot(null); setEndSlot(null); }}>
                <Icon name="close-circle" size={18} color={C.subtext} />
              </TouchableOpacity>
            </View>
          )}

          {/* Available slots */}
          <Text style={[styles.sectionLabel, { color: C.text }]}>Available slots</Text>
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: SPACING.lg }} />
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((s) => {
                const isSelected = selectedSlot?.start === s.start;
                return (
                  <TouchableOpacity
                    key={s.start}
                    disabled={!s.available}
                    style={[
                      styles.slotBox,
                      { borderColor: C.primary + '40', backgroundColor: C.greenSoft },
                      isSelected   && [styles.slotBoxActive, { backgroundColor: C.primary, borderColor: C.primary }],
                      !s.available && [styles.slotBoxDisabled, { backgroundColor: C.bgSoft, borderColor: C.border }],
                    ]}
                    onPress={() => handleSlotSelect(s)}
                  >
                    <Text style={[
                      styles.slotText,
                      { color: C.primary },
                      isSelected   && styles.slotTextActive,
                      !s.available && [styles.slotTextDisabled, { color: C.subtext }],
                    ]}>
                      {to12h(s.start)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {slots.length === 0 && (
                <Text style={[styles.noSlots, { color: C.subtext }]}>No slots available</Text>
              )}
            </View>
          )}

        </ScrollView>
      </View>

      {/* End Time Picker Modal */}
      <Modal visible={showEndPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Select End Time</Text>
              <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                <Icon name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.slotGrid}>
              {endSlots.map((s) => {
                const isSelected = endSlot?.end === s.end;
                return (
                  <TouchableOpacity
                    key={s.end}
                    style={[styles.slotBox, { borderColor: C.primary + '40', backgroundColor: C.greenSoft }, isSelected && [styles.slotBoxActive, { backgroundColor: C.primary, borderColor: C.primary }]]}
                    onPress={() => { setEndSlot(s); setShowEndPicker(false); }}
                  >
                    <Text style={[styles.slotText, { color: C.primary }, isSelected && styles.slotTextActive]}>
                      {to12h(s.end)}
                    </Text>
                    <Text style={[styles.slotDurationText, { color: C.primary }, isSelected && styles.slotTextActive]}>
                      {s.duration} hr{s.duration > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {endSlots.length === 0 && (
                <Text style={[styles.noSlots, { color: C.subtext }]}>No end times available</Text>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            { backgroundColor: C.primary },
            (!selectedSlot || !endSlot) && [styles.confirmBtnDisabled, { backgroundColor: C.subtext }],
          ]}
          onPress={handleConfirm}
          disabled={submitting || !selectedSlot || !endSlot}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.confirmBtnText}>
                {selectedSlot && endSlot
                  ? `Book ${to12h(selectedSlot.start)} - ${to12h(endSlot.end)}`
                  : 'Select a slot to continue'
                }
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:                { flex: 1 },
  heroBg:              { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.42 },
  heroOverlay:         { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.42, backgroundColor: 'rgba(0,0,0,0.35)', padding: SPACING.lg, paddingTop: 50, justifyContent: 'space-between' },
  backBtn:             { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  heroInfo:            { paddingBottom: SPACING.lg },
  heroName:            { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroLocRow:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroLoc:             { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroPrice:           { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 8 },
  heroPriceUnit:       { fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.8)' },
  sheet:               { position: 'absolute', bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.65, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  sheetHandle:         { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },
  sheetHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  sheetTitle:          { fontSize: 18, fontWeight: '700', flex: 1, marginLeft: SPACING.sm },
  sportRow:            { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  sportPill:           { paddingHorizontal: SPACING.lg, paddingVertical: 8, borderRadius: RADIUS.round, borderWidth: 1 },
  sportPillActive:     { },
  sportPillText:       { fontWeight: '600', fontSize: 13 },
  sportPillTextActive: { color: '#fff' },
  dateScroll:          { gap: SPACING.sm, paddingBottom: SPACING.md },
  dateBox:             { width: 58, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1 },
  dateBoxActive:       { },
  dateMonth:           { fontSize: 10, fontWeight: '600' },
  dateNum:             { fontSize: 20, fontWeight: '800' },
  dateDay:             { fontSize: 10 },
  dateTextActive:      { color: '#fff' },
  selectedDisplay:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  selectedText:        { flex: 1, fontWeight: '700', fontSize: 14 },
  sectionLabel:        { fontSize: 15, fontWeight: '700', marginBottom: SPACING.md },
  slotGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  slotBox:             { paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, minWidth: 95, alignItems: 'center' },
  slotBoxActive:       { },
  slotBoxDisabled:     { },
  slotText:            { fontWeight: '600', fontSize: 13 },
  slotDurationText:    { fontWeight: '500', fontSize: 11, marginTop: 2, opacity: 0.7 },
  slotTextActive:      { color: '#fff' },
  slotTextDisabled:    { },
  noSlots:             { fontSize: 13, padding: SPACING.md },
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:           { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40 },
  modalHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle:          { fontSize: 18, fontWeight: '700' },
  footer:              { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, borderTopWidth: 1 },
  confirmBtn:          { paddingVertical: 16, borderRadius: RADIUS.lg, alignItems: 'center' },
  confirmBtnDisabled:  { },
  confirmBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});