import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import { getTournamentByIdApi, publishTournamentApi } from '../api/tournaments';

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

const TournamentDetailScreen = ({ route, navigation }) => {
  const { tournamentId } = route.params || {};
  const { colors, isDark } = useTheme();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Tournament Details',
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
      headerRight: () =>
        tournament ? (
          <TouchableOpacity
            style={styles.headerEditBtn}
            onPress={() => navigation.navigate('EditTournament', { tournamentId: tournament.id })}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={17} color={colors.primary} />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, colors, tournament]);

  const loadDetails = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await getTournamentByIdApi(tournamentId);
      const data = res?.data?.tournament || res?.tournament;
      if (data) {
        setTournament(data);
      }
    } catch (err) {
      console.error('Failed to fetch tournament detail:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tournamentId]);

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [loadDetails])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDetails();
  };

  const handlePublish = async () => {
    Alert.alert(
      'Publish Tournament',
      'Publishing will generate a shareable tournament link allowing players and teams to view this tournament and turf details. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'default',
          onPress: async () => {
            setPublishing(true);
            try {
              const res = await publishTournamentApi(tournamentId);
              const updated = res?.data?.tournament || res?.tournament;
              if (updated) {
                setTournament(updated);
                Alert.alert(
                  'Tournament Published! 🎉',
                  'Your tournament is now live and published! You can now share the link with teams and players.',
                  [
                    {
                      text: 'Share Now',
                      onPress: () => handleShare(updated),
                    },
                    { text: 'OK' },
                  ]
                );
              }
            } catch (err) {
              console.error('Failed to publish tournament:', err);
              Alert.alert('Publish Failed', err.message || 'An error occurred while publishing.');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async (data = tournament) => {
    if (!data) return;
    const turfName = data.turfName || data.turf?.name || 'our turf arena';
    const shareUrl =
      data.shareableUrl ||
      `https://turfbookingapp.com/tournament/${data.shareableIdentifier}?turfId=${data.turfId}`;

    const message = `🏆 Join the "${data.name}" (${data.sport}) Tournament at ${turfName}!\n\n📅 Dates: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}\n👥 Teams: ${data.numberOfTeams} | Players: ${data.playersPerTeam} per team\n\nView details & register here: ${shareUrl}`;

    try {
      await Share.share({
        title: data.name,
        message,
        url: shareUrl,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleCopyLink = () => {
    if (!tournament) return;
    const shareUrl =
      tournament.shareableUrl ||
      `https://turfbookingapp.com/tournament/${tournament.shareableIdentifier}?turfId=${tournament.turfId}`;

    if (Clipboard && Clipboard.setString) {
      Clipboard.setString(shareUrl);
      Alert.alert('Copied to Clipboard', 'Tournament shareable link copied successfully.');
    } else {
      Alert.alert('Tournament Link', shareUrl);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
          Loading tournament details...
        </Text>
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Tournament Not Found</Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPublished = tournament.status === 'published';
  const isCricket = (tournament.sport || '').toLowerCase().includes('cricket');
  const turfName = tournament.turfName || tournament.turf?.name || 'Partner Facility';
  const turfCity = tournament.turf?.city || tournament.turf?.address || 'Tamil Nadu';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Status Header Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.sportTag, { backgroundColor: colors.primaryLight }]}>
              <Feather name="award" size={13} color={colors.primary} />
              <Text style={[styles.sportTagText, { color: colors.primary }]}>
                {tournament.sport ? tournament.sport.toUpperCase() : 'TOURNAMENT'}
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
                  borderColor: isPublished ? '#10B981' : '#F59E0B',
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
                  styles.statusBadgeText,
                  { color: isPublished ? '#10B981' : '#D97706' },
                ]}
              >
                {isPublished ? 'Published' : 'Draft'}
              </Text>
            </View>
          </View>

          <Text style={[styles.tournamentTitle, { color: colors.text }]}>{tournament.name}</Text>

          {/* Turf Host Card */}
          <View
            style={[
              styles.turfInfoRow,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.turfIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Feather name="map-pin" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.turfTitle, { color: colors.text }]} numberOfLines={1}>
                {turfName}
              </Text>
              <Text style={[styles.turfSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {turfCity}
              </Text>
            </View>
            <View style={[styles.turfPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.turfPillText, { color: colors.primary }]}>Host Turf</Text>
            </View>
          </View>
        </View>

        {/* Shareable Link Box (When Published) */}
        {isPublished && (
          <View
            style={[
              styles.shareCard,
              {
                backgroundColor: isDark ? '#11221F' : '#F0FDF4',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#BBF7D0',
              },
              SHADOWS.sm,
            ]}
          >
            <View style={styles.shareHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="share-2" size={16} color={colors.primary} />
                <Text style={[styles.shareHeaderTitle, { color: colors.text }]}>
                  Shareable Tournament Link
                </Text>
              </View>
              <TouchableOpacity onPress={handleCopyLink} activeOpacity={0.7}>
                <Text style={[styles.copyBtnText, { color: colors.primary }]}>Copy Link</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.shareSub, { color: colors.textSecondary }]}>
              Players can open this link to view tournament details and explore {turfName}.
            </Text>

            <View style={[styles.linkBox, { backgroundColor: isDark ? '#0B1715' : '#FFFFFF', borderColor: colors.border }]}>
              <Text style={[styles.linkText, { color: colors.text }]} numberOfLines={1}>
                {tournament.shareableUrl}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.shareActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleShare()}
              activeOpacity={0.85}
            >
              <Feather name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.shareActionBtnText}>Share Tournament</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule & Dates Card */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Schedule</Text>

          <View style={styles.scheduleRow}>
            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>START DATE</Text>
              <View style={styles.dateValueRow}>
                <Feather name="calendar" size={14} color={colors.primary} />
                <Text style={[styles.dateValue, { color: colors.text }]}>
                  {formatDate(tournament.startDate)}
                </Text>
              </View>
            </View>

            <View style={[styles.scheduleDivider, { backgroundColor: colors.border }]} />

            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>END DATE</Text>
              <View style={styles.dateValueRow}>
                <Feather name="calendar" size={14} color={colors.primary} />
                <Text style={[styles.dateValue, { color: colors.text }]}>
                  {formatDate(tournament.endDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tournament Structure & Rules Card */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Structure & Rules</Text>

          <View style={styles.statsGrid}>
            {/* Number of Teams */}
            <View
              style={[
                styles.statItem,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: colors.border },
              ]}
            >
              <View style={[styles.statIconBox, { backgroundColor: colors.primaryLight }]}>
                <Feather name="users" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {tournament.numberOfTeams}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Teams</Text>
            </View>

            {/* Players per Team */}
            <View
              style={[
                styles.statItem,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: colors.border },
              ]}
            >
              <View style={[styles.statIconBox, { backgroundColor: colors.primaryLight }]}>
                <Feather name="user" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {tournament.playersPerTeam}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Players / Team</Text>
            </View>

            {/* Cricket Overs (When applicable) */}
            {isCricket && (
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: colors.border },
                ]}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="clock" size={16} color="#D97706" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {tournament.oversPerTeam || 'N/A'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overs / Team</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: colors.primary }]}
            onPress={() => navigation.navigate('EditTournament', { tournamentId: tournament.id })}
            activeOpacity={0.8}
          >
            <Feather name="edit" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Details</Text>
          </TouchableOpacity>

          {!isPublished ? (
            <TouchableOpacity
              style={[styles.publishActionBtn, { backgroundColor: colors.primary }]}
              onPress={handlePublish}
              disabled={publishing}
              activeOpacity={0.85}
            >
              {publishing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="upload-cloud" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.publishActionBtnText}>Publish Tournament</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.publishActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleShare()}
              activeOpacity={0.85}
            >
              <Feather name="share-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.publishActionBtnText}>Share</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingSub: {
    marginTop: 12,
    fontSize: SIZES.sm,
  },
  errorTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerEditBtn: {
    padding: 8,
    marginRight: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    padding: 16,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  sportTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tournamentTitle: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  turfInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  turfIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turfTitle: {
    fontSize: SIZES.sm + 1,
    fontWeight: '700',
  },
  turfSubtitle: {
    fontSize: SIZES.xs,
    marginTop: 1,
  },
  turfPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  turfPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  shareCard: {
    padding: 16,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  shareHeaderTitle: {
    fontSize: SIZES.sm + 1,
    fontWeight: '800',
  },
  copyBtnText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '800',
  },
  shareSub: {
    fontSize: SIZES.xs,
    lineHeight: 16,
    marginBottom: 10,
  },
  linkBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkText: {
    fontSize: SIZES.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  shareActionBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  detailCard: {
    padding: 16,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
  },
  cardSectionTitle: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleCol: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateValue: {
    fontSize: SIZES.sm + 1,
    fontWeight: '700',
  },
  scheduleDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: SIZES.lg,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  editBtnText: {
    fontSize: SIZES.sm + 1,
    fontWeight: '700',
  },
  publishActionBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  publishActionBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm + 1,
    fontWeight: '700',
  },
});

export default TournamentDetailScreen;
