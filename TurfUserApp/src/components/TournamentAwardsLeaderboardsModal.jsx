import React, { useState, useMemo } from 'react';
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
import { CRICKET_LIGHT } from '../theme/cricketLight';
import { calculateTournamentLeaders } from '../utils/cricketScorerEngine';

export default function TournamentAwardsLeaderboardsModal({
  visible,
  onClose,
  tournament,
  onSelectPlayer,
}) {
  const colors = CRICKET_LIGHT;
  const isDark = false;
  const [activeTab, setActiveTab] = useState('runs'); // 'runs' | 'wickets' | 'sr' | 'econ' | 'sixes' | 'fours' | 'fielding'

  const leadersData = useMemo(() => {
    return calculateTournamentLeaders(tournament);
  }, [tournament]);

  const { podium, awards, leaderboards, isFinalized } = leadersData;
  const prizeDetails = tournament?.prizeDetails || {};
  const hasAwards = Object.values(awards || {}).some(Boolean);

  const tabs = [
    { key: 'runs', label: '🏏 Runs' },
    { key: 'wickets', label: '🎯 Wickets' },
    { key: 'sr', label: '⚡ Strike Rate' },
    { key: 'econ', label: '📉 Economy' },
    { key: 'sixes', label: '💥 Sixes' },
    { key: 'fours', label: '🎯 Fours' },
    { key: 'fielding', label: '🧤 Fielding' },
  ];

  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'runs':
        return leaderboards.runs || [];
      case 'wickets':
        return leaderboards.wickets || [];
      case 'sr':
        return leaderboards.strikeRate || [];
      case 'econ':
        return leaderboards.economy || [];
      case 'sixes':
        return leaderboards.sixes || [];
      case 'fours':
        return leaderboards.fours || [];
      case 'fielding':
        return leaderboards.fielding || [];
      default:
        return leaderboards.runs || [];
    }
  }, [activeTab, leaderboards]);

  const getRankBadgeStyle = (rank) => {
    switch (rank) {
      case 1:
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' };
      case 2:
        return { bg: '#F1F5F9', border: '#94A3B8', text: '#475569' };
      case 3:
        return { bg: '#FFEDD5', border: '#FB923C', text: '#9A3412' };
      default:
        return { bg: isDark ? '#1E293B' : '#F8FAFC', border: colors.border, text: colors.subtext || '#64748B' };
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
        return '#10B981';
      case 'A':
        return '#059669';
      case 'B+':
        return '#3B82F6';
      case 'B':
        return '#D97706';
      default:
        return '#64748B';
    }
  };

  const handlePlayerPress = (player) => {
    if (onSelectPlayer) {
      onSelectPlayer(player);
    } else {
      Alert.alert(
        player.name,
        `Team: ${player.teamName}\n` +
        `• Runs: ${player.runs} (${player.balls} balls, SR: ${player.strikeRate})\n` +
        `• Boundaries: 4s: ${player.fours} | 6s: ${player.sixes}\n` +
        `• Bowling: ${player.wickets} wkts (${player.overs} ov, Econ: ${player.economy})\n` +
        `• Fielding: ${player.catches} catches, ${player.runOuts} run-outs\n` +
        `• Overall Rating: ${player.grade} (${player.impactScore} pts)`
      );
    }
  };

  if (!tournament) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bg || '#0F172A' }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.statusTag, { color: isFinalized ? '#10B981' : '#F59E0B' }]}>
                  {isFinalized ? '👑 TOURNAMENT COMPLETED' : '⚡ CURRENT STANDINGS'}
                </Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                Awards & Leaderboards
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.subtext || '#94A3B8' }]} numberOfLines={1}>
                {tournament.name}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Top Podium (When Overall Performers Exist) */}
            {podium.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isFinalized ? '🏆 Overall Champions Podium' : '⭐ Top Impact Performers'}
                </Text>

                <View style={styles.podiumContainer}>
                  {podium.map((p, index) => {
                    const rank = index + 1;
                    const badge = getRankBadgeStyle(rank);
                    return (
                      <TouchableOpacity
                        key={`podium_${p.id}`}
                        style={[
                          styles.podiumCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: badge.border,
                            borderTopWidth: rank === 1 ? 4 : 2,
                            borderTopColor: badge.border,
                          },
                        ]}
                        onPress={() => handlePlayerPress(p)}
                      >
                        <View style={[styles.podiumBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[styles.podiumBadgeText, { color: badge.text }]}>
                            {rank === 1 ? '🥇 #1' : (rank === 2 ? '🥈 #2' : '🥉 #3')}
                          </Text>
                        </View>
                        <Text style={[styles.podiumPlayerName, { color: colors.text }]} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={[styles.podiumTeamName, { color: colors.subtext || '#94A3B8' }]} numberOfLines={1}>
                          {p.teamName}
                        </Text>
                        <Text style={[styles.podiumPoints, { color: colors.primary }]}>
                          {p.impactScore} <Text style={{ fontSize: 10, fontWeight: '600', color: colors.subtext }}>pts</Text>
                        </Text>
                        <Text style={[styles.podiumMiniStat, { color: colors.subtext || '#94A3B8' }]}>
                          {p.runs}r • {p.wickets}w
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Featured Awards Grid */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🎖️ Featured Tournament Awards{!isFinalized && hasAwards ? '  ·  Provisional' : ''}
              </Text>
              {!hasAwards && (
                <View style={{ padding: 18, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.subtext, textAlign: 'center' }}>
                    Awards will appear as soon as the first match is scored. Final awards are confirmed when the tournament completes.
                  </Text>
                </View>
              )}

              <View style={styles.awardsGrid}>
                {/* 1. Player of the Tournament */}
                {awards.playerOfTournament && (
                  <TouchableOpacity
                    style={[styles.awardCard, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : '#FEF3C7', borderColor: '#D97706' }]}
                    onPress={() => handlePlayerPress(awards.playerOfTournament)}
                  >
                    <View style={styles.awardHeaderRow}>
                      <Text style={styles.awardIcon}>👑</Text>
                      <View style={[styles.gradeTag, { backgroundColor: getGradeColor(awards.playerOfTournament.grade) }]}>
                        <Text style={styles.gradeTagText}>{awards.playerOfTournament.grade}</Text>
                      </View>
                    </View>
                    <Text style={[styles.awardRoleTitle, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                      PLAYER OF TOURNAMENT
                    </Text>
                    <Text style={[styles.awardWinnerName, { color: colors.text }]} numberOfLines={1}>
                      {awards.playerOfTournament.name}
                    </Text>
                    <Text style={[styles.awardTeamName, { color: colors.subtext || '#94A3B8' }]} numberOfLines={1}>
                      {awards.playerOfTournament.teamName}
                    </Text>
                    <Text style={[styles.awardStatHighlight, { color: colors.text }]}>
                      {awards.playerOfTournament.runs} runs • {awards.playerOfTournament.wickets} wickets
                    </Text>
                    {Boolean(prizeDetails.playerOfTournamentPrize) && (
                      <View style={styles.prizeBox}>
                        <Text style={styles.prizeText}>🎁 {prizeDetails.playerOfTournamentPrize}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* 2. Best Batter */}
                {awards.bestBatter && (
                  <TouchableOpacity
                    style={[styles.awardCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: '#10B981' }]}
                    onPress={() => handlePlayerPress(awards.bestBatter)}
                  >
                    <View style={styles.awardHeaderRow}>
                      <Text style={styles.awardIcon}>🏏</Text>
                      <View style={[styles.gradeTag, { backgroundColor: getGradeColor(awards.bestBatter.grade) }]}>
                        <Text style={styles.gradeTagText}>{awards.bestBatter.grade}</Text>
                      </View>
                    </View>
                    <Text style={[styles.awardRoleTitle, { color: '#059669' }]}>
                      BEST BATTER
                    </Text>
                    <Text style={[styles.awardWinnerName, { color: colors.text }]} numberOfLines={1}>
                      {awards.bestBatter.name}
                    </Text>
                    <Text style={[styles.awardTeamName, { color: colors.subtext || '#94A3B8' }]} numberOfLines={1}>
                      {awards.bestBatter.teamName}
                    </Text>
                    <Text style={[styles.awardStatHighlight, { color: colors.text }]}>
                      {awards.bestBatter.runs} runs (SR: {awards.bestBatter.strikeRate})
                    </Text>
                    {Boolean(prizeDetails.bestBatterPrize) && (
                      <View style={styles.prizeBox}>
                        <Text style={styles.prizeText}>🎁 {prizeDetails.bestBatterPrize}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* 3. Best Bowler */}
                {awards.bestBowler && (
                  <TouchableOpacity
                    style={[styles.awardCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF', borderColor: '#3B82F6' }]}
                    onPress={() => handlePlayerPress(awards.bestBowler)}
                  >
                    <View style={styles.awardHeaderRow}>
                      <Text style={styles.awardIcon}>🎯</Text>
                      <View style={[styles.gradeTag, { backgroundColor: getGradeColor(awards.bestBowler.grade) }]}>
                        <Text style={styles.gradeTagText}>{awards.bestBowler.grade}</Text>
                      </View>
                    </View>
                    <Text style={[styles.awardRoleTitle, { color: '#2563EB' }]}>
                      BEST BOWLER
                    </Text>
                    <Text style={[styles.awardWinnerName, { color: colors.text }]} numberOfLines={1}>
                      {awards.bestBowler.name}
                    </Text>
                    <Text style={[styles.awardTeamName, { color: colors.subtext || '#94A3B8' }]} numberOfLines={1}>
                      {awards.bestBowler.teamName}
                    </Text>
                    <Text style={[styles.awardStatHighlight, { color: colors.text }]}>
                      {awards.bestBowler.wickets} wkts • Econ: {awards.bestBowler.economy}
                    </Text>
                    {Boolean(prizeDetails.bestBowlerPrize) && (
                      <View style={styles.prizeBox}>
                        <Text style={styles.prizeText}>🎁 {prizeDetails.bestBowlerPrize}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* 4. Best All-Rounder */}
                {awards.bestAllRounder && (
                  <TouchableOpacity
                    style={[styles.awardCard, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#F5F3FF', borderColor: '#8B5CF6' }]}
                    onPress={() => handlePlayerPress(awards.bestAllRounder)}
                  >
                    <View style={styles.awardHeaderRow}>
                      <Text style={styles.awardIcon}>⚡</Text>
                      <View style={[styles.gradeTag, { backgroundColor: getGradeColor(awards.bestAllRounder.grade) }]}>
                        <Text style={styles.gradeTagText}>{awards.bestAllRounder.grade}</Text>
                      </View>
                    </View>
                    <Text style={[styles.awardRoleTitle, { color: '#7C3AED' }]}>
                      BEST ALL-ROUNDER
                    </Text>
                    <Text style={[styles.awardWinnerName, { color: colors.text }]} numberOfLines={1}>
                      {awards.bestAllRounder.name}
                    </Text>
                    <Text style={[styles.awardTeamName, { color: colors.subtext || '#94A3B8' }]} numberOfLines={1}>
                      {awards.bestAllRounder.teamName}
                    </Text>
                    <Text style={[styles.awardStatHighlight, { color: colors.text }]}>
                      {awards.bestAllRounder.runs} runs & {awards.bestAllRounder.wickets} wkts
                    </Text>
                    {Boolean(prizeDetails.bestAllRounderPrize) && (
                      <View style={styles.prizeBox}>
                        <Text style={styles.prizeText}>🎁 {prizeDetails.bestAllRounderPrize}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* 5. Best Fielder */}
                {awards.bestFielder && (
                  <TouchableOpacity
                    style={[styles.awardCard, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.12)' : '#FDF2F8', borderColor: '#EC4899' }]}
                    onPress={() => handlePlayerPress(awards.bestFielder)}
                  >
                    <View style={styles.awardHeaderRow}>
                      <Text style={styles.awardIcon}>🧤</Text>
                      <View style={[styles.gradeTag, { backgroundColor: getGradeColor(awards.bestFielder.grade) }]}>
                        <Text style={styles.gradeTagText}>{awards.bestFielder.grade}</Text>
                      </View>
                    </View>
                    <Text style={[styles.awardRoleTitle, { color: '#DB2777' }]}>
                      BEST FIELDER
                    </Text>
                    <Text style={[styles.awardWinnerName, { color: colors.text }]} numberOfLines={1}>
                      {awards.bestFielder.name}
                    </Text>
                    <Text style={[styles.awardTeamName, { color: colors.subtext || '#94A3B8' }]} numberOfLines={1}>
                      {awards.bestFielder.teamName}
                    </Text>
                    <Text style={[styles.awardStatHighlight, { color: colors.text }]}>
                      {awards.bestFielder.catches} catches • {awards.bestFielder.runOuts} run-outs
                    </Text>
                    {Boolean(prizeDetails.bestFielderPrize) && (
                      <View style={styles.prizeBox}>
                        <Text style={styles.prizeText}>🎁 {prizeDetails.bestFielderPrize}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category Leaderboards Tabs & List */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📊 Category Leaderboards
              </Text>

              {/* Tabs Strip */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsStrip}>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={`tab_${tab.key}`}
                      style={[
                        styles.tabBtn,
                        isActive
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                      onPress={() => setActiveTab(tab.key)}
                    >
                      <Text style={[styles.tabBtnText, { color: isActive ? '#FFFFFF' : colors.text }]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Leaderboard Rows */}
              <View style={[styles.leaderboardTableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {currentList.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <Feather name="bar-chart-2" size={24} color={colors.subtext || '#94A3B8'} />
                    <Text style={[styles.emptyStateText, { color: colors.subtext || '#94A3B8' }]}>
                      {activeTab === 'sr'
                        ? 'Minimum 10 balls faced required for Strike Rate leaderboard.'
                        : (activeTab === 'econ'
                          ? 'Minimum 6 legal balls bowled required for Economy leaderboard.'
                          : 'No player statistics recorded in this category yet.')}
                    </Text>
                  </View>
                ) : (
                  currentList.map((player, idx) => {
                    const rank = idx + 1;
                    const badge = getRankBadgeStyle(rank);

                    let statMain = '';
                    let statSub = '';

                    switch (activeTab) {
                      case 'runs':
                        statMain = `${player.runs} Runs`;
                        statSub = `${player.balls}b • SR: ${player.strikeRate}`;
                        break;
                      case 'wickets':
                        statMain = `${player.wickets} Wkts`;
                        statSub = `${player.overs} ov • Econ: ${player.economy}`;
                        break;
                      case 'sr':
                        statMain = `SR: ${player.strikeRate}`;
                        statSub = `${player.runs} runs (${player.balls} balls)`;
                        break;
                      case 'econ':
                        statMain = `Econ: ${player.economy}`;
                        statSub = `${player.wickets}w in ${player.overs} ov`;
                        break;
                      case 'sixes':
                        statMain = `${player.sixes} Sixes`;
                        statSub = `${player.runs} total runs`;
                        break;
                      case 'fours':
                        statMain = `${player.fours} Fours`;
                        statSub = `${player.runs} total runs`;
                        break;
                      case 'fielding':
                        statMain = `${player.fieldingDismissals} Dismissals`;
                        statSub = `${player.catches}c, ${player.runOuts}ro`;
                        break;
                    }

                    return (
                      <TouchableOpacity
                        key={`row_${player.id}_${idx}`}
                        style={[styles.leaderRow, { borderBottomColor: colors.border }]}
                        onPress={() => handlePlayerPress(player)}
                      >
                        <View style={[styles.rankCircle, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[styles.rankCircleText, { color: badge.text }]}>#{rank}</Text>
                        </View>

                        <View style={styles.playerInfoCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.rowPlayerName, { color: colors.text }]} numberOfLines={1}>
                              {player.name}
                            </Text>
                            <View style={[styles.rowGradeTag, { backgroundColor: getGradeColor(player.grade) }]}>
                              <Text style={styles.rowGradeText}>{player.grade}</Text>
                            </View>
                          </View>
                          <Text style={[styles.rowTeamName, { color: colors.subtext || '#94A3B8' }]} numberOfLines={1}>
                            {player.teamName}
                          </Text>
                        </View>

                        <View style={styles.statCol}>
                          <Text style={[styles.rowStatMain, { color: colors.text }]}>{statMain}</Text>
                          <Text style={[styles.rowStatSub, { color: colors.subtext || '#94A3B8' }]}>{statSub}</Text>
                        </View>

                        <Feather name="chevron-right" size={16} color={colors.subtext || '#94A3B8'} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          </ScrollView>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusTag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  podiumContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  podiumCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  podiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  podiumBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  podiumPlayerName: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  podiumTeamName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  podiumPoints: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  podiumMiniStat: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  awardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  awardCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  awardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  awardIcon: {
    fontSize: 20,
  },
  gradeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  awardRoleTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  awardWinnerName: {
    fontSize: 14,
    fontWeight: '800',
  },
  awardTeamName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  awardStatHighlight: {
    fontSize: 11,
    fontWeight: '700',
  },
  prizeBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  prizeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  tabsStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  leaderboardTableCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyStateBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  rankCircleText: {
    fontSize: 11,
    fontWeight: '900',
  },
  playerInfoCol: {
    flex: 1,
  },
  rowPlayerName: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6,
  },
  rowGradeTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rowGradeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  rowTeamName: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statCol: {
    alignItems: 'flex-end',
  },
  rowStatMain: {
    fontSize: 12,
    fontWeight: '800',
  },
  rowStatSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
