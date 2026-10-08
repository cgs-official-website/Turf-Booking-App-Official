import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

const clone = (o) => JSON.parse(JSON.stringify(o));

const STAGES = {
  first_half: '1st Half',
  half_time: 'Half Time',
  second_half: '2nd Half',
  full_time: 'Full Time',
};

export default function FootballScorecardScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);

  // Football state
  const [stage, setStage] = useState('first_half'); // 'first_half' | 'half_time' | 'second_half' | 'full_time'
  const [scores, setScores] = useState({ A: 0, B: 0 });
  const [events, setEvents] = useState([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // Event modal state
  const [activeModal, setActiveModal] = useState(null); // 'goal' | 'card' | 'sub' | 'penalty'
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAssist, setSelectedAssist] = useState(null);
  const [cardType, setCardType] = useState('yellow'); // 'yellow' | 'red'
  const [penaltyResult, setPenaltyResult] = useState('scored'); // 'scored' | 'missed'
  const [subOutPlayer, setSubOutPlayer] = useState(null);
  const [subInPlayer, setSubInPlayer] = useState(null);

  // Undo stack
  const undoStack = useRef([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const m = await matchStorage.getMatch(matchId);
        if (!active || !m) return;
        setMatch(m);

        if (m.football) {
          setStage(m.football.stage || (m.football.half === 2 ? 'half_time' : m.football.half === 3 ? 'second_half' : m.football.half === 4 ? 'full_time' : 'first_half'));
          setScores(m.football.scores || { A: m.football.scoreA ?? 0, B: m.football.scoreB ?? 0 });
          setEvents(m.football.events || []);
          setTimerSeconds(m.football.timerSeconds ?? m.football.elapsedSeconds ?? 0);
          setTimerRunning(Boolean(m.football.timerRunning ?? m.football.isRunning));
        } else {
          // Initialize football state
          const initial = {
            stage: 'first_half',
            scores: { A: 0, B: 0 },
            events: [],
            timerSeconds: 0,
            timerRunning: true,
          };
          setStage(initial.stage);
          setScores(initial.scores);
          setEvents(initial.events);
          setTimerSeconds(initial.timerSeconds);
          setTimerRunning(true);
        }
      })();
      return () => {
        active = false;
      };
    }, [matchId])
  );

  // Timer interval
  useEffect(() => {
    if (timerRunning && stage !== 'half_time' && stage !== 'full_time') {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, stage]);

  const persist = async (nextStage, nextScores, nextEvents, nextSec, nextRunning) => {
    if (!match) return;
    const nextMatch = clone(match);
    nextMatch.status = nextStage === 'full_time' ? 'completed' : 'live';
    nextMatch.football = {
      stage: nextStage,
      scores: nextScores,
      events: nextEvents,
      timerSeconds: nextSec,
      timerRunning: nextRunning,
    };

    if (nextStage === 'full_time') {
      const winner =
        nextScores.A > nextScores.B
          ? nextMatch.teams.A.name
          : nextScores.B > nextScores.A
          ? nextMatch.teams.B.name
          : 'Draw';
      nextMatch.result =
        winner === 'Draw'
          ? `Match Drawn ${nextScores.A} - ${nextScores.B}`
          : `${winner} won ${Math.max(nextScores.A, nextScores.B)} - ${Math.min(nextScores.A, nextScores.B)}`;
    }

    setMatch(nextMatch);
    await matchStorage.saveMatch(nextMatch);
  };

  const saveUndoState = () => {
    undoStack.current.push({
      stage,
      scores: { ...scores },
      events: [...events],
      timerSeconds,
      timerRunning,
    });
  };

  const handleUndo = async () => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    setStage(prev.stage);
    setScores(prev.scores);
    setEvents(prev.events);
    setTimerSeconds(prev.timerSeconds);
    setTimerRunning(prev.timerRunning);
    await persist(prev.stage, prev.scores, prev.events, prev.timerSeconds, prev.timerRunning);
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

  const getTeamPlayers = (teamKey) => {
    const ids = match?.teams?.[teamKey]?.playerIds || [];
    const list = ids.map((id) => playerById(id)).filter(Boolean);
    if (list.length === 0) {
      return [
        { id: `${teamKey}_p1`, name: `${match.teams[teamKey]?.name || 'Player'} 1` },
        { id: `${teamKey}_p2`, name: `${match.teams[teamKey]?.name || 'Player'} 2` },
      ];
    }
    return list;
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentMinute = Math.max(1, Math.floor(timerSeconds / 60) + 1);

  // Stage Transitions
  const handleNextStage = async () => {
    saveUndoState();
    let nextStage = stage;
    let nextRunning = timerRunning;
    if (stage === 'first_half') {
      nextStage = 'half_time';
      nextRunning = false;
    } else if (stage === 'half_time') {
      nextStage = 'second_half';
      nextRunning = true;
    } else if (stage === 'second_half') {
      nextStage = 'full_time';
      nextRunning = false;
    }
    setStage(nextStage);
    setTimerRunning(nextRunning);
    await persist(nextStage, scores, events, timerSeconds, nextRunning);
  };

  // Add Event
  const recordGoal = async (isOwnGoal = false) => {
    saveUndoState();
    const scoringTeam = isOwnGoal ? (selectedTeam === 'A' ? 'B' : 'A') : selectedTeam;
    const newScores = {
      ...scores,
      [scoringTeam]: scores[scoringTeam] + 1,
    };
    const playerObj = playerById(selectedPlayer);
    const assistObj = playerById(selectedAssist);

    const event = {
      id: Date.now().toString(),
      type: isOwnGoal ? 'own_goal' : 'goal',
      minute: currentMinute,
      half: stage,
      team: scoringTeam,
      creditedTeam: selectedTeam,
      playerId: selectedPlayer,
      playerName: playerObj?.name || 'Player',
      assistPlayerId: isOwnGoal ? null : selectedAssist,
      assistPlayerName: assistObj?.name || null,
      timestamp: Date.now(),
    };

    const newEvents = [event, ...events];
    setScores(newScores);
    setEvents(newEvents);
    setActiveModal(null);
    setSelectedPlayer(null);
    setSelectedAssist(null);
    await persist(stage, newScores, newEvents, timerSeconds, timerRunning);
  };

  const recordCard = async () => {
    saveUndoState();
    const playerObj = playerById(selectedPlayer);
    const event = {
      id: Date.now().toString(),
      type: cardType === 'yellow' ? 'yellow_card' : 'red_card',
      minute: currentMinute,
      half: stage,
      team: selectedTeam,
      playerId: selectedPlayer,
      playerName: playerObj?.name || 'Player',
      timestamp: Date.now(),
    };
    const newEvents = [event, ...events];
    setEvents(newEvents);
    setActiveModal(null);
    setSelectedPlayer(null);
    await persist(stage, scores, newEvents, timerSeconds, timerRunning);
  };

  const recordPenalty = async () => {
    saveUndoState();
    const scored = penaltyResult === 'scored';
    const newScores = scored
      ? { ...scores, [selectedTeam]: scores[selectedTeam] + 1 }
      : scores;
    const playerObj = playerById(selectedPlayer);
    const event = {
      id: Date.now().toString(),
      type: scored ? 'penalty_goal' : 'penalty_miss',
      minute: currentMinute,
      half: stage,
      team: selectedTeam,
      playerId: selectedPlayer,
      playerName: playerObj?.name || 'Player',
      timestamp: Date.now(),
    };
    const newEvents = [event, ...events];
    setScores(newScores);
    setEvents(newEvents);
    setActiveModal(null);
    setSelectedPlayer(null);
    await persist(stage, newScores, newEvents, timerSeconds, timerRunning);
  };

  const recordSub = async () => {
    saveUndoState();
    const outObj = playerById(subOutPlayer);
    const inObj = playerById(subInPlayer);
    const event = {
      id: Date.now().toString(),
      type: 'substitution',
      minute: currentMinute,
      half: stage,
      team: selectedTeam,
      outPlayerId: subOutPlayer,
      outPlayerName: outObj?.name || 'Player',
      inPlayerId: subInPlayer,
      inPlayerName: inObj?.name || 'Player',
      timestamp: Date.now(),
    };
    const newEvents = [event, ...events];
    setEvents(newEvents);
    setActiveModal(null);
    setSubOutPlayer(null);
    setSubInPlayer(null);
    await persist(stage, scores, newEvents, timerSeconds, timerRunning);
  };

  const tossSummary = match.toss
    ? `${match.toss.winnerName} won toss (${match.toss.decision === 'kickoff' ? 'Kickoff' : 'Side'})`
    : null;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Match', { matchId })} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Football Match</Text>
          <Text style={styles.headerSub}>{match.place || 'Turf'}</Text>
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
        {/* Toss info if available */}
        {tossSummary && (
          <View style={styles.tossBanner}>
            <Icon name="information-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.tossBannerText}>{tossSummary}</Text>
          </View>
        )}

        {/* Scoreboard Card */}
        <View style={styles.scoreCard}>
          <View style={styles.stageBadge}>
            <Text style={styles.stageBadgeText}>{STAGES[stage]}</Text>
          </View>

          <View style={styles.matchScoreRow}>
            {/* Team A */}
            <View style={styles.teamScoreCol}>
              <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.avatarText}>{(teamA.name || 'A')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamA.name}</Text>
              <Text style={styles.bigScore}>{scores.A}</Text>
            </View>

            <View style={styles.scoreDivider}>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.clockText}>{formatTime(timerSeconds)}</Text>
              <TouchableOpacity
                style={[styles.clockBtn, timerRunning && styles.clockBtnPause]}
                onPress={() => setTimerRunning(!timerRunning)}
                disabled={stage === 'half_time' || stage === 'full_time'}
              >
                <Icon
                  name={timerRunning ? 'pause' : 'play'}
                  size={14}
                  color={timerRunning ? '#EF4444' : COLORS.primary}
                />
                <Text style={[styles.clockBtnText, timerRunning && { color: '#EF4444' }]}>
                  {timerRunning ? 'Pause' : 'Play'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Team B */}
            <View style={styles.teamScoreCol}>
              <View style={[styles.avatar, { backgroundColor: '#EA580C' }]}>
                <Text style={styles.avatarText}>{(teamB.name || 'B')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamB.name}</Text>
              <Text style={styles.bigScore}>{scores.B}</Text>
            </View>
          </View>

          {/* Stage Progression Button */}
          {stage !== 'full_time' && (
            <TouchableOpacity style={styles.nextStageBtn} onPress={handleNextStage}>
              <Text style={styles.nextStageBtnText}>
                {stage === 'first_half'
                  ? 'End 1st Half'
                  : stage === 'half_time'
                  ? 'Start 2nd Half'
                  : 'End Match (Full Time)'}
              </Text>
              <Icon name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}

          {stage === 'full_time' && (
            <View style={styles.resultBanner}>
              <Icon name="trophy" size={20} color="#F59E0B" />
              <Text style={styles.resultText}>
                {scores.A > scores.B
                  ? `${teamA.name} Won!`
                  : scores.B > scores.A
                  ? `${teamB.name} Won!`
                  : 'Match Drawn!'}
              </Text>
            </View>
          )}
        </View>

        {/* Action Controls (Disabled if full_time) */}
        {stage !== 'full_time' && (
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionGridItem, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
              onPress={() => {
                setSelectedTeam('A');
                setSelectedPlayer(null);
                setSelectedAssist(null);
                setActiveModal('goal');
              }}
            >
              <Text style={styles.actionEmoji}>⚽</Text>
              <Text style={[styles.actionItemTitle, { color: '#047857' }]}>+ Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionGridItem, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
              onPress={() => {
                setSelectedTeam('A');
                setSelectedPlayer(null);
                setPenaltyResult('scored');
                setActiveModal('penalty');
              }}
            >
              <Text style={styles.actionEmoji}>🥅</Text>
              <Text style={[styles.actionItemTitle, { color: '#1D4ED8' }]}>Penalty</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionGridItem, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
              onPress={() => {
                setSelectedTeam('A');
                setSelectedPlayer(null);
                setCardType('yellow');
                setActiveModal('card');
              }}
            >
              <Text style={styles.actionEmoji}>🟨 / 🟥</Text>
              <Text style={[styles.actionItemTitle, { color: '#B45309' }]}>Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionGridItem, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}
              onPress={() => {
                setSelectedTeam('A');
                setSubOutPlayer(null);
                setSubInPlayer(null);
                setActiveModal('sub');
              }}
            >
              <Text style={styles.actionEmoji}>🔄</Text>
              <Text style={[styles.actionItemTitle, { color: '#7E22CE' }]}>Substitution</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline / Events */}
        <Text style={styles.sectionTitle}>Match Events ({events.length})</Text>
        {events.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No events recorded yet. Tap + Goal, Card, or Penalty to log action.</Text>
          </View>
        ) : (
          events.map((ev) => {
            const evTeam = ev.team === 'A' ? teamA : teamB;
            const isGoal = ev.type === 'goal' || ev.type === 'penalty_goal';
            return (
              <View key={ev.id} style={styles.eventRow}>
                <View style={styles.eventMinCol}>
                  <Text style={styles.eventMin}>{ev.minute}'</Text>
                </View>
                <View style={styles.eventIconCol}>
                  <Text style={styles.eventIconEmoji}>
                    {ev.type === 'goal'
                      ? '⚽'
                      : ev.type === 'own_goal'
                      ? '⚠️ ⚽'
                      : ev.type === 'penalty_goal'
                      ? '🥅 ⚽'
                      : ev.type === 'penalty_miss'
                      ? '❌'
                      : ev.type === 'yellow_card'
                      ? '🟨'
                      : ev.type === 'red_card'
                      ? '🟥'
                      : '🔄'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventMainText}>
                    {ev.type === 'substitution'
                      ? `${ev.inPlayerName} IN ➔ ${ev.outPlayerName} OUT`
                      : ev.playerName}
                  </Text>
                  <Text style={styles.eventSubText}>
                    {evTeam.name}
                    {ev.assistPlayerName ? ` · Assist: ${ev.assistPlayerName}` : ''}
                    {ev.type === 'own_goal' ? ' (Own Goal)' : ''}
                    {ev.type === 'penalty_goal' ? ' (Penalty)' : ''}
                    {ev.type === 'penalty_miss' ? ' (Penalty Missed)' : ''}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Goal Modal */}
      <Modal visible={activeModal === 'goal'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Goal ⚽</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Team Picker */}
            <Text style={styles.modalLabel}>Scoring Team:</Text>
            <View style={styles.teamChoiceRow}>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, selectedTeam === 'A' && styles.teamChoiceBtnActive]}
                onPress={() => {
                  setSelectedTeam('A');
                  setSelectedPlayer(null);
                  setSelectedAssist(null);
                }}
              >
                <Text style={[styles.teamChoiceText, selectedTeam === 'A' && styles.teamChoiceTextActive]}>
                  {teamA.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, selectedTeam === 'B' && styles.teamChoiceBtnActive]}
                onPress={() => {
                  setSelectedTeam('B');
                  setSelectedPlayer(null);
                  setSelectedAssist(null);
                }}
              >
                <Text style={[styles.teamChoiceText, selectedTeam === 'B' && styles.teamChoiceTextActive]}>
                  {teamB.name}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scorer Picker */}
            <Text style={styles.modalLabel}>Goal Scorer:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {getTeamPlayers(selectedTeam).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, selectedPlayer === p.id && styles.chipActive]}
                  onPress={() => setSelectedPlayer(p.id)}
                >
                  <Text style={[styles.chipText, selectedPlayer === p.id && styles.chipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Assist Picker (Optional) */}
            <Text style={styles.modalLabel}>Assist By (Optional):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <TouchableOpacity
                style={[styles.chip, selectedAssist === null && styles.chipActive]}
                onPress={() => setSelectedAssist(null)}
              >
                <Text style={[styles.chipText, selectedAssist === null && styles.chipTextActive]}>None</Text>
              </TouchableOpacity>
              {getTeamPlayers(selectedTeam)
                .filter((p) => p.id !== selectedPlayer)
                .map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, selectedAssist === p.id && styles.chipActive]}
                    onPress={() => setSelectedAssist(p.id)}
                  >
                    <Text style={[styles.chipText, selectedAssist === p.id && styles.chipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#FEE2E2', flex: 1, marginRight: 8 }]}
                onPress={() => recordGoal(true)}
                disabled={!selectedPlayer}
              >
                <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Own Goal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  { backgroundColor: COLORS.primary, flex: 2 },
                  !selectedPlayer && { opacity: 0.5 },
                ]}
                onPress={() => recordGoal(false)}
                disabled={!selectedPlayer}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Card Modal */}
      <Modal visible={activeModal === 'card'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Player 🟨 / 🟥</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Card Type */}
            <Text style={styles.modalLabel}>Card Color:</Text>
            <View style={styles.teamChoiceRow}>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, cardType === 'yellow' && { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
                onPress={() => setCardType('yellow')}
              >
                <Text style={{ fontWeight: '800', color: '#B45309' }}>🟨 Yellow Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, cardType === 'red' && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
                onPress={() => setCardType('red')}
              >
                <Text style={{ fontWeight: '800', color: '#B91C1C' }}>🟥 Red Card</Text>
              </TouchableOpacity>
            </View>

            {/* Team Picker */}
            <Text style={styles.modalLabel}>Team:</Text>
            <View style={styles.teamChoiceRow}>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, selectedTeam === 'A' && styles.teamChoiceBtnActive]}
                onPress={() => {
                  setSelectedTeam('A');
                  setSelectedPlayer(null);
                }}
              >
                <Text style={[styles.teamChoiceText, selectedTeam === 'A' && styles.teamChoiceTextActive]}>
                  {teamA.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, selectedTeam === 'B' && styles.teamChoiceBtnActive]}
                onPress={() => {
                  setSelectedTeam('B');
                  setSelectedPlayer(null);
                }}
              >
                <Text style={[styles.teamChoiceText, selectedTeam === 'B' && styles.teamChoiceTextActive]}>
                  {teamB.name}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Player Picker */}
            <Text style={styles.modalLabel}>Player:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {getTeamPlayers(selectedTeam).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, selectedPlayer === p.id && styles.chipActive]}
                  onPress={() => setSelectedPlayer(p.id)}
                >
                  <Text style={[styles.chipText, selectedPlayer === p.id && styles.chipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: COLORS.primary, marginTop: 16 }, !selectedPlayer && { opacity: 0.5 }]}
              onPress={recordCard}
              disabled={!selectedPlayer}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm Card</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Penalty Modal */}
      <Modal visible={activeModal === 'penalty'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Penalty Kick 🥅</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Team Taking Penalty:</Text>
            <View style={styles.teamChoiceRow}>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, selectedTeam === 'A' && styles.teamChoiceBtnActive]}
                onPress={() => {
                  setSelectedTeam('A');
                  setSelectedPlayer(null);
                }}
              >
                <Text style={[styles.teamChoiceText, selectedTeam === 'A' && styles.teamChoiceTextActive]}>
                  {teamA.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, selectedTeam === 'B' && styles.teamChoiceBtnActive]}
                onPress={() => {
                  setSelectedTeam('B');
                  setSelectedPlayer(null);
                }}
              >
                <Text style={[styles.teamChoiceText, selectedTeam === 'B' && styles.teamChoiceTextActive]}>
                  {teamB.name}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Penalty Taker:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {getTeamPlayers(selectedTeam).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, selectedPlayer === p.id && styles.chipActive]}
                  onPress={() => setSelectedPlayer(p.id)}
                >
                  <Text style={[styles.chipText, selectedPlayer === p.id && styles.chipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Result:</Text>
            <View style={styles.teamChoiceRow}>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, penaltyResult === 'scored' && { backgroundColor: '#ECFDF5', borderColor: '#0F766E' }]}
                onPress={() => setPenaltyResult('scored')}
              >
                <Text style={{ fontWeight: '800', color: '#047857' }}>✅ Scored</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, penaltyResult === 'missed' && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
                onPress={() => setPenaltyResult('missed')}
              >
                <Text style={{ fontWeight: '800', color: '#B91C1C' }}>❌ Missed / Saved</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: COLORS.primary, marginTop: 16 }, !selectedPlayer && { opacity: 0.5 }]}
              onPress={recordPenalty}
              disabled={!selectedPlayer}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm Penalty</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sub Modal */}
      <Modal visible={activeModal === 'sub'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Substitution 🔄</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Team:</Text>
            <View style={styles.teamChoiceRow}>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, selectedTeam === 'A' && styles.teamChoiceBtnActive]}
                onPress={() => {
                  setSelectedTeam('A');
                  setSubOutPlayer(null);
                  setSubInPlayer(null);
                }}
              >
                <Text style={[styles.teamChoiceText, selectedTeam === 'A' && styles.teamChoiceTextActive]}>
                  {teamA.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.teamChoiceBtn, selectedTeam === 'B' && styles.teamChoiceBtnActive]}
                onPress={() => {
                  setSelectedTeam('B');
                  setSubOutPlayer(null);
                  setSubInPlayer(null);
                }}
              >
                <Text style={[styles.teamChoiceText, selectedTeam === 'B' && styles.teamChoiceTextActive]}>
                  {teamB.name}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Player Coming OUT ⬇️:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {getTeamPlayers(selectedTeam).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, subOutPlayer === p.id && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
                  onPress={() => setSubOutPlayer(p.id)}
                >
                  <Text style={[styles.chipText, subOutPlayer === p.id && { color: '#B91C1C', fontWeight: '800' }]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Player Coming IN ⬆️:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {getTeamPlayers(selectedTeam)
                .filter((p) => p.id !== subOutPlayer)
                .map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, subInPlayer === p.id && { backgroundColor: '#ECFDF5', borderColor: '#0F766E' }]}
                    onPress={() => setSubInPlayer(p.id)}
                  >
                    <Text style={[styles.chipText, subInPlayer === p.id && { color: '#047857', fontWeight: '800' }]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalActionBtn,
                { backgroundColor: COLORS.primary, marginTop: 16 },
                (!subOutPlayer || !subInPlayer) && { opacity: 0.5 },
              ]}
              onPress={recordSub}
              disabled={!subOutPlayer || !subInPlayer}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm Substitution</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  tossBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  tossBannerText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

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
  stageBadge: {
    backgroundColor: COLORS.bgSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    marginBottom: SPACING.md,
  },
  stageBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },

  matchScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: SPACING.sm,
  },
  teamScoreCol: { flex: 1, alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  teamName: { fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  bigScore: { fontSize: 44, fontWeight: '900', color: COLORS.text },

  scoreDivider: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  vsText: { fontSize: 13, fontWeight: '800', color: COLORS.subtext, marginBottom: 4 },
  clockText: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },
  clockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  clockBtnPause: { backgroundColor: '#FEE2E2' },
  clockBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  nextStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.lg,
    width: '100%',
    marginTop: SPACING.md,
  },
  nextStageBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
  },
  resultText: { fontSize: 15, fontWeight: '800', color: '#92400E' },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionGridItem: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionEmoji: { fontSize: 22, marginBottom: 4 },
  actionItemTitle: { fontSize: 13, fontWeight: '800' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: { fontSize: 13, color: COLORS.subtext, textAlign: 'center' },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: RADIUS.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  eventMinCol: { width: 36 },
  eventMin: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  eventIconCol: { width: 32, alignItems: 'center' },
  eventIconEmoji: { fontSize: 16 },
  eventMainText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  eventSubText: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.subtext, marginTop: 12, marginBottom: 8 },

  teamChoiceRow: { flexDirection: 'row', gap: 10 },
  teamChoiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: COLORS.bgSoft,
  },
  teamChoiceBtnActive: { backgroundColor: COLORS.greenSoft, borderColor: COLORS.primary },
  teamChoiceText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  teamChoiceTextActive: { color: COLORS.primary, fontWeight: '800' },

  chipsScroll: { flexDirection: 'row', marginVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.bgSoft,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.greenSoft, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary, fontWeight: '800' },

  modalBtnRow: { flexDirection: 'row', marginTop: 20 },
  modalActionBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
