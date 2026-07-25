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

function applyBall(inning, kind) {
  const inn = clone(inning);
  const striker = getBatter(inn, inn.strikerId);
  const bowler = getBowler(inn, inn.currentBowlerId);

  if (['0', '1', '2', '3', '4', '6'].includes(kind)) {
    const runs = parseInt(kind, 10);
    if (striker) { striker.runs += runs; striker.balls += 1; if (runs === 4) striker.fours += 1; if (runs === 6) striker.sixes += 1; }
    if (bowler) { bowler.runs += runs; bowler.balls += 1; }
    inn.totalRuns += runs;
    inn.legalBalls += 1;
    if (runs % 2 === 1) [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
    if (inn.legalBalls % 6 === 0) {
      [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
      inn.currentBowlerId = null;
    }
  } else if (kind === 'W') {
    if (striker) { striker.balls += 1; striker.out = true; }
    if (bowler) { bowler.balls += 1; bowler.wickets += 1; }
    inn.wickets += 1;
    inn.legalBalls += 1;
    if (inn.legalBalls % 6 === 0) {
      inn.currentBowlerId = null;
    }
    if (inn.battingQueue.length > 0) {
      inn.strikerId = inn.battingQueue.shift();
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
        setViewIdx(m.currentInningsIndex);
        checkModals(m);
      })();
      return () => { active = false; };
    }, [matchId])
  );

  const checkModals = (m) => {
    const inn = m.innings[m.currentInningsIndex];
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

  const playerById = (id) => match?.players.find((p) => p.id === id);

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
    next.timeline = [...next.timeline, { time: Date.now(), text: 'Innings started' }];
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

    const updatedInning = applyBall(inn, kind);
    const battingTeamSize = match.teams[updatedInning.battingTeam].playerIds.length;
    const allOut = updatedInning.strikerId === null;
    const oversDone = updatedInning.legalBalls >= match.overs * 6;
    const inningsComplete = allOut || oversDone;

    const next = clone(match);

    if (!inningsComplete) {
      next.innings[idx] = updatedInning;
      await persist(next);
      return;
    }

    updatedInning.completed = true;
    next.innings[idx] = updatedInning;

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
      next.timeline = [...next.timeline, {
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
      next.timeline = [...next.timeline, { time: Date.now(), text: resultText }];
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

  const inn = match?.innings?.[viewIdx];
  const isLiveView = match && viewIdx === match.currentInningsIndex && match.status === 'live';

  const battingTeamName = inn ? match.teams[inn.battingTeam].name : '';
  const bowlingTeamName = inn ? match.teams[inn.bowlingTeam].name : '';

  const battingList = useMemo(() => {
    if (!inn) return [];
    return Object.keys(inn.batters).map((id) => ({ id, ...inn.batters[id] }));
  }, [inn]);

  const bowlingList = useMemo(() => {
    if (!inn) return [];
    return Object.keys(inn.bowlers).map((id) => ({ id, ...inn.bowlers[id] }));
  }, [inn]);

  const eligibleBatters = (teamKey, excludeIds = []) => {
    if (!match) return [];
    return match.teams[teamKey].playerIds
      .filter((id) => !excludeIds.includes(id))
      .map((id) => playerById(id))
      .filter(Boolean);
  };

  if (!match || !inn) return <View style={styles.root} />;

  const needRuns = inn.target ? inn.target - inn.totalRuns : null;
  const ballsLeft = match.overs * 6 - inn.legalBalls;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Match', { matchId })} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{match.teams.A.name} vs {match.teams.B.name}</Text>
          <Text style={styles.headerSub}>{match.place}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {match.innings.map((i, idx) => (
          <TouchableOpacity key={idx} style={styles.tabBtn} onPress={() => setViewIdx(idx)}>
            <Text style={[styles.tabText, viewIdx === idx && styles.tabTextActive]}>
              {match.teams[i.battingTeam].name}
            </Text>
            {viewIdx === idx && <View style={styles.tabUnderline} />}
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