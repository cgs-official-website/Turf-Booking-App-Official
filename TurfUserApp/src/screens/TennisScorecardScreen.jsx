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

// Standard tennis point labels
const POINT_LABELS = {
  0: 'Love',
  1: '15',
  2: '30',
  3: '40',
};

export default function TennisScorecardScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);

  // Tennis state
  const [format, setFormat] = useState('singles'); // 'singles' | 'doubles'
  const [currentSetNum, setCurrentSetNum] = useState(1);
  const [rawPoints, setRawPoints] = useState({ A: 0, B: 0 }); // 0, 1, 2, 3, 4 (advantage)
  const [games, setGames] = useState({ A: 0, B: 0 });
  const [setsWon, setSetsWon] = useState({ A: 0, B: 0 });
  const [setHistory, setSetHistory] = useState([]); // [{ set: 1, A: 6, B: 4, winner: 'A' }]
  const [isTiebreak, setIsTiebreak] = useState(false);
  const [tiebreakPoints, setTiebreakPoints] = useState({ A: 0, B: 0 });
  const [serverTeam, setServerTeam] = useState('A');
  const [matchWinner, setMatchWinner] = useState(null);

  const undoStack = useRef([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const m = await matchStorage.getMatch(matchId);
        if (!active || !m) return;
        setMatch(m);

        const teamAPlayers = m.teams.A.playerIds || [];
        const teamBPlayers = m.teams.B.playerIds || [];
        const isDoubles = teamAPlayers.length >= 2 && teamBPlayers.length >= 2;

        if (m.tennis) {
          setFormat(m.tennis.format || (isDoubles ? 'doubles' : 'singles'));
          setCurrentSetNum(m.tennis.currentSetNum || m.tennis.currentSet || 1);
          setRawPoints(m.tennis.rawPoints || { A: 0, B: 0 });
          setGames(m.tennis.games || { A: m.tennis.gamesA ?? 0, B: m.tennis.gamesB ?? 0 });
          setSetsWon(m.tennis.setsWon || { A: m.tennis.setsA ?? 0, B: m.tennis.setsB ?? 0 });
          setSetHistory(m.tennis.setHistory || []);
          setIsTiebreak(Boolean(m.tennis.isTiebreak));
          setTiebreakPoints(m.tennis.tiebreakPoints || { A: 0, B: 0 });
          setServerTeam(m.tennis.serverTeam || (m.toss?.winner === 'B' ? 'B' : 'A'));
          setMatchWinner(m.tennis.matchWinner || null);
        } else {
          const startingServerTeam = m.toss?.winner === 'B' ? 'B' : 'A';
          setFormat(isDoubles ? 'doubles' : 'singles');
          setCurrentSetNum(1);
          setRawPoints({ A: 0, B: 0 });
          setGames({ A: 0, B: 0 });
          setSetsWon({ A: 0, B: 0 });
          setSetHistory([]);
          setIsTiebreak(false);
          setTiebreakPoints({ A: 0, B: 0 });
          setServerTeam(startingServerTeam);
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
    nextMatch.tennis = nextState;

    if (nextState.matchWinner) {
      const winnerName = nextMatch.teams[nextState.matchWinner].name;
      nextMatch.result = `${winnerName} won the match (${nextState.setsWon.A} - ${nextState.setsWon.B} Sets)`;
    }

    setMatch(nextMatch);
    await matchStorage.saveMatch(nextMatch);
  };

  const saveUndoState = () => {
    undoStack.current.push({
      format,
      currentSetNum,
      rawPoints: { ...rawPoints },
      games: { ...games },
      setsWon: { ...setsWon },
      setHistory: clone(setHistory),
      isTiebreak,
      tiebreakPoints: { ...tiebreakPoints },
      serverTeam,
      matchWinner,
    });
  };

  const handleUndo = async () => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    setFormat(prev.format);
    setCurrentSetNum(prev.currentSetNum);
    setRawPoints(prev.rawPoints);
    setGames(prev.games);
    setSetsWon(prev.setsWon);
    setSetHistory(prev.setHistory);
    setIsTiebreak(prev.isTiebreak);
    setTiebreakPoints(prev.tiebreakPoints);
    setServerTeam(prev.serverTeam);
    setMatchWinner(prev.matchWinner);
    await persist(prev);
  };

  if (!match) return <View style={styles.root} />;

  const teamA = match.teams.A;
  const teamB = match.teams.B;

  // Tennis Score Display Calculation (Love, 15, 30, 40, Deuce, Advantage)
  const getPointDisplay = () => {
    if (isTiebreak) {
      return {
        A: String(tiebreakPoints.A),
        B: String(tiebreakPoints.B),
        status: 'Tiebreak (First to 7, Win by 2)',
      };
    }

    const pA = rawPoints.A;
    const pB = rawPoints.B;

    if (pA >= 3 && pB >= 3) {
      if (pA === pB) {
        return { A: '40', B: '40', status: 'Deuce' };
      }
      if (pA === pB + 1) {
        return { A: 'AD', B: '—', status: `Advantage ${teamA.name}` };
      }
      if (pB === pA + 1) {
        return { A: '—', B: 'AD', status: `Advantage ${teamB.name}` };
      }
    }

    return {
      A: POINT_LABELS[pA] || '40',
      B: POINT_LABELS[pB] || '40',
      status: null,
    };
  };

  const displayPoints = getPointDisplay();

  // Point won handler
  const addPoint = async (team) => {
    if (matchWinner) return;
    saveUndoState();

    const otherTeam = team === 'A' ? 'B' : 'A';

    // ── Handle Tiebreak Scoring ───────────────────────────────────────────
    if (isTiebreak) {
      const nextTB = { ...tiebreakPoints, [team]: tiebreakPoints[team] + 1 };
      const tbA = nextTB.A;
      const tbB = nextTB.B;

      // Winner of tiebreak: >= 7 points and lead by 2
      if ((tbA >= 7 && tbA - tbB >= 2) || (tbB >= 7 && tbB - tbA >= 2)) {
        const tbWinner = tbA > tbB ? 'A' : 'B';
        const nextGames = { ...games, [tbWinner]: games[tbWinner] + 1 };
        return finishSet(tbWinner, nextGames, nextTB);
      }

      // In tiebreak, server switches after first point and then every 2 points
      const totalTBPoints = tbA + tbB;
      const nextServer = (totalTBPoints % 2 === 1)
        ? (serverTeam === 'A' ? 'B' : 'A')
        : serverTeam;

      setTiebreakPoints(nextTB);
      setServerTeam(nextServer);

      return persist({
        format,
        currentSetNum,
        rawPoints,
        games,
        setsWon,
        setHistory,
        isTiebreak: true,
        tiebreakPoints: nextTB,
        serverTeam: nextServer,
        matchWinner,
      });
    }

    // ── Regular Game Scoring ──────────────────────────────────────────────
    let pWinner = rawPoints[team];
    let pLoser = rawPoints[otherTeam];

    let gameWon = false;

    if (pWinner >= 3 && pLoser >= 3) {
      // Deuce / Advantage state
      if (pWinner === pLoser) {
        // Was Deuce -> now Advantage
        pWinner += 1;
      } else if (pWinner < pLoser) {
        // Other player had advantage -> back to Deuce
        pLoser -= 1;
      } else {
        // Player had advantage and won point -> Game Won!
        gameWon = true;
      }
    } else if (pWinner === 3) {
      // 40-Love, 40-15, 40-30 -> Game Won!
      gameWon = true;
    } else {
      pWinner += 1;
    }

    if (gameWon) {
      // Game finished
      const nextGames = { ...games, [team]: games[team] + 1 };
      const gWinner = nextGames[team];
      const gLoser = nextGames[otherTeam];

      // Check if set is won or tiebreak triggered
      if (gWinner === 6 && gLoser === 6) {
        // Enter Tiebreak!
        setIsTiebreak(true);
        setTiebreakPoints({ A: 0, B: 0 });
        setRawPoints({ A: 0, B: 0 });
        setGames(nextGames);
        const nextServer = serverTeam === 'A' ? 'B' : 'A';
        setServerTeam(nextServer);

        return persist({
          format,
          currentSetNum,
          rawPoints: { A: 0, B: 0 },
          games: nextGames,
          setsWon,
          setHistory,
          isTiebreak: true,
          tiebreakPoints: { A: 0, B: 0 },
          serverTeam: nextServer,
          matchWinner,
        });
      } else if ((gWinner >= 6 && gWinner - gLoser >= 2) || gWinner === 7) {
        // Set Won!
        return finishSet(team, nextGames);
      } else {
        // Regular game win within current set
        setGames(nextGames);
        setRawPoints({ A: 0, B: 0 });
        const nextServer = serverTeam === 'A' ? 'B' : 'A';
        setServerTeam(nextServer);

        return persist({
          format,
          currentSetNum,
          rawPoints: { A: 0, B: 0 },
          games: nextGames,
          setsWon,
          setHistory,
          isTiebreak: false,
          tiebreakPoints: { A: 0, B: 0 },
          serverTeam: nextServer,
          matchWinner,
        });
      }
    } else {
      // Still in current game
      const nextRaw = { ...rawPoints, [team]: pWinner, [otherTeam]: pLoser };
      setRawPoints(nextRaw);

      return persist({
        format,
        currentSetNum,
        rawPoints: nextRaw,
        games,
        setsWon,
        setHistory,
        isTiebreak: false,
        tiebreakPoints: { A: 0, B: 0 },
        serverTeam,
        matchWinner,
      });
    }
  };

  const finishSet = async (winnerTeam, finalGames, finalTB = null) => {
    const newSetsWon = { ...setsWon, [winnerTeam]: setsWon[winnerTeam] + 1 };
    const newHistory = [
      ...setHistory,
      {
        set: currentSetNum,
        A: finalGames.A,
        B: finalGames.B,
        winner: winnerTeam,
        tiebreak: finalTB ? `${finalTB.A}-${finalTB.B}` : null,
      },
    ];

    // Best of 3 sets: first to 2 sets
    let newMatchWinner = null;
    if (newSetsWon.A >= 2) newMatchWinner = 'A';
    else if (newSetsWon.B >= 2) newMatchWinner = 'B';

    const nextSetNumber = currentSetNum + 1;
    const nextGames = { A: 0, B: 0 };
    const nextRaw = { A: 0, B: 0 };
    const nextServer = serverTeam === 'A' ? 'B' : 'A';

    setSetsWon(newSetsWon);
    setSetHistory(newHistory);
    setMatchWinner(newMatchWinner);
    setIsTiebreak(false);
    setTiebreakPoints({ A: 0, B: 0 });

    if (!newMatchWinner) {
      setCurrentSetNum(nextSetNumber);
      setGames(nextGames);
      setRawPoints(nextRaw);
      setServerTeam(nextServer);
    } else {
      setGames(finalGames);
    }

    const nextState = {
      format,
      currentSetNum: newMatchWinner ? currentSetNum : nextSetNumber,
      rawPoints: newMatchWinner ? rawPoints : nextRaw,
      games: newMatchWinner ? finalGames : nextGames,
      setsWon: newSetsWon,
      setHistory: newHistory,
      isTiebreak: false,
      tiebreakPoints: { A: 0, B: 0 },
      serverTeam: nextServer,
      matchWinner: newMatchWinner,
    };

    await persist(nextState);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Match', { matchId })} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Tennis Match</Text>
          <Text style={styles.headerSub}>{format.toUpperCase()} · Best of 3 Sets</Text>
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

        {/* Live Tennis Scoreboard */}
        <View style={styles.scoreCard}>
          {displayPoints.status && (
            <View style={styles.statusBanner}>
              <Text style={styles.statusBannerText}>{displayPoints.status}</Text>
            </View>
          )}

          <View style={styles.teamsRow}>
            {/* Team A */}
            <View style={styles.teamCol}>
              <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.avatarText}>{(teamA.name || 'A')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamA.name}</Text>
              {serverTeam === 'A' ? (
                <View style={styles.serverBadge}>
                  <Text style={styles.serverBadgeText}>🎾 Server</Text>
                </View>
              ) : (
                <View style={[styles.serverBadge, { backgroundColor: COLORS.bgSoft }]}>
                  <Text style={[styles.serverBadgeText, { color: COLORS.subtext }]}>Receiver</Text>
                </View>
              )}
              <Text style={styles.gamesLabel}>Games: {games.A}</Text>
              <Text style={styles.bigPoint}>{displayPoints.A}</Text>
            </View>

            <View style={styles.scoreSep}>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.gameScoreText}>
                Games: {games.A} - {games.B}
              </Text>
            </View>

            {/* Team B */}
            <View style={styles.teamCol}>
              <View style={[styles.avatar, { backgroundColor: '#EA580C' }]}>
                <Text style={styles.avatarText}>{(teamB.name || 'B')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamB.name}</Text>
              {serverTeam === 'B' ? (
                <View style={styles.serverBadge}>
                  <Text style={styles.serverBadgeText}>🎾 Server</Text>
                </View>
              ) : (
                <View style={[styles.serverBadge, { backgroundColor: COLORS.bgSoft }]}>
                  <Text style={[styles.serverBadgeText, { color: COLORS.subtext }]}>Receiver</Text>
                </View>
              )}
              <Text style={styles.gamesLabel}>Games: {games.B}</Text>
              <Text style={styles.bigPoint}>{displayPoints.B}</Text>
            </View>
          </View>

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

        {/* Tennis Point Buttons */}
        {!matchWinner && (
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={[styles.pointBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => addPoint('A')}
            >
              <Text style={styles.pointBtnEmoji}>🎾 Point</Text>
              <Text style={styles.pointBtnText} numberOfLines={1}>{teamA.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pointBtn, { backgroundColor: '#EA580C' }]}
              onPress={() => addPoint('B')}
            >
              <Text style={styles.pointBtnEmoji}>🎾 Point</Text>
              <Text style={styles.pointBtnText} numberOfLines={1}>{teamB.name}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Server Toggle */}
        {!matchWinner && (
          <TouchableOpacity
            style={styles.switchServerBtn}
            onPress={() => {
              saveUndoState();
              const next = serverTeam === 'A' ? 'B' : 'A';
              setServerTeam(next);
              persist({
                format,
                currentSetNum,
                rawPoints,
                games,
                setsWon,
                setHistory,
                isTiebreak,
                tiebreakPoints,
                serverTeam: next,
                matchWinner,
              });
            }}
          >
            <Icon name="swap-horizontal" size={16} color={COLORS.primary} />
            <Text style={styles.switchServerText}>
              Change Server to {serverTeam === 'A' ? teamB.name : teamA.name}
            </Text>
          </TouchableOpacity>
        )}

        {/* Set History Table */}
        <Text style={styles.sectionTitle}>Completed Sets</Text>
        {setHistory.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No sets completed yet. Set 1 in progress.</Text>
          </View>
        ) : (
          setHistory.map((s, idx) => (
            <View key={idx} style={styles.historyRow}>
              <Text style={styles.historySetLabel}>Set {s.set}</Text>
              <Text style={styles.historyScore}>
                {teamA.name} {s.A} - {s.B} {teamB.name}
                {s.tiebreak ? ` (${s.tiebreak})` : ''}
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
  statusBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    marginBottom: 10,
  },
  statusBannerText: { color: '#92400E', fontWeight: '800', fontSize: 12 },

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
  serverBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    marginBottom: 4,
  },
  serverBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  gamesLabel: { fontSize: 12, fontWeight: '700', color: COLORS.subtext, marginTop: 2 },
  bigPoint: { fontSize: 44, fontWeight: '900', color: COLORS.text, marginTop: 2 },

  scoreSep: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  vsText: { fontSize: 13, fontWeight: '800', color: COLORS.subtext },
  gameScoreText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, marginTop: 4 },

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
  pointBtnEmoji: { fontSize: 18, color: '#fff', marginBottom: 4 },
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
