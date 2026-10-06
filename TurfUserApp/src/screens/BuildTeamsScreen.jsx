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

      // Ensure creator is present if no players selected
      const effectivePlayers = (m.players && m.players.length > 0)
        ? m.players
        : [{ id: 'host_creator', name: 'You (Host)', isGuest: false }];

      // split players alternately if not already split
      if (m.teams?.A?.playerIds?.length || m.teams?.B?.playerIds?.length) {
        setTeamA({
          ...m.teams.A,
          captainId: m.teams.A.captainId || m.teams.A.playerIds[0] || null,
        });
        setTeamB({
          ...m.teams.B,
          captainId: m.teams.B.captainId || m.teams.B.playerIds[0] || null,
        });
      } else {
        const ids = effectivePlayers.map((p) => p.id);
        const a = ids.filter((_, i) => i % 2 === 0);
        const b = ids.filter((_, i) => i % 2 === 1);
        setTeamA({ name: 'Team A', logo: null, playerIds: a, captainId: a[0] || null });
        setTeamB({ name: 'Team B', logo: null, playerIds: b, captainId: b[0] || null });
      }
    })();
  }, [matchId]);

  const playerById = (id) => {
    if (id === 'host_creator') return { id: 'host_creator', name: 'You (Host)' };
    return match?.players?.find((p) => p.id === id);
  };

  const setCaptain = (teamKey, playerId) => {
    if (teamKey === 'A') {
      setTeamA((t) => ({ ...t, captainId: playerId }));
    } else {
      setTeamB((t) => ({ ...t, captainId: playerId }));
    }
  };

  const swapTeam = (id) => {
    if (teamA.playerIds.includes(id)) {
      const newA = teamA.playerIds.filter((x) => x !== id);
      const newB = [...teamB.playerIds, id];
      const newACaptain = teamA.captainId === id ? (newA[0] || null) : teamA.captainId;
      const newBCaptain = teamB.captainId || id;
      setTeamA((t) => ({ ...t, playerIds: newA, captainId: newACaptain }));
      setTeamB((t) => ({ ...t, playerIds: newB, captainId: newBCaptain }));
    } else {
      const newB = teamB.playerIds.filter((x) => x !== id);
      const newA = [...teamA.playerIds, id];
      const newBCaptain = teamB.captainId === id ? (newB[0] || null) : teamB.captainId;
      const newACaptain = teamA.captainId || id;
      setTeamB((t) => ({ ...t, playerIds: newB, captainId: newBCaptain }));
      setTeamA((t) => ({ ...t, playerIds: newA, captainId: newACaptain }));
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
    const isOpenMatch = match?.playWithStrangers === true;

    // For Private Squad with no players, alert gently if both teams are empty
    if (!isOpenMatch && teamA.playerIds.length === 0 && teamB.playerIds.length === 0) {
      Alert.alert('Need players', 'Please select at least one player for your private squad team.');
      return;
    }

    setSaving(true);
    try {
      const updated = await matchStorage.updateMatch(matchId, {
        teams: { A: teamA, B: teamB },
        status: 'upcoming',
      });
      await matchStorage.addTimeline(matchId, 'Match Room Created');
      navigation.replace('Match', { matchId: updated.id });
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save match room');
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
          <View key={id} style={styles.playerRow}>
            <TouchableOpacity
              style={styles.playerLeftTouchable}
              onPress={() => swapTeam(id)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Icon name="person" size={16} color={COLORS.subtext} />
              </View>
              <Text style={styles.playerName}>{p.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captainBtn}
              onPress={() => setCaptain(label, id)}
              activeOpacity={0.7}
            >
              {isCaptain ? (
                <View style={styles.captainBadgeActive}>
                  <Icon name="star" size={14} color="#92400E" />
                  <Text style={styles.captainBadgeTextActive}>Leader</Text>
                </View>
              ) : (
                <View style={styles.captainBadgeInactive}>
                  <Icon name="star-outline" size={14} color={COLORS.subtext} />
                  <Text style={styles.captainBadgeTextInactive}>Set Leader</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
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
        <Text style={styles.hint}>Tap player to swap teams • Tap ⭐ to set Team Leader</Text>
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

  playerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10, marginBottom: SPACING.sm, backgroundColor: '#fff' },
  playerLeftTouchable: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1, paddingVertical: 2 },
  avatar:      { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  playerName:  { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  captainBtn:  { paddingVertical: 4, paddingHorizontal: 4 },
  captainBadgeActive: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.round },
  captainBadgeTextActive: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  captainBadgeInactive: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bgSoft, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.round },
  captainBadgeTextInactive: { fontSize: 11, fontWeight: '700', color: COLORS.subtext },
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