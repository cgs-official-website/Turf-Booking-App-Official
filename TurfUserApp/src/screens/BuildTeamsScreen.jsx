import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, Image, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

export default function BuildTeamsScreen({ route, navigation }) {
  const { matchId } = route.params;

  const [match, setMatch] = useState(null);
  const [teamA, setTeamA] = useState({ name: 'Team A', logo: null, playerIds: [] });
  const [teamB, setTeamB] = useState({ name: 'Team B', logo: null, playerIds: [] });
  const [editModal, setEditModal] = useState(false);
  const [editA, setEditA] = useState({ name: '', logo: null });
  const [editB, setEditB] = useState({ name: '', logo: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await matchStorage.getMatch(matchId);
      if (!m) return;
      setMatch(m);

      // split players alternately if not already split
      if (m.teams?.A?.playerIds?.length || m.teams?.B?.playerIds?.length) {
        setTeamA(m.teams.A);
        setTeamB(m.teams.B);
      } else {
        const ids = m.players.map((p) => p.id);
        const a = ids.filter((_, i) => i % 2 === 0);
        const b = ids.filter((_, i) => i % 2 === 1);
        setTeamA({ name: 'Team A', logo: null, playerIds: a, captainId: a[0] || null });
        setTeamB({ name: 'Team B', logo: null, playerIds: b, captainId: b[0] || null });
      }
    })();
  }, [matchId]);

  const playerById = (id) => match?.players.find((p) => p.id === id);

  const swapTeam = (id) => {
    if (teamA.playerIds.includes(id)) {
      setTeamA((t) => ({ ...t, playerIds: t.playerIds.filter((x) => x !== id) }));
      setTeamB((t) => ({ ...t, playerIds: [...t.playerIds, id] }));
    } else {
      setTeamB((t) => ({ ...t, playerIds: t.playerIds.filter((x) => x !== id) }));
      setTeamA((t) => ({ ...t, playerIds: [...t.playerIds, id] }));
    }
  };

  const openEdit = () => {
    setEditA({ name: teamA.name, logo: teamA.logo });
    setEditB({ name: teamB.name, logo: teamB.logo });
    setEditModal(true);
  };

  const pickLogo = (which) => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (res) => {
      if (res.didCancel || res.errorCode) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      if (which === 'A') setEditA((e) => ({ ...e, logo: uri }));
      else setEditB((e) => ({ ...e, logo: uri }));
    });
  };

  const saveEdit = () => {
    setTeamA((t) => ({ ...t, name: editA.name || 'Team A', logo: editA.logo }));
    setTeamB((t) => ({ ...t, name: editB.name || 'Team B', logo: editB.logo }));
    setEditModal(false);
  };

  const handleContinue = async () => {
    if (teamA.playerIds.length === 0 || teamB.playerIds.length === 0) {
      Alert.alert('Need players', 'Both teams need at least one player');
      return;
    }
    setSaving(true);
    try {
      const updated = await matchStorage.updateMatch(matchId, {
        teams: { A: teamA, B: teamB },
        status: 'upcoming',
      });
      await matchStorage.addTimeline(matchId, 'Teams finalized');
      navigation.replace('Match', { matchId: updated.id });
    } finally {
      setSaving(false);
    }
  };

  if (!match) return <View style={styles.root} />;

  const renderTeam = (team, label) => (
    <View style={styles.teamBlock}>
      <View style={styles.teamHeaderRow}>
        {team.logo ? (
          <Image source={{ uri: team.logo }} style={styles.teamLogoImg} />
        ) : (
          <View style={styles.teamLogoPlaceholder}>
            <Icon name="shield-outline" size={14} color={COLORS.subtext} />
          </View>
        )}
        <Text style={styles.teamName}>{team.name}</Text>
      </View>
      {team.playerIds.map((id) => {
        const p = playerById(id);
        if (!p) return null;
        const isCaptain = team.captainId === id;
        return (
          <TouchableOpacity key={id} style={styles.playerRow} onPress={() => swapTeam(id)}>
            <View style={styles.playerLeft}>
              <View style={styles.avatar}>
                <Icon name="person" size={16} color={COLORS.subtext} />
              </View>
              <Text style={styles.playerName}>{p.name}</Text>
            </View>
            {isCaptain ? (
              <Icon name="star" size={18} color="#f59e0b" />
            ) : (
              <View style={styles.radio} />
            )}
          </TouchableOpacity>
        );
      })}
      {team.playerIds.length === 0 && (
        <Text style={styles.emptyText}>No players — tap a player below to add here</Text>
      )}
    </View>
  );

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
        <View style={[styles.stepBar, styles.stepActive]} />
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Build Teams</Text>
        <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
          <Icon name="pencil" size={13} color={COLORS.primary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {renderTeam(teamA, 'A')}
        {renderTeam(teamB, 'B')}
        <Text style={styles.hint}>Tap a player to move them between teams</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} disabled={saving} onPress={handleContinue}>
          <Text style={styles.continueText}>{saving ? 'Please wait…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Details modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Details</Text>

            <Text style={styles.label}>Team A</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your team name"
              placeholderTextColor={COLORS.subtext}
              value={editA.name}
              onChangeText={(v) => setEditA((e) => ({ ...e, name: v }))}
            />
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickLogo('A')}>
              {editA.logo ? (
                <Image source={{ uri: editA.logo }} style={styles.uploadPreview} />
              ) : (
                <View style={styles.uploadIconCircle}>
                  <Icon name="person-outline" size={20} color={COLORS.subtext} />
                </View>
              )}
              <Text style={styles.uploadTitle}>Upload Team logo</Text>
              <Text style={styles.uploadSub}>Tap to upload your Turf logo</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: SPACING.md }]}>Team B</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your team name"
              placeholderTextColor={COLORS.subtext}
              value={editB.name}
              onChangeText={(v) => setEditB((e) => ({ ...e, name: v }))}
            />
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickLogo('B')}>
              {editB.logo ? (
                <Image source={{ uri: editB.logo }} style={styles.uploadPreview} />
              ) : (
                <View style={styles.uploadIconCircle}>
                  <Icon name="person-outline" size={20} color={COLORS.subtext} />
                </View>
              )}
              <Text style={styles.uploadTitle}>Upload Team logo</Text>
              <Text style={styles.uploadSub}>Tap to upload your Turf logo</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
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

  titleRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg },
  sectionTitle:{ fontSize: 18, fontWeight: '800', color: COLORS.text },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.greenSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.round },
  editBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  teamBlock:   { marginBottom: SPACING.lg },
  teamHeaderRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  teamLogoImg: { width: 26, height: 26, borderRadius: 13 },
  teamLogoPlaceholder: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  teamName:    { fontWeight: '800', fontSize: 14, color: COLORS.text },

  playerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12, marginBottom: SPACING.sm, backgroundColor: '#fff' },
  playerLeft:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar:      { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  playerName:  { fontSize: 14, fontWeight: '600', color: COLORS.text },
  radio:       { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border },
  emptyText:   { fontSize: 12, color: COLORS.subtext, fontStyle: 'italic' },
  hint:        { fontSize: 11, color: COLORS.subtext, textAlign: 'center', marginTop: SPACING.sm },

  footer:      { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  continueBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  continueText:{ color: '#fff', fontWeight: '800', fontSize: 15 },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACING.lg },
  modalSheet:  { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: SPACING.lg, maxHeight: '85%' },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  label:       { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 14, color: COLORS.text, marginBottom: SPACING.sm },
  uploadBox:   { borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: RADIUS.lg, alignItems: 'center', paddingVertical: SPACING.md, backgroundColor: COLORS.greenSoft },
  uploadIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  uploadPreview: { width: 48, height: 48, borderRadius: 24, marginBottom: 6 },
  uploadTitle: { fontWeight: '700', fontSize: 13, color: COLORS.text },
  uploadSub:   { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  cancelBtn:   { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  cancelText:  { fontWeight: '700', color: COLORS.text },
  saveBtn:     { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  saveText:    { fontWeight: '700', color: '#fff' },
});