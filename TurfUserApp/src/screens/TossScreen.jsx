import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

const OVER_OPTIONS = [5, 6, 8, 10, 15, 20];

export default function TossScreen({ route, navigation }) {
  const { matchId } = route.params;

  const [spinTeam, setSpinTeam] = useState('B'); // team that flips the coin
  const [callTeam, setCallTeam] = useState('A'); // team that calls heads/tails
  const [call, setCall] = useState(null); // 'H' | 'T'
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null); // 'H' | 'T'
  const [wonBy, setWonBy] = useState(null); // 'A' | 'B'
  const [decision, setDecision] = useState(null); // 'bat' | 'bowl'
  const [overs, setOvers] = useState(6);
  const [saving, setSaving] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;

  const rotateY = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1800deg'] });
  const scale = spinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1] });

  const doSpin = () => {
    if (!call || spinning) return;
    setSpinning(true);
    setResult(null);
    setWonBy(null);
    spinAnim.setValue(0);

    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const outcome = Math.random() < 0.5 ? 'H' : 'T';
      const winner = outcome === call ? callTeam : (callTeam === 'A' ? 'B' : 'A');
      setResult(outcome);
      setWonBy(winner);
      setSpinning(false);
    });
  };

  const teamLabel = (t) => (t === 'A' ? 'Team A' : 'Team B');

  const handleConfirm = async () => {
    if (!wonBy || !decision || saving) return;
    setSaving(true);
    try {
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
        toss: { spinTeam, callTeam, call, result, wonBy, decision },
        currentInningsIndex: 0,
        innings: [innings0],
      });
      await matchStorage.addTimeline(
        matchId,
        `${teamLabel(wonBy)} won the toss, chose to ${decision}`
      );
      navigation.replace('Scorecard', { matchId: updated.id, needSetup: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Toss</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.coinBox}>
        <Animated.View style={[styles.coin, { transform: [{ perspective: 800 }, { rotateY }, { scale }] }]}>
          <Text style={styles.coinLetter}>
            {spinning ? '' : (result || 'H')}
          </Text>
        </Animated.View>
        <Text style={styles.coinCaption}>
          {result
            ? `Coin lands ${result === 'H' ? 'Heads' : 'Tails'}`
            : "Let's see who's going to win the Toss?"}
        </Text>
        {wonBy && <Text style={styles.wonByText}>{teamLabel(wonBy)} Won the Toss</Text>}
      </View>

      {!result && (
        <>
          <Text style={styles.label}>Which team going to spin?</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, spinTeam === 'A' && styles.pillActive]}
              onPress={() => setSpinTeam('A')}
            >
              <Text style={[styles.pillText, spinTeam === 'A' && styles.pillTextActive]}>Team A</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, spinTeam === 'B' && styles.pillActive]}
              onPress={() => setSpinTeam('B')}
            >
              <Text style={[styles.pillText, spinTeam === 'B' && styles.pillTextActive]}>Team B</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{teamLabel(callTeam)}: Choose Heads or Tails ?</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, call === 'H' && styles.pillActive]}
              onPress={() => setCall('H')}
            >
              <Text style={[styles.pillText, call === 'H' && styles.pillTextActive]}>Heads</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, call === 'T' && styles.pillActive]}
              onPress={() => setCall('T')}
            >
              <Text style={[styles.pillText, call === 'T' && styles.pillTextActive]}>Tails</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.spinBtn, (!call || spinning) && { opacity: 0.5 }]}
            disabled={!call || spinning}
            onPress={doSpin}
          >
            <Text style={styles.spinBtnText}>{spinning ? 'Spinning…' : 'Spin'}</Text>
          </TouchableOpacity>
        </>
      )}

      {result && (
        <>
          <Text style={styles.label}>{teamLabel(wonBy)}: Choose Bat or Bowl ?</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, decision === 'bat' && styles.pillActive]}
              onPress={() => setDecision('bat')}
            >
              <Text style={[styles.pillText, decision === 'bat' && styles.pillTextActive]}>Bat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, decision === 'bowl' && styles.pillActive]}
              onPress={() => setDecision('bowl')}
            >
              <Text style={[styles.pillText, decision === 'bowl' && styles.pillTextActive]}>Bowl</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Choose how many over?</Text>
          <View style={styles.oversRow}>
            {OVER_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o}
                style={[styles.oversPill, overs === o && styles.pillActive]}
                onPress={() => setOvers(o)}
              >
                <Text style={[styles.pillText, overs === o && styles.pillTextActive]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.spinBtn, (!decision || saving) && { opacity: 0.5 }]}
            disabled={!decision || saving}
            onPress={handleConfirm}
          >
            <Text style={styles.spinBtnText}>{saving ? 'Please wait…' : 'Confirm & Start'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.lg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: SPACING.md },
  backBtn:     { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  backArrow:   { fontSize: 26, color: COLORS.text },
  headerTitle: { ...FONT.h3, color: COLORS.text },

  coinBox:     { backgroundColor: '#fdf3e7', borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxl, marginBottom: SPACING.lg },
  coin:        { width: 140, height: 140, borderRadius: 70, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', borderWidth: 8, borderColor: '#f9c96b' },
  coinLetter:  { fontSize: 52, fontWeight: '800', color: '#c9720a' },
  coinCaption: { marginTop: SPACING.md, fontWeight: '700', fontSize: 14, color: COLORS.text, textAlign: 'center' },
  wonByText:   { marginTop: 4, color: '#c2410c', fontWeight: '700', fontSize: 13 },

  label:       { fontWeight: '700', fontSize: 14, color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  pillRow:     { flexDirection: 'row', gap: SPACING.md },
  pill:        { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  pillActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText:    { fontWeight: '700', color: COLORS.text },
  pillTextActive: { color: '#fff' },

  oversRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  oversPill:   { width: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: 10, alignItems: 'center' },

  spinBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.xl },
  spinBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});