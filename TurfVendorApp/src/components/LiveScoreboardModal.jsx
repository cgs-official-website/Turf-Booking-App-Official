import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CRICKET_LIGHT } from '../theme/cricketLight';
import { crrString, rrrString } from '../utils/cricketScorerEngine';

export default function LiveScoreboardModal({
  visible,
  onClose,
  match,
}) {
  const C = CRICKET_LIGHT;
  const dark = false;

  // Tab: 1 for Innings 1, 2 for Innings 2, or 'awards'
  const [activeTab, setActiveTab] = useState(1);

  const live = match?.liveCricket;

  useEffect(() => {
    if (live?.currentInnings) {
      setActiveTab(live.currentInnings);
    }
  }, [live?.currentInnings]);

  if (!match) return null;

  const currentInnNum = live?.currentInnings || 1;
  const inn1 = live?.innings1;
  const inn2 = live?.innings2;

  let activeInnings = activeTab === 2 ? (inn2 || inn1) : inn1;

  if (!activeInnings) {
    const score = match.score || {};
    const teamAName = match.teamA?.name || match.teamA?.teamName || 'Team A';
    const teamBName = match.teamB?.name || match.teamB?.teamName || 'Team B';
    const isTeam2 = activeTab === 2;
    activeInnings = {
      battingTeamName: isTeam2 ? teamBName : teamAName,
      runs: isTeam2 ? (score.runsB !== undefined ? score.runsB : 0) : (score.runsA !== undefined ? score.runsA : 0),
      wickets: isTeam2 ? (score.wicketsB !== undefined ? score.wicketsB : 0) : (score.wicketsA !== undefined ? score.wicketsA : 0),
      overs: isTeam2 ? (score.oversB || '0.0') : (score.oversA || '0.0'),
      maxOvers: 10,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      currentStrikerId: null,
      currentNonStrikerId: null,
      currentBowlerId: null,
      batters: {},
      bowlers: {},
      currentOverBalls: [],
      fallOfWickets: [],
    };
  }

  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  const striker = activeInnings.batters?.[activeInnings.currentStrikerId];
  const nonStriker = activeInnings.batters?.[activeInnings.currentNonStrikerId];
  const bowler = activeInnings.bowlers?.[activeInnings.currentBowlerId];

  const crr = crrString(activeInnings.runs, activeInnings.legalBalls);
  const target = live?.target;
  const maxBalls = (activeInnings.maxOvers || 10) * 6;
  const remBalls = Math.max(0, maxBalls - activeInnings.legalBalls);
  const remRuns = target ? Math.max(0, target - activeInnings.runs) : null;
  const rrr = target ? rrrString(target, activeInnings.runs, remBalls) : null;

  const allBatters = Object.values(activeInnings.batters || {});
  const allBowlers = Object.values(activeInnings.bowlers || {});

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: C.bg }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.liveTagRow}>
                {isLive ? (
                  <>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveTagText}>LIVE SCOREBOARD</Text>
                  </>
                ) : (
                  <Text style={[styles.completedTagText, { color: C.primary }]}>
                    {isCompleted ? 'MATCH SCORECARD' : 'UPCOMING MATCH'}
                  </Text>
                )}
                <Text style={[styles.roundLabel, { color: C.subtext }]}>
                  • {match.roundName || 'Match'} {match.matchNumber ? `#${match.matchNumber}` : ''}
                </Text>
              </View>
              <Text style={[styles.matchTitle, { color: C.text }]} numberOfLines={1}>
                {match.teamA?.name || 'Team A'} vs {match.teamB?.name || 'Team B'}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Live Hero Banner */}
            <View style={[styles.scoreHeroCard, { backgroundColor: C.card, borderColor: isLive ? '#EF4444' : C.border }]}>
              <View style={styles.heroMainRow}>
                <View style={styles.scoreBlock}>
                  <Text style={[styles.battingTeamName, { color: C.text }]} numberOfLines={1}>
                    {activeInnings.battingTeamName}
                  </Text>
                  <Text style={[styles.runsWickets, { color: C.text }]}>
                    {activeInnings.runs}/{activeInnings.wickets}
                  </Text>
                  <Text style={[styles.oversText, { color: C.subtext }]}>
                    {activeInnings.overs} / {activeInnings.maxOvers} ov
                  </Text>
                </View>

                <View style={styles.runRateBlock}>
                  <Text style={[styles.crrLabel, { color: C.subtext }]}>CRR: {crr}</Text>
                  {target && activeTab === 2 && (
                    <Text style={[styles.rrrLabel, { color: '#D97706' }]}>
                      RRR: {rrr}
                    </Text>
                  )}
                </View>
              </View>

              {/* Target Banner */}
              {target && activeTab === 2 && (
                <View style={[styles.chaseBanner, { backgroundColor: dark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7' }]}>
                  <Feather name="target" size={13} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={[styles.chaseText, { color: dark ? '#FBBF24' : '#92400E' }]}>
                    Target: {target} • Need {remRuns} runs from {remBalls} balls
                  </Text>
                </View>
              )}

              {/* Match Result if completed */}
              {isCompleted && match.score && (
                <View style={[styles.completedBanner, { backgroundColor: dark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                  <Text style={styles.completedText}>
                    {match.score.summary || `${match.winner?.name || 'Winner'} won`}
                  </Text>
                </View>
              )}
            </View>

            {/* Live At-Crease Widget (If match is currently live) */}
            {isLive && (
              <View style={[styles.liveCreaseCard, { backgroundColor: C.card, borderColor: C.border }]}>
                {/* Batters */}
                <View style={styles.creaseSection}>
                  <Text style={[styles.creaseSectionLabel, { color: C.subtext }]}>AT CREASE</Text>
                  <View style={styles.creaseBattersRow}>
                    {[{ p: striker, fb: 'Striker', st: true }, { p: nonStriker, fb: 'Non-Striker', st: false }].map((x, k) => (
                      <View key={`cr_${k}`} style={styles.creaseRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[styles.strikerDot, !x.st && { backgroundColor: 'transparent' }]} />
                          <Text style={[styles.creasePlayerName, { color: C.text }]} numberOfLines={1}>
                            {x.p?.name || x.fb}{x.st ? ' *' : ''}
                          </Text>
                        </View>
                        <Text style={[styles.creasePlayerStat, { color: C.text }]}>
                          <Text style={{ fontWeight: '900' }}>{x.p?.runs || 0}</Text> ({x.p?.balls || 0}) · 4s {x.p?.fours || 0} · 6s {x.p?.sixes || 0}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Bowler */}
                <View style={[styles.creaseSection, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }]}>
                  <Text style={[styles.creaseSectionLabel, { color: C.subtext }]}>BOWLING</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="locate" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                      <Text style={[styles.creasePlayerName, { color: C.text }]}>{bowler?.name || 'Bowler'}</Text>
                    </View>
                    <Text style={[styles.creasePlayerStat, { color: C.text }]}>
                      {bowler?.overs || '0.0'} ov • {bowler?.runs || 0} r • {bowler?.wickets || 0} w (Econ: {bowler?.economy || '0.0'})
                    </Text>
                  </View>

                  {/* Over Deliveries */}
                  <View style={styles.overStripContainer}>
                    <Text style={[styles.thisOverLabel, { color: C.subtext }]}>THIS OVER:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ballsRow}>
                      {activeInnings.currentOverBalls && activeInnings.currentOverBalls.length > 0 ? (
                        activeInnings.currentOverBalls.map((b, idx) => (
                          <View
                            key={`b_${idx}`}
                            style={[
                              styles.ballBadge,
                              b.includes('W') && { backgroundColor: '#EF4444' },
                              (b === '4' || b === '6') && { backgroundColor: '#10B981' },
                              (b.includes('WD') || b.includes('NB')) && { backgroundColor: '#F59E0B' },
                              (!b.includes('W') && b !== '4' && b !== '6' && !b.includes('WD') && !b.includes('NB')) && { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
                            ]}
                          >
                            <Text style={[styles.ballBadgeText, (b.includes('W') || b === '4' || b === '6') && { color: '#FFFFFF' }]}>
                              {b}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={{ fontSize: 11, color: C.subtext, fontStyle: 'italic' }}>
                          Starting over...
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                </View>
              </View>
            )}

            {/* Innings Tabs */}
            <View style={[styles.tabsRow, { backgroundColor: C.soft }]}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 1 && styles.tabBtnOn]}
                onPress={() => setActiveTab(1)}
              >
                <Text style={[styles.tabBtnText, { color: activeTab === 1 ? C.primary : C.subtext }]}>
                  1st Inn · {inn1?.battingTeamName || 'Team 1'}
                </Text>
              </TouchableOpacity>

              {inn2 && (
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 2 && styles.tabBtnOn]}
                  onPress={() => setActiveTab(2)}
                >
                  <Text style={[styles.tabBtnText, { color: activeTab === 2 ? C.primary : C.subtext }]}>
                    2nd Inn · {inn2?.battingTeamName || 'Team 2'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Full Batting Table */}
            <Text style={[styles.sectionHeading, { color: C.text, marginTop: 14 }]}>Batting</Text>
            <View style={[styles.fullTable, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.thRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.thBatter, { color: C.subtext }]}>BATSMAN</Text>
                <Text style={[styles.thVal, { color: C.subtext }]}>R</Text>
                <Text style={[styles.thVal, { color: C.subtext }]}>B</Text>
                <Text style={[styles.thVal, { color: C.subtext }]}>4s</Text>
                <Text style={[styles.thVal, { color: C.subtext }]}>6s</Text>
                <Text style={[styles.thValWide, { color: C.subtext }]}>SR</Text>
              </View>

              {allBatters.length === 0 ? (
                <View style={{ padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: C.subtext, fontStyle: 'italic' }}>
                    Deliveries are being scored live
                  </Text>
                </View>
              ) : (
                allBatters.map((b) => {
                  const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
                  return (
                    <View key={`btr_${b.id}`} style={[styles.tdRow, { borderBottomColor: C.border }]}>
                      <View style={styles.tdBatter}>
                        <Text style={[styles.btrName, { color: C.text }]} numberOfLines={1}>{b.name}</Text>
                        <Text style={[styles.btrDismissal, { color: C.subtext }]}>
                          {b.out ? String(b.dismissal || 'out').replace(/_/g, ' ') : 'not out'}
                        </Text>
                      </View>
                      <Text style={[styles.tdVal, { color: C.text, fontWeight: '800' }]}>{b.runs}</Text>
                      <Text style={[styles.tdVal, { color: C.subtext }]}>{b.balls}</Text>
                      <Text style={[styles.tdVal, { color: C.subtext }]}>{b.fours || 0}</Text>
                      <Text style={[styles.tdVal, { color: C.subtext }]}>{b.sixes || 0}</Text>
                      <Text style={[styles.tdValWide, { color: C.subtext }]}>{sr}</Text>
                    </View>
                  );
                })
              )}

              {/* Extras Row */}
              <View style={[styles.extrasRow, { backgroundColor: dark ? 'rgba(0,0,0,0.2)' : '#F8FAFC' }]}>
                <Text style={[styles.extrasLabel, { color: C.text }]}>Extras:</Text>
                <Text style={[styles.extrasVal, { color: C.subtext }]}>
                  {activeInnings.extras?.total || 0} (wd {activeInnings.extras?.wides || 0}, nb {activeInnings.extras?.noBalls || 0}, b {activeInnings.extras?.byes || 0}, lb {activeInnings.extras?.legByes || 0})
                </Text>
              </View>
            </View>

            {/* Full Bowling Table */}
            <Text style={[styles.sectionHeading, { color: C.text, marginTop: 16 }]}>Bowling</Text>
            <View style={[styles.fullTable, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.thRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.thBatter, { color: C.subtext }]}>BOWLER</Text>
                <Text style={[styles.thVal, { color: C.subtext }]}>O</Text>
                <Text style={[styles.thVal, { color: C.subtext }]}>M</Text>
                <Text style={[styles.thVal, { color: C.subtext }]}>R</Text>
                <Text style={[styles.thVal, { color: C.subtext }]}>W</Text>
                <Text style={[styles.thValWide, { color: C.subtext }]}>ECON</Text>
              </View>

              {allBowlers.length === 0 ? (
                <View style={{ padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: C.subtext, fontStyle: 'italic' }}>
                    Bowling figures will update as overs are bowled
                  </Text>
                </View>
              ) : (
                allBowlers.map((bw) => (
                  <View key={`bwl_${bw.id}`} style={[styles.tdRow, { borderBottomColor: C.border }]}>
                    <Text style={[styles.btrName, styles.tdBatter, { color: C.text }]} numberOfLines={1}>{bw.name}</Text>
                    <Text style={[styles.tdVal, { color: C.text }]}>{bw.overs}</Text>
                    <Text style={[styles.tdVal, { color: C.subtext }]}>{bw.maidens || 0}</Text>
                    <Text style={[styles.tdVal, { color: C.text }]}>{bw.runs}</Text>
                    <Text style={[styles.tdVal, { color: C.primary, fontWeight: '800' }]}>{bw.wickets}</Text>
                    <Text style={[styles.tdValWide, { color: C.subtext }]}>{bw.economy}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Fall of Wickets */}
            {activeInnings.fallOfWickets && activeInnings.fallOfWickets.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionHeading, { color: C.text }]}>Fall of Wickets</Text>
                <View style={[styles.fowCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  {activeInnings.fallOfWickets.map((w, idx) => (
                    <Text key={`fow_${idx}`} style={[styles.fowItem, { color: C.subtext }]}>
                      {w.score}/{w.wicketNumber} ({w.batterName}, {w.overs} ov){idx < activeInnings.fallOfWickets.length - 1 ? ' • ' : ''}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
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
    borderBottomWidth: 1,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveTagText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  completedTagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roundLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  matchTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
    paddingBottom: 36,
  },
  scoreHeroCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  heroMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  battingTeamName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  runsWickets: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  oversText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  runRateBlock: {
    alignItems: 'flex-end',
  },
  crrLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  rrrLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  chaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  chaseText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  completedBanner: {
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  completedText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '800',
  },
  liveCreaseCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  creaseSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  creaseBattersRow: {
    gap: 2,
  },
  creaseBatterItem: {
    flexDirection: 'column',
  },
  strikerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  creasePlayerName: {
    fontSize: 13,
    fontWeight: '800',
  },
  creasePlayerStat: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  overStripContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.15)',
  },
  thisOverLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginRight: 8,
  },
  ballsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ballBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  creaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  fullTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  thBatter: {
    flex: 2,
    fontSize: 10,
    fontWeight: '800',
  },
  thVal: {
    flex: 0.7,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  thValWide: {
    flex: 1.1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  tdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tdBatter: {
    flex: 2,
  },
  btrName: {
    fontSize: 12,
    fontWeight: '700',
  },
  btrDismissal: {
    fontSize: 10,
    marginTop: 1,
  },
  tdVal: {
    flex: 0.7,
    fontSize: 12,
    textAlign: 'center',
  },
  tdValWide: {
    flex: 1.1,
    fontSize: 11,
    textAlign: 'center',
  },
  extrasRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  extrasLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 6,
  },
  extrasVal: {
    fontSize: 11,
    fontWeight: '500',
  },
  fowCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fowItem: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 18,
  },
});
