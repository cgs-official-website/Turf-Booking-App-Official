import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const QUARTERS = ['Q1', 'Q2', 'Half Time', 'Q3', 'Q4', 'OT', 'Final'];

export default function BasketballScorecardScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);

  // Basketball state
  const [quarter, setQuarter] = useState('Q1');
  const [scores, setScores] = useState({ A: 0, B: 0 });
  const [quarterScores, setQuarterScores] = useState({
    Q1: { A: 0, B: 0 },
    Q2: { A: 0, B: 0 },
    Q3: { A: 0, B: 0 },
    Q4: { A: 0, B: 0 },
    OT: { A: 0, B: 0 },
  });
  const [teamFouls, setTeamFouls] = useState({ A: 0, B: 0 });
  const [possession, setPossession] = useState('A');
  const [events, setEvents] = useState([]);

  // Clock state (10 mins per quarter = 600s)
  const [clockSec, setClockSec] = useState(600);
  const [clockRunning, setClockRunning] = useState(false);
  const timerRef = useRef(null);

  // Modal for player stats / events (foul, rebound, assist, steal, block, turnover, sub)
  const [modalType, setModalType] = useState(null); // 'stat' | 'sub'
  const [statAction, setStatAction] = useState('foul');
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [subOutPlayer, setSubOutPlayer] = useState(null);
  const [subInPlayer, setSubInPlayer] = useState(null);

  const undoStack = useRef([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const m = await matchStorage.getMatch(matchId);
        if (!active || !m) return;
        setMatch(m);

        if (m.basketball) {
          const qVal = m.basketball.quarter;
          const qStr = typeof qVal === 'number'
            ? (qVal === 2 ? 'Q2' : qVal === 3 ? 'Half Time' : qVal === 4 ? 'Q3' : qVal === 5 ? 'Q4' : 'Q1')
            : (qVal || 'Q1');
          setQuarter(qStr);
          setScores(m.basketball.scores || { A: m.basketball.scoreA ?? 0, B: m.basketball.scoreB ?? 0 });
          setQuarterScores(
            m.basketball.quarterScores || {
              Q1: { A: 0, B: 0 },
              Q2: { A: 0, B: 0 },
              Q3: { A: 0, B: 0 },
              Q4: { A: 0, B: 0 },
              OT: { A: 0, B: 0 },
            }
          );
          setTeamFouls(m.basketball.teamFouls || { A: m.basketball.foulsA ?? 0, B: m.basketball.foulsB ?? 0 });
          setPossession(m.basketball.possession || m.basketball.possessionTeam || (m.toss?.winner === 'B' ? 'B' : 'A'));
          setClockSec(m.basketball.clockSec ?? (m.basketball.quarterDurationMinutes ? m.basketball.quarterDurationMinutes * 60 : 600));
          setClockRunning(Boolean(m.basketball.clockRunning ?? m.basketball.isRunning));
          setEvents(m.basketball.events || []);
        } else {
          const initPossession = m.toss?.winner === 'B' ? 'B' : 'A';
          setQuarter('Q1');
          setScores({ A: 0, B: 0 });
          setQuarterScores({
            Q1: { A: 0, B: 0 },
            Q2: { A: 0, B: 0 },
            Q3: { A: 0, B: 0 },
            Q4: { A: 0, B: 0 },
            OT: { A: 0, B: 0 },
          });
          setTeamFouls({ A: 0, B: 0 });
          setPossession(initPossession);
          setClockSec(600);
          setClockRunning(true);
          setEvents([]);
        }
      })();
      return () => {
        active = false;
      };
    }, [matchId])
  );

  // Clock countdown interval
  useEffect(() => {
    if (clockRunning && quarter !== 'Half Time' && quarter !== 'Final') {
      timerRef.current = setInterval(() => {
        setClockSec((prev) => {
          if (prev <= 1) {
            setClockRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clockRunning, quarter]);

  const persist = async (nextState) => {
    if (!match) return;
    const nextMatch = clone(match);
    nextMatch.status = nextState.quarter === 'Final' ? 'completed' : 'live';
    nextMatch.basketball = nextState;

    if (nextState.quarter === 'Final') {
      const winner =
        nextState.scores.A > nextState.scores.B
          ? nextMatch.teams.A.name
          : nextState.scores.B > nextState.scores.A
          ? nextMatch.teams.B.name
          : 'Draw';
      nextMatch.result =
        winner === 'Draw'
          ? `Match Tied (${nextState.scores.A} - ${nextState.scores.B})`
          : `${winner} won (${Math.max(nextState.scores.A, nextState.scores.B)} - ${Math.min(
              nextState.scores.A,
              nextState.scores.B
            )})`;
    }

    setMatch(nextMatch);
    await matchStorage.saveMatch(nextMatch);
  };

  const saveUndoState = () => {
    undoStack.current.push({
      quarter,
      scores: { ...scores },
      quarterScores: clone(quarterScores),
      teamFouls: { ...teamFouls },
      possession,
      clockSec,
      clockRunning,
      events: clone(events),
    });
  };

  const handleUndo = async () => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    setQuarter(prev.quarter);
    setScores(prev.scores);
    setQuarterScores(prev.quarterScores);
    setTeamFouls(prev.teamFouls);
    setPossession(prev.possession);
    setClockSec(prev.clockSec);
    setClockRunning(prev.clockRunning);
    setEvents(prev.events);
    await persist(prev);
  };

  if (!match) return <View style={styles.root} />;

  const teamA = match.teams.A;
  const teamB = match.teams.B;

  const playerById = (id) => {
    if (!id) return null;
    const found = match?.players?.find((p) => p.id === id);
    if (found) return found;
    return { id, name: id };
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

  const formatClock = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Add Points
  const addPoints = async (team, pts) => {
    if (quarter === 'Half Time' || quarter === 'Final') return;
    saveUndoState();

    const newScores = { ...scores, [team]: scores[team] + pts };
    const qKey = quarter === 'OT' ? 'OT' : quarter;
    const newQuarterScores = {
      ...quarterScores,
      [qKey]: {
        ...quarterScores[qKey],
        [team]: (quarterScores[qKey]?.[team] || 0) + pts,
      },
    };

    const nextPossession = team === 'A' ? 'B' : 'A';
    const newEvent = {
      id: Date.now().toString(),
      type: `${pts}pt`,
      quarter,
      team,
      pts,
      clock: formatClock(clockSec),
      timestamp: Date.now(),
    };

    const newEvents = [newEvent, ...events];

    setScores(newScores);
    setQuarterScores(newQuarterScores);
    setPossession(nextPossession);
    setEvents(newEvents);

    await persist({
      quarter,
      scores: newScores,
      quarterScores: newQuarterScores,
      teamFouls,
      possession: nextPossession,
      clockSec,
      clockRunning,
      events: newEvents,
    });
  };

  // Next Quarter Progression
  const handleAdvanceQuarter = async () => {
    saveUndoState();
    let nextQuarter = quarter;
    let nextClock = 600;
    let nextRunning = true;
    let nextFouls = { A: 0, B: 0 }; // Fouls reset each quarter

    if (quarter === 'Q1') {
      nextQuarter = 'Q2';
    } else if (quarter === 'Q2') {
      nextQuarter = 'Half Time';
      nextRunning = false;
      nextClock = 0;
    } else if (quarter === 'Half Time') {
      nextQuarter = 'Q3';
      nextClock = 600;
      nextRunning = true;
    } else if (quarter === 'Q3') {
      nextQuarter = 'Q4';
    } else if (quarter === 'Q4') {
      if (scores.A === scores.B) {
        nextQuarter = 'OT';
        nextClock = 300; // 5 min overtime
      } else {
        nextQuarter = 'Final';
        nextRunning = false;
        nextClock = 0;
      }
    } else if (quarter === 'OT') {
      nextQuarter = 'Final';
      nextRunning = false;
      nextClock = 0;
    }

    setQuarter(nextQuarter);
    setClockSec(nextClock);
    setClockRunning(nextRunning);
    setTeamFouls(nextFouls);

    await persist({
      quarter: nextQuarter,
      scores,
      quarterScores,
      teamFouls: nextFouls,
      possession,
      clockSec: nextClock,
      clockRunning: nextRunning,
      events,
    });
  };

  // Record Stat (Foul, Rebound, Assist, Steal, Block, Turnover)
  const recordStat = async () => {
    saveUndoState();
    const playerObj = playerById(selectedPlayer);
    let newFouls = { ...teamFouls };

    if (statAction === 'foul') {
      newFouls[selectedTeam] += 1;
    }

    const event = {
      id: Date.now().toString(),
      type: statAction,
      quarter,
      team: selectedTeam,
      playerId: selectedPlayer,
      playerName: playerObj?.name || 'Player',
      clock: formatClock(clockSec),
      timestamp: Date.now(),
    };

    const newEvents = [event, ...events];
    setTeamFouls(newFouls);
    setEvents(newEvents);
    setModalType(null);
    setSelectedPlayer(null);

    await persist({
      quarter,
      scores,
      quarterScores,
      teamFouls: newFouls,
      possession,
      clockSec,
      clockRunning,
      events: newEvents,
    });
  };

  // Record Sub
  const recordSub = async () => {
    saveUndoState();
    const outObj = playerById(subOutPlayer);
    const inObj = playerById(subInPlayer);
    const event = {
      id: Date.now().toString(),
      type: 'sub',
      quarter,
      team: selectedTeam,
      outPlayerId: subOutPlayer,
      outPlayerName: outObj?.name || 'Player',
      inPlayerId: subInPlayer,
      inPlayerName: inObj?.name || 'Player',
      clock: formatClock(clockSec),
      timestamp: Date.now(),
    };
    const newEvents = [event, ...events];
    setEvents(newEvents);
    setModalType(null);
    setSubOutPlayer(null);
    setSubInPlayer(null);

    await persist({
      quarter,
      scores,
      quarterScores,
      teamFouls,
      possession,
      clockSec,
      clockRunning,
      events: newEvents,
    });
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Match', { matchId })} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Basketball Match</Text>
          <Text style={styles.headerSub}>{match.place || 'Court'}</Text>
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
        {/* Quarter & Clock Pill */}
        <View style={styles.topInfoRow}>
          <View style={styles.quarterPill}>
            <Text style={styles.quarterPillText}>{quarter}</Text>
          </View>
          <View style={styles.clockPill}>
            <Text style={styles.clockPillText}>{formatClock(clockSec)}</Text>
            {quarter !== 'Half Time' && quarter !== 'Final' && (
              <TouchableOpacity
                onPress={() => setClockRunning(!clockRunning)}
                style={[styles.clockToggleBtn, clockRunning && { backgroundColor: '#FEE2E2' }]}
              >
                <Icon
                  name={clockRunning ? 'pause' : 'play'}
                  size={12}
                  color={clockRunning ? '#EF4444' : COLORS.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Scoreboard Card */}
        <View style={styles.scoreCard}>
          <View style={styles.teamsRow}>
            {/* Team A */}
            <View style={styles.teamCol}>
              <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.avatarText}>{(teamA.name || 'A')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamA.name}</Text>
              {possession === 'A' && (
                <View style={styles.possessionBadge}>
                  <Text style={styles.possessionBadgeText}>🏀 Possession</Text>
                </View>
              )}
              <Text style={styles.bigScore}>{scores.A}</Text>
              <View style={styles.foulBadge}>
                <Text style={styles.foulBadgeText}>
                  Fouls: {teamFouls.A} {teamFouls.A >= 5 ? '(BONUS)' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.scoreSep}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            {/* Team B */}
            <View style={styles.teamCol}>
              <View style={[styles.avatar, { backgroundColor: '#EA580C' }]}>
                <Text style={styles.avatarText}>{(teamB.name || 'B')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{teamB.name}</Text>
              {possession === 'B' && (
                <View style={styles.possessionBadge}>
                  <Text style={styles.possessionBadgeText}>🏀 Possession</Text>
                </View>
              )}
              <Text style={styles.bigScore}>{scores.B}</Text>
              <View style={styles.foulBadge}>
                <Text style={styles.foulBadgeText}>
                  Fouls: {teamFouls.B} {teamFouls.B >= 5 ? '(BONUS)' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Quarter Box Score Table */}
          <View style={styles.boxScoreTable}>
            <View style={styles.boxRow}>
              <Text style={[styles.boxHeaderCell, { flex: 1.5 }]}>Team</Text>
              <Text style={styles.boxHeaderCell}>Q1</Text>
              <Text style={styles.boxHeaderCell}>Q2</Text>
              <Text style={styles.boxHeaderCell}>Q3</Text>
              <Text style={styles.boxHeaderCell}>Q4</Text>
              {quarter === 'OT' && <Text style={styles.boxHeaderCell}>OT</Text>}
              <Text style={[styles.boxHeaderCell, { fontWeight: '900' }]}>T</Text>
            </View>
            <View style={styles.boxRow}>
              <Text style={[styles.boxCell, { flex: 1.5, fontWeight: '700' }]} numberOfLines={1}>
                {teamA.name}
              </Text>
              <Text style={styles.boxCell}>{quarterScores.Q1?.A || 0}</Text>
              <Text style={styles.boxCell}>{quarterScores.Q2?.A || 0}</Text>
              <Text style={styles.boxCell}>{quarterScores.Q3?.A || 0}</Text>
              <Text style={styles.boxCell}>{quarterScores.Q4?.A || 0}</Text>
              {quarter === 'OT' && <Text style={styles.boxCell}>{quarterScores.OT?.A || 0}</Text>}
              <Text style={[styles.boxCell, { fontWeight: '900', color: COLORS.primary }]}>
                {scores.A}
              </Text>
            </View>
            <View style={styles.boxRow}>
              <Text style={[styles.boxCell, { flex: 1.5, fontWeight: '700' }]} numberOfLines={1}>
                {teamB.name}
              </Text>
              <Text style={styles.boxCell}>{quarterScores.Q1?.B || 0}</Text>
              <Text style={styles.boxCell}>{quarterScores.Q2?.B || 0}</Text>
              <Text style={styles.boxCell}>{quarterScores.Q3?.B || 0}</Text>
              <Text style={styles.boxCell}>{quarterScores.Q4?.B || 0}</Text>
              {quarter === 'OT' && <Text style={styles.boxCell}>{quarterScores.OT?.B || 0}</Text>}
              <Text style={[styles.boxCell, { fontWeight: '900', color: '#EA580C' }]}>
                {scores.B}
              </Text>
            </View>
          </View>

          {/* Advance Quarter Button */}
          {quarter !== 'Final' && (
            <TouchableOpacity style={styles.advanceBtn} onPress={handleAdvanceQuarter}>
              <Text style={styles.advanceBtnText}>
                {quarter === 'Q1'
                  ? 'End Q1 ➔ Start Q2'
                  : quarter === 'Q2'
                  ? 'End 1st Half (Half Time)'
                  : quarter === 'Half Time'
                  ? 'Start 2nd Half (Q3)'
                  : quarter === 'Q3'
                  ? 'End Q3 ➔ Start Q4'
                  : quarter === 'Q4'
                  ? scores.A === scores.B
                    ? 'Tied! Go to Overtime (OT)'
                    : 'End Match (Final Score)'
                  : 'End Match (Final Score)'}
              </Text>
              <Icon name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Final Match Card */}
          {quarter === 'Final' && (
            <View style={styles.finalCard}>
              <Icon name="trophy" size={28} color="#F59E0B" />
              <Text style={styles.finalTitle}>
                {scores.A > scores.B
                  ? `${teamA.name} Won!`
                  : scores.B > scores.A
                  ? `${teamB.name} Won!`
                  : 'Game Tied!'}
              </Text>
              <Text style={styles.finalSub}>
                Final Score: {scores.A} - {scores.B}
              </Text>
            </View>
          )}
        </View>

        {/* Scoring Controls per team */}
        {quarter !== 'Final' && quarter !== 'Half Time' && (
          <View style={{ gap: SPACING.md, marginBottom: SPACING.md }}>
            {/* Team A Scoring Row */}
            <View style={styles.scoringRowCard}>
              <Text style={[styles.scoringRowTitle, { color: COLORS.primary }]} numberOfLines={1}>
                {teamA.name}
              </Text>
              <View style={styles.ptsBtnGroup}>
                <TouchableOpacity
                  style={[styles.ptBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
                  onPress={() => addPoints('A', 1)}
                >
                  <Text style={[styles.ptBtnText, { color: '#047857' }]}>+1 FT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ptBtn, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}
                  onPress={() => addPoints('A', 2)}
                >
                  <Text style={[styles.ptBtnText, { color: '#1D4ED8' }]}>+2 FG</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ptBtn, { backgroundColor: '#F3E8FF', borderColor: '#A855F7' }]}
                  onPress={() => addPoints('A', 3)}
                >
                  <Text style={[styles.ptBtnText, { color: '#7E22CE' }]}>+3 3PT</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Team B Scoring Row */}
            <View style={styles.scoringRowCard}>
              <Text style={[styles.scoringRowTitle, { color: '#EA580C' }]} numberOfLines={1}>
                {teamB.name}
              </Text>
              <View style={styles.ptsBtnGroup}>
                <TouchableOpacity
                  style={[styles.ptBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
                  onPress={() => addPoints('B', 1)}
                >
                  <Text style={[styles.ptBtnText, { color: '#047857' }]}>+1 FT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ptBtn, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}
                  onPress={() => addPoints('B', 2)}
                >
                  <Text style={[styles.ptBtnText, { color: '#1D4ED8' }]}>+2 FG</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ptBtn, { backgroundColor: '#F3E8FF', borderColor: '#A855F7' }]}
                  onPress={() => addPoints('B', 3)}
                >
                  <Text style={[styles.ptBtnText, { color: '#7E22CE' }]}>+3 3PT</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Quick Stat Logging Actions */}
        {quarter !== 'Final' && quarter !== 'Half Time' && (
          <View style={styles.quickStatGrid}>
            {[
              { key: 'foul', label: 'Foul', icon: 'hand-left-outline' },
              { key: 'rebound', label: 'Rebound', icon: 'disc-outline' },
              { key: 'assist', label: 'Assist', icon: 'git-pull-request-outline' },
              { key: 'steal', label: 'Steal', icon: 'flash-outline' },
              { key: 'block', label: 'Block', icon: 'shield-outline' },
              { key: 'turnover', label: 'Turnover', icon: 'swap-horizontal-outline' },
            ].map((st) => (
              <TouchableOpacity
                key={st.key}
                style={styles.quickStatItem}
                onPress={() => {
                  setStatAction(st.key);
                  setSelectedTeam('A');
                  setSelectedPlayer(null);
                  setModalType('stat');
                }}
              >
                <Icon name={st.icon} size={18} color={COLORS.text} />
                <Text style={styles.quickStatText}>{st.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.quickStatItem, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}
              onPress={() => {
                setSelectedTeam('A');
                setSubOutPlayer(null);
                setSubInPlayer(null);
                setModalType('sub');
              }}
            >
              <Icon name="people-outline" size={18} color="#7E22CE" />
              <Text style={[styles.quickStatText, { color: '#7E22CE', fontWeight: '800' }]}>Sub</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Events List */}
        <Text style={styles.sectionTitle}>Game Events ({events.length})</Text>
        {events.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No events logged yet. Use buttons above to log scoring and stats.</Text>
          </View>
        ) : (
          events.map((ev) => {
            const evTeam = ev.team === 'A' ? teamA : teamB;
            const isScore = ev.pts !== undefined;
            return (
              <View key={ev.id} style={styles.eventRow}>
                <View style={styles.eventMinCol}>
                  <Text style={styles.eventMin}>{ev.quarter}</Text>
                  <Text style={styles.eventClock}>{ev.clock}</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 8 }}>
                  <Text style={styles.eventMainText}>
                    {isScore
                      ? `+${ev.pts} Points (${ev.type.toUpperCase()})`
                      : ev.type === 'sub'
                      ? `${ev.inPlayerName} IN ➔ ${ev.outPlayerName} OUT`
                      : `${ev.type.toUpperCase()} by ${ev.playerName}`}
                  </Text>
                  <Text style={styles.eventSubText}>{evTeam.name}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Stat Modal */}
      <Modal visible={modalType === 'stat'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record {statAction.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setModalType(null)}>
                <Icon name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

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
              onPress={recordStat}
              disabled={!selectedPlayer}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm {statAction}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sub Modal */}
      <Modal visible={modalType === 'sub'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Player Substitution 🔄</Text>
              <TouchableOpacity onPress={() => setModalType(null)}>
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

            <Text style={styles.modalLabel}>Player OUT ⬇️:</Text>
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

            <Text style={styles.modalLabel}>Player IN ⬆️:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {getTeamPlayers(selectedTeam)
                .filter((p) => p.id !== subOutPlayer)
                .map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, subInPlayer === p.id && { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
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
              <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm Sub</Text>
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

  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  quarterPill: {
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
  },
  quarterPillText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bgSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  clockPillText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  clockToggleBtn: {
    padding: 4,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.greenSoft,
  },

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
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.md,
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
  possessionBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    marginBottom: 4,
  },
  possessionBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  bigScore: { fontSize: 48, fontWeight: '900', color: COLORS.text },
  foulBadge: {
    backgroundColor: COLORS.bgSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
    marginTop: 4,
  },
  foulBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.subtext },

  scoreSep: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  vsText: { fontSize: 13, fontWeight: '800', color: COLORS.subtext },

  boxScoreTable: {
    width: '100%',
    backgroundColor: COLORS.bgSoft,
    borderRadius: RADIUS.md,
    padding: 8,
    marginBottom: SPACING.md,
  },
  boxRow: { flexDirection: 'row', paddingVertical: 4, alignItems: 'center' },
  boxHeaderCell: { flex: 1, fontSize: 11, fontWeight: '700', color: COLORS.subtext, textAlign: 'center' },
  boxCell: { flex: 1, fontSize: 12, color: COLORS.text, textAlign: 'center' },

  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
    width: '100%',
  },
  advanceBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  finalCard: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  finalTitle: { fontSize: 16, fontWeight: '800', color: '#92400E', marginTop: 6 },
  finalSub: { fontSize: 13, color: '#B45309', marginTop: 2 },

  scoringRowCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scoringRowTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  ptsBtnGroup: { flexDirection: 'row', gap: 10 },
  ptBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  ptBtnText: { fontSize: 14, fontWeight: '800' },

  quickStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  quickStatItem: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  quickStatText: { fontSize: 11, fontWeight: '700', color: COLORS.text },

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

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: RADIUS.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  eventMinCol: { width: 44, alignItems: 'center' },
  eventMin: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  eventClock: { fontSize: 9, color: COLORS.subtext },
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

  modalActionBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
