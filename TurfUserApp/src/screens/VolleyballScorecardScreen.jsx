import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

const clone = (o) => JSON.parse(JSON.stringify(o));

export default function VolleyballScorecardScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);

  // Volleyball state
  const [currentSetNum, setCurrentSetNum] = useState(1);
  const [points, setPoints] = useState({ A: 0, B: 0 });
  const [setsWon, setSetsWon] = useState({ A: 0, B: 0 });
  const [setHistory, setSetHistory] = useState([]); // [{ set: 1, A: 25, B: 21, winner: 'A' }]
  const [servingTeam, setServingTeam] = useState('A');
  const [matchWinner, setMatchWinner] = useState(null);

  const undoStack = useRef([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const m = await matchStorage.getMatch(matchId);
        if (!active || !m) return;
        setMatch(m);

        if (m.volleyball) {
          setCurrentSetNum(m.volleyball.currentSetNum || m.volleyball.currentSet || 1);
          setPoints(m.volleyball.points || { A: m.volleyball.pointsA ?? 0, B: m.volleyball.pointsB ?? 0 });
          setSetsWon(m.volleyball.setsWon || { A: m.volleyball.setsA ?? 0, B: m.volleyball.setsB ?? 0 });
          setSetHistory(m.volleyball.setHistory || []);
          setServingTeam(m.volleyball.servingTeam || (m.toss?.winner === 'B' ? 'B' : 'A'));
          setMatchWinner(m.volleyball.matchWinner || null);
        } else {
          const startingServerTeam = m.toss?.winner === 'B' ? 'B' : 'A';
          setCurrentSetNum(1);
          setPoints({ A: 0, B: 0 });
          setSetsWon({ A: 0, B: 0 });
          setSetHistory([]);
          setServingTeam(startingServerTeam);
          setMatchWinner(null);
        }
      })();
      return () => {
        active = false;
      };
    }, [matchId])
  );

  const persist = async (nextState) => {
    if (!match) return;
    const nextMatch = clone(match);
    nextMatch.status = nextState.matchWinner ? 'completed' : 'live';
    nextMatch.volleyball = nextState;

    if (nextState.matchWinner) {
      const winnerName = nextMatch.teams[nextState.matchWinner].name;
      nextMatch.result = `${winnerName} won the match (${nextState.setsWon.A} - ${nextState.setsWon.B})`;
    }

    setMatch(nextMatch);
    await matchStorage.saveMatch(nextMatch);
  };

  const saveUndoState = () => {
    undoStack.current.push({
      currentSetNum,
      points: { ...points },
      setsWon: { ...setsWon },
      setHistory: clone(setHistory),
      servingTeam,
      matchWinner,
    });
  };

  const handleUndo = async () => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    setCurrentSetNum(prev.currentSetNum);
    setPoints(prev.points);
    setSetsWon(prev.setsWon);
    setSetHistory(prev.setHistory);
    setServingTeam(prev.servingTeam);
    setMatchWinner(prev.matchWinner);
    await persist(prev);
  };

  if (!match) return <View style={styles.root} />;

  const teamA = match.teams.A;
  const teamB = match.teams.B;

  // Set target: 25 for sets 1-2, 15 for deciding set 3 (in best-of-3)
  const setTarget = currentSetNum === 3 ? 15 : 25;

  const checkSetWinner = (pts) => {
    const a = pts.A;
    const b = pts.B;
    if (a >= setTarget && a - b >= 2) return 'A';
    if (b >= setTarget && b - a >= 2) return 'B';
    return null;
  };

  const currentSetWinner = checkSetWinner(points);

  const addPoint = async (rallyWinner) => {
    if (matchWinner || currentSetWinner) return;
    saveUndoState();

    const newPoints = { ...points, [rallyWinner]: points[rallyWinner] + 1 };
    // Service change if rally winner wasn't serving
    let newServing = servingTeam;
    if (rallyWinner !== servingTeam) {
      newServing = rallyWinner;
    }

    setPoints(newPoints);
    setServingTeam(newServing);

    const nextState = {
      currentSetNum,
      points: newPoints,
      setsWon,
      setHistory,
      servingTeam: newServing,
      matchWinner,
    };

    await persist(nextState);
  };

  const nextSet = async () => {
    if (!currentSetWinner) return;
    saveUndoState();

    const newSetsWon = {
      ...setsWon,
      [currentSetWinner]: setsWon[currentSetWinner] + 1,
    };

    const newHistory = [
      ...setHistory,
      {
        set: currentSetNum,
        A: points.A,
        B: points.B,
        winner: currentSetWinner,
      },
    ];

    // Best of 3: first to 2 sets
    let newMatchWinner = null;
    if (newSetsWon.A >= 2) newMatchWinner = 'A';
    else if (newSetsWon.B >= 2) newMatchWinner = 'B';

    const nextSetNumber = currentSetNum + 1;
    const nextPts = { A: 0, B: 0 };
    const nextServing = currentSetWinner;

    setSetsWon(newSetsWon);
    setSetHistory(newHistory);
    setMatchWinner(newMatchWinner);
    if (!newMatchWinner) {
      setCurrentSetNum(nextSetNumber);
      setPoints(nextPts);
      setServingTeam(nextServing);
    }

    const nextState = {
      currentSetNum: newMatchWinner ? currentSetNum : nextSetNumber,
      points: newMatchWinner ? points : nextPts,
      setsWon: newSetsWon,
      setHistory: newHistory,
      servingTeam: nextServing,
      matchWinner: newMatchWinner,
    };

    await persist(nextState);
  };

  const isSetPoint =
    !currentSetWinner &&
    ((points.A >= setTarget - 1 && points.A > points.B) ||
      (points.B >= setTarget - 1 && points.B > points.A));

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Match', { matchId })} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Volleyball Match</Text>
          <Text style={styles.headerSub}>Best of 3 Sets · Rally Scoring</Text>
        </View>
        <TouchableOpacity
          onPress={handleUndo}
          disabled={undoStack.current.length === 0}
          style={[styles.backBtn, undoStack.current.length === 0 && { opacity: 0.3 }]}
        >
          <Icon name="arrow-undo" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }}>
        {/* Set & Sets Header */}
        <View style={styles.topInfoRow}>
          <View style={styles.setPill}>
            <Text style={styles.setPillText}>
              {matchWinner ? 'Match Completed' : `Set ${currentSetNum} of 3`}
            </Text>
          </View>
          <View style={styles.setsCountBadge}>
            <Text style={styles.setsCountText}>
              Sets: {setsWon.A} - {setsWon.B}
            </Text>
          </View>
        </View>

        {/* Live Scoreboard */}
        <View style={styles.scoreCard}>
          {isSetPoint && !currentSetWinner && (
            <View style={styles.setPointBanner}>
              <Text style={styles.setPointText}>
                {points.A > points.B ? `${teamA.name} Set Point!` : `${teamB.name} Set Point!`}
              </Text>
            </View>
          )}

          <View style={styles.teamsRow}>
            {/* Team A */}
            <View style={styles.teamCol}>
              <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.avatarText}>{(teamA.name || 'A')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamA.name}</Text>
              {servingTeam === 'A' && (
                <View style={styles.servingBadge}>
                  <Text style={styles.servingBadgeText}>🏐 Serving</Text>
                </View>
              )}
              <Text style={styles.bigScore}>{points.A}</Text>
            </View>

            <View style={styles.scoreSep}>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.targetHint}>First to {setTarget} (Lead 2)</Text>
            </View>

            {/* Team B */}
            <View style={styles.teamCol}>
              <View style={[styles.avatar, { backgroundColor: '#EA580C' }]}>
                <Text style={styles.avatarText}>{(teamB.name || 'B')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamB.name}</Text>
              {servingTeam === 'B' && (
                <View style={styles.servingBadge}>
                  <Text style={styles.servingBadgeText}>🏐 Serving</Text>
                </View>
              )}
              <Text style={styles.bigScore}>{points.B}</Text>
            </View>
          </View>

          {/* Set Won Card */}
          {currentSetWinner && !matchWinner && (
            <View style={styles.setWonCard}>
              <Text style={styles.setWonTitle}>
                🎉 {currentSetWinner === 'A' ? teamA.name : teamB.name} wins Set {currentSetNum}!
              </Text>
              <TouchableOpacity style={styles.nextSetBtn} onPress={nextSet}>
                <Text style={styles.nextSetBtnText}>Start Set {currentSetNum + 1}</Text>
                <Icon name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Match Won Card */}
          {matchWinner && (
            <View style={styles.matchWonCard}>
              <Icon name="trophy" size={28} color="#F59E0B" />
              <Text style={styles.matchWonTitle}>
                🏆 {matchWinner === 'A' ? teamA.name : teamB.name} Won Match!
              </Text>
              <Text style={styles.matchWonSub}>
                Sets: {setsWon.A} - {setsWon.B}
              </Text>
            </View>
          )}
        </View>

        {/* Rally Winner Buttons */}
        {!currentSetWinner && !matchWinner && (
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={[styles.pointBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => addPoint('A')}
            >
              <Text style={styles.pointBtnEmoji}>🏐 +1</Text>
              <Text style={styles.pointBtnText} numberOfLines={1}>Rally Won by {teamA.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pointBtn, { backgroundColor: '#EA580C' }]}
              onPress={() => addPoint('B')}
            >
              <Text style={styles.pointBtnEmoji}>🏐 +1</Text>
              <Text style={styles.pointBtnText} numberOfLines={1}>Rally Won by {teamB.name}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Service Toggle */}
        {!matchWinner && !currentSetWinner && (
          <TouchableOpacity
            style={styles.switchServerBtn}
            onPress={() => {
              saveUndoState();
              const next = servingTeam === 'A' ? 'B' : 'A';
              setServingTeam(next);
              persist({
                currentSetNum,
                points,
                setsWon,
                setHistory,
                servingTeam: next,
                matchWinner,
              });
            }}
          >
            <Icon name="swap-horizontal" size={16} color={COLORS.primary} />
            <Text style={styles.switchServerText}>
              Change Serving Team to {servingTeam === 'A' ? teamB.name : teamA.name}
            </Text>
          </TouchableOpacity>
        )}

        {/* Completed Sets History */}
        <Text style={styles.sectionTitle}>Completed Sets</Text>
        {setHistory.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No sets completed yet. Current Set in progress.</Text>
          </View>
        ) : (
          setHistory.map((s, idx) => (
            <View key={idx} style={styles.historyRow}>
              <Text style={styles.historySetLabel}>Set {s.set}</Text>
              <Text style={styles.historyScore}>
                {teamA.name} {s.A} - {s.B} {teamB.name}
              </Text>
              <View style={styles.historyWinnerBadge}>
                <Text style={styles.historyWinnerText}>
                  {s.winner === 'A' ? teamA.name : teamB.name} won
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.bgSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...FONT.h3, color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.subtext },

  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  setPill: {
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  setPillText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  setsCountBadge: {
    backgroundColor: COLORS.bgSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  setsCountText: { fontSize: 12, fontWeight: '800', color: COLORS.text },

  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  setPointBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    marginBottom: 10,
  },
  setPointText: { color: '#B91C1C', fontWeight: '800', fontSize: 12 },

  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  teamCol: { flex: 1, alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  teamName: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  servingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    marginBottom: 4,
  },
  servingBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  bigScore: { fontSize: 50, fontWeight: '900', color: COLORS.text },

  scoreSep: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  vsText: { fontSize: 13, fontWeight: '800', color: COLORS.subtext },
  targetHint: { fontSize: 10, color: COLORS.subtext, marginTop: 4, textAlign: 'center' },

  setWonCard: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  setWonTitle: { fontSize: 14, fontWeight: '800', color: '#047857', marginBottom: 8 },
  nextSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  nextSetBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  matchWonCard: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  matchWonTitle: { fontSize: 16, fontWeight: '800', color: '#92400E', marginTop: 6 },
  matchWonSub: { fontSize: 13, color: '#B45309', marginTop: 2 },

  actionBtnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  pointBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  pointBtnEmoji: { fontSize: 20, color: '#fff', marginBottom: 4 },
  pointBtnText: { fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center', paddingHorizontal: 6 },

  switchServerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bgSoft,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  switchServerText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: { fontSize: 13, color: COLORS.subtext },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historySetLabel: { fontSize: 13, fontWeight: '700', color: COLORS.subtext },
  historyScore: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  historyWinnerBadge: {
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  historyWinnerText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
});
