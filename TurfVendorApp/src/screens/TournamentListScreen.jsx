import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import { getTournamentsApi } from '../api/tournaments';

const SPORT_COLORS = {
  cricket: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  football: { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
  badminton: { bg: '#E0E7FF', text: '#4F46E5', border: '#C7D2FE' },
  tennis: { bg: '#FCE7F3', text: '#DB2777', border: '#FBCFE8' },
  basketball: { bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA' },
  volleyball: { bg: '#F3E8FF', text: '#9333EA', border: '#E9D5FF' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[monthIndex]} ${day}, ${year}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

const TournamentListScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { activeTurfId, turfs } = useSelector((s) => s.vendor);
  const activeTurf = (Array.isArray(turfs) ? turfs : []).find(
    (t) => (t._id || t.id) === activeTurfId
  ) || (turfs && turfs[0]) || null;

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'turf_hosted' | 'user_created' | 'draft'

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Tournaments',
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border || 'transparent',
      },
      headerTintColor: colors.text,
      headerTitleStyle: {
        color: colors.text,
        fontWeight: '700',
      },
      headerRight: () => (
        <TouchableOpacity
          style={[styles.headerAddBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CreateTournament')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.headerAddText}>Create</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors]);

  const loadTournaments = useCallback(async () => {
    try {
      const res = await getTournamentsApi(activeTurfId);
      const list = res?.data?.tournaments || res?.tournaments || [];
      setTournaments(list);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTurfId]);

  useFocusEffect(
    useCallback(() => {
      loadTournaments();
    }, [loadTournaments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTournaments();
  };

  const filteredTournaments = tournaments.filter((t) => {
    const isUser = t.creatorType === 'USER' || t.source === 'USER CREATED';
    if (filter === 'turf_hosted') return !isUser;
    if (filter === 'user_created') return isUser;
    if (filter === 'draft') return t.status === 'draft';
    return true;
  });

  const renderTournamentItem = ({ item }) => {
    const sportLower = (item.sport || '').toLowerCase();
    const sportTheme =
      SPORT_COLORS[sportLower] || {
        bg: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
        text: colors.text,
        border: colors.border,
      };

    const isPublished = item.status === 'published';
    const isUserCreated = item.creatorType === 'USER' || item.source === 'USER CREATED';

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          {
            backgroundColor: colors.card,
            borderColor: isUserCreated
              ? (isDark ? 'rgba(139, 92, 246, 0.4)' : '#DDD6FE')
              : colors.border,
          },
          SHADOWS.sm,
        ]}
        onPress={() => navigation.navigate('TournamentDetail', { tournamentId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {/* Source Badge */}
            <View
              style={[
                styles.sourceTag,
                {
                  backgroundColor: isUserCreated
                    ? (isDark ? 'rgba(124, 58, 237, 0.25)' : '#EDE9FE')
                    : (isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7'),
                  borderColor: isUserCreated ? '#A78BFA' : '#86EFAC',
                },
              ]}
            >
              <Text
                style={[
                  styles.sourceTagText,
                  { color: isUserCreated ? '#7C3AED' : '#0F766E' },
                ]}
              >
                {isUserCreated ? 'USER CREATED' : 'TURF HOSTED'}
              </Text>
            </View>

            <View
              style={[
                styles.sportBadge,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : sportTheme.bg,
                  borderColor: isDark ? colors.border : sportTheme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.sportText,
                  { color: isDark ? colors.primary : sportTheme.text },
                ]}
              >
                {item.sport ? item.sport.toUpperCase() : 'SPORTS'}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isPublished
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.15)'
                      : '#DCFCE7'
                    : isDark
                    ? 'rgba(245, 158, 11, 0.15)'
                    : '#FEF3C7',
                  borderColor: isPublished
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.4)'
                      : '#86EFAC'
                    : isDark
                    ? 'rgba(245, 158, 11, 0.4)'
                    : '#FDE68A',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isPublished ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isPublished ? '#10B981' : '#D97706' },
                ]}
              >
                {isPublished ? 'Published' : 'Draft'}
              </Text>
            </View>
          </View>

          <Feather name="chevron-right" size={18} color={colors.textLight} />
        </View>

        <Text style={[styles.tournamentName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>

        {isUserCreated && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Feather name="user" size={12} color="#8B5CF6" style={{ marginRight: 5 }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Created by <Text style={{ fontWeight: '700', color: colors.text }}>{item.creatorName || item.creator || 'Community Member'}</Text>
            </Text>
          </View>
        )}

        {item.turfName || activeTurf?.name ? (
          <View style={styles.turfNameRow}>
            <Feather name="map-pin" size={13} color={colors.textSecondary} />
            <Text style={[styles.turfNameText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.turfName || activeTurf?.name}
            </Text>
          </View>
        ) : null}

        <View style={styles.dateRow}>
          <Feather name="calendar" size={13} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        <View style={styles.tagsRow}>
          <View style={[styles.metricTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
            <Feather name="users" size={12} color={colors.primary} />
            <Text style={[styles.metricTagText, { color: colors.text }]}>
              {item.numberOfTeams} Teams
            </Text>
          </View>

          <View style={[styles.metricTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
            <Feather name="user" size={12} color={colors.primary} />
            <Text style={[styles.metricTagText, { color: colors.text }]}>
              {item.playersPerTeam} Players/Team
            </Text>
          </View>

          {item.oversPerTeam ? (
            <View style={[styles.metricTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
              <Feather name="clock" size={12} color="#F59E0B" />
              <Text style={[styles.metricTagText, { color: colors.text }]}>
                {item.oversPerTeam} Overs
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Active Turf Context Bar */}
      {activeTurf && (
        <View style={[styles.turfContextBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.turfContextLeft}>
            <Feather name="shield" size={15} color={colors.primary} />
            <Text style={[styles.turfContextName, { color: colors.text }]} numberOfLines={1}>
              {activeTurf.name}
            </Text>
          </View>
          <View style={[styles.turfPill, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.turfPillText, { color: colors.primary }]}>Active Turf</Text>
          </View>
        </View>
      )}

      {/* Tabs Filter Bar */}
      <View style={styles.filterBar}>
        {[
          { key: 'all', label: 'All' },
          { key: 'turf_hosted', label: 'Turf Hosted' },
          { key: 'user_created', label: 'User Created' },
          { key: 'draft', label: 'Draft' },
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                isActive && [styles.filterTabActive, { backgroundColor: colors.primary }],
                !isActive && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isActive ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading tournaments...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTournaments}
          keyExtractor={(item) => item.id}
          renderItem={renderTournamentItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Feather name="award" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {filter === 'all'
                  ? 'No Tournaments Created'
                  : `No ${filter === 'published' ? 'Published' : 'Draft'} Tournaments`}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {filter === 'all'
                  ? 'Create your first tournament to start organizing matches and sharing with teams.'
                  : `You currently have no ${filter} tournaments for this turf.`}
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateTournament')}
                activeOpacity={0.85}
              >
                <Feather name="plus-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.emptyActionText}>Create Tournament</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    gap: 4,
  },
  headerAddText: {
    color: '#FFFFFF',
    fontSize: SIZES.xs + 1,
    fontWeight: '700',
  },
  turfContextBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  turfContextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  turfContextName: {
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  turfPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  turfPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  filterTabActive: {},
  filterTabText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  itemCard: {
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sportText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tournamentName: {
    fontSize: SIZES.base + 1,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  turfNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  turfNameText: {
    fontSize: SIZES.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  metricTagText: {
    fontSize: SIZES.xs - 1,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: SIZES.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: SIZES.md,
    fontWeight: '700',
  },
});

export default TournamentListScreen;
