import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { matchStorage } from '../utils/matchStorage';
import { SPACING, RADIUS, SHADOW } from '../utils/theme';

const SPORT_ICONS = {
  Cricket: 'cricket',
  Football: 'dribbble', // fallback icon
  Badminton: 'activity',
  Basketball: 'disc',
  Volleyball: 'circle',
  Tennis: 'globe',
};

function getSportEmoji(sport = '') {
  const s = String(sport).toLowerCase();
  if (s.includes('cricket')) return '🏏';
  if (s.includes('football')) return '⚽';
  if (s.includes('badminton')) return '🏸';
  if (s.includes('basketball')) return '🏀';
  if (s.includes('volleyball')) return '🏐';
  if (s.includes('tennis')) return '🎾';
  return '🏆';
}

function getScoreSummary(match) {
  if (!match) return '';
  const sport = (match.sport || '').toLowerCase();

  if (sport.includes('cricket')) {
    const inn0 = match.innings?.[0];
    const inn1 = match.innings?.[1];
    if (inn0) {
      const s0 = `${inn0.totalRuns || 0}/${inn0.wickets || 0}`;
      const s1 = inn1 ? `${inn1.totalRuns || 0}/${inn1.wickets || 0}` : null;
      return s1 ? `${s0} vs ${s1}` : s0;
    }
  }

  if (sport.includes('football') && match.football) {
    const sA = match.football.scores?.A ?? match.football.scoreA ?? 0;
    const sB = match.football.scores?.B ?? match.football.scoreB ?? 0;
    return `${sA} - ${sB}`;
  }

  if (sport.includes('badminton') && match.badminton) {
    const gA = match.badminton.gamesA ?? 0;
    const gB = match.badminton.gamesB ?? 0;
    return `${gA} - ${gB} Sets`;
  }

  if (sport.includes('volleyball') && match.volleyball) {
    const sA = match.volleyball.setsA ?? 0;
    const sB = match.volleyball.setsB ?? 0;
    return `${sA} - ${sB} Sets`;
  }

  if (sport.includes('basketball') && match.basketball) {
    const sA = match.basketball.scoreA ?? 0;
    const sB = match.basketball.scoreB ?? 0;
    return `${sA} - ${sB}`;
  }

  if (sport.includes('tennis') && match.tennis) {
    const sA = match.tennis.setsA ?? 0;
    const sB = match.tennis.setsB ?? 0;
    return `${sA} - ${sB} Sets`;
  }

  return match.resultText || match.result || '';
}

export default function MatchHistoryScreen({ navigation }) {
  const { C, dark } = useTheme();
  const [filter, setFilter] = useState('all'); // 'all' | 'live' | 'completed'
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = async (filterType = filter) => {
    try {
      const list = await matchStorage.getMyMatches(filterType === 'all' ? null : filterType);
      setMatches(list || []);
    } catch (err) {
      console.warn('Failed to load past matches:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMatches(filter);
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches(filter);
  };

  const handleSelectFilter = (newFilter) => {
    setFilter(newFilter);
    setLoading(true);
    loadMatches(newFilter);
  };

  const handleCardPress = (item) => {
    if (!item || !item.id) return;
    const statusLower = (item.status || '').toLowerCase();
    const isCompleted = statusLower === 'completed';

    if (isCompleted) {
      // Completed match: READ-ONLY Past Match Details (NO resume, NO scoring controls)
      navigation.navigate('PastMatchDetails', { matchId: item.id, matchData: item });
    } else if (statusLower === 'live' || statusLower === 'toss') {
      // Live / Active match: RESUME the SAME match via existing matchId on live scoring screen
      const sport = (item.sport || '').toLowerCase();

      let routeName = 'Scorecard';
      if (sport.includes('football')) routeName = 'FootballScorecard';
      else if (sport.includes('badminton')) routeName = 'BadmintonScorecard';
      else if (sport.includes('volleyball')) routeName = 'VolleyballScorecard';
      else if (sport.includes('basketball')) routeName = 'BasketballScorecard';
      else if (sport.includes('tennis')) routeName = 'TennisScorecard';

      navigation.navigate(routeName, { matchId: item.id });
    } else {
      // Created / Upcoming match: Go to Match room screen to start Toss & Setup
      navigation.navigate('Match', { matchId: item.id });
    }
  };

  const renderMatchCard = ({ item }) => {
    const teamAName = item.teams?.A?.name || item.teams?.teamA?.name || 'Team A';
    const teamBName = item.teams?.B?.name || item.teams?.teamB?.name || 'Team B';
    const scoreStr = getScoreSummary(item);
    const emoji = getSportEmoji(item.sport);
    const resultMsg = item.resultText || item.result || '';
    const statusLower = (item.status || 'completed').toLowerCase();
    const isCompleted = statusLower === 'completed';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: C.card, borderColor: C.border },
          SHADOW.card,
        ]}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.88}
      >
        {/* Card Header: Sport & Status */}
        <View style={styles.cardHeader}>
          <View style={[styles.sportBadge, { backgroundColor: C.primaryLight }]}>
            <Text style={styles.sportEmoji}>{emoji}</Text>
            <Text style={[styles.sportName, { color: C.primary }]}>
              {item.sport || 'Sport'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isCompleted
                  ? 'rgba(12, 176, 83, 0.12)'
                  : statusLower === 'live'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isCompleted
                    ? '#0CB053'
                    : statusLower === 'live'
                    ? '#EF4444'
                    : '#3B82F6',
                },
              ]}
            >
              {statusLower.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Venue & Date info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={13} color={C.subtext} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: C.subtext }]} numberOfLines={1}>
              {item.place || 'Turf Arena'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={13} color={C.subtext} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: C.subtext }]}>
              {item.date || item.matchDate || 'Today'}
            </Text>
          </View>
        </View>

        {/* Teams & Score Row */}
        <View style={[styles.teamsRow, { backgroundColor: C.bgSoft || '#F8FAFC' }]}>
          <View style={styles.teamBox}>
            <Text style={[styles.teamName, { color: C.text }]} numberOfLines={1}>
              {teamAName}
            </Text>
          </View>

          <View style={styles.versusBox}>
            <Text style={[styles.vsText, { color: C.primary }]}>VS</Text>
          </View>

          <View style={styles.teamBoxRight}>
            <Text style={[styles.teamName, { color: C.text }]} numberOfLines={1}>
              {teamBName}
            </Text>
          </View>
        </View>

        {/* Score Summary & Result Banner */}
        {!!scoreStr && (
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, { color: C.subtext }]}>Score: </Text>
            <Text style={[styles.scoreValue, { color: C.text }]}>{scoreStr}</Text>
          </View>
        )}

        {!!resultMsg && (
          <View style={[styles.resultBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="trophy-outline" size={15} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={[styles.resultMsgText, { color: '#B45309' }]} numberOfLines={1}>
              {resultMsg}
            </Text>
          </View>
        )}

        {/* Footer Chevron */}
        <View style={styles.cardFooter}>
          <Text style={[styles.viewDetailsTxt, { color: isCompleted ? C.primary : '#EF4444' }]}>
            {isCompleted ? 'View Match Details' : '⚡ Resume Live Match'}
          </Text>
          <Feather name="chevron-right" size={16} color={isCompleted ? C.primary : '#EF4444'} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Match History</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateMatch')}
          style={[styles.createBtn, { backgroundColor: C.primary }]}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All Matches' },
          { key: 'live', label: 'Live / Active' },
          { key: 'completed', label: 'Past Matches' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              { backgroundColor: filter === tab.key ? C.primary : C.card, borderColor: C.border },
            ]}
            onPress={() => handleSelectFilter(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === tab.key ? '#FFFFFF' : C.text },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content List */}
      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.loadingTxt, { color: C.subtext }]}>Loading matches...</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderMatchCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: C.primaryLight }]}>
                <Feather name="award" size={40} color={C.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text }]}>No Matches Found</Text>
              <Text style={[styles.emptySub, { color: C.subtext }]}>
                {filter === 'completed'
                  ? 'Played community matches will be permanently recorded here with complete scorecards.'
                  : 'No matches found under this filter.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: C.primary }]}
                onPress={() => navigation.navigate('CreateMatch')}
                activeOpacity={0.85}
              >
                <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionTxt}>Create New Match</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  createBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 6,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sportEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  sportName: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },

  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  teamBox: {
    flex: 1,
  },
  teamBoxRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '800',
  },
  versusBox: {
    paddingHorizontal: 10,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '900',
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '800',
  },

  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  resultMsgText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  viewDetailsTxt: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingTxt: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyActionTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
