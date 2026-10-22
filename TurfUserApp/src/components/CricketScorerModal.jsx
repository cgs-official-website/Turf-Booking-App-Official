import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import useTheme from '../hooks/useTheme';
import {
  processBallEvent,
  undoLastBall,
  createEmptyInnings,
  crrString,
  rrrString,
} from '../utils/cricketScorerEngine';

export default function CricketScorerModal({
  visible,
  onClose,
  match,
  tournament,
  onSyncLiveCricket,
  onFinishMatch,
  busy = false,
}) {
  const { C: colors, dark: isDark } = useTheme();

  // Local live cricket state
  const [liveState, setLiveState] = useState(null);

  // Sub-modals
  const [showNextBowlerModal, setShowNextBowlerModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showDismissalPickerModal, setShowDismissalPickerModal] = useState(false);
  const [showFielderPickerModal, setShowFielderPickerModal] = useState(false);
  const [pendingDismissal, setPendingDismissal] = useState('bowled');
  const [pendingFielder, setPendingFielder] = useState(null);

  // Guard to ensure modal only initializes state once per match open
  const initializedMatchIdRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  // Normalize squad helper
  const getNormalizedSquad = (team, squadKey, matchSetup) => {
    let raw = [];
    if (matchSetup && Array.isArray(matchSetup[squadKey]) && matchSetup[squadKey].length > 0) {
      raw = matchSetup[squadKey];
    } else if (team && Array.isArray(team.players) && team.players.length > 0) {
      raw = team.players;
    } else {
      raw = Array.from({ length: 11 }, (_, i) => ({ id: `${team?.id || 'tm'}_p${i + 1}`, name: `Player ${i + 1}` }));
    }
    return raw.map((p, idx) => ({
      id: String(p.id || p.userId || p._id || `${team?.id || 'tm'}_p${idx + 1}`),
      name: String(p.name || p.playerName || p.user?.name || (typeof p === 'string' ? p : `Player ${idx + 1}`)),
    }));
  };

  // Determine toss and batting order
  const isTeamABattingFirst = useMemo(() => {
    if (!match) return true;
    if (match.toss) {
      if (match.toss.winnerId === match.teamA?.id) {
        return match.toss.decision !== 'bowl';
      } else if (match.toss.winnerId === match.teamB?.id) {
        return match.toss.decision === 'bowl';
      }
    }
    if (match.matchSetup?.battingTeamId) {
      return match.matchSetup.battingTeamId === match.teamA?.id;
    }
    return true;
  }, [match]);

  const team1Squad = useMemo(() => {
    if (!match) return [];
    return isTeamABattingFirst
      ? getNormalizedSquad(match.teamA, 'playingXI_A', match.matchSetup)
      : getNormalizedSquad(match.teamB, 'playingXI_B', match.matchSetup);
  }, [match, isTeamABattingFirst]);

  const team2Squad = useMemo(() => {
    if (!match) return [];
    return isTeamABattingFirst
      ? getNormalizedSquad(match.teamB, 'playingXI_B', match.matchSetup)
      : getNormalizedSquad(match.teamA, 'playingXI_A', match.matchSetup);
  }, [match, isTeamABattingFirst]);

  const ensureBatter = (inn, pId, pName) => {
    if (!inn) return;
    if (!inn.batters) inn.batters = {};
    const id = String(pId);
    if (!inn.batters[id]) {
      inn.batters[id] = {
        id,
        name: pName || `Batter ${id}`,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        dismissal: null,
      };
    } else if (pName && (inn.batters[id].name.startsWith('Batter ') || inn.batters[id].name === 'Striker' || inn.batters[id].name === 'Non-Striker')) {
      inn.batters[id].name = pName;
    }
    return inn.batters[id];
  };

  const ensureBowler = (inn, pId, pName) => {
    if (!inn) return;
    if (!inn.bowlers) inn.bowlers = {};
    const id = String(pId);
    if (!inn.bowlers[id]) {
      inn.bowlers[id] = {
        id,
        name: pName || `Bowler ${id}`,
        balls: 0,
        overs: '0.0',
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: '0.0',
      };
    } else if (pName && (inn.bowlers[id].name.startsWith('Bowler ') || inn.bowlers[id].name === 'Bowler')) {
      inn.bowlers[id].name = pName;
    }
    return inn.bowlers[id];
  };

  const ensureInningsRoster = (inn, bSquad, bwSquad) => {
    if (!inn) return;
    if (!inn.batters) inn.batters = {};
    if (!inn.bowlers) inn.bowlers = {};

    bSquad.forEach((p) => {
      const pId = String(p.id);
      if (!inn.batters[pId]) {
        inn.batters[pId] = {
          id: pId,
          name: p.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          out: false,
          dismissal: null,
        };
      } else if (p.name && (inn.batters[pId].name.startsWith('Batter ') || inn.batters[pId].name === 'Striker' || inn.batters[pId].name === 'Non-Striker')) {
        inn.batters[pId].name = p.name;
      }
    });

    bwSquad.forEach((p) => {
      const pId = String(p.id);
      if (!inn.bowlers[pId]) {
        inn.bowlers[pId] = {
          id: pId,
          name: p.name,
          balls: 0,
          overs: '0.0',
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: '0.0',
        };
      } else if (p.name && (inn.bowlers[pId].name.startsWith('Bowler ') || inn.bowlers[pId].name === 'Bowler')) {
        inn.bowlers[pId].name = p.name;
      }
    });

    if (!inn.currentStrikerId && bSquad.length > 0) {
      inn.currentStrikerId = String(bSquad[0].id);
    }
    if (!inn.currentNonStrikerId && bSquad.length > 1) {
      inn.currentNonStrikerId = String(bSquad[1].id);
    }
    if (!inn.currentBowlerId && bwSquad.length > 0) {
      inn.currentBowlerId = String(bwSquad[0].id);
    }
  };

  useEffect(() => {
    if (!visible || !match) {
      initializedMatchIdRef.current = null;
      return;
    }

    // If modal is already open for this exact match, preserve current live state
    if (initializedMatchIdRef.current === match.id && liveState) {
      return;
    }

    initializedMatchIdRef.current = match.id;

    const firstBatTeam = isTeamABattingFirst ? match.teamA : match.teamB;
    const firstBowlTeam = isTeamABattingFirst ? match.teamB : match.teamA;
    const effectiveOvers = tournament?.oversPerTeam || match.matchSetup?.maxOvers || 10;

    if (match.liveCricket && (match.liveCricket.innings1 || match.liveCricket.innings2)) {
      const restored = JSON.parse(JSON.stringify(match.liveCricket));
      ensureInningsRoster(restored.innings1, team1Squad, team2Squad);
      if (restored.innings2) {
        ensureInningsRoster(restored.innings2, team2Squad, team1Squad);
      }
      setLiveState(restored);
    } else {
      const inn1 = createEmptyInnings(firstBatTeam, firstBowlTeam, effectiveOvers);
      ensureInningsRoster(inn1, team1Squad, team2Squad);
      const initialLive = {
        currentInnings: 1,
        maxOvers: effectiveOvers,
        target: null,
        innings1: inn1,
        innings2: null,
      };
      setLiveState(initialLive);
      scheduleSync(initialLive);
    }
  }, [visible, match?.id]);

  const scheduleSync = (updatedLive) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      if (onSyncLiveCricket) {
        onSyncLiveCricket(updatedLive);
      }
    }, 400);
  };

  if (!match || !liveState) return null;

  const currentInningsNum = liveState.currentInnings || 1;
  const curInnKey = currentInningsNum === 2 ? 'innings2' : 'innings1';
  const innings = liveState[curInnKey];

  if (!innings) return null;

  const battingSquad = currentInningsNum === 1 ? team1Squad : team2Squad;
  const bowlingSquad = currentInningsNum === 1 ? team2Squad : team1Squad;

  const rawStriker = innings.batters?.[innings.currentStrikerId];
  const rawNonStriker = innings.batters?.[innings.currentNonStrikerId];
  const rawBowler = innings.bowlers?.[innings.currentBowlerId];

  const striker = {
    id: innings.currentStrikerId,
    name: rawStriker?.name || battingSquad.find((p) => p.id === innings.currentStrikerId)?.name || 'Striker',
    runs: rawStriker?.runs || 0,
    balls: rawStriker?.balls || 0,
    fours: rawStriker?.fours || 0,
    sixes: rawStriker?.sixes || 0,
  };

  const nonStriker = {
    id: innings.currentNonStrikerId,
    name: rawNonStriker?.name || battingSquad.find((p) => p.id === innings.currentNonStrikerId)?.name || 'Non-Striker',
    runs: rawNonStriker?.runs || 0,
    balls: rawNonStriker?.balls || 0,
    fours: rawNonStriker?.fours || 0,
    sixes: rawNonStriker?.sixes || 0,
  };

  const bowler = {
    id: innings.currentBowlerId,
    name: rawBowler?.name || bowlingSquad.find((p) => p.id === innings.currentBowlerId)?.name || 'Bowler',
    overs: rawBowler?.overs || '0.0',
    maidens: rawBowler?.maidens || 0,
    runs: rawBowler?.runs || 0,
    wickets: rawBowler?.wickets || 0,
    economy: rawBowler?.economy || '0.0',
  };

  const strikerSR = striker.balls > 0 ? ((striker.runs / striker.balls) * 100).toFixed(1) : '0.0';
  const nonStrikerSR = nonStriker.balls > 0 ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(1) : '0.0';

  const crr = crrString(innings.runs, innings.legalBalls);
  const target = liveState.target;
  const maxBalls = (innings.maxOvers || 10) * 6;
  const remBalls = Math.max(0, maxBalls - innings.legalBalls);
  const remRuns = target ? Math.max(0, target - innings.runs) : null;
  const rrr = target ? rrrString(target, innings.runs, remBalls) : null;

  const isOverLimitReached = innings.legalBalls >= maxBalls;
  const isAllOut = innings.wickets >= 10 || (battingSquad.length > 0 && innings.wickets >= battingSquad.length - 1);
  const isTargetReached = Boolean(target && innings.runs >= target);
  const isInningsOver = Boolean(innings.isCompleted || isOverLimitReached || isAllOut || isTargetReached);

  const handleStartSecondInnings = () => {
    const inn1 = liveState.innings1;
    if (!inn1) return;
    const secondBattingTeam = inn1.bowlingTeamId === match.teamA?.id ? match.teamA : match.teamB;
    const secondBowlingTeam = inn1.battingTeamId === match.teamA?.id ? match.teamA : match.teamB;
    const inn2 = createEmptyInnings(secondBattingTeam, secondBowlingTeam, liveState.maxOvers);
    ensureInningsRoster(inn2, team2Squad, team1Squad);
    const nextLive = {
      ...liveState,
      currentInnings: 2,
      target: inn1.runs + 1,
      innings2: inn2,
    };
    setLiveState(nextLive);
    scheduleSync(nextLive);
  };

  const handleConfirmFinishMatch = () => {
    const inn1 = liveState.innings1;
    const inn2 = liveState.innings2;

    const team1Name = inn1?.battingTeamName || match.teamA?.name || 'Team 1';
    const score1 = `${inn1?.runs || 0}/${inn1?.wickets || 0} (${inn1?.overs || '0.0'} ov)`;

    const team2Name = inn2?.battingTeamName || inn1?.bowlingTeamName || match.teamB?.name || 'Team 2';
    const score2 = inn2 ? `${inn2.runs}/${inn2.wickets} (${inn2.overs} ov)` : 'Did not bat';

    let resultText = '';
    const runs1 = inn1?.runs || 0;
    const runs2 = inn2?.runs || 0;
    const wickets2 = inn2?.wickets || 0;

    if (!inn2) {
      resultText = `${team1Name} scored ${runs1} runs.`;
    } else if (runs2 > runs1) {
      const wLeft = Math.max(1, 10 - wickets2);
      resultText = `${team2Name} won by ${wLeft} wicket${wLeft === 1 ? '' : 's'}!`;
    } else if (runs1 > runs2) {
      const rDiff = runs1 - runs2;
      resultText = `${team1Name} won by ${rDiff} run${rDiff === 1 ? '' : 's'}!`;
    } else {
      resultText = `Scores are tied (${runs1} - ${runs2})! Super Over needed.`;
    }

    Alert.alert(
      'Finish Match Confirmation 🏆',
      `Score Summary:\n• ${team1Name}: ${score1}\n• ${team2Name}: ${score2}\n\nResult:\n${resultText}\n\nMark match COMPLETED and calculate winner automatically?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Finish',
          style: 'default',
          onPress: () => {
            onFinishMatch();
          },
        },
      ]
    );
  };

  const handleBall = (event) => {
    if (isInningsOver) {
      if (currentInningsNum === 1) {
        Alert.alert('1st Innings Finished', 'Innings limit reached. Please start the 2nd Innings.', [
          { text: 'Start 2nd Innings', onPress: handleStartSecondInnings },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        handleConfirmFinishMatch();
      }
      return;
    }

    const fullEvent = {
      ...event,
      strikerId: innings.currentStrikerId,
      strikerName: striker.name,
      nonStrikerId: innings.currentNonStrikerId,
      nonStrikerName: nonStriker.name,
      bowlerId: innings.currentBowlerId,
      bowlerName: bowler.name,
    };

    const res = processBallEvent(innings, fullEvent, target);
    const updatedLive = { ...liveState };
    updatedLive[curInnKey] = res.innings;

    setLiveState(updatedLive);
    scheduleSync(updatedLive);

    if (res.inningsCompleted) {
      if (currentInningsNum === 1) {
        Alert.alert(
          '1st Innings Completed! 🏁',
          `${innings.battingTeamName} finished at ${res.innings.runs}/${res.innings.wickets} in ${res.innings.overs} overs.\n\nTarget for ${innings.bowlingTeamName}: ${res.innings.runs + 1} runs.`,
          [
            {
              text: 'Start 2nd Innings',
              onPress: handleStartSecondInnings,
            },
          ]
        );
      } else {
        handleConfirmFinishMatch();
      }
      return;
    }

    if (res.wicketFell) {
      setShowWicketModal(true);
    } else if (res.overFinished) {
      setShowNextBowlerModal(true);
    }
  };

  const handleUndo = () => {
    if (!innings.ballHistory || innings.ballHistory.length === 0) {
      Alert.alert('Notice', 'No balls bowled in this innings yet.');
      return;
    }
    const undone = undoLastBall(innings);
    const updatedLive = { ...liveState };
    updatedLive[curInnKey] = undone;
    setLiveState(updatedLive);
    scheduleSync(updatedLive);
  };

  const handleWicketButtonPress = () => {
    setShowDismissalPickerModal(true);
  };

  const handleSelectDismissal = (type) => {
    setPendingDismissal(type);
    setShowDismissalPickerModal(false);
    if (['caught', 'run_out', 'stumped'].includes(type)) {
      setShowFielderPickerModal(true);
    } else {
      executeWicket(type, null);
    }
  };

  const handleSelectFielder = (fielder) => {
    setPendingFielder(fielder);
    setShowFielderPickerModal(false);
    executeWicket(pendingDismissal, fielder);
  };

  const executeWicket = (dismissalType, fielder) => {
    handleBall({
      type: 'W',
      runs: 0,
      dismissal: dismissalType,
      fielderId: fielder?.id || null,
      fielderName: fielder?.name || null,
    });
  };

  const handleSelectNextBowler = (player) => {
    const updatedLive = { ...liveState };
    const curInn = updatedLive[curInnKey];
    curInn.currentBowlerId = String(player.id);
    ensureBowler(curInn, player.id, player.name);
    setLiveState(updatedLive);
    scheduleSync(updatedLive);
    setShowNextBowlerModal(false);
  };

  const handleSelectNewBatter = (player) => {
    const updatedLive = { ...liveState };
    const curInn = updatedLive[curInnKey];
    const newBatterId = String(player.id);
    ensureBatter(curInn, newBatterId, player.name);

    const isEndOverWicket = curInn.legalBalls > 0 && curInn.legalBalls % 6 === 0;
    if (isEndOverWicket) {
      curInn.currentStrikerId = curInn.currentNonStrikerId;
      curInn.currentNonStrikerId = newBatterId;
    } else {
      curInn.currentStrikerId = newBatterId;
    }

    setLiveState(updatedLive);
    scheduleSync(updatedLive);
    setShowWicketModal(false);

    if (isEndOverWicket && !curInn.isCompleted) {
      setTimeout(() => setShowNextBowlerModal(true), 300);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bg || colors.background || '#0F172A' }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.liveTagRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveTagText}>LIVE SCORER</Text>
                <Text style={[styles.roundLabel, { color: colors.subtext || colors.textSecondary }]}>
                  • {match.roundName || 'Match'} {match.matchNumber ? `#${match.matchNumber}` : ''}
                </Text>
              </View>
              <Text style={[styles.battingTeamTitle, { color: colors.text }]} numberOfLines={1}>
                {innings.battingTeamName} {currentInningsNum === 2 ? '(2nd Inn)' : '(1st Inn)'}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Scorecard Hero Board */}
            <View style={[styles.scoreHeroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.heroMainRow}>
                <View style={styles.scoreBlock}>
                  <Text style={[styles.runsWickets, { color: colors.text }]}>
                    {innings.runs}/{innings.wickets}
                  </Text>
                  <Text style={[styles.oversText, { color: colors.subtext || colors.textSecondary }]}>
                    {innings.overs} / {innings.maxOvers} ov
                  </Text>
                </View>

                <View style={styles.runRateBlock}>
                  <Text style={[styles.crrLabel, { color: colors.subtext || colors.textSecondary }]}>CRR: {crr}</Text>
                  {target && (
                    <Text style={[styles.rrrLabel, { color: '#D97706' }]}>
                      RRR: {rrr}
                    </Text>
                  )}
                </View>
              </View>

              {/* Target / Chasing Lead */}
              {target && (
                <View style={[styles.chaseBanner, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7' }]}>
                  <Feather name="target" size={13} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={[styles.chaseText, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                    Need {remRuns} runs from {remBalls} balls • Target: {target}
                  </Text>
                </View>
              )}
            </View>

            {/* Current Batters Table */}
            <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.thBatter, { color: colors.subtext || colors.textSecondary }]}>BATSMAN</Text>
                <Text style={[styles.thStat, { color: colors.subtext || colors.textSecondary }]}>R</Text>
                <Text style={[styles.thStat, { color: colors.subtext || colors.textSecondary }]}>B</Text>
                <Text style={[styles.thStat, { color: colors.subtext || colors.textSecondary }]}>4s</Text>
                <Text style={[styles.thStat, { color: colors.subtext || colors.textSecondary }]}>6s</Text>
                <Text style={[styles.thStatWide, { color: colors.subtext || colors.textSecondary }]}>SR</Text>
              </View>

              {/* Striker Row */}
              <View style={[styles.tableRow, styles.strikerRow, { borderBottomColor: colors.border }]}>
                <View style={styles.tdBatter}>
                  <View style={styles.strikerDot} />
                  <Text style={[styles.batterName, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                    {striker.name} *
                  </Text>
                </View>
                <Text style={[styles.tdStat, { color: colors.text, fontWeight: '800' }]}>{striker.runs}</Text>
                <Text style={[styles.tdStat, { color: colors.subtext || colors.textSecondary }]}>{striker.balls}</Text>
                <Text style={[styles.tdStat, { color: colors.subtext || colors.textSecondary }]}>{striker.fours || 0}</Text>
                <Text style={[styles.tdStat, { color: colors.subtext || colors.textSecondary }]}>{striker.sixes || 0}</Text>
                <Text style={[styles.tdStatWide, { color: colors.subtext || colors.textSecondary }]}>{strikerSR}</Text>
              </View>

              {/* Non-Striker Row */}
              <View style={styles.tableRow}>
                <View style={styles.tdBatter}>
                  <Text style={[styles.batterName, { color: colors.text, marginLeft: 10 }]} numberOfLines={1}>
                    {nonStriker.name}
                  </Text>
                </View>
                <Text style={[styles.tdStat, { color: colors.text, fontWeight: '700' }]}>{nonStriker.runs}</Text>
                <Text style={[styles.tdStat, { color: colors.subtext || colors.textSecondary }]}>{nonStriker.balls}</Text>
                <Text style={[styles.tdStat, { color: colors.subtext || colors.textSecondary }]}>{nonStriker.fours || 0}</Text>
                <Text style={[styles.tdStat, { color: colors.subtext || colors.textSecondary }]}>{nonStriker.sixes || 0}</Text>
                <Text style={[styles.tdStatWide, { color: colors.subtext || colors.textSecondary }]}>{nonStrikerSR}</Text>
              </View>
            </View>

            {/* Current Bowler Card */}
            <View style={[styles.bowlerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.bowlerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bowlerLabel, { color: colors.subtext || colors.textSecondary }]}>BOWLER</Text>
                  <Text style={[styles.bowlerName, { color: colors.text }]} numberOfLines={1}>
                    {bowler.name}
                  </Text>
                </View>
                <View style={styles.bowlerFigures}>
                  <Text style={[styles.bowlerFigText, { color: colors.text }]}>
                    {bowler.overs} ov • {bowler.maidens || 0} m • {bowler.runs} r • {bowler.wickets} w
                  </Text>
                  <Text style={[styles.bowlerEcon, { color: colors.subtext || colors.textSecondary }]}>
                    Econ: {bowler.economy}
                  </Text>
                </View>
              </View>

              {/* Over Deliveries Strip */}
              <View style={styles.overStripContainer}>
                <Text style={[styles.thisOverLabel, { color: colors.subtext || colors.textSecondary }]}>THIS OVER:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ballsRow}>
                  {innings.currentOverBalls && innings.currentOverBalls.length > 0 ? (
                    innings.currentOverBalls.map((b, idx) => (
                      <View
                        key={`ball_${idx}`}
                        style={[
                          styles.ballBadge,
                          b.includes('W') && { backgroundColor: '#EF4444' },
                          (b === '4' || b === '6') && { backgroundColor: '#10B981' },
                          (b.includes('WD') || b.includes('NB')) && { backgroundColor: '#F59E0B' },
                          (!b.includes('W') && b !== '4' && b !== '6' && !b.includes('WD') && !b.includes('NB')) && { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                        ]}
                      >
                        <Text style={[styles.ballBadgeText, (b.includes('W') || b === '4' || b === '6') && { color: '#FFFFFF' }]}>
                          {b}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.subtext || colors.textSecondary, fontStyle: 'italic' }}>
                      Ready for 1st ball
                    </Text>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* Innings Completed Status Banner */}
            {isInningsOver && (
              <View style={{ marginBottom: 12, padding: 14, borderRadius: 12, backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderWidth: 1, borderColor: '#D97706', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#FBBF24' : '#B45309', marginBottom: 6 }}>
                  {isTargetReached ? 'Target Reached! 🏁' : (isAllOut ? 'All Out! 🏁' : 'Over Limit Reached! 🏁')}
                </Text>
                <Text style={{ fontSize: 12, color: colors.subtext || colors.textSecondary, textAlign: 'center', marginBottom: 10 }}>
                  {currentInningsNum === 1
                    ? `1st Innings finished at ${innings.runs}/${innings.wickets}. Target for 2nd innings: ${innings.runs + 1}`
                    : `2nd Innings finished at ${innings.runs}/${innings.wickets}. Match concluded.`}
                </Text>
                {currentInningsNum === 1 ? (
                  <TouchableOpacity
                    style={[styles.finishBtn, { backgroundColor: colors.primary, paddingHorizontal: 20 }]}
                    onPress={handleStartSecondInnings}
                  >
                    <Text style={styles.finishBtnText}>Start 2nd Innings 🏏</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.finishBtn, { backgroundColor: '#059669', paddingHorizontal: 20 }]}
                    onPress={handleConfirmFinishMatch}
                  >
                    <Text style={styles.finishBtnText}>Finish Match & Declare Winner 🏆</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Keypad */}
            <View style={[styles.keypadContainer, isInningsOver && { opacity: 0.45 }]}>
              {/* Row 1: 0, 1, 2, 3 */}
              <View style={styles.keypadRow}>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleBall({ type: 'RUN', runs: 0 })}>
                  <Text style={[styles.keyText, { color: colors.text }]}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleBall({ type: 'RUN', runs: 1 })}>
                  <Text style={[styles.keyText, { color: colors.text }]}>1</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleBall({ type: 'RUN', runs: 2 })}>
                  <Text style={[styles.keyText, { color: colors.text }]}>2</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleBall({ type: 'RUN', runs: 3 })}>
                  <Text style={[styles.keyText, { color: colors.text }]}>3</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2: 4, 6, WD, NB */}
              <View style={styles.keypadRow}>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: '#10B981' }]} onPress={() => handleBall({ type: 'RUN', runs: 4 })}>
                  <Text style={[styles.keyText, { color: '#FFFFFF' }]}>4</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: '#059669' }]} onPress={() => handleBall({ type: 'RUN', runs: 6 })}>
                  <Text style={[styles.keyText, { color: '#FFFFFF' }]}>6</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: colors.card, borderColor: '#F59E0B' }]} onPress={() => handleBall({ type: 'WD', runs: 0 })}>
                  <Text style={[styles.keyText, { color: '#F59E0B' }]}>WD</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: colors.card, borderColor: '#F59E0B' }]} onPress={() => handleBall({ type: 'NB', runs: 0 })}>
                  <Text style={[styles.keyText, { color: '#F59E0B' }]}>NB</Text>
                </TouchableOpacity>
              </View>

              {/* Row 3: BYE, LB, W, UNDO */}
              <View style={styles.keypadRow}>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleBall({ type: 'BYE', runs: 1 })}>
                  <Text style={[styles.keyTextSmall, { color: colors.text }]}>BYE</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleBall({ type: 'LB', runs: 1 })}>
                  <Text style={[styles.keyTextSmall, { color: colors.text }]}>LB</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isInningsOver} style={[styles.keyBtn, { backgroundColor: '#EF4444' }]} onPress={handleWicketButtonPress}>
                  <Text style={[styles.keyText, { color: '#FFFFFF' }]}>W</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keyBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={handleUndo}>
                  <Feather name="rotate-ccw" size={18} color={colors.text} />
                  <Text style={[styles.undoText, { color: colors.text }]}>UNDO</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => setShowNextBowlerModal(true)}
              >
                <Feather name="user" size={14} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>Change Bowler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.finishBtn, { backgroundColor: '#059669' }]}
                onPress={handleConfirmFinishMatch}
              >
                <Feather name="check-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.finishBtnText}>Finish Match</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* NEXT BOWLER MODAL */}
          <Modal visible={showNextBowlerModal} transparent animationType="fade">
            <View style={styles.subModalOverlay}>
              <View style={[styles.subModalCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.subModalTitle, { color: colors.text }]}>Over Complete! Select Next Bowler</Text>
                <Text style={{ color: colors.subtext || colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                  Pick bowler from {innings.bowlingTeamName}
                </Text>

                <ScrollView style={{ maxHeight: 280 }}>
                  {bowlingSquad.map((player) => {
                    const isPrevBowler = String(player.id) === String(innings.currentBowlerId);
                    return (
                      <TouchableOpacity
                        key={`nb_${player.id}`}
                        style={[
                          styles.subModalOption,
                          { borderBottomColor: colors.border, opacity: isPrevBowler ? 0.4 : 1 },
                        ]}
                        onPress={() => !isPrevBowler && handleSelectNextBowler(player)}
                        disabled={isPrevBowler}
                      >
                        <Text style={[styles.subModalOptionText, { color: colors.text }]}>
                          {player.name} {isPrevBowler ? '(Bowled last over)' : ''}
                        </Text>
                        <Feather name="chevron-right" size={16} color={colors.subtext || colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* DISMISSAL TYPE PICKER MODAL */}
          <Modal visible={showDismissalPickerModal} transparent animationType="fade">
            <View style={styles.subModalOverlay}>
              <View style={[styles.subModalCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.subModalTitle, { color: '#EF4444' }]}>Wicket! Select Dismissal Type</Text>
                <Text style={{ color: colors.subtext || colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                  How was {striker.name} dismissed?
                </Text>

                {[
                  { key: 'bowled', label: 'Bowled' },
                  { key: 'caught', label: 'Caught' },
                  { key: 'lbw', label: 'LBW' },
                  { key: 'run_out', label: 'Run Out' },
                  { key: 'stumped', label: 'Stumped' },
                  { key: 'hit_wicket', label: 'Hit Wicket' },
                ].map((item) => (
                  <TouchableOpacity
                    key={`d_${item.key}`}
                    style={[styles.subModalOption, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectDismissal(item.key)}
                  >
                    <Text style={[styles.subModalOptionText, { color: colors.text }]}>{item.label}</Text>
                    <Feather name="chevron-right" size={16} color={colors.subtext || colors.textSecondary} />
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.actionBtn, { marginTop: 10, alignSelf: 'center', borderColor: colors.border }]}
                  onPress={() => setShowDismissalPickerModal(false)}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* FIELDER PICKER MODAL */}
          <Modal visible={showFielderPickerModal} transparent animationType="fade">
            <View style={styles.subModalOverlay}>
              <View style={[styles.subModalCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.subModalTitle, { color: '#0284C7' }]}>Select Fielder 🧤</Text>
                <Text style={{ color: colors.subtext || colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                  Who contributed to the {pendingDismissal.replace('_', ' ')}?
                </Text>

                <ScrollView style={{ maxHeight: 260 }}>
                  {bowlingSquad.map((player) => (
                    <TouchableOpacity
                      key={`f_${player.id}`}
                      style={[styles.subModalOption, { borderBottomColor: colors.border }]}
                      onPress={() => handleSelectFielder(player)}
                    >
                      <Text style={[styles.subModalOptionText, { color: colors.text }]}>{player.name}</Text>
                      <Feather name="check" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* NEW BATTER ON WICKET MODAL */}
          <Modal visible={showWicketModal} transparent animationType="fade">
            <View style={styles.subModalOverlay}>
              <View style={[styles.subModalCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.subModalTitle, { color: '#EF4444' }]}>WICKET! Select New Batsman</Text>
                <Text style={{ color: colors.subtext || colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                  {striker.name} is OUT! Choose incoming batter:
                </Text>

                {(() => {
                  const available = battingSquad.filter((player) => {
                    const pId = String(player.id);
                    const batterStat = innings.batters?.[pId];
                    const isOut = Boolean(batterStat?.out);
                    const isRecordedInFow = Array.isArray(innings.fallOfWickets) && innings.fallOfWickets.some((f) => String(f.batterId) === pId);
                    const isDismissedStriker = pId === String(innings.currentStrikerId);
                    const isNonStriker = pId === String(innings.currentNonStrikerId);
                    return !isOut && !isRecordedInFow && !isDismissedStriker && !isNonStriker;
                  });

                  if (available.length === 0) {
                    return (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 14, textAlign: 'center', marginBottom: 10 }}>
                          All Out! No more available batsmen in the squad.
                        </Text>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
                          onPress={() => {
                            setShowWicketModal(false);
                            const updatedLive = { ...liveState };
                            updatedLive[curInnKey].isCompleted = true;
                            setLiveState(updatedLive);
                            scheduleSync(updatedLive);
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Confirm All Out</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return (
                    <ScrollView style={{ maxHeight: 280 }}>
                      {available.map((player) => (
                        <TouchableOpacity
                          key={`newb_${player.id}`}
                          style={[
                            styles.subModalOption,
                            { borderBottomColor: colors.border },
                          ]}
                          onPress={() => handleSelectNewBatter(player)}
                        >
                          <Text style={[styles.subModalOptionText, { color: colors.text }]}>
                            {player.name}
                          </Text>
                          <Feather name="plus-circle" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  );
                })()}
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '92%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomWidth: 1,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  roundLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  battingTeamTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 36,
  },
  scoreHeroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  heroMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBlock: {},
  runsWickets: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  oversText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  runRateBlock: {
    alignItems: 'flex-end',
  },
  crrLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  rrrLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  chaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  chaseText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  thBatter: {
    flex: 3,
    fontSize: 11,
    fontWeight: '800',
  },
  thStat: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  thStatWide: {
    flex: 1.5,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  strikerRow: {
    borderBottomWidth: 1,
  },
  tdBatter: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  strikerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  batterName: {
    fontSize: 13,
    flex: 1,
  },
  tdStat: {
    flex: 1,
    fontSize: 13,
    textAlign: 'center',
  },
  tdStatWide: {
    flex: 1.5,
    fontSize: 12,
    textAlign: 'center',
  },
  bowlerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  bowlerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bowlerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bowlerName: {
    fontSize: 14,
    fontWeight: '800',
  },
  bowlerFigures: {
    alignItems: 'flex-end',
  },
  bowlerFigText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bowlerEcon: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  overStripContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(100,116,139,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  thisOverLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginRight: 8,
  },
  ballsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ballBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  ballBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  keypadContainer: {
    gap: 10,
    marginBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keyBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '900',
  },
  keyTextSmall: {
    fontSize: 13,
    fontWeight: '800',
  },
  undoText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  finishBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 18,
    elevation: 8,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  subModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subModalOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
