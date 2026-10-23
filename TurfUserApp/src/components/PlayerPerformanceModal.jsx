import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { CRICKET_LIGHT } from '../theme/cricketLight';
import { calculateMatchPerformances } from '../utils/cricketScorerEngine';

export default function PlayerPerformanceModal({
  visible,
  onClose,
  match,
}) {
  const C = CRICKET_LIGHT;
  const dark = false;

  if (!match) return null;

  const result = match.playerPerformances && match.playerPerformances.length > 0
    ? { performances: match.playerPerformances, awards: match.awards || {} }
    : calculateMatchPerformances(match);

  const { performances, awards } = result;

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+': return '#10B981';
      case 'A': return '#059669';
      case 'B+': return '#3B82F6';
      case 'B': return '#D97706';
      default: return '#64748B';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: C.bg }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: C.text }]}>Player Performances & Awards 🎖️</Text>
              <Text style={[styles.subtitle, { color: C.subtext }]}>
                {match.roundName || 'Match'} • Real ball-by-ball performance grades
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Awards Highlight Section */}
            <Text style={[styles.sectionHeading, { color: C.text }]}>Match Awards 🏆</Text>
            <View style={styles.awardsGrid}>
              {/* Player of the Match */}
              {awards?.playerOfTheMatch && (
                <View style={[styles.awardCard, { backgroundColor: dark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7', borderColor: '#D97706' }]}>
                  <Text style={styles.awardEmoji}>🎖️</Text>
                  <Text style={[styles.awardType, { color: dark ? '#FBBF24' : '#B45309' }]}>PLAYER OF THE MATCH</Text>
                  <Text style={[styles.awardWinner, { color: C.text }]} numberOfLines={1}>
                    {awards.playerOfTheMatch.name}
                  </Text>
                  <Text style={[styles.awardStats, { color: C.subtext }]}>
                    {awards.playerOfTheMatch.runs} runs ({awards.playerOfTheMatch.balls}b) • {awards.playerOfTheMatch.wickets} wkts
                  </Text>
                </View>
              )}

              {/* Best Batter */}
              {awards?.bestBatter && (
                <View style={[styles.awardCard, { backgroundColor: dark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: '#10B981' }]}>
                  <Text style={styles.awardEmoji}>🏏</Text>
                  <Text style={[styles.awardType, { color: '#10B981' }]}>BEST BATTER</Text>
                  <Text style={[styles.awardWinner, { color: C.text }]} numberOfLines={1}>
                    {awards.bestBatter.name}
                  </Text>
                  <Text style={[styles.awardStats, { color: C.subtext }]}>
                    {awards.bestBatter.runs} runs (SR: {awards.bestBatter.strikeRate})
                  </Text>
                </View>
              )}

              {/* Best Bowler */}
              {awards?.bestBowler && (
                <View style={[styles.awardCard, { backgroundColor: dark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF', borderColor: '#3B82F6' }]}>
                  <Text style={styles.awardEmoji}>🎯</Text>
                  <Text style={[styles.awardType, { color: '#3B82F6' }]}>BEST BOWLER</Text>
                  <Text style={[styles.awardWinner, { color: C.text }]} numberOfLines={1}>
                    {awards.bestBowler.name}
                  </Text>
                  <Text style={[styles.awardStats, { color: C.subtext }]}>
                    {awards.bestBowler.wickets} wkts • {awards.bestBowler.overs} ov • Econ: {awards.bestBowler.economy}
                  </Text>
                </View>
              )}
            </View>

            {/* Performance Grades Table */}
            <Text style={[styles.sectionHeading, { color: C.text, marginTop: 18 }]}>
              All Player Ratings & Stats
            </Text>

            {performances.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Feather name="activity" size={28} color={C.subtext} />
                <Text style={[styles.emptyText, { color: C.subtext }]}>
                  Ball-by-ball performances will appear here as the match progresses.
                </Text>
              </View>
            ) : (
              <View style={[styles.tableContainer, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={[styles.tableHeader, { borderBottomColor: C.border }]}>
                  <Text style={[styles.thPlayer, { color: C.subtext }]}>PLAYER</Text>
                  <Text style={[styles.thStat, { color: C.subtext }]}>BAT</Text>
                  <Text style={[styles.thStat, { color: C.subtext }]}>BOWL</Text>
                  <Text style={[styles.thGrade, { color: C.subtext }]}>GRADE</Text>
                </View>

                {performances.map((p, idx) => {
                  const gradeColor = getGradeColor(p.grade);
                  return (
                    <View key={`perf_${p.id || idx}`} style={[styles.tableRow, { borderBottomColor: C.border }]}>
                      <View style={styles.tdPlayer}>
                        <Text style={[styles.playerName, { color: C.text }]} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={[styles.playerTeam, { color: C.subtext }]} numberOfLines={1}>
                          {p.teamName || 'Team'}
                        </Text>
                      </View>

                      {/* Bat stats */}
                      <View style={styles.tdStat}>
                        <Text style={[styles.statMajor, { color: C.text }]}>{p.runs} ({p.balls})</Text>
                        <Text style={[styles.statMinor, { color: C.subtext }]}>SR: {p.strikeRate}</Text>
                      </View>

                      {/* Bowl stats */}
                      <View style={styles.tdStat}>
                        <Text style={[styles.statMajor, { color: C.text }]}>{p.wickets}w ({p.overs}o)</Text>
                        <Text style={[styles.statMinor, { color: C.subtext }]}>Econ: {p.economy}</Text>
                      </View>

                      {/* Grade Badge */}
                      <View style={styles.tdGrade}>
                        <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
                          <Text style={styles.gradeText}>{p.grade}</Text>
                        </View>
                        <Text style={[styles.pointsText, { color: C.subtext }]}>
                          {p.impactPoints} pts
                        </Text>
                      </View>
                    </View>
                  );
                })}
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
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
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  awardsGrid: {
    gap: 8,
  },
  awardCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  awardEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  awardType: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  awardWinner: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  awardStats: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  tableContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  thPlayer: {
    flex: 1.6,
    fontSize: 10,
    fontWeight: '800',
  },
  thStat: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  thGrade: {
    flex: 0.8,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tdPlayer: {
    flex: 1.6,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '800',
  },
  playerTeam: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tdStat: {
    flex: 1,
    alignItems: 'center',
  },
  statMajor: {
    fontSize: 12,
    fontWeight: '700',
  },
  statMinor: {
    fontSize: 10,
    fontWeight: '500',
  },
  tdGrade: {
    flex: 0.8,
    alignItems: 'center',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  pointsText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
});
