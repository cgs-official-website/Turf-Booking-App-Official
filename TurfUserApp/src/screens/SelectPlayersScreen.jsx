import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage, playerStorage } from '../utils/matchStorage';

export default function SelectPlayersScreen({ route, navigation }) {
  const { matchId } = route.params;

  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState({}); // id -> true
  const [guestModal, setGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await playerStorage.getRecentPlayers();
      setPlayers(list);
      const initial = {};
      list.forEach((p) => { initial[p.id] = true; }); // default all selected, like screenshot
      setSelected(initial);
    })();
  }, []);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleSaveGuest = async () => {
    if (!guestName.trim()) {
      Alert.alert('Name required', 'Please enter guest name');
      return;
    }
    const guest = await playerStorage.addGuestPlayer({ name: guestName.trim(), phone: guestPhone.trim() });
    setPlayers((p) => [...p, guest]);
    setSelected((s) => ({ ...s, [guest.id]: true }));
    setGuestName('');
    setGuestPhone('');
    setGuestModal(false);
  };

  const handleNext = async () => {
    if (selectedCount < 2 || saving) return;
    setSaving(true);
    try {
      const chosen = players.filter((p) => selected[p.id]);
      await matchStorage.updateMatch(matchId, { players: chosen });
      navigation.navigate('BuildTeams', { matchId });
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

      <View style={styles.stepsRow}>
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={styles.stepBar} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        <Text style={styles.sectionTitle}>Select Players</Text>
        <Text style={styles.sectionSub}>Choose who's playing</Text>

        {players.map((p) => (
          <TouchableOpacity key={p.id} style={styles.playerRow} onPress={() => toggle(p.id)}>
            <View style={styles.playerLeft}>
              <View style={styles.avatar}>
                <Icon name="person" size={16} color={COLORS.subtext} />
              </View>
              <Text style={styles.playerName}>{p.name}</Text>
              {p.isGuest && <Text style={styles.guestTag}>Guest</Text>}
            </View>
            <View style={[styles.radio, selected[p.id] && styles.radioActive]}>
              {selected[p.id] && <Icon name="checkmark" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addGuestRow} onPress={() => setGuestModal(true)}>
          <Icon name="person-add-outline" size={16} color={COLORS.primary} />
          <Text style={styles.addGuestText}>Add Guest / Invite by Phone</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, selectedCount < 2 && { opacity: 0.5 }]}
          disabled={selectedCount < 2 || saving}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>
            {saving ? 'Please wait…' : `Next · ${selectedCount} selected`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Guest modal */}
      <Modal visible={guestModal} transparent animationType="slide" onRequestClose={() => setGuestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Guest</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Madhan Raj"
              placeholderTextColor={COLORS.subtext}
              value={guestName}
              onChangeText={setGuestName}
            />

            <Text style={styles.label}>Mobile number (option)</Text>
            <TextInput
              style={styles.input}
              placeholder="98774 32156"
              placeholderTextColor={COLORS.subtext}
              value={guestPhone}
              onChangeText={setGuestPhone}
              keyboardType="phone-pad"
            />

            <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setGuestModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGuest}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

  sectionTitle:{ fontSize: 18, fontWeight: '800', color: COLORS.text },
  sectionSub:  { fontSize: 12, color: COLORS.subtext, marginBottom: SPACING.md },

  playerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12, marginBottom: SPACING.sm, backgroundColor: '#fff' },
  playerLeft:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar:      { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  playerName:  { fontSize: 14, fontWeight: '600', color: COLORS.text },
  guestTag:    { fontSize: 10, color: COLORS.primary, backgroundColor: COLORS.greenSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.round, overflow: 'hidden' },
  radio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  addGuestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 14, marginTop: SPACING.sm },
  addGuestText:{ color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  footer:      { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  nextBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  nextText:    { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACING.lg },
  modalSheet:  { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: SPACING.lg },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  label:       { fontSize: 12, color: COLORS.subtext, marginBottom: 6, marginTop: SPACING.sm },
  input:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 14, color: COLORS.text },
  cancelBtn:   { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  cancelText:  { fontWeight: '700', color: COLORS.text },
  saveBtn:     { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  saveText:    { fontWeight: '700', color: '#fff' },
});