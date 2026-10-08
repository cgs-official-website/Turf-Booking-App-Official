import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

const clone = (o) => JSON.parse(JSON.stringify(o));

export default function BadmintonScorecardScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);

  // Badminton state
  const [format, setFormat] = useState('singles'); // 'singles' | 'doubles'
  const [currentGameNum, setCurrentGameNum] = useState(1);
  const [points, setPoints] = useState({ A: 0, B: 0 });
  const [gamesWon, setGamesWon] = useState({ A: 0, B: 0 });
  const [gameHistory, setGameHistory] = useState([]); // [{ game: 1, A: 21, B: 18, winner: 'A' }]
  const [serverTeam, setServerTeam] = useState('A');
  const [serverPlayerId, setServerPlayerId] = useState(null);
  const [receiverPlayerId, setReceiverPlayerId] = useState(null);
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

        if (m.badminton) {
          setFormat(m.badminton.format || (isDoubles ? 'doubles' : 'singles'));
          setCurrentGameNum(m.badminton.currentGameNum || m.badminton.currentGame || 1);
          setPoints(m.badminton.points || { A: m.badminton.pointsA ?? 0, B: m.badminton.pointsB ?? 0 });
          setGamesWon(m.badminton.gamesWon || { A: m.badminton.gamesA ?? 0, B: m.badminton.gamesB ?? 0 });
          setGameHistory(m.badminton.gameHistory || []);
          setServerTeam(m.badminton.serverTeam || (m.toss?.winner === 'B' ? 'B' : 'A'));
          setServerPlayerId(m.badminton.serverPlayerId || null);
          setReceiverPlayerId(m.badminton.receiverPlayerId || null);
          setMatchWinner(m.badminton.matchWinner || null);
        } else {
          const startingServerTeam = m.toss?.winner === 'B' ? 'B' : 'A';
          setFormat(isDoubles ? 'doubles' : 'singles');
          setCurrentGameNum(1);
          setPoints({ A: 0, B: 0 });
          setGamesWon({ A: 0, B: 0 });
          setGameHistory([]);
          setServerTeam(startingServerTeam);
          setServerPlayerId(m.teams[startingServerTeam].playerIds?.[0] || null);
          const receivingTeam = startingServerTeam === 'A' ? 'B' : 'A';
          setReceiverPlayerId(m.teams[receivingTeam].playerIds?.[0] || null);
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
    nextMatch.badminton = nextState;

    if (nextState.matchWinner) {
      const winnerName = nextMatch.teams[nextState.matchWinner].name;
      nextMatch.result = `${winnerName} won the match (${nextState.gamesWon.A} - ${nextState.gamesWon.B})`;
    }

    setMatch(nextMatch);
    await matchStorage.saveMatch(nextMatch);
  };

  const saveUndoState = () => {
    undoStack.current.push({
      format,
      currentGameNum,
      points: { ...points },
      gamesWon: { ...gamesWon },
      gameHistory: clone(gameHistory),
      serverTeam,
      serverPlayerId,
      receiverPlayerId,
      matchWinner,
    });
  };

  const handleUndo = async () => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    setFormat(prev.format);
    setCurrentGameNum(prev.currentGameNum);
    setPoints(prev.points);
    setGamesWon(prev.gamesWon);
    setGameHistory(prev.gameHistory);
    setServerTeam(prev.serverTeam);
    setServerPlayerId(prev.serverPlayerId);
    setReceiverPlayerId(prev.receiverPlayerId);
    setMatchWinner(prev.matchWinner);
    await persist(prev);
  };

  if (!match) return <View style={styles.root} />;

  const teamA = match.teams.A;
  const teamB = match.teams.B;

  const playerById = (id) => {
    if (!id) return null;
    if (typeof id === 'object' && id !== null) {
      if (id.name && !String(id.name).startsWith('guest_') && isNaN(id.name)) return id;
      if (id.id || id.userId) id = id.id || id.userId;
    }
    const strId = String(id);

    if (match?.playerNames && match.playerNames[strId]) {
      return { id: strId, name: match.playerNames[strId] };
    }
    if (match?.scorecard?.playerNames && match.scorecard.playerNames[strId]) {
      return { id: strId, name: match.scorecard.playerNames[strId] };
    }

    const found = match?.players?.find((p) =>
      typeof p === 'object' && p !== null ? p.id === strId || p.userId === strId : p === strId
    );
    if (found && typeof found === 'object' && found.name && !String(found.name).startsWith('guest_')) {
      return { id: strId, name: found.name };
    }

    const teamPlayers = [
      ...(match?.teams?.A?.players || match?.teams?.teamA?.players || []),
      ...(match?.teams?.B?.players || match?.teams?.teamB?.players || []),
    ];
    const foundInTeam = teamPlayers.find(
      (p) => typeof p === 'object' && p !== null && (p.id === strId || p.userId === strId)
    );
    if (foundInTeam && foundInTeam.name && !String(foundInTeam.name).startsWith('guest_')) {
      return { id: strId, name: foundInTeam.name };
    }

    if (strId.startsWith('guest_')) {
      const parts = strId.split('_');
      const maybeName = parts.slice(2).join(' ');
      if (maybeName && isNaN(maybeName) && maybeName.toLowerCase() !== 'player') {
        const cleanName = maybeName
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return { id: strId, name: cleanName };
      }
    }

    if (strId === 'host_creator' || strId === match?.createdBy) return { id: strId, name: match?.creatorName || 'You (Host)' };

    return { id: strId, name: strId.length > 15 ? 'Player' : strId };
  };

  // Check Game Winner
  const checkGameWinner = (pts) => {
    const a = pts.A;
    const b = pts.B;
    if (a >= 21 && a - b >= 2) return 'A';
    if (b >= 21 && b - a >= 2) return 'B';
    if (a === 30) return 'A';
    if (b === 30) return 'B';
    return null;
  };

  const currentGameWinner = checkGameWinner(points);

  const addPoint = async (team) => {
    if (matchWinner || currentGameWinner) return;
    saveUndoState();

    const newPoints = { ...points, [team]: points[team] + 1 };
    let newServerTeam = serverTeam;

    // Rally scoring rule: side winning rally gains service
    if (team !== serverTeam) {
      newServerTeam = team;
    }

    setPoints(newPoints);
    setServerTeam(newServerTeam);

    const winnerOfGame = checkGameWinner(newPoints);
    const nextState = {
      format,
      currentGameNum,
      points: newPoints,
      gamesWon,
      gameHistory,
      serverTeam: newServerTeam,
      serverPlayerId,
      receiverPlayerId,
      matchWinner,
    };

    await persist(nextState);
  };

  const nextGame = async () => {
    if (!currentGameWinner) return;
    saveUndoState();

    const newGamesWon = {
      ...gamesWon,
      [currentGameWinner]: gamesWon[currentGameWinner] + 1,
    };

    const newHistory = [
      ...gameHistory,
      {
        game: currentGameNum,
        A: points.A,
        B: points.B,
        winner: currentGameWinner,
      },
    ];

    // Best of 3: first to 2 games wins
    let newMatchWinner = null;
    if (newGamesWon.A >= 2) newMatchWinner = 'A';
    else if (newGamesWon.B >= 2) newMatchWinner = 'B';

    const nextGameNumber = currentGameNum + 1;
    const nextPts = { A: 0, B: 0 };
    // Winner of previous game serves first in next game
    const nextServerTeam = currentGameWinner;

    setGamesWon(newGamesWon);
    setGameHistory(newHistory);
    setMatchWinner(newMatchWinner);
    if (!newMatchWinner) {
      setCurrentGameNum(nextGameNumber);
      setPoints(nextPts);
      setServerTeam(nextServerTeam);
    }

    const nextState = {
      format,
      currentGameNum: newMatchWinner ? currentGameNum : nextGameNumber,
      points: newMatchWinner ? points : nextPts,
      gamesWon: newGamesWon,
      gameHistory: newHistory,
      serverTeam: nextServerTeam,
      serverPlayerId,
      receiverPlayerId,
      matchWinner: newMatchWinner,
    };

    await persist(nextState);
  };

  // Even/Odd Court Rule
  const serverPoints = serverTeam === 'A' ? points.A : points.B;
  const courtSide = serverPoints % 2 === 0 ? 'Right Court' : 'Left Court';

  const isGamePoint =
    !currentGameWinner &&
    ((points.A >= 20 && points.A > points.B) || (points.B >= 20 && points.B > points.A));

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Match', { matchId })} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Badminton Match</Text>
          <Text style={styles.headerSub}>{format.toUpperCase()} · Best of 3</Text>
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
        {/* Match Header Badge */}
        <View style={styles.topInfoRow}>
          <View style={styles.gamePill}>
            <Text style={styles.gamePillText}>
              {matchWinner ? 'Match Completed' : `Game ${currentGameNum} of 3`}
            </Text>
          </View>
          <View style={styles.gamesCountBadge}>
            <Text style={styles.gamesCountText}>
              Games: {gamesWon.A} - {gamesWon.B}
            </Text>
          </View>
        </View>

        {/* Live Scoreboard */}
        <View style={styles.scoreCard}>
          {isGamePoint && !currentGameWinner && (
            <View style={styles.gamePointBanner}>
              <Text style={styles.gamePointText}>
                {points.A > points.B ? `${teamA.name} Game Point` : `${teamB.name} Game Point`}
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
              {serverTeam === 'A' && (
                <View style={styles.servingBadge}>
                  <Text style={styles.servingBadgeText}>🏸 Serving ({courtSide})</Text>
                </View>
              )}
              <Text style={styles.bigScore}>{points.A}</Text>
            </View>

            <View style={styles.scoreSep}>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.ruleHint}>First to 21 (Win by 2)</Text>
            </View>

            {/* Team B */}
            <View style={styles.teamCol}>
              <View style={[styles.avatar, { backgroundColor: '#EA580C' }]}>
                <Text style={styles.avatarText}>{(teamB.name || 'B')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamB.name}</Text>
              {serverTeam === 'B' && (
                <View style={styles.servingBadge}>
                  <Text style={styles.servingBadgeText}>🏸 Serving ({courtSide})</Text>
                </View>
              )}
              <Text style={styles.bigScore}>{points.B}</Text>
            </View>
          </View>

          {/* Game Winner Prompt */}
          {currentGameWinner && !matchWinner && (
            <View style={styles.gameWonCard}>
              <Text style={styles.gameWonTitle}>
                🎉 {currentGameWinner === 'A' ? teamA.name : teamB.name} wins Game {currentGameNum}!
              </Text>
              <TouchableOpacity style={styles.nextGameBtn} onPress={nextGame}>
                <Text style={styles.nextGameBtnText}>Start Game {currentGameNum + 1}</Text>
                <Icon name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Match Winner Banner */}
          {matchWinner && (
            <View style={styles.matchWonCard}>
              <Icon name="trophy" size={28} color="#F59E0B" />
              <Text style={styles.matchWonTitle}>
                🏆 {matchWinner === 'A' ? teamA.name : teamB.name} Won Match!
              </Text>
              <Text style={styles.matchWonSub}>
                Games: {gamesWon.A} - {gamesWon.B}
              </Text>
            </View>
          )}
        </View>

        {/* Rally Point Buttons */}
        {!currentGameWinner && !matchWinner && (
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={[styles.pointBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => addPoint('A')}
            >
              <Text style={styles.pointBtnEmoji}>🏸 +1</Text>
              <Text style={styles.pointBtnText} numberOfLines={1}>Point {teamA.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pointBtn, { backgroundColor: '#EA580C' }]}
              onPress={() => addPoint('B')}
            >
              <Text style={styles.pointBtnEmoji}>🏸 +1</Text>
              <Text style={styles.pointBtnText} numberOfLines={1}>Point {teamB.name}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Service Switch Toggle */}
        {!matchWinner && !currentGameWinner && (
          <TouchableOpacity
            style={styles.switchServerBtn}
            onPress={() => {
              saveUndoState();
              const next = serverTeam === 'A' ? 'B' : 'A';
              setServerTeam(next);
              persist({
                format,
                currentGameNum,
                points,
                gamesWon,
                gameHistory,
                serverTeam: next,
                serverPlayerId,
                receiverPlayerId,
                matchWinner,
              });
            }}
          >
            <Icon name="swap-horizontal" size={16} color={COLORS.primary} />
            <Text style={styles.switchServerText}>
              Switch Serving Team to {serverTeam === 'A' ? teamB.name : teamA.name}
            </Text>
          </TouchableOpacity>
        )}

        {/* Game History */}
        <Text style={styles.sectionTitle}>Completed Games</Text>
        {gameHistory.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No games completed yet. Current Game in progress.</Text>
          </View>
        ) : (
          gameHistory.map((g, idx) => (
            <View key={idx} style={styles.historyRow}>
              <Text style={styles.historyGameLabel}>Game {g.game}</Text>
              <Text style={styles.historyScore}>
                {teamA.name} {g.A} - {g.B} {teamB.name}
              </Text>
              <View style={styles.historyWinnerBadge}>
                <Text style={styles.historyWinnerText}>
                  {g.winner === 'A' ? teamA.name : teamB.name} won
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
  gamePill: {
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  gamePillText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  gamesCountBadge: {
    backgroundColor: COLORS.bgSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  gamesCountText: { fontSize: 12, fontWeight: '800', color: COLORS.text },

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
  gamePointBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    marginBottom: 10,
  },
  gamePointText: { color: '#B91C1C', fontWeight: '800', fontSize: 12 },

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
  ruleHint: { fontSize: 10, color: COLORS.subtext, marginTop: 4, textAlign: 'center' },

  gameWonCard: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  gameWonTitle: { fontSize: 14, fontWeight: '800', color: '#047857', marginBottom: 8 },
  nextGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  nextGameBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

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
  pointBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

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
  historyGameLabel: { fontSize: 13, fontWeight: '700', color: COLORS.subtext },
  historyScore: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  historyWinnerBadge: {
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  historyWinnerText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
});
