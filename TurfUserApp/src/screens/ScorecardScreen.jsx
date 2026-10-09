import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

const BALL_BUTTONS_ROW1 = [
  { key: '0', label: '·', bg: '#F1F3F4', color: COLORS.text },
  { key: '1', label: '1', bg: '#DCEBFF', color: '#1D4ED8' },
  { key: '2', label: '2', bg: '#DCEBFF', color: '#1D4ED8' },
  { key: '3', label: '3', bg: '#DCEBFF', color: '#1D4ED8' },
  { key: '4', label: '4', bg: '#DCFCE7', color: '#15803D' },
];
const BALL_BUTTONS_ROW2 = [
  { key: '6', label: '6', bg: COLORS.primary, color: '#fff' },
  { key: 'W', label: 'W', bg: '#FEE2E2', color: '#B91C1C' },
  { key: 'Wd', label: 'Wd', bg: '#FEF3C7', color: '#92400E' },
  { key: 'Nb', label: 'Nb', bg: '#FFEDD5', color: '#C2410C' },
];

// ── pure helpers ────────────────────────────────────────────────────────
const clone = (o) => JSON.parse(JSON.stringify(o));

function getBatter(inn, id) {
  if (!id) return null;
  if (!inn.batters[id]) inn.batters[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
  return inn.batters[id];
}
function getBowler(inn, id) {
  if (!id) return null;
  if (!inn.bowlers[id]) inn.bowlers[id] = { balls: 0, runs: 0, wickets: 0 };
  return inn.bowlers[id];
}

function applyBall(inning, kind, lastManEnabled = false) {
  const inn = clone(inning);
  const striker = getBatter(inn, inn.strikerId);
  const bowler = getBowler(inn, inn.currentBowlerId);

  const isSoloBatter = lastManEnabled && !inn.nonStrikerId;

  if (['0', '1', '2', '3', '4', '6'].includes(kind)) {
    const runs = parseInt(kind, 10);
    if (striker) { striker.runs += runs; striker.balls += 1; if (runs === 4) striker.fours += 1; if (runs === 6) striker.sixes += 1; }
    if (bowler) { bowler.runs += runs; bowler.balls += 1; }
    inn.totalRuns += runs;
    inn.legalBalls += 1;

    if (!isSoloBatter && inn.nonStrikerId) {
      if (runs % 2 === 1) [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
      if (inn.legalBalls % 6 === 0) {
        [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
        inn.currentBowlerId = null;
      }
    } else {
      if (inn.legalBalls % 6 === 0) {
        inn.currentBowlerId = null;
      }
    }
  } else if (kind === 'W') {
    if (striker) { striker.balls += 1; striker.out = true; }
    if (bowler) { bowler.balls += 1; bowler.wickets += 1; }
    inn.wickets += 1;
    inn.legalBalls += 1;
    if (inn.legalBalls % 6 === 0) {
      inn.currentBowlerId = null;
    }
    if (inn.battingQueue && inn.battingQueue.length > 0) {
      inn.strikerId = inn.battingQueue.shift();
    } else if (lastManEnabled && inn.nonStrikerId) {
      inn.strikerId = inn.nonStrikerId;
      inn.nonStrikerId = null;
    } else {
      inn.strikerId = null; // all out
    }
  } else if (kind === 'Wd' || kind === 'Nb') {
    inn.totalRuns += 1;
    inn.extras += 1;
    if (bowler) bowler.runs += 1;
  }
  return inn;
}

const oversStr = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
const sr = (runs, balls) => (balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0');
const eco = (runs, balls) => (balls > 0 ? (runs / (balls / 6)).toFixed(1) : '0.0');
const crr = (runs, balls) => (balls > 0 ? (runs / (balls / 6)).toFixed(1) : '0.0');

export default function ScorecardScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);
  const [viewIdx, setViewIdx] = useState(0);
  const [setupModal, setSetupModal] = useState(false);
  const [bowlerModal, setBowlerModal] = useState(false);
  const [pickStriker, setPickStriker] = useState(null);
  const [pickNonStriker, setPickNonStriker] = useState(null);
  const [pickBowler, setPickBowler] = useState(null);
  const undoStack = useRef([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const m = await matchStorage.getMatch(matchId);
        if (!active || !m) return;
        setMatch(m);
        const inningsList = Array.isArray(m.innings) ? m.innings : (Array.isArray(m.scorecard?.innings) ? m.scorecard.innings : []);
        const defaultIdx = m.currentInningsIndex !== undefined && m.currentInningsIndex !== null
          ? Number(m.currentInningsIndex)
          : (inningsList.length > 1 ? 1 : 0);
        setViewIdx(defaultIdx);
        checkModals(m);
      })();
      return () => { active = false; };
    }, [matchId])
  );

  const checkModals = (m) => {
    if (!m || m.status === 'completed') { setSetupModal(false); setBowlerModal(false); return; }
    const inningsList = Array.isArray(m.innings) ? m.innings : (Array.isArray(m.scorecard?.innings) ? m.scorecard.innings : []);
    const idx = m.currentInningsIndex !== undefined ? Number(m.currentInningsIndex) : 0;
    const inn = inningsList[idx];
    if (!inn || inn.completed) { setSetupModal(false); setBowlerModal(false); return; }
    if (!inn.strikerId && !inn.nonStrikerId) {
      setPickStriker(null); setPickNonStriker(null); setPickBowler(null);
      setSetupModal(true);
      setBowlerModal(false);
    } else if (!inn.currentBowlerId) {
      setPickBowler(null);
      setBowlerModal(true);
      setSetupModal(false);
    } else {
      setSetupModal(false);
      setBowlerModal(false);
    }
  };

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
    if (strId.endsWith('_p1')) return { id: strId, name: 'Player 1' };
    if (strId.endsWith('_p2')) return { id: strId, name: 'Player 2' };

    return { id: strId, name: strId.length > 15 ? 'Player' : strId };
  };

  const eligibleBatters = (teamKey, excludeIds = []) => {
    if (!match || !match.teams || !match.teams[teamKey]) return [];
    const teamPlayerIds = match.teams[teamKey].playerIds || [];
    let list = teamPlayerIds
      .filter((id) => !excludeIds.includes(id))
      .map((id) => playerById(id))
      .filter(Boolean);

    if (list.length === 0) {
      const teamName = match.teams[teamKey]?.name || 'Player';
      const fallbackList = [
        { id: `${teamKey}_p1`, name: `${teamName} 1` },
        { id: `${teamKey}_p2`, name: `${teamName} 2` },
      ];
      return fallbackList.filter((p) => !excludeIds.includes(p.id));
    }

    if (list.length === 1 && excludeIds.length > 0) {
      const teamName = match.teams[teamKey]?.name || 'Player';
      list.push({ id: `${teamKey}_p2`, name: `${teamName} 2` });
    }

    return list;
  };

  const persist = async (nextMatch) => {
    setMatch(nextMatch);
    await matchStorage.saveMatch(nextMatch);
    checkModals(nextMatch);
  };

  // ── setup: pick openers + first bowler ──────────────────────────────────
  const confirmSetup = async () => {
    if (!pickStriker || !pickNonStriker || !pickBowler || pickStriker === pickNonStriker) return;
    const idx = match.currentInningsIndex;
    const inn = clone(match.innings[idx]);
    inn.strikerId = pickStriker;
    inn.nonStrikerId = pickNonStriker;
    inn.currentBowlerId = pickBowler;
    const battingTeam = match.teams[inn.battingTeam];
    inn.battingQueue = battingTeam.playerIds.filter((id) => id !== pickStriker && id !== pickNonStriker);
    const next = clone(match);
    next.innings[idx] = inn;
    next.status = 'live';
    next.timeline = [...(Array.isArray(next.timeline) ? next.timeline : []), { time: Date.now(), text: 'Innings started' }];
    await persist(next);
  };

  const confirmBowler = async () => {
    if (!pickBowler) return;
    const idx = match.currentInningsIndex;
    const inn = clone(match.innings[idx]);
    inn.currentBowlerId = pickBowler;
    const next = clone(match);
    next.innings[idx] = inn;
    await persist(next);
  };

  // ── scoring ──────────────────────────────────────────────────────────────
  const handleBall = async (kind) => {
    if (!match) return;
    const idx = match.currentInningsIndex;
    const inn = match.innings[idx];
    if (!inn || inn.completed || !inn.strikerId || !inn.currentBowlerId) return;

    undoStack.current.push(clone({ innings: match.innings, currentInningsIndex: match.currentInningsIndex, status: match.status }));

    const lastManEnabled = Boolean(match.lastManEnabled || match.toss?.lastManEnabled || match.scorecard?.lastManEnabled);
    const updatedInning = applyBall(inn, kind, lastManEnabled);
    const battingTeamSize = match.teams[updatedInning.battingTeam].playerIds.length;
    const allOut = updatedInning.strikerId === null;
    const oversDone = updatedInning.legalBalls >= match.overs * 6;
    const targetReached = idx === 1 && Boolean(updatedInning.target) && updatedInning.totalRuns >= updatedInning.target;
    const inningsComplete = allOut || oversDone || targetReached;

    const next = clone(match);

    if (!inningsComplete) {
      next.innings[idx] = updatedInning;
      await persist(next);
      return;
    }

    updatedInning.completed = true;
    next.innings[idx] = updatedInning;

    const curTimeline = Array.isArray(next.timeline) ? next.timeline : [];
    if (idx === 0) {
      const battingTeam2 = updatedInning.bowlingTeam;
      const bowlingTeam2 = updatedInning.battingTeam;
      next.innings.push({
        battingTeam: battingTeam2, bowlingTeam: bowlingTeam2,
        totalRuns: 0, wickets: 0, legalBalls: 0, extras: 0,
        strikerId: null, nonStrikerId: null, currentBowlerId: null,
        batters: {}, bowlers: {}, battingQueue: [],
        completed: false,
        target: updatedInning.totalRuns + 1,
      });
      next.currentInningsIndex = 1;
      next.timeline = [...curTimeline, {
        time: Date.now(),
        text: `${match.teams[updatedInning.battingTeam].name} scored ${updatedInning.totalRuns}/${updatedInning.wickets} in ${oversStr(updatedInning.legalBalls)} overs`,
      }];
      setViewIdx(1);
    } else {
      next.status = 'completed';
      const chasing = updatedInning;
      const first = next.innings[0];
      const target = chasing.target || first.totalRuns + 1;
      let resultText;
      if (chasing.totalRuns >= target) {
        const battingSize = match.teams[chasing.battingTeam].playerIds.length;
        const wicketsLeft = battingSize - 1 - chasing.wickets;
        resultText = `${match.teams[chasing.battingTeam].name} won by ${Math.max(wicketsLeft, 0)} wicket(s)`;
      } else if (chasing.totalRuns === target - 1) {
        resultText = 'Match tied';
      } else {
        const margin = target - 1 - chasing.totalRuns;
        resultText = `${match.teams[first.battingTeam].name} won by ${margin} run(s)`;
      }
      next.timeline = [...curTimeline, { time: Date.now(), text: resultText }];
      next.resultText = resultText;
    }

    await persist(next);
  };

  const handleUndo = async () => {
    if (undoStack.current.length === 0 || !match) return;
    const snap = undoStack.current.pop();
    const next = clone(match);
    next.innings = snap.innings;
    next.currentInningsIndex = snap.currentInningsIndex;
    next.status = snap.status;
    setViewIdx(snap.currentInningsIndex);
    await persist(next);
  };

  const inningsList = Array.isArray(match?.innings) ? match.innings : (Array.isArray(match?.scorecard?.innings) ? match.scorecard.innings : []);
  const validViewIdx = Math.min(Math.max(viewIdx, 0), Math.max(inningsList.length - 1, 0));
  const inn = inningsList[validViewIdx];
  const isLiveView = match && validViewIdx === match.currentInningsIndex && match.status !== 'completed';

  const battingTeamName = inn ? (match.teams?.[inn.battingTeam]?.name || (inn.battingTeam === 'A' ? match.teams?.A?.name : match.teams?.B?.name) || 'Team A') : '';
  const bowlingTeamName = inn ? (match.teams?.[inn.bowlingTeam]?.name || (inn.bowlingTeam === 'A' ? match.teams?.A?.name : match.teams?.B?.name) || 'Team B') : '';

  const battingList = useMemo(() => {
    if (!inn || !inn.batters) return [];
    return Object.keys(inn.batters).map((id) => ({ id, ...inn.batters[id] }));
  }, [inn]);

  const bowlingList = useMemo(() => {
    if (!inn || !inn.bowlers) return [];
    return Object.keys(inn.bowlers).map((id) => ({ id, ...inn.bowlers[id] }));
  }, [inn]);

  if (!match) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scorecard</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: COLORS.subtext }}>Loading match scorecard...</Text>
        </View>
      </View>
    );
  }

  if (!inn) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{(match.teams?.A?.name || 'Team A')} vs {(match.teams?.B?.name || 'Team B')}</Text>
            <Text style={styles.headerSub}>{match.place || 'Turf Arena'}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: COLORS.text, fontWeight: '700' }}>
            {match.status === 'completed' ? 'Match Completed' : 'Innings setup pending...'}
          </Text>
          {match.resultText && (
            <Text style={{ fontSize: 14, color: COLORS.primary, marginTop: 8, fontWeight: '600' }}>
              {match.resultText}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const needRuns = inn.target ? inn.target - inn.totalRuns : null;
  const ballsLeft = match.overs * 6 - inn.legalBalls;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{(match.teams?.A?.name || match.teams?.teamA?.name || 'Team A')} vs {(match.teams?.B?.name || match.teams?.teamB?.name || 'Team B')}</Text>
          <Text style={styles.headerSub}>{match.place || 'Turf Arena'}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {inningsList.map((i, idx) => (
          <TouchableOpacity key={idx} style={styles.tabBtn} onPress={() => setViewIdx(idx)}>
            <Text style={[styles.tabText, validViewIdx === idx && styles.tabTextActive]}>
              {match.teams?.[i.battingTeam]?.name || (i.battingTeam === 'A' ? match.teams?.A?.name : match.teams?.B?.name) || `Inning ${idx + 1}`}
            </Text>
            {validViewIdx === idx && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>
        {match.status === 'completed' && (
          <View style={styles.resultBanner}>
            <Icon name="trophy" size={20} color="#92400e" />
            <Text style={styles.resultText}>{match.resultText}</Text>
          </View>
        )}

        {/* Score banner */}
        <View style={styles.scoreBanner}>
          <Text style={styles.scoreBig}>{inn.totalRuns}-{inn.wickets}</Text>
          <Text style={styles.scoreOvers}>{oversStr(inn.legalBalls)} ov{inn.target ? ` · Need ${Math.max(needRuns, 0)} from ${Math.max(ballsLeft, 0)} balls` : ''}</Text>
          <View style={styles.chipRow}>
            <View style={styles.chip}><Text style={styles.chipText}>CRR: {crr(inn.totalRuns, inn.legalBalls)}</Text></View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                RRR: {inn.target && ballsLeft > 0 ? ((needRuns) / (ballsLeft / 6)).toFixed(1) : '0.0'}
              </Text>
            </View>
            <View style={styles.chip}><Text style={styles.chipText}>Target: {inn.target || 0}</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>Extras: {inn.extras}</Text></View>
          </View>
        </View>

        {/* Current batters */}
        {inn.strikerId && (
          <View style={styles.currentBattersBox}>
            {[inn.strikerId, inn.nonStrikerId].filter(Boolean).map((id) => {
              const b = inn.batters[id] || { runs: 0, balls: 0 };
              const p = playerById(id);
              const onStrike = id === inn.strikerId;
              return (
                <View key={id} style={styles.batterRow}>
                  <Text style={styles.batterName}>{p?.name || '—'}{onStrike ? ' *' : ''}</Text>
                  <Text style={styles.batterStats}>{b.runs} ({b.balls}) · SR {sr(b.runs, b.balls)}</Text>
                </View>
              );
            })}
            {inn.currentBowlerId && (
              <View style={styles.bowlerNowRow}>
                <Text style={styles.bowlerNowText}>
                  Bowler: {playerById(inn.currentBowlerId)?.name} · {getBowler(clone(inn), inn.currentBowlerId).runs}-{getBowler(clone(inn), inn.currentBowlerId).wickets} ({oversStr(getBowler(clone(inn), inn.currentBowlerId).balls)})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Ball buttons */}
        {isLiveView && (
          <>
            <View style={styles.ballRow}>
              {BALL_BUTTONS_ROW1.map((b) => (
                <TouchableOpacity key={b.key} style={[styles.ballBtn, { backgroundColor: b.bg }]} onPress={() => handleBall(b.key)}>
                  <Text style={[styles.ballBtnText, { color: b.color }]}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.ballRow}>
              {BALL_BUTTONS_ROW2.map((b) => (
                <TouchableOpacity key={b.key} style={[styles.ballBtn, { backgroundColor: b.bg, flex: 1.2 }]} onPress={() => handleBall(b.key)}>
                  <Text style={[styles.ballBtnText, { color: b.color }]}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} disabled={undoStack.current.length === 0}>
              <Text style={styles.undoText}>Undo</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Batting card */}
        <View style={styles.inningCard}>
          <Text style={styles.inningCardTitle}>
            {battingTeamName} Inning {inn.totalRuns}/{inn.wickets} ({oversStr(inn.legalBalls)} ov)
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.th, { flex: 2 }]}>BATTING</Text>
            <Text style={styles.th}>R</Text>
            <Text style={styles.th}>4s</Text>
            <Text style={styles.th}>6s</Text>
            <Text style={styles.th}>B</Text>
            <Text style={styles.th}>SR</Text>
          </View>
          {battingList.map((b) => {
            const p = playerById(b.id);
            return (
              <View key={b.id} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 2, color: b.out ? COLORS.red : COLORS.text, fontWeight: '700' }]}>
                  {p?.name}{b.id === inn.strikerId ? ' *' : ''}
                </Text>
                <Text style={styles.td}>{b.runs}</Text>
                <Text style={styles.td}>{b.fours}</Text>
                <Text style={styles.td}>{b.sixes}</Text>
                <Text style={styles.td}>{b.balls}</Text>
                <Text style={styles.td}>{sr(b.runs, b.balls)}</Text>
              </View>
            );
          })}
          {battingList.length === 0 && <Text style={styles.emptyRow}>Yet to bat</Text>}
        </View>

        {/* Bowling card */}
        <View style={[styles.inningCard, { backgroundColor: COLORS.bgSoft }]}>
          <Text style={[styles.inningCardTitle, { color: COLORS.text }]}>{bowlingTeamName}</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.th, { flex: 2 }]}>BOWLING</Text>
            <Text style={styles.th}>OV</Text>
            <Text style={styles.th}>R</Text>
            <Text style={styles.th}>W</Text>
            <Text style={styles.th}>ECO</Text>
          </View>
          {bowlingList.map((b) => {
            const p = playerById(b.id);
            return (
              <View key={b.id} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>
                  {p?.name}{b.id === inn.currentBowlerId ? ' *' : ''}
                </Text>
                <Text style={styles.td}>{oversStr(b.balls)}</Text>
                <Text style={styles.td}>{b.runs}</Text>
                <Text style={styles.td}>{b.wickets}</Text>
                <Text style={styles.td}>{eco(b.runs, b.balls)}</Text>
              </View>
            );
          })}
          {bowlingList.length === 0 && <Text style={styles.emptyRow}>Yet to bowl</Text>}
        </View>
      </ScrollView>

      {/* Setup modal: pick openers + first bowler */}
      <Modal visible={setupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Openers & Bowler</Text>

            <Text style={styles.label}>{match.teams[inn.battingTeam].name} — Striker</Text>
            <View style={styles.chooseRow}>
              {eligibleBatters(inn.battingTeam).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.choosePill, pickStriker === p.id && styles.choosePillActive]}
                  onPress={() => setPickStriker(p.id)}
                >
                  <Text style={[styles.choosePillText, pickStriker === p.id && styles.choosePillTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Non-striker</Text>
            <View style={styles.chooseRow}>
              {eligibleBatters(inn.battingTeam, [pickStriker].filter(Boolean)).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.choosePill, pickNonStriker === p.id && styles.choosePillActive]}
                  onPress={() => setPickNonStriker(p.id)}
                >
                  <Text style={[styles.choosePillText, pickNonStriker === p.id && styles.choosePillTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{match.teams[inn.bowlingTeam].name} — Bowler</Text>
            <View style={styles.chooseRow}>
              {eligibleBatters(inn.bowlingTeam).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.choosePill, pickBowler === p.id && styles.choosePillActive]}
                  onPress={() => setPickBowler(p.id)}
                >
                  <Text style={[styles.choosePillText, pickBowler === p.id && styles.choosePillTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, (!pickStriker || !pickNonStriker || !pickBowler) && { opacity: 0.5 }]}
              disabled={!pickStriker || !pickNonStriker || !pickBowler}
              onPress={confirmSetup}
            >
              <Text style={styles.confirmBtnText}>Start Innings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Next bowler modal (after each over) */}
      <Modal visible={bowlerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Next Bowler</Text>
            <View style={styles.chooseRow}>
              {eligibleBatters(inn.bowlingTeam).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.choosePill, pickBowler === p.id && styles.choosePillActive]}
                  onPress={() => setPickBowler(p.id)}
                >
                  <Text style={[styles.choosePillText, pickBowler === p.id && styles.choosePillTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, !pickBowler && { opacity: 0.5 }]}
              disabled={!pickBowler}
              onPress={confirmBowler}
            >
              <Text style={styles.confirmBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.sm },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  headerSub:   { fontSize: 11, color: COLORS.subtext },

  tabRow:      { flexDirection: 'row', paddingHorizontal: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn:      { marginRight: SPACING.lg, paddingBottom: 10 },
  tabText:     { fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  tabTextActive:{ color: COLORS.primary, fontWeight: '800' },
  tabUnderline:{ height: 2, backgroundColor: COLORS.primary, marginTop: 6, borderRadius: 1 },

  resultBanner:{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  resultText:  { fontWeight: '800', color: '#92400e', fontSize: 13, flex: 1 },

  scoreBanner: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md },
  scoreBig:    { color: '#fff', fontSize: 32, fontWeight: '800' },
  scoreOvers:  { color: '#eafff0', fontSize: 12, marginTop: 2, marginBottom: SPACING.sm },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.round },
  chipText:    { color: '#fff', fontSize: 11, fontWeight: '700' },

  currentBattersBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  batterRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  batterName:  { fontWeight: '700', fontSize: 13, color: COLORS.text },
  batterStats: { fontSize: 12, color: COLORS.subtext },
  bowlerNowRow:{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  bowlerNowText:{ fontSize: 12, color: COLORS.subtext, fontWeight: '600' },

  ballRow:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ballBtn:     { flex: 1, height: 46, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  ballBtnText: { fontWeight: '800', fontSize: 16 },
  undoBtn:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', marginBottom: SPACING.lg },
  undoText:    { fontWeight: '700', color: COLORS.text },

  inningCard:  { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, marginTop: SPACING.sm },
  inningCardTitle:{ color: '#fff', fontWeight: '800', fontSize: 13 },

  table:       { borderWidth: 1, borderColor: COLORS.border, borderTopWidth: 0, borderBottomLeftRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md, marginBottom: SPACING.md, overflow: 'hidden' },
  tableHeadRow:{ flexDirection: 'row', backgroundColor: COLORS.bgSoft, paddingVertical: 8, paddingHorizontal: SPACING.sm },
  th:          { flex: 1, fontSize: 10, fontWeight: '800', color: COLORS.subtext, textAlign: 'center' },
  tableRow:    { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  td:          { flex: 1, fontSize: 12, color: COLORS.text, textAlign: 'center' },
  emptyRow:    { padding: SPACING.md, fontSize: 12, color: COLORS.subtext, textAlign: 'center', fontStyle: 'italic' },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:  { backgroundColor: '#fff', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, maxHeight: '85%' },
  modalTitle:  { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  label:       { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm, marginBottom: 6 },
  chooseRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  choosePill:  { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.round, paddingHorizontal: 12, paddingVertical: 8 },
  choosePillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  choosePillText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  choosePillTextActive: { color: '#fff' },
  confirmBtn:  { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.lg },
  confirmBtnText:{ color: '#fff', fontWeight: '800', fontSize: 15 },
});