import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

export default function MatchSetupWizardModal({
  visible,
  onClose,
  match,
  tournament,
  onStartMatch,
  busy = false,
}) {
  const { colors, isDark } = useTheme();

  // Step: 1: Toss, 2: Squads, 3: Openers & Bowler
  const [step, setStep] = useState(1);

  // Step 1: Toss
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [decision, setDecision] = useState('bat'); // 'bat' | 'bowl'

  // Step 2: Playing Squads
  const [squadA, setSquadA] = useState([]);
  const [squadB, setSquadB] = useState([]);

  // Step 3: Striker, Non-Striker, Bowler
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [maxOvers, setMaxOvers] = useState('10');

  useEffect(() => {
    if (match) {
      setStep(1);
      const defaultWinner = match.toss?.winnerId || match.teamA?.id || '';
      setTossWinnerId(defaultWinner);
      setDecision(match.toss?.decision || 'bat');

      // Initialize Squad A
      const rawPlayersA = Array.isArray(match.teamA?.players) && match.teamA.players.length > 0
        ? match.teamA.players
        : Array.from({ length: 11 }, (_, i) => ({ id: `pA_${i + 1}`, name: `Player ${i + 1}` }));
      setSquadA(rawPlayersA.map((p, i) => ({ id: p.id || `pA_${i + 1}`, name: p.name || `Player ${i + 1}` })));

      // Initialize Squad B
      const rawPlayersB = Array.isArray(match.teamB?.players) && match.teamB.players.length > 0
        ? match.teamB.players
        : Array.from({ length: 11 }, (_, i) => ({ id: `pB_${i + 1}`, name: `Player ${i + 1}` }));
      setSquadB(rawPlayersB.map((p, i) => ({ id: p.id || `pB_${i + 1}`, name: p.name || `Player ${i + 1}` })));

      const initialOvers = match.matchSetup?.maxOvers || tournament?.oversPerTeam || 10;
      setMaxOvers(String(initialOvers));
    }
  }, [match, tournament]);

  const teamAName = match?.teamA?.name || match?.teamA?.teamName || match?.placeholderA || 'Team A';
  const teamBName = match?.teamB?.name || match?.teamB?.teamName || match?.placeholderB || 'Team B';

  const isTeamABatting =
    (tossWinnerId === match?.teamA?.id && decision === 'bat') ||
    (tossWinnerId === match?.teamB?.id && decision === 'bowl');

  const battingTeam = isTeamABatting ? match?.teamA : match?.teamB;
  const bowlingTeam = isTeamABatting ? match?.teamB : match?.teamA;
  const battingSquad = isTeamABatting ? squadA : squadB;
  const bowlingSquad = isTeamABatting ? squadB : squadA;

  // Set default striker/non-striker/bowler when moving to step 3
  const handleProceedToOpeners = () => {
    if (!strikerId && battingSquad[0]) setStrikerId(battingSquad[0].id);
    if (!nonStrikerId && battingSquad[1]) setNonStrikerId(battingSquad[1].id);
    if (!bowlerId && bowlingSquad[0]) setBowlerId(bowlingSquad[0].id);
    setStep(3);
  };

  const handleStartMatch = () => {
    if (!strikerId || !nonStrikerId) {
      Alert.alert('Required', 'Please select both an opening Striker and Non-Striker.');
      return;
    }
    if (strikerId === nonStrikerId) {
      Alert.alert('Invalid Selection', 'Striker and Non-Striker must be different players.');
      return;
    }
    if (!bowlerId) {
      Alert.alert('Required', 'Please select an opening bowler.');
      return;
    }

    const strikerObj = battingSquad.find((p) => p.id === strikerId) || { id: strikerId, name: 'Striker' };
    const nonStrikerObj = battingSquad.find((p) => p.id === nonStrikerId) || { id: nonStrikerId, name: 'Non-Striker' };
    const bowlerObj = bowlingSquad.find((p) => p.id === bowlerId) || { id: bowlerId, name: 'Bowler' };

    onStartMatch({
      winnerTeamId: tossWinnerId,
      decision,
      playingXI_A: squadA,
      playingXI_B: squadB,
      striker: strikerObj,
      nonStriker: nonStrikerObj,
      bowler: bowlerObj,
      maxOvers: parseInt(maxOvers, 10) || 10,
    });
  };

  if (!match) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Match Scorer Setup</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {match.roundName || 'Knockout Fixture'} • {teamAName} vs {teamBName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Stepper Progress */}
          <View style={[styles.stepperContainer, { borderBottomColor: colors.border }]}>
            <View style={[styles.stepItem, step >= 1 && styles.stepActive]}>
              <View style={[styles.stepCircle, step >= 1 ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <Text style={[styles.stepLabel, { color: step >= 1 ? colors.primary : colors.textSecondary }]}>Toss</Text>
            </View>
            <View style={[styles.stepLine, { backgroundColor: step >= 2 ? colors.primary : colors.border }]} />
            <View style={[styles.stepItem, step >= 2 && styles.stepActive]}>
              <View style={[styles.stepCircle, step >= 2 ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <Text style={[styles.stepLabel, { color: step >= 2 ? colors.primary : colors.textSecondary }]}>Squads</Text>
            </View>
            <View style={[styles.stepLine, { backgroundColor: step >= 3 ? colors.primary : colors.border }]} />
            <View style={[styles.stepItem, step >= 3 && styles.stepActive]}>
              <View style={[styles.stepCircle, step >= 3 ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <Text style={[styles.stepLabel, { color: step >= 3 ? colors.primary : colors.textSecondary }]}>Openers</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* STEP 1: TOSS */}
            {step === 1 && (
              <View>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Who won the coin toss?</Text>
                <View style={styles.choiceRow}>
                  <TouchableOpacity
                    style={[
                      styles.teamCard,
                      {
                        borderColor: tossWinnerId === match.teamA?.id ? colors.primary : colors.border,
                        backgroundColor: tossWinnerId === match.teamA?.id ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') : colors.inputBg,
                      },
                    ]}
                    onPress={() => setTossWinnerId(match.teamA?.id)}
                  >
                    <Feather name="shield" size={24} color={tossWinnerId === match.teamA?.id ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.teamCardName, { color: colors.text }]} numberOfLines={2}>
                      {teamAName}
                    </Text>
                    {tossWinnerId === match.teamA?.id && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.teamCard,
                      {
                        borderColor: tossWinnerId === match.teamB?.id ? colors.primary : colors.border,
                        backgroundColor: tossWinnerId === match.teamB?.id ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') : colors.inputBg,
                      },
                    ]}
                    onPress={() => setTossWinnerId(match.teamB?.id)}
                  >
                    <Feather name="shield" size={24} color={tossWinnerId === match.teamB?.id ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.teamCardName, { color: colors.text }]} numberOfLines={2}>
                      {teamBName}
                    </Text>
                    {tossWinnerId === match.teamB?.id && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 20 }]}>Elected to:</Text>
                <View style={styles.decisionRow}>
                  <TouchableOpacity
                    style={[
                      styles.decisionBtn,
                      {
                        borderColor: decision === 'bat' ? colors.primary : colors.border,
                        backgroundColor: decision === 'bat' ? colors.primary : colors.inputBg,
                      },
                    ]}
                    onPress={() => setDecision('bat')}
                  >
                    <Text style={[styles.decisionBtnText, { color: decision === 'bat' ? '#FFFFFF' : colors.text }]}>
                      BAT FIRST
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.decisionBtn,
                      {
                        borderColor: decision === 'bowl' ? colors.primary : colors.border,
                        backgroundColor: decision === 'bowl' ? colors.primary : colors.inputBg,
                      },
                    ]}
                    onPress={() => setDecision('bowl')}
                  >
                    <Text style={[styles.decisionBtnText, { color: decision === 'bowl' ? '#FFFFFF' : colors.text }]}>
                      BOWL FIRST
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Match Overs input */}
                <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 20 }]}>Match Overs</Text>
                <View style={[styles.oversInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Feather name="clock" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="10"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={maxOvers}
                    onChangeText={setMaxOvers}
                  />
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Overs / Innings</Text>
                </View>

                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.nextBtnText}>Next: Confirm Squads</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: SQUADS CONFIRMATION */}
            {step === 2 && (
              <View>
                <View style={[styles.tossSummaryBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: '#10B981' }]}>
                  <Feather name="info" size={16} color="#10B981" style={{ marginRight: 8 }} />
                  <Text style={[styles.tossSummaryText, { color: colors.text }]}>
                    {tossWinnerId === match.teamA?.id ? teamAName : teamBName} won toss & elected to {decision}.
                  </Text>
                </View>

                <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 12 }]}>
                  Batting Squad: {battingTeam?.name || battingTeam?.teamName}
                </Text>
                <View style={styles.rosterList}>
                  {battingSquad.map((player, idx) => (
                    <View key={player.id} style={[styles.rosterItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Text style={[styles.rosterIdx, { color: colors.textSecondary }]}>{idx + 1}</Text>
                      <Text style={[styles.rosterPlayerName, { color: colors.text }]}>{player.name}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 18 }]}>
                  Bowling Squad: {bowlingTeam?.name || bowlingTeam?.teamName}
                </Text>
                <View style={styles.rosterList}>
                  {bowlingSquad.map((player, idx) => (
                    <View key={player.id} style={[styles.rosterItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Text style={[styles.rosterIdx, { color: colors.textSecondary }]}>{idx + 1}</Text>
                      <Text style={[styles.rosterPlayerName, { color: colors.text }]}>{player.name}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.stepActions}>
                  <TouchableOpacity style={[styles.stepBackBtn, { borderColor: colors.border }]} onPress={() => setStep(1)}>
                    <Text style={[styles.stepBackText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.stepNextBtn, { backgroundColor: colors.primary }]} onPress={handleProceedToOpeners}>
                    <Text style={styles.nextBtnText}>Next: Select Openers</Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: SELECT STRIKER, NON-STRIKER, BOWLER */}
            {step === 3 && (
              <View>
                {/* 1. Striker */}
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  1. Opening Striker ({battingTeam?.name || battingTeam?.teamName})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerPillsRow}>
                  {battingSquad.map((p) => {
                    const isSel = strikerId === p.id;
                    const isOther = nonStrikerId === p.id;
                    return (
                      <TouchableOpacity
                        key={`striker_${p.id}`}
                        style={[
                          styles.playerPill,
                          {
                            backgroundColor: isSel ? '#10B981' : colors.inputBg,
                            borderColor: isSel ? '#10B981' : colors.border,
                            opacity: isOther ? 0.35 : 1,
                          },
                        ]}
                        onPress={() => !isOther && setStrikerId(p.id)}
                        disabled={isOther}
                      >
                        <Text style={[styles.playerPillText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 2. Non-Striker */}
                <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 18 }]}>
                  2. Opening Non-Striker ({battingTeam?.name || battingTeam?.teamName})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerPillsRow}>
                  {battingSquad.map((p) => {
                    const isSel = nonStrikerId === p.id;
                    const isOther = strikerId === p.id;
                    return (
                      <TouchableOpacity
                        key={`nonstriker_${p.id}`}
                        style={[
                          styles.playerPill,
                          {
                            backgroundColor: isSel ? '#3B82F6' : colors.inputBg,
                            borderColor: isSel ? '#3B82F6' : colors.border,
                            opacity: isOther ? 0.35 : 1,
                          },
                        ]}
                        onPress={() => !isOther && setNonStrikerId(p.id)}
                        disabled={isOther}
                      >
                        <Text style={[styles.playerPillText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 3. Opening Bowler */}
                <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 18 }]}>
                  3. Opening Bowler ({bowlingTeam?.name || bowlingTeam?.teamName})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerPillsRow}>
                  {bowlingSquad.map((p) => {
                    const isSel = bowlerId === p.id;
                    return (
                      <TouchableOpacity
                        key={`bowler_${p.id}`}
                        style={[
                          styles.playerPill,
                          {
                            backgroundColor: isSel ? '#D97706' : colors.inputBg,
                            borderColor: isSel ? '#D97706' : colors.border,
                          },
                        ]}
                        onPress={() => setBowlerId(p.id)}
                      >
                        <Text style={[styles.playerPillText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.stepActions}>
                  <TouchableOpacity style={[styles.stepBackBtn, { borderColor: colors.border }]} onPress={() => setStep(2)}>
                    <Text style={[styles.stepBackText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.startMatchBtn, { backgroundColor: '#10B981', opacity: busy ? 0.6 : 1 }]}
                    onPress={handleStartMatch}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="play" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.startMatchText}>Start Live Match</Text>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
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
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLine: {
    width: 32,
    height: 2,
    marginHorizontal: 8,
  },
  body: {
    padding: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  teamCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    minHeight: 100,
    position: 'relative',
  },
  teamCardName: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  decisionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  decisionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  oversInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  tossSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  tossSummaryText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  rosterList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  rosterIdx: {
    fontSize: 10,
    fontWeight: '700',
    marginRight: 6,
  },
  rosterPlayerName: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  stepBackBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  stepBackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepNextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  pickerPillsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  playerPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  playerPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  startMatchBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  startMatchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
