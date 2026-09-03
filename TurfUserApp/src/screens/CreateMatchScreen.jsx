import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, FlatList,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import { getSportIconComponent } from '../components/SportChip';
import { matchStorage } from '../utils/matchStorage';
import PrimaryButton from '../components/PrimaryButton';

const SPORTS = ['Cricket', 'Football', 'Badminton', 'Volleyball', 'Basketball', 'Tennis'];

export default function CreateMatchScreen({ route, navigation }) {
  const params = route.params || {};
  const { C, dark } = useTheme();

  const [place] = useState(params.venue || params.place || '');
  const [sport, setSport] = useState(params.sport || 'Cricket');
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
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Create Match Room</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Step progress */}
      <View style={styles.stepsRow}>
        <View style={[styles.stepBar, { backgroundColor: C.primary }]} />
        <View style={[styles.stepBar, { backgroundColor: C.border }]} />
        <View style={[styles.stepBar, { backgroundColor: C.border }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Match Configuration</Text>

        <Text style={[styles.label, { color: C.text }]}>Venue / Stadium</Text>
        <View style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="map-pin" size={16} color={C.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.inputText, { color: C.text }]}>{place || 'Select ground'}</Text>
        </View>

        <Text style={[styles.label, { color: C.text }]}>Sport Category</Text>
        <TouchableOpacity
          style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => setSportModal(true)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {getSportIconComponent(sport, 16, C.primary)}
            <Text style={[styles.inputText, { marginLeft: 8, color: C.text }]}>
              {sport || 'Choose sport'}
            </Text>
          </View>
          <Feather name="chevron-down" size={18} color={C.subtext} />
        </TouchableOpacity>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Game Date</Text>
            <View style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <TextInput
                style={[styles.inputText, { color: C.text }]}
                value={date}
                onChangeText={setDate}
                placeholder="Today"
                placeholderTextColor={C.caption}
              />
            </View>
          </View>
          <View style={{ width: SPACING.md }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Match Time</Text>
            <View style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <TextInput
                style={[styles.inputText, { color: C.text }]}
                value={time}
                onChangeText={setTime}
                placeholder="07:00 PM"
                placeholderTextColor={C.caption}
              />
            </View>
          </View>
        </View>

        {/* Play with strangers */}
        <Text style={[styles.label, { marginTop: SPACING.lg, color: C.text }]}>
          Open to Public Players?
        </Text>
        <Text style={[styles.sublabel, { color: C.subtext }]}>
          Allow other players in your city to request joining this match room
        </Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: strangers === 'yes' ? C.primary : C.card, borderColor: strangers === 'yes' ? C.primary : C.border },
            ]}
            onPress={() => setStrangers('yes')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: strangers === 'yes' ? '#FFFFFF' : C.text }]}>
              Yes, Open Match
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: strangers === 'no' ? C.primary : C.card, borderColor: strangers === 'no' ? C.primary : C.border },
            ]}
            onPress={() => setStrangers('no')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: strangers === 'no' ? '#FFFFFF' : C.text }]}>
              No, Private Squad
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <PrimaryButton
          title="Continue to Select Players →"
          onPress={handleNext}
          loading={saving}
          disabled={!canProceed}
        />
      </View>

      {/* Sport selection modal */}
      <Modal visible={sportModal} transparent animationType="fade" onRequestClose={() => setSportModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSportModal(false)}
        >
          <View style={[styles.modalBox, { backgroundColor: C.card, borderColor: C.border }, SHADOW.floating]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Select Sport</Text>
            <FlatList
              data={SPORTS}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sportRow, { borderBottomColor: C.border }]}
                  onPress={() => { setSport(item); setSportModal(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.sportIconWrap, { backgroundColor: C.bgSoft }]}>
                      {getSportIconComponent(item, 18, C.primary)}
                    </View>
                    <Text style={[styles.sportRowText, { color: C.text }]}>{item}</Text>
                  </View>
                  {sport === item && <Feather name="check" size={18} color={C.primary} />}
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
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...FONT.h2, fontSize: 18, fontWeight: '800' },
  stepsRow:    { flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.lg, marginBottom: 12 },
  stepBar:     { flex: 1, height: 4, borderRadius: 2 },
  sectionTitle:{ ...FONT.h2, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  label:       { fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  sublabel:    { fontSize: 12, marginBottom: 8 },
  inputBox:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 14, height: 50 },
  inputText:   { fontSize: 14, flex: 1 },
  row2:        { flexDirection: 'row', marginTop: 4 },
  toggleRow:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  toggleBtn:   { flex: 1, borderWidth: 1.5, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  toggleText:  { fontWeight: '800', fontSize: 13 },
  footer:      { padding: SPACING.lg, borderTopWidth: 1 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: SPACING.lg },
  modalBox:    { borderRadius: RADIUS.xxl, padding: 20, borderWidth: 1 },
  modalTitle:  { ...FONT.h2, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  sportRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  sportIconWrap:{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sportRowText:{ fontSize: 15, fontWeight: '700' },
});