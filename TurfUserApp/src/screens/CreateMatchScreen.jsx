import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

const SPORTS = ['Cricket', 'Football', 'Badminton', 'Volleyball', 'Basketball'];

export default function CreateMatchScreen({ route, navigation }) {
  const params = route.params || {};

  const [place] = useState(params.venue || params.place || '');
  const [sport, setSport] = useState(params.sport || '');
  const [sportModal, setSportModal] = useState(false);
  const [date, setDate] = useState(params.date ? String(params.date) : 'Today');
  const [time, setTime] = useState(params.time || '07:00 PM');
  const [strangers, setStrangers] = useState(null); // 'yes' | 'no'
  const [saving, setSaving] = useState(false);

  const canProceed = place.trim().length > 0 && sport && strangers !== null;

  const handleNext = async () => {
    if (!canProceed || saving) return;
    setSaving(true);
    try {
      const match = await matchStorage.createMatch({
        bookingId: params.bookingId || null,
        place,
        sport,
        date,
        time,
        playWithStrangers: strangers === 'yes',
      });
      navigation.navigate('SelectPlayers', { matchId: match.id });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Match</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Step progress */}
      <View style={styles.stepsRow}>
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={styles.stepBar} />
        <View style={styles.stepBar} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>
        <Text style={styles.sectionTitle}>Match Details</Text>

        <Text style={styles.label}>Place</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputText}>{place || 'Turf name'}</Text>
        </View>

        <Text style={styles.label}>Sports</Text>
        <TouchableOpacity style={styles.inputBox} onPress={() => setSportModal(true)}>
          <Text style={[styles.inputText, !sport && { color: COLORS.subtext }]}>
            {sport || 'Select'}
          </Text>
          <Icon name="chevron-down" size={18} color={COLORS.subtext} />
        </TouchableOpacity>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                value={date}
                onChangeText={setDate}
                placeholder="Today"
                placeholderTextColor={COLORS.subtext}
              />
            </View>
          </View>
          <View style={{ width: SPACING.md }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Time</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                value={time}
                onChangeText={setTime}
                placeholder="07:00 PM"
                placeholderTextColor={COLORS.subtext}
              />
            </View>
          </View>
        </View>

        <View style={{ marginTop: SPACING.lg }}>
          <Text style={styles.label}>Play with strangers?</Text>
          <Text style={styles.sublabel}>Open your match nearby players.</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, strangers === 'yes' && styles.toggleBtnActive]}
              onPress={() => setStrangers('yes')}
            >
              <Text style={[styles.toggleText, strangers === 'yes' && styles.toggleTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, strangers === 'no' && styles.toggleBtnActive]}
              onPress={() => setStrangers('no')}
            >
              <Text style={[styles.toggleText, strangers === 'no' && styles.toggleTextActive]}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed && { opacity: 0.5 }]}
          disabled={!canProceed || saving}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>{saving ? 'Please wait…' : 'Next'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sport picker modal */}
      <Modal visible={sportModal} transparent animationType="fade" onRequestClose={() => setSportModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSportModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Sport</Text>
            <FlatList
              data={SPORTS}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sportRow}
                  onPress={() => { setSport(item); setSportModal(false); }}
                >
                  <Text style={styles.sportRowText}>{item}</Text>
                  {sport === item && <Icon name="checkmark" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...FONT.h3, color: COLORS.text },

  stepsRow:    { flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  stepBar:     { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  stepActive:  { backgroundColor: COLORS.primary },

  sectionTitle:{ fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  label:       { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md, marginBottom: 6 },
  sublabel:    { fontSize: 12, color: COLORS.subtext, marginBottom: SPACING.sm },
  inputBox:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, backgroundColor: '#fff' },
  inputText:   { fontSize: 14, color: COLORS.text, flex: 1 },
  row2:        { flexDirection: 'row' },

  toggleRow:   { flexDirection: 'row', gap: SPACING.md, marginTop: 4 },
  toggleBtn:   { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText:  { fontWeight: '700', color: COLORS.text },
  toggleTextActive: { color: '#fff' },

  footer:      { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  nextBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  nextText:    { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:  { backgroundColor: '#fff', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, maxHeight: '60%' },
  modalTitle:  { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  sportRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sportRowText:{ fontSize: 14, color: COLORS.text },
});