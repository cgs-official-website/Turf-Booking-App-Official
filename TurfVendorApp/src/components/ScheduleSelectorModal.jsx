import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../utils/theme';

const ROUND_OPTIONS = [
  { id: 'League', label: 'League Match', icon: 'grid' },
  { id: 'Quarter Final', label: 'Quarter Final', icon: 'layers' },
  { id: 'Semi Final', label: 'Semi Final', icon: 'zap' },
  { id: 'Final', label: 'Final', icon: 'award' },
  { id: '3rd Place Playoff', label: '3rd Place Playoff', icon: 'shield' },
];

export default function ScheduleSelectorModal({
  visible,
  onClose,
  tournament,
  acceptedTeams = [],
  onAutoSchedule,
  onManualSchedule,
  busy = false,
}) {
  const { colors, isDark } = useTheme();

  // Mode: 'choose' | 'manual_form'
  const [mode, setMode] = useState('choose');
  const [selectedRound, setSelectedRound] = useState('League');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');

  const teamsCount = acceptedTeams.length;

  const handleSelectAuto = () => {
    if (teamsCount < 2) {
      Alert.alert(
        'Insufficient Teams',
        `At least 2 accepted teams are required for auto scheduling.\nCurrently accepted: ${teamsCount}.`
      );
      return;
    }
    const cups = tournament?.prizeDetails?.cupsCount || 1;
    Alert.alert(
      'Automated Knockout Draw 🎲',
      `Randomly pair all ${teamsCount} accepted teams into knockout tournament rounds?\n\n- Round 1 pairs generated randomly\n- Winners automatically advance\n- Correct bracket tree calculated (${cups} Cup${cups > 1 ? 's' : ''})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Draw',
          onPress: () => {
            onAutoSchedule(cups);
          },
        },
      ]
    );
  };

  const handleCreateManualFixture = () => {
    if (!teamAId || !teamBId) {
      Alert.alert('Selection Required', 'Please select both Team A and Team B to schedule this fixture.');
      return;
    }
    if (teamAId === teamBId) {
      Alert.alert('Invalid Selection', 'A team cannot play against itself. Please select two distinct teams.');
      return;
    }

    onManualSchedule({
      roundName: selectedRound,
      teamAId,
      teamBId,
    });
  };

  const resetAndClose = () => {
    setMode('choose');
    setTeamAId('');
    setTeamBId('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {mode === 'choose' ? 'How do you want to schedule?' : 'Manual Fixture Setup'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {mode === 'choose'
                  ? `${teamsCount} registered & accepted teams available`
                  : 'Select round and choose two teams to clash'}
              </Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {mode === 'choose' ? (
              <View style={styles.cardsWrap}>
                {/* AUTO CARD */}
                <TouchableOpacity
                  style={[
                    styles.choiceCard,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5',
                      borderColor: '#10B981',
                    },
                  ]}
                  onPress={handleSelectAuto}
                  activeOpacity={0.8}
                  disabled={busy}
                >
                  <View style={[styles.badgeIcon, { backgroundColor: '#10B981' }]}>
                    <Feather name="shuffle" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.choiceContent}>
                    <View style={styles.titleWithTag}>
                      <Text style={[styles.choiceTitle, { color: colors.text }]}>AUTO SCHEDULE</Text>
                      <View style={[styles.recBadge, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.recText}>FAST</Text>
                      </View>
                    </View>
                    <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>
                      Randomly pair all registered & accepted teams. Generates complete knockout rounds (Quarter, Semi, Final) automatically.
                    </Text>
                    <View style={styles.featuresRow}>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={13} color="#10B981" />
                        <Text style={[styles.featureText, { color: colors.text }]}>Instant draw</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={13} color="#10B981" />
                        <Text style={[styles.featureText, { color: colors.text }]}>Auto bracket tree</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={13} color="#10B981" />
                        <Text style={[styles.featureText, { color: colors.text }]}>Fair pairing</Text>
                      </View>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={22} color="#10B981" />
                </TouchableOpacity>

                {/* MANUAL CARD */}
                <TouchableOpacity
                  style={[
                    styles.choiceCard,
                    {
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF',
                      borderColor: '#3B82F6',
                    },
                  ]}
                  onPress={() => setMode('manual_form')}
                  activeOpacity={0.8}
                  disabled={busy}
                >
                  <View style={[styles.badgeIcon, { backgroundColor: '#3B82F6' }]}>
                    <Feather name="edit-3" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.choiceContent}>
                    <View style={styles.titleWithTag}>
                      <Text style={[styles.choiceTitle, { color: colors.text }]}>MANUAL SCHEDULE</Text>
                      <View style={[styles.recBadge, { backgroundColor: '#3B82F6' }]}>
                        <Text style={styles.recText}>CUSTOM</Text>
                      </View>
                    </View>
                    <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>
                      Pick specific round (League, QF, SF, Final) and manually choose Team A vs Team B from registered teams.
                    </Text>
                    <View style={styles.featuresRow}>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={13} color="#3B82F6" />
                        <Text style={[styles.featureText, { color: colors.text }]}>Select matchups</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={13} color="#3B82F6" />
                        <Text style={[styles.featureText, { color: colors.text }]}>Choose rounds</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={13} color="#3B82F6" />
                        <Text style={[styles.featureText, { color: colors.text }]}>Custom order</Text>
                      </View>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={22} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.manualForm}>
                {/* 1. Round Selection */}
                <Text style={[styles.sectionLabel, { color: colors.text }]}>1. Select Round</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roundPillsRow}>
                  {ROUND_OPTIONS.map((opt) => {
                    const isSel = selectedRound === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.roundPill,
                          {
                            backgroundColor: isSel ? colors.primary : colors.inputBg,
                            borderColor: isSel ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedRound(opt.id)}
                      >
                        <Feather name={opt.icon} size={13} color={isSel ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={[styles.roundPillText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 2. Team A Selection */}
                <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>2. Select Team A</Text>
                <View style={styles.teamsGrid}>
                  {acceptedTeams.map((team) => {
                    const isSel = teamAId === team.id;
                    const isOpponent = teamBId === team.id;
                    return (
                      <TouchableOpacity
                        key={`teamA_${team.id}`}
                        style={[
                          styles.teamSelectCard,
                          {
                            backgroundColor: isSel ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : colors.inputBg,
                            borderColor: isSel ? '#10B981' : colors.border,
                            opacity: isOpponent ? 0.35 : 1,
                          },
                        ]}
                        onPress={() => !isOpponent && setTeamAId(team.id)}
                        disabled={isOpponent}
                      >
                        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                          {team.name || team.teamName}
                        </Text>
                        {isSel && <Feather name="check-circle" size={14} color="#10B981" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* VS Indicator */}
                <View style={styles.vsContainer}>
                  <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
                  <View style={[styles.vsCircle, { backgroundColor: colors.primary }]}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                  <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
                </View>

                {/* 3. Team B Selection */}
                <Text style={[styles.sectionLabel, { color: colors.text }]}>3. Select Team B</Text>
                <View style={styles.teamsGrid}>
                  {acceptedTeams.map((team) => {
                    const isSel = teamBId === team.id;
                    const isOpponent = teamAId === team.id;
                    return (
                      <TouchableOpacity
                        key={`teamB_${team.id}`}
                        style={[
                          styles.teamSelectCard,
                          {
                            backgroundColor: isSel ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE') : colors.inputBg,
                            borderColor: isSel ? '#3B82F6' : colors.border,
                            opacity: isOpponent ? 0.35 : 1,
                          },
                        ]}
                        onPress={() => !isOpponent && setTeamBId(team.id)}
                        disabled={isOpponent}
                      >
                        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                          {team.name || team.teamName}
                        </Text>
                        {isSel && <Feather name="check-circle" size={14} color="#3B82F6" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Action Buttons */}
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.backBtn, { borderColor: colors.border }]}
                    onPress={() => setMode('choose')}
                    disabled={busy}
                  >
                    <Feather name="arrow-left" size={16} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.backBtnText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: (!teamAId || !teamBId || busy) ? 0.6 : 1 }]}
                    onPress={handleCreateManualFixture}
                    disabled={!teamAId || !teamBId || busy}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="calendar" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmBtnText}>Schedule Fixture</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
  },
  cardsWrap: {
    gap: 14,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  choiceContent: {
    flex: 1,
  },
  titleWithTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  recBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  choiceDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  manualForm: {
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  roundPillsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  roundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  roundPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamSelectCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  vsLine: {
    flex: 1,
    height: 1,
  },
  vsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
