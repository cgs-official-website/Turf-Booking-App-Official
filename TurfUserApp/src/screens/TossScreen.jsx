import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

const OVER_OPTIONS = [5, 6, 8, 10, 15, 20];
const FOOTBALL_HALVES = [10, 15, 20, 30, 45];
const BADMINTON_POINTS = [11, 15, 21];
const VOLLEYBALL_POINTS = [15, 21, 25];
const BASKETBALL_QUARTERS = [5, 8, 10, 12];
const TENNIS_GAMES = [4, 6];

export default function TossScreen({ route, navigation }) {
  const { matchId } = route.params;

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Toss state
  const [spinTeam, setSpinTeam] = useState('A'); // Team A or Team B spins
  const [callTeam, setCallTeam] = useState('B'); // Opposing team that chooses
  const [call, setCall] = useState(null); // 'H' | 'T'
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null); // 'H' | 'T'
  const [wonBy, setWonBy] = useState(null); // 'A' | 'B'
  const [decision, setDecision] = useState(null); // Sport-specific decision
  const [saving, setSaving] = useState(false);
  // Coin face alternation during spin
  const [coinFace, setCoinFace] = useState('TOSS'); // 'TOSS' | 'HEAD'
  const coinFaceIntervalRef = useRef(null);

  // Sport-specific configuration state
  const [overs, setOvers] = useState(6);
  const [halfDuration, setHalfDuration] = useState(20);
  const [badmintonPoints, setBadmintonPoints] = useState(21);
  const [badmintonGames, setBadmintonGames] = useState(3);
  const [volleyballPoints, setVolleyballPoints] = useState(25);
  const [volleyballSets, setVolleyballSets] = useState(3);
  const [basketballQuarter, setBasketballQuarter] = useState(10);
  const [tennisGames, setTennisGames] = useState(6);
  const [tennisSets, setTennisSets] = useState(3);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const rotateY = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1800deg'] });
  const scale = spinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1] });

  useEffect(() => {
    (async () => {
      try {
        const m = await matchStorage.getMatch(matchId);
        if (m) {
          setMatch(m);
          if (m.overs) setOvers(m.overs);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  const teamAName = match?.teams?.A?.name || 'Team A';
  const teamBName = match?.teams?.B?.name || 'Team B';
  const teamLabel = (t) => (t === 'A' ? teamAName : teamBName);
  const sport = (match?.sport || 'Cricket').toLowerCase();

  const handleSelectSpinner = (team) => {
    if (spinning) return;
    setSpinTeam(team);
    const otherTeam = team === 'A' ? 'B' : 'A';
    setCallTeam(otherTeam);
    setCall(null); // Clear previous calling team selection as required
  };

  const doSpin = () => {
    if (!call || !spinTeam || spinning) return;
    setSpinning(true);
    setResult(null);
    setWonBy(null);
    setDecision(null);
    setCoinFace('TOSS');
    spinAnim.setValue(0);

    // Alternate coin face between 'TOSS' and 'HEAD' every 120ms while spinning
    let faceToggle = false;
    coinFaceIntervalRef.current = setInterval(() => {
      faceToggle = !faceToggle;
      setCoinFace(faceToggle ? 'HEAD' : 'TOSS');
    }, 120);

    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      clearInterval(coinFaceIntervalRef.current);
      coinFaceIntervalRef.current = null;
      const outcome = Math.random() < 0.5 ? 'H' : 'T';
      // Calling team wins if their call matches actual result; otherwise spinner team wins
      const winner = outcome === call ? callTeam : spinTeam;
      setCoinFace(outcome === 'H' ? 'HEAD' : 'TAIL');
      setResult(outcome);
      setWonBy(winner);
      setSpinning(false);
    });
  };

  const handleConfirm = async () => {
    if (!wonBy || !decision || saving) return;
    setSaving(true);
    try {
      const tossData = {
        spinTeam,
        spinTeamName: teamLabel(spinTeam),
        callTeam,
        callTeamName: teamLabel(callTeam),
        call: call === 'H' ? 'Heads' : 'Tails',
        result: result === 'H' ? 'Heads' : 'Tails',
        wonBy,
        wonByName: teamLabel(wonBy),
        decision,
      };

      if (sport === 'cricket') {
        const battingTeam = decision === 'bat' ? wonBy : (wonBy === 'A' ? 'B' : 'A');
        const bowlingTeam = battingTeam === 'A' ? 'B' : 'A';

        const innings0 = {
          battingTeam, bowlingTeam,
          totalRuns: 0, wickets: 0, legalBalls: 0, extras: 0,
          strikerId: null, nonStrikerId: null, currentBowlerId: null,
          batters: {}, bowlers: {},
          completed: false,
        };

        const updated = await matchStorage.updateMatch(matchId, {
          status: 'toss',
          overs,
          toss: { ...tossData, overs },
          currentInningsIndex: 0,
          innings: [innings0],
        });
        await matchStorage.addTimeline(
          matchId,
          `${teamLabel(wonBy)} won the toss, chose to ${decision}`
        );
        navigation.replace('Scorecard', { matchId: updated.id, needSetup: true });
        return;
      }

      if (sport === 'football') {
        const kickoffTeam = decision === 'kickoff' ? wonBy : (wonBy === 'A' ? 'B' : 'A');
        const footballState = {
          scoreA: 0,
          scoreB: 0,
          half: 1, // 1: 1st Half, 2: Half Time, 3: 2nd Half, 4: Full Time
          halfDurationMinutes: halfDuration,
          elapsedSeconds: 0,
          isRunning: false,
          kickoffTeam,
          events: [], // [{ id, type, minute, team, playerId, playerName, assistId, assistName, detail }]
        };

        const updated = await matchStorage.updateMatch(matchId, {
          status: 'live',
          toss: { ...tossData, halfDuration, kickoffTeam },
          football: footballState,
        });
        await matchStorage.addTimeline(
          matchId,
          `${teamLabel(wonBy)} won the toss, chose ${decision === 'kickoff' ? 'Kickoff' : 'Side'}`
        );
        navigation.replace('FootballScorecard', { matchId: updated.id });
        return;
      }

      if (sport === 'badminton') {
        const servingTeam = decision === 'serve' ? wonBy : (wonBy === 'A' ? 'B' : 'A');
        const badmintonState = {
          gamesA: 0,
          gamesB: 0,
          currentGame: 1,
          maxGames: badmintonGames,
          targetPoints: badmintonPoints,
          pointsA: 0,
          pointsB: 0,
          serverTeam: servingTeam,
          gameHistory: [], // [{ game: 1, scoreA, scoreB, winner }]
          completed: false,
        };

        const updated = await matchStorage.updateMatch(matchId, {
          status: 'live',
          toss: { ...tossData, servingTeam, badmintonPoints, badmintonGames },
          badminton: badmintonState,
        });
        await matchStorage.addTimeline(
          matchId,
          `${teamLabel(wonBy)} won the toss, chose ${decision === 'serve' ? 'to Serve First' : 'Court Side'}`
        );
        navigation.replace('BadmintonScorecard', { matchId: updated.id });
        return;
      }

      if (sport === 'volleyball') {
        const servingTeam = decision === 'serve' ? wonBy : (wonBy === 'A' ? 'B' : 'A');
        const volleyballState = {
          setsA: 0,
          setsB: 0,
          currentSet: 1,
          maxSets: volleyballSets,
          targetPoints: volleyballPoints,
          pointsA: 0,
          pointsB: 0,
          servingTeam,
          setHistory: [], // [{ set: 1, scoreA, scoreB, winner }]
          completed: false,
        };

        const updated = await matchStorage.updateMatch(matchId, {
          status: 'live',
          toss: { ...tossData, servingTeam, volleyballPoints, volleyballSets },
          volleyball: volleyballState,
        });
        await matchStorage.addTimeline(
          matchId,
          `${teamLabel(wonBy)} won the toss, chose ${decision === 'serve' ? 'to Serve' : 'Side'}`
        );
        navigation.replace('VolleyballScorecard', { matchId: updated.id });
        return;
      }

      if (sport === 'basketball') {
        const possessionTeam = decision === 'ball' ? wonBy : (wonBy === 'A' ? 'B' : 'A');
        const basketballState = {
          scoreA: 0,
          scoreB: 0,
          quarter: 1, // 1, 2, 3 (Half Time), 4 (Q3), 5 (Q4), 6+ (OT)
          quarterDurationMinutes: basketballQuarter,
          elapsedSeconds: 0,
          isRunning: false,
          possessionTeam,
          foulsA: 0,
          foulsB: 0,
          events: [], // [{ id, type, quarter, team, points, playerId, playerName, text }]
          completed: false,
        };

        const updated = await matchStorage.updateMatch(matchId, {
          status: 'live',
          toss: { ...tossData, possessionTeam, basketballQuarter },
          basketball: basketballState,
        });
        await matchStorage.addTimeline(
          matchId,
          `${teamLabel(wonBy)} won opening toss, chose ${decision === 'ball' ? 'Ball Possession' : 'Side'}`
        );
        navigation.replace('BasketballScorecard', { matchId: updated.id });
        return;
      }

      if (sport === 'tennis') {
        const servingTeam = decision === 'serve' ? wonBy : (wonBy === 'A' ? 'B' : 'A');
        const tennisState = {
          setsA: 0,
          setsB: 0,
          gamesA: 0,
          gamesB: 0,
          pointsA: '0', // '0', '15', '30', '40', 'AD'
          pointsB: '0',
          currentSet: 1,
          maxSets: tennisSets,
          gamesPerSet: tennisGames,
          serverTeam: servingTeam,
          setHistory: [], // [{ set: 1, gamesA, gamesB, winner }]
          completed: false,
        };

        const updated = await matchStorage.updateMatch(matchId, {
          status: 'live',
          toss: { ...tossData, servingTeam, tennisGames, tennisSets },
          tennis: tennisState,
        });
        await matchStorage.addTimeline(
          matchId,
          `${teamLabel(wonBy)} won the toss, chose ${decision === 'serve' ? 'to Serve' : decision === 'receive' ? 'to Receive' : 'Side'}`
        );
        navigation.replace('TennisScorecard', { matchId: updated.id });
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Toss</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Coin Box */}
        <View style={styles.coinBox}>
          <Animated.View style={[styles.coin, { transform: [{ perspective: 800 }, { rotateY }, { scale }] }]}>
            {spinning ? (
              <View style={styles.coinFaceContainer}>
                <Text style={styles.coinFaceText}>{coinFace}</Text>
              </View>
            ) : result ? (
              <View style={styles.coinFaceContainer}>
                <Text style={styles.coinFaceText}>
                  {result === 'H' ? 'HEAD' : 'TAIL'}
                </Text>
              </View>
            ) : (
              <View style={styles.coinFaceContainer}>
                <Text style={styles.coinFaceText}>TOSS</Text>
              </View>
            )}
          </Animated.View>
          <Text style={styles.coinCaption}>
            {result
              ? `Coin lands ${result === 'H' ? 'Heads' : 'Tails'}`
              : "Let's see who's going to win the Toss?"}
          </Text>
          {wonBy && (
            <View style={styles.winnerBadge}>
              <Icon name="trophy" size={16} color="#c2410c" style={{ marginRight: 6 }} />
              <Text style={styles.wonByText}>{teamLabel(wonBy)} Won the Toss</Text>
            </View>
          )}
        </View>

        {/* Toss Summary Display (After Spin) */}
        {result && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Coin Spinner:</Text>
              <Text style={styles.summaryValue}>{teamLabel(spinTeam)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Calling Team:</Text>
              <Text style={styles.summaryValue}>{teamLabel(callTeam)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{teamLabel(callTeam)}'s Call:</Text>
              <Text style={styles.summaryValue}>{call === 'H' ? 'Heads' : 'Tails'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Actual Coin Result:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                {result === 'H' ? 'Heads' : 'Tails'}
              </Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingTop: 8 }]}>
              <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>Toss Winner:</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a', fontWeight: '800' }]}>
                {teamLabel(wonBy)}
              </Text>
            </View>
          </View>
        )}

        {/* Step 1 & 2: Before Toss Result */}
        {!result && (
          <View style={styles.setupCard}>
            {/* Step 1: Spinner Team */}
            <Text style={styles.label}>Which team going to spin?</Text>
            <View style={styles.pillRow}>
              <TouchableOpacity
                style={[styles.pill, spinTeam === 'A' && styles.pillActive]}
                onPress={() => handleSelectSpinner('A')}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, spinTeam === 'A' && styles.pillTextActive]} numberOfLines={1}>
                  {teamAName}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, spinTeam === 'B' && styles.pillActive]}
                onPress={() => handleSelectSpinner('B')}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, spinTeam === 'B' && styles.pillTextActive]} numberOfLines={1}>
                  {teamBName}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step 2: Calling Team selects Heads / Tails */}
            <Text style={styles.label}>{teamLabel(callTeam)}: Choose Heads or Tails ?</Text>
            <View style={styles.pillRow}>
              <TouchableOpacity
                style={[styles.pill, call === 'H' && styles.pillActive]}
                onPress={() => setCall('H')}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, call === 'H' && styles.pillTextActive]}>Heads</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, call === 'T' && styles.pillActive]}
                onPress={() => setCall('T')}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, call === 'T' && styles.pillTextActive]}>Tails</Text>
              </TouchableOpacity>
            </View>

            {/* Step 3: Spin Button */}
            <TouchableOpacity
              style={[styles.spinBtn, (!call || !spinTeam || spinning) && { opacity: 0.5 }]}
              disabled={!call || !spinTeam || spinning}
              onPress={doSpin}
              activeOpacity={0.85}
            >
              <Text style={styles.spinBtnText}>{spinning ? 'Spinning Coin…' : 'Spin Coin'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Sport-Specific Post-Toss Decisions */}
        {result && wonBy && (
          <View style={styles.postTossCard}>
            {/* ─── CRICKET ─── */}
            {sport === 'cricket' && (
              <>
                <Text style={styles.label}>{teamLabel(wonBy)}: Choose Bat or Bowl ?</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'bat' && styles.pillActive]}
                    onPress={() => setDecision('bat')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'bat' && styles.pillTextActive]}>🏏 Bat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'bowl' && styles.pillActive]}
                    onPress={() => setDecision('bowl')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'bowl' && styles.pillTextActive]}>⚾ Bowl</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Choose how many over?</Text>
                <View style={styles.oversRow}>
                  {OVER_OPTIONS.map((o) => (
                    <TouchableOpacity
                      key={o}
                      style={[styles.oversPill, overs === o && styles.pillActive]}
                      onPress={() => setOvers(o)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, overs === o && styles.pillTextActive]}>{o}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ─── FOOTBALL ─── */}
            {sport === 'football' && (
              <>
                <Text style={styles.label}>{teamLabel(wonBy)}: Choose Kickoff or Side ?</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'kickoff' && styles.pillActive]}
                    onPress={() => setDecision('kickoff')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'kickoff' && styles.pillTextActive]}>⚽ Kickoff</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'side' && styles.pillActive]}
                    onPress={() => setDecision('side')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'side' && styles.pillTextActive]}>🔄 Choose Side</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Half Duration (Minutes per half)</Text>
                <View style={styles.oversRow}>
                  {FOOTBALL_HALVES.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.oversPill, halfDuration === h && styles.pillActive]}
                      onPress={() => setHalfDuration(h)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, halfDuration === h && styles.pillTextActive]}>{h}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ─── BADMINTON ─── */}
            {sport === 'badminton' && (
              <>
                <Text style={styles.label}>{teamLabel(wonBy)}: Choose Serve or Side ?</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'serve' && styles.pillActive]}
                    onPress={() => setDecision('serve')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'serve' && styles.pillTextActive]}>🏸 Serve First</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'side' && styles.pillActive]}
                    onPress={() => setDecision('side')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'side' && styles.pillTextActive]}>🔄 Choose Side</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Points per Game</Text>
                <View style={styles.oversRow}>
                  {BADMINTON_POINTS.map((pt) => (
                    <TouchableOpacity
                      key={pt}
                      style={[styles.oversPill, badmintonPoints === pt && styles.pillActive]}
                      onPress={() => setBadmintonPoints(pt)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, badmintonPoints === pt && styles.pillTextActive]}>{pt} Pts</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Match Format</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, badmintonGames === 1 && styles.pillActive]}
                    onPress={() => setBadmintonGames(1)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, badmintonGames === 1 && styles.pillTextActive]}>1 Game</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, badmintonGames === 3 && styles.pillActive]}
                    onPress={() => setBadmintonGames(3)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, badmintonGames === 3 && styles.pillTextActive]}>Best of 3</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ─── VOLLEYBALL ─── */}
            {sport === 'volleyball' && (
              <>
                <Text style={styles.label}>{teamLabel(wonBy)}: Choose Serve or Side ?</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'serve' && styles.pillActive]}
                    onPress={() => setDecision('serve')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'serve' && styles.pillTextActive]}>🏐 Serve First</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'side' && styles.pillActive]}
                    onPress={() => setDecision('side')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'side' && styles.pillTextActive]}>🔄 Receive / Side</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Points per Set</Text>
                <View style={styles.oversRow}>
                  {VOLLEYBALL_POINTS.map((pt) => (
                    <TouchableOpacity
                      key={pt}
                      style={[styles.oversPill, volleyballPoints === pt && styles.pillActive]}
                      onPress={() => setVolleyballPoints(pt)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, volleyballPoints === pt && styles.pillTextActive]}>{pt} Pts</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Sets Format</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, volleyballSets === 3 && styles.pillActive]}
                    onPress={() => setVolleyballSets(3)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, volleyballSets === 3 && styles.pillTextActive]}>Best of 3 Sets</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, volleyballSets === 5 && styles.pillActive]}
                    onPress={() => setVolleyballSets(5)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, volleyballSets === 5 && styles.pillTextActive]}>Best of 5 Sets</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ─── BASKETBALL ─── */}
            {sport === 'basketball' && (
              <>
                <Text style={styles.label}>{teamLabel(wonBy)}: Choose Opening Possession or Side ?</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'ball' && styles.pillActive]}
                    onPress={() => setDecision('ball')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'ball' && styles.pillTextActive]}>🏀 Ball First</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'side' && styles.pillActive]}
                    onPress={() => setDecision('side')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'side' && styles.pillTextActive]}>🔄 Defend / Side</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Quarter Duration (Minutes)</Text>
                <View style={styles.oversRow}>
                  {BASKETBALL_QUARTERS.map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={[styles.oversPill, basketballQuarter === q && styles.pillActive]}
                      onPress={() => setBasketballQuarter(q)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, basketballQuarter === q && styles.pillTextActive]}>{q}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ─── TENNIS ─── */}
            {sport === 'tennis' && (
              <>
                <Text style={styles.label}>{teamLabel(wonBy)}: Choose Serve, Receive or Side ?</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'serve' && styles.pillActive]}
                    onPress={() => setDecision('serve')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'serve' && styles.pillTextActive]}>🎾 Serve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'receive' && styles.pillActive]}
                    onPress={() => setDecision('receive')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'receive' && styles.pillTextActive]}>↩ Receive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, decision === 'side' && styles.pillActive]}
                    onPress={() => setDecision('side')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, decision === 'side' && styles.pillTextActive]}>🔄 Side</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Games per Set</Text>
                <View style={styles.oversRow}>
                  {TENNIS_GAMES.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.oversPill, tennisGames === g && styles.pillActive]}
                      onPress={() => setTennisGames(g)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, tennisGames === g && styles.pillTextActive]}>{g} Games</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Sets Format</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, tennisSets === 1 && styles.pillActive]}
                    onPress={() => setTennisSets(1)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, tennisSets === 1 && styles.pillTextActive]}>1 Set</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, tennisSets === 3 && styles.pillActive]}
                    onPress={() => setTennisSets(3)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, tennisSets === 3 && styles.pillTextActive]}>Best of 3</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Confirm & Start Button */}
            <TouchableOpacity
              style={[styles.spinBtn, (!decision || saving) && { opacity: 0.5 }]}
              disabled={!decision || saving}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.spinBtnText}>
                {saving ? 'Setting up Match…' : `Confirm & Start ${match?.sport || 'Match'}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.lg },
  center:      { justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: SPACING.md },
  backBtn:     { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { ...FONT.h3, color: COLORS.text, fontWeight: '800' },

  coinBox:     { backgroundColor: '#FFF7ED', borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.md, borderWidth: 1, borderColor: '#FED7AA' },
  coin:        { width: 130, height: 130, borderRadius: 65, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', borderWidth: 8, borderColor: '#FDE68A', elevation: 4 },
  coinFaceContainer: { alignItems: 'center', justifyContent: 'center' },
  coinFaceText: { fontSize: 20, fontWeight: '900', color: '#78350F', letterSpacing: 1.5, textAlign: 'center' },
  coinLetter:  { fontSize: 48, fontWeight: '900', color: '#78350F' },
  coinCaption: { marginTop: SPACING.md, fontWeight: '700', fontSize: 14, color: COLORS.text, textAlign: 'center' },
  winnerBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#FFEDD5', paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.round },
  wonByText:   { color: '#C2410C', fontWeight: '800', fontSize: 13 },

  summaryCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  summaryLabel:{ fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  summaryValue:{ fontSize: 13, color: COLORS.text, fontWeight: '700' },

  setupCard:   { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.lg },
  postTossCard:{ backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.lg },

  label:       { fontWeight: '700', fontSize: 13, color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  pillRow:     { flexDirection: 'row', gap: SPACING.sm, marginBottom: 4 },
  pill:        { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', backgroundColor: COLORS.bg },
  pillActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText:    { fontWeight: '700', fontSize: 13, color: COLORS.text },
  pillTextActive: { color: '#fff' },

  oversRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  oversPill:   { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, alignItems: 'center', backgroundColor: COLORS.bg },

  spinBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center', marginTop: SPACING.lg, elevation: 2 },
  spinBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});