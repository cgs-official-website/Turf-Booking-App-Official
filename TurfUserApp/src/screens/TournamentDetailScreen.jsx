import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { SPACING, RADIUS, SHADOW, FONT } from '../utils/theme';
import {
  getTournamentByIdApi,
  publishTournamentApi,
  cancelTournamentApi,
<<<<<<< HEAD
  getMyTournamentRegistrationApi,
=======
  updateTournamentTeamsApi,
>>>>>>> 4d1ada6 (Describe your changes)
} from '../api/tournaments';

const DEFAULT_SPORT_IMAGES = {
  Cricket: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
  Football: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
  Badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
  Tennis: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800',
  Basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
  Volleyball: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
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

export default function TournamentDetailScreen({ route, navigation }) {
  const { tournamentId, tournament: initialTournament } = route.params || {};
  const { C, dark } = useTheme();
  const { user } = useSelector((s) => s.auth);

  const [tournament, setTournament] = useState(initialTournament || null);
  const [loading, setLoading] = useState(!initialTournament);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Team & Player Management Modal State
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [playerPhoneInput, setPlayerPhoneInput] = useState('');
  const [savingTeams, setSavingTeams] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await getTournamentByIdApi(tournamentId);
      const data = res?.tournament || res?.data?.tournament;
      if (data) {
        setTournament(data);
      }
    } catch (err) {
      console.warn('Failed to load tournament detail:', err.message);
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

  const isCricket = String(tournament?.sport || '').toLowerCase().includes('cricket');
  const isCommunity =
    tournament?.creatorType === 'USER' ||
    tournament?.source === 'COMMUNITY' ||
    Boolean(tournament?.userId);

  const isOwner =
    tournament?.isOwner ||
    (Boolean(user?.id) && Boolean(tournament?.userId) && tournament?.userId === user?.id);

  const isPublished = tournament?.status === 'published';
  const isDraft = tournament?.status === 'draft';
  const isCancelled = tournament?.status === 'cancelled';

  const totalTeams = tournament?.numberOfTeams || tournament?.totalTeams || tournament?.participantCapacity || 16;
  const acceptedTeamsCount = tournament?.acceptedTeamsCount !== undefined ? Number(tournament.acceptedTeamsCount) : 0;
  const remainingSlots = tournament?.remainingSlots !== undefined
    ? Number(tournament.remainingSlots)
    : Math.max(0, totalTeams - acceptedTeamsCount);
  const isFull = tournament?.isFull || remainingSlots <= 0;

  const lifecycleStatus = tournament?.lifecycleStatus || (
    isCancelled ? 'cancelled' :
    isFull ? 'full' :
    isPublished ? 'published' : 'draft'
  );

  const myRegistration = tournament?.myRegistration || null;

  const bannerImg =
    tournament?.bannerUrl ||
    tournament?.turf?.images?.[0] ||
    DEFAULT_SPORT_IMAGES[tournament?.sport] ||
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800';

  const hostTurfName = tournament?.turf?.name || tournament?.turfName || 'Selected Host Turf';
  const turfLocation =
    tournament?.turf?.city ||
    tournament?.turf?.location?.city ||
    tournament?.turf?.address ||
    tournament?.city ||
    'Host Facility';

  const shareUrl =
    tournament?.shareableUrl ||
    `https://turfbookingapp.com/tournament/${tournament?.shareableIdentifier || tournament?.id}`;

  const handleShare = async () => {
    if (!tournament) return;
    const message = `🏆 Join "${tournament.name}" (${tournament.sport}) hosted at ${hostTurfName}!\n\n📅 Dates: ${formatDate(tournament.startDate)} to ${formatDate(tournament.endDate)}\n👥 Format: ${tournament.numberOfTeams} Teams (${tournament.playersPerTeam} players/team)${isCricket && tournament.oversPerTeam ? `\n🏏 Overs: ${tournament.oversPerTeam}` : ''}\n\nView details & follow updates:\n${shareUrl}`;

    try {
      await Share.share({
        title: tournament.name,
        message,
        url: shareUrl,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    if (Clipboard && Clipboard.setString) {
      Clipboard.setString(shareUrl);
      Alert.alert('Link Copied 📋', 'Tournament shareable link copied to clipboard.');
    } else {
      Alert.alert('Tournament Link', shareUrl);
    }
  };

  const handlePublish = async () => {
    Alert.alert(
      'Publish Tournament',
      'Publishing will make this tournament visible to players and teams with a shareable public link. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await publishTournamentApi(tournament.id);
              const updated = res?.tournament || res?.data?.tournament;
              if (updated) {
                setTournament(updated);
                Alert.alert(
                  'Tournament Published! 🎉',
                  'Your tournament is now live and published! You can now share the link with teams and players.',
                  [
                    { text: 'Share Now', onPress: handleShare },
                    { text: 'OK' },
                  ]
                );
              }
            } catch (err) {
              Alert.alert('Publish Failed', err.message || 'Unable to publish tournament.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelTournament = async () => {
    Alert.alert(
      'Cancel Tournament',
      'Are you sure you want to cancel this tournament? This will mark the tournament as cancelled.',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel Tournament',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await cancelTournamentApi(tournament.id);
              const updated = res?.tournament || res?.data?.tournament;
              if (updated) {
                setTournament(updated);
                Alert.alert('Tournament Cancelled', 'The tournament has been marked as cancelled.');
              }
            } catch (err) {
              Alert.alert('Cancel Failed', err.message || 'Unable to cancel tournament.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open Add Player Modal
  const handleOpenAddPlayer = (teamId) => {
    setSelectedTeamId(teamId);
    setPlayerNameInput('');
    setPlayerPhoneInput('');
    setPlayerModalVisible(true);
  };

  // Save Player to Team
  const handleSavePlayer = async () => {
    if (!playerNameInput.trim()) {
      Alert.alert('Required', 'Please enter player name.');
      return;
    }

    const currentTeams = Array.isArray(tournament?.teams) ? [...tournament.teams] : [];
    const teamIndex = currentTeams.findIndex((t) => t.id === selectedTeamId);
    if (teamIndex === -1) return;

    const maxCap = tournament.playersPerTeam || 11;
    const team = currentTeams[teamIndex];
    const existingPlayers = Array.isArray(team.players) ? team.players : [];

    if (existingPlayers.length >= maxCap) {
      Alert.alert(
        'Capacity Reached',
        `This team is at maximum capacity (${maxCap} players). Cannot add more players.`
      );
      return;
    }

    const newPlayer = {
      id: `p_${Date.now()}`,
      name: playerNameInput.trim(),
      phone: playerPhoneInput.trim() || undefined,
      isInvited: true,
      invitedAt: new Date().toISOString(),
    };

    const updatedTeam = {
      ...team,
      players: [...existingPlayers, newPlayer],
    };
    currentTeams[teamIndex] = updatedTeam;

    setSavingTeams(true);
    try {
      await updateTournamentTeamsApi(tournament.id, currentTeams);
      setTournament((prev) => ({ ...prev, teams: currentTeams }));
      setPlayerModalVisible(false);
      Alert.alert('Player Added', `${newPlayer.name} has been added to ${team.name}.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update team roster.');
    } finally {
      setSavingTeams(false);
    }
  };

  // Remove Player from Team
  const handleRemovePlayer = (teamId, playerId, playerName) => {
    Alert.alert(
      'Remove Player',
      `Remove ${playerName} from this team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const currentTeams = Array.isArray(tournament?.teams) ? [...tournament.teams] : [];
            const teamIndex = currentTeams.findIndex((t) => t.id === teamId);
            if (teamIndex === -1) return;

            const team = currentTeams[teamIndex];
            const updatedPlayers = (team.players || []).filter((p) => p.id !== playerId);
            currentTeams[teamIndex] = { ...team, players: updatedPlayers };

            setSavingTeams(true);
            try {
              await updateTournamentTeamsApi(tournament.id, currentTeams);
              setTournament((prev) => ({ ...prev, teams: currentTeams }));
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to remove player.');
            } finally {
              setSavingTeams(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerBox, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.subtext }]}>Loading tournament details...</Text>
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={[styles.centerBox, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={42} color={C.error} />
        <Text style={[styles.errorTitle, { color: C.text }]}>Tournament Not Found</Text>
        <TouchableOpacity
          style={[styles.backBtnPill, { backgroundColor: C.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const teamsList = Array.isArray(tournament.teams) && tournament.teams.length > 0
    ? tournament.teams
    : Array.from({ length: tournament.numberOfTeams || 2 }, (_, idx) => ({
        id: `team_${idx + 1}`,
        name: `Team ${idx + 1}`,
        players: [],
      }));

  const maxPlayersPerTeam = tournament.playersPerTeam || 11;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Top Header Bar ── */}
      <View style={[styles.headerRow, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
            {tournament.name}
          </Text>
          <Text style={[styles.headerSub, { color: C.subtext }]}>
            {isCommunity ? 'User Created Tournament' : 'Turf Hosted Tournament'}
          </Text>
        </View>

        {/* Share Header Action */}
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="share-2" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* ── Hero Banner ── */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: bannerImg }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroGradient} />

          {/* Badges on Hero */}
          <View style={styles.heroBadgesRow}>
            {/* Source Badge */}
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor: '#0F766E',
                },
              ]}
            >
              <Ionicons
                name={isCommunity ? 'people' : 'shield-checkmark'}
                size={13}
                color="#FFFFFF"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.sourceBadgeText}>
                {isCommunity ? (isOwner ? 'MY TOURNAMENT • USER CREATED' : 'USER CREATED') : 'TURF HOSTED'}
              </Text>
            </View>

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    lifecycleStatus === 'published'
                      ? '#10B981'
                      : lifecycleStatus === 'full'
                      ? '#F59E0B'
                      : lifecycleStatus === 'ongoing'
                      ? '#0284C7'
                      : lifecycleStatus === 'completed'
                      ? '#64748B'
                      : lifecycleStatus === 'draft'
                      ? '#F59E0B'
                      : '#EF4444',
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {lifecycleStatus === 'published'
                  ? `REGISTRATION OPEN • ${remainingSlots} SLOTS LEFT`
                  : lifecycleStatus === 'full'
                  ? `FULL • ${acceptedTeamsCount}/${totalTeams} TEAMS`
                  : lifecycleStatus === 'ongoing'
                  ? 'ONGOING'
                  : lifecycleStatus === 'completed'
                  ? 'COMPLETED'
                  : lifecycleStatus === 'draft'
                  ? 'DRAFT'
                  : 'CANCELLED'}
              </Text>
            </View>
          </View>

          {/* Sport Chip on Hero Bottom Left */}
          <View style={styles.heroSportChip}>
            <Feather name="award" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.heroSportText}>{tournament.sport}</Text>
          </View>
        </View>

        {/* ── Main Tournament Title & Host Info ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <Text style={[styles.mainTitle, { color: C.text }]}>{tournament.name}</Text>

          {/* Host Facility Row */}
          <View style={styles.hostRow}>
            <View
              style={[
                styles.hostAvatar,
                { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
              ]}
            >
              <Ionicons
                name="business"
                size={16}
                color="#10B981"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.hostLabel, { color: C.subtext }]}>
                Host Turf Venue
              </Text>
              <Text style={[styles.hostName, { color: C.text }]}>
                {hostTurfName}
              </Text>
            </View>

            {tournament.turf && (
              <TouchableOpacity
                style={[styles.viewTurfBtn, { borderColor: C.primary }]}
                onPress={() => navigation.navigate('TurfDetail', { turfId: tournament.turf.id || tournament.turfId, turf: tournament.turf })}
              >
                <Text style={[styles.viewTurfText, { color: C.primary }]}>View Arena</Text>
                <Feather name="arrow-right" size={12} color={C.primary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={13} color={C.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.locationText, { color: C.subtext }]}>
              {turfLocation}
            </Text>
          </View>

          {/* Creator Info if User Created */}
          {isCommunity && (
            <View style={[styles.creatorInfoBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Ionicons name="person-circle" size={18} color="#0F766E" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.creatorLabel, { color: C.subtext }]}>Tournament Organizer</Text>
                <Text style={[styles.creatorVal, { color: C.text }]}>
                  {isOwner ? 'You (Logged-in Organizer)' : (tournament.creatorName || 'Community Member')}
                </Text>
              </View>
              <View style={styles.userCreatedBadge}>
                <Text style={styles.userCreatedBadgeText}>USER CREATED</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Format & Key Metrics ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <Text style={[styles.sectionHeading, { color: C.text }]}>Tournament Format</Text>

          <View style={styles.metricGrid}>
            {/* Start Date */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="calendar" size={16} color={C.primary} />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Starts</Text>
              <Text style={[styles.metricVal, { color: C.text }]}>{formatDate(tournament.startDate)}</Text>
            </View>

            {/* End Date */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="flag" size={16} color="#0284C7" />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Ends</Text>
              <Text style={[styles.metricVal, { color: C.text }]}>{formatDate(tournament.endDate)}</Text>
            </View>

            {/* Teams */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Ionicons name="people-outline" size={18} color="#0F766E" />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Teams</Text>
              <Text style={[styles.metricVal, { color: C.text }]}>{tournament.numberOfTeams} Teams</Text>
            </View>

            {/* Players / Team */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Ionicons name="shirt-outline" size={18} color="#10B981" />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Squad Size</Text>
              <Text style={[styles.metricVal, { color: C.text }]}>{tournament.playersPerTeam} / Team</Text>
            </View>
          </View>

          {/* Cricket Overs Indicator */}
          {isCricket && Boolean(tournament.oversPerTeam) && (
            <View style={[styles.cricketOversRow, { backgroundColor: dark ? '#1E293B' : '#FEF3C7' }]}>
              <Feather name="disc" size={16} color="#D97706" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cricketOversTitle, { color: '#B45309' }]}>Cricket Match Overs Rule</Text>
                <Text style={[styles.cricketOversSub, { color: '#92400E' }]}>
                  {tournament.oversPerTeam} overs per inning / side
                </Text>
              </View>
            </View>
          )}
        </View>

<<<<<<< HEAD
        {/* ── Capacity & Slots Overview (Part 1 & 5) ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.capacityHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people" size={18} color={C.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionHeading, { color: C.text }]}>Tournament Capacity</Text>
            </View>
            <View
              style={[
                styles.capacityTag,
                {
                  backgroundColor:
                    lifecycleStatus === 'published'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : lifecycleStatus === 'full'
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(100, 116, 139, 0.12)',
                },
              ]}
            >
              <Text
                style={[
                  styles.capacityTagText,
                  {
                    color:
                      lifecycleStatus === 'published'
                        ? '#10B981'
                        : lifecycleStatus === 'full'
                        ? '#D97706'
                        : '#64748B',
                  },
                ]}
              >
                {lifecycleStatus === 'published'
                  ? `${remainingSlots} SLOTS REMAINING`
                  : lifecycleStatus === 'full'
                  ? 'FULL'
                  : lifecycleStatus.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Stat Numbers */}
          <View style={styles.capacityNumbersRow}>
            <View style={styles.capacityNumCol}>
              <Text style={[styles.capacityNumLabel, { color: C.subtext }]}>Accepted Teams</Text>
              <Text style={[styles.capacityNumVal, { color: C.text }]}>
                {acceptedTeamsCount} / {totalTeams}
              </Text>
            </View>
            <View style={[styles.capacityDivider, { backgroundColor: C.border }]} />
            <View style={styles.capacityNumCol}>
              <Text style={[styles.capacityNumLabel, { color: C.subtext }]}>Remaining Slots</Text>
              <Text style={[styles.capacityNumVal, { color: remainingSlots > 0 ? '#10B981' : '#EF4444' }]}>
                {remainingSlots}
              </Text>
            </View>
          </View>

          {/* Visual Progress Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: C.bgSoft }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.round((acceptedTeamsCount / (totalTeams || 1)) * 100))}%`,
                  backgroundColor: isFull ? '#F59E0B' : C.primary,
                },
              ]}
            />
          </View>

          {Boolean(tournament.registrationDeadline || tournament.registrationEndDate) && (
            <View style={styles.deadlineRow}>
              <Feather name="clock" size={13} color={C.subtext} style={{ marginRight: 6 }} />
              <Text style={[styles.deadlineText, { color: C.subtext }]}>
                Registration Deadline: {formatDate(tournament.registrationDeadline || tournament.registrationEndDate)}
              </Text>
            </View>
          )}
        </View>

        {/* ── User's Team Application Status (Part 4) ── */}
        {myRegistration && (
          <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={styles.myAppTopRow}>
              <View>
                <Text style={[styles.myAppLabel, { color: C.subtext }]}>Your Team</Text>
                <Text style={[styles.myAppTeamName, { color: C.text }]}>{myRegistration.teamName}</Text>
              </View>

              <View
                style={[
                  styles.myAppStatusBadge,
                  {
                    backgroundColor:
                      myRegistration.status === 'accepted'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : myRegistration.status === 'rejected'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    borderColor:
                      myRegistration.status === 'accepted'
                        ? '#10B981'
                        : myRegistration.status === 'rejected'
                        ? '#EF4444'
                        : '#F59E0B',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.myAppStatusText,
                    {
                      color:
                        myRegistration.status === 'accepted'
                          ? '#10B981'
                          : myRegistration.status === 'rejected'
                          ? '#EF4444'
                          : '#D97706',
                    },
                  ]}
                >
                  {myRegistration.status === 'accepted'
                    ? 'Accepted'
                    : myRegistration.status === 'rejected'
                    ? 'Rejected'
                    : 'Pending Approval'}
                </Text>
              </View>
            </View>

            {/* Official Confirmation Banner */}
            {myRegistration.status === 'accepted' && (
              <View style={[styles.noticeCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10B981' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={[styles.noticeText, { color: '#047857' }]}>
                  You are officially registered for this tournament.
                </Text>
              </View>
            )}

            {/* Pending Notice */}
            {myRegistration.status === 'pending' && (
              <View style={[styles.noticeCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#F59E0B' }]}>
                <Feather name="clock" size={16} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={[styles.noticeText, { color: '#B45309' }]}>
                  Your application has been submitted and is awaiting turf owner approval.
                </Text>
              </View>
            )}

            {/* Rejection Notice */}
            {myRegistration.status === 'rejected' && (
              <View style={[styles.noticeCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                <Feather name="alert-triangle" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noticeText, { color: '#B91C1C' }]}>
                    Application Rejected
                  </Text>
                  {Boolean(myRegistration.rejectionReason) && (
                    <Text style={[styles.rejectionReasonDetail, { color: '#7F1D1D' }]}>
                      Reason: {myRegistration.rejectionReason}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.myAppRosterSummary}>
              <Text style={[styles.myAppRosterItem, { color: C.subtext }]}>
                👤 Captain: <Text style={{ color: C.text, fontFamily: FONT.bold }}>{myRegistration.captainName}</Text>
              </Text>
              <Text style={[styles.myAppRosterItem, { color: C.subtext }]}>
                👥 Squad: <Text style={{ color: C.text, fontFamily: FONT.bold }}>{Array.isArray(myRegistration.players) ? myRegistration.players.length : tournament.playersPerTeam} Players</Text>
              </Text>
            </View>
          </View>
        )}

        {/* ── Register CTA (Part 1) ── */}
        {!isOwner && !myRegistration && (
          <View style={styles.registerCtaWrap}>
            {lifecycleStatus === 'published' && remainingSlots > 0 ? (
              <TouchableOpacity
                style={[styles.registerBigBtn, { backgroundColor: C.primary }, SHADOW.floating]}
                onPress={() => navigation.navigate('RegisterTeam', { tournament })}
                activeOpacity={0.88}
              >
                <Ionicons name="trophy-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.registerBigBtnText}>Register Your Team</Text>
              </TouchableOpacity>
            ) : isFull ? (
              <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                <Feather name="lock" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={[styles.blockedCtaText, { color: C.text }]}>
                  Tournament Full ({totalTeams}/{totalTeams} Teams Registered)
                </Text>
              </View>
            ) : lifecycleStatus === 'ongoing' ? (
              <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                <Feather name="activity" size={16} color="#0284C7" style={{ marginRight: 8 }} />
                <Text style={[styles.blockedCtaText, { color: '#0284C7' }]}>
                  Tournament is currently ongoing
                </Text>
              </View>
            ) : lifecycleStatus === 'completed' ? (
              <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                <Feather name="flag" size={16} color={C.subtext} style={{ marginRight: 8 }} />
                <Text style={[styles.blockedCtaText, { color: C.subtext }]}>
                  Tournament completed
                </Text>
              </View>
            ) : null}
          </View>
        )}

=======
        {/* ── Teams & Player Rosters Section ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionHeading, { color: C.text, marginBottom: 2 }]}>Teams & Squads</Text>
              <Text style={[styles.sectionSubtitle, { color: C.subtext }]}>
                {tournament.numberOfTeams} Teams • Capacity: {maxPlayersPerTeam} players per team
              </Text>
            </View>
          </View>

          {teamsList.map((team, idx) => {
            const players = Array.isArray(team.players) ? team.players : [];
            const isFull = players.length >= maxPlayersPerTeam;
            const fillRatio = Math.min(players.length / maxPlayersPerTeam, 1);

            return (
              <View
                key={team.id || idx}
                style={[
                  styles.teamCard,
                  { backgroundColor: C.bgSoft, borderColor: C.border },
                ]}
              >
                {/* Team Card Header */}
                <View style={styles.teamCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.teamNameText, { color: C.text }]}>{team.name}</Text>
                  </View>

                  {/* Capacity Pill */}
                  <View
                    style={[
                      styles.capacityPill,
                      {
                        backgroundColor: isFull
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(59, 130, 246, 0.12)',
                        borderColor: isFull ? '#10B981' : '#3B82F6',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.capacityPillText,
                        { color: isFull ? '#10B981' : '#2563EB' },
                      ]}
                    >
                      {players.length} / {maxPlayersPerTeam} Players
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={[styles.capacityTrack, { backgroundColor: C.border }]}>
                  <View
                    style={[
                      styles.capacityBar,
                      {
                        width: `${fillRatio * 100}%`,
                        backgroundColor: isFull ? '#10B981' : '#3B82F6',
                      },
                    ]}
                  />
                </View>

                {/* Player List */}
                {players.length > 0 ? (
                  <View style={styles.playersListWrap}>
                    {players.map((player, pIdx) => (
                      <View
                        key={player.id || pIdx}
                        style={[
                          styles.playerItemRow,
                          {
                            backgroundColor: C.card,
                            borderColor: C.border,
                          },
                        ]}
                      >
                        <View style={[styles.playerAvatar, { backgroundColor: C.primaryLight }]}>
                          <Text style={[styles.playerAvatarText, { color: C.primary }]}>
                            {String(player.name || 'P').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.playerNameText, { color: C.text }]} numberOfLines={1}>
                            {player.name}
                          </Text>
                          {player.phone ? (
                            <Text style={[styles.playerPhoneText, { color: C.subtext }]}>
                              📞 {player.phone}
                            </Text>
                          ) : null}
                        </View>

                        {/* Remove button if owner */}
                        {isOwner && (
                          <TouchableOpacity
                            style={styles.playerRemoveBtn}
                            onPress={() => handleRemovePlayer(team.id, player.id, player.name)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="x" size={14} color={C.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.noPlayersText, { color: C.subtext }]}>
                    No players registered in this squad yet.
                  </Text>
                )}

                {/* Add Player CTA if owner & not full */}
                {isOwner && !isFull && (
                  <TouchableOpacity
                    style={[styles.addPlayerBtn, { borderColor: '#0F766E' }]}
                    onPress={() => handleOpenAddPlayer(team.id)}
                    activeOpacity={0.8}
                  >
                    <Feather name="user-plus" size={13} color="#0F766E" style={{ marginRight: 6 }} />
                    <Text style={[styles.addPlayerBtnText, { color: '#0F766E' }]}>
                      Add / Invite Player ({players.length}/{maxPlayersPerTeam})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

>>>>>>> 4d1ada6 (Describe your changes)
        {/* ── Description ── */}
        {Boolean(tournament.description) && (
          <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <Text style={[styles.sectionHeading, { color: C.text }]}>About the Tournament</Text>
            <Text style={[styles.bodyText, { color: C.subtext }]}>{tournament.description}</Text>
          </View>
        )}

        {/* ── Rules & Regulations ── */}
        {Boolean(tournament.rules) && (
          <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <Text style={[styles.sectionHeading, { color: C.text }]}>Rules & Guidelines</Text>
            <Text style={[styles.bodyText, { color: C.subtext }]}>{tournament.rules}</Text>
          </View>
        )}

        {/* ── Public Share Link Box ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <Text style={[styles.sectionHeading, { color: C.text }]}>Share Tournament</Text>
          <Text style={[styles.shareSub, { color: C.subtext }]}>
            Share this link with your squad, clubs, and sports communities:
          </Text>

          <View style={[styles.shareBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
            <Text style={[styles.shareUrlText, { color: C.text }]} numberOfLines={1}>
              {shareUrl}
            </Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink} activeOpacity={0.7}>
              <Feather name="copy" size={16} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.shareBigBtn, { backgroundColor: '#0F766E' }]}
            onPress={handleShare}
            activeOpacity={0.88}
          >
            <Feather name="share-2" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.shareBigBtnText}>Share Tournament</Text>
          </TouchableOpacity>
        </View>

        {/* ── Creator Action Controls (If Owner) ── */}
        {isOwner && (
          <View style={styles.ownerActionsWrap}>
            {isDraft && (
              <TouchableOpacity
                style={[styles.publishActionBtn, { backgroundColor: '#0F766E' }, SHADOW.floating]}
                onPress={handlePublish}
                disabled={actionLoading}
                activeOpacity={0.88}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.publishActionText}>Publish Tournament Now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {!isCancelled && (
              <TouchableOpacity
                style={[styles.cancelActionBtn, { borderColor: C.error }]}
                onPress={handleCancelTournament}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <Feather name="slash" size={15} color={C.error} style={{ marginRight: 6 }} />
                <Text style={[styles.cancelActionText, { color: C.error }]}>Cancel Tournament</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Add Player Modal ── */}
      <Modal visible={playerModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Add Player to Squad</Text>
              <TouchableOpacity
                onPress={() => setPlayerModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalInputLabel, { color: C.text }]}>
              Player Name <Text style={{ color: C.error }}>*</Text>
            </Text>
            <TextInput
              style={[styles.modalTextInput, { backgroundColor: C.bgSoft, color: C.text, borderColor: C.border }]}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={C.subtext}
              value={playerNameInput}
              onChangeText={setPlayerNameInput}
              autoFocus
            />

            <Text style={[styles.modalInputLabel, { color: C.text }]}>
              Phone Number (Optional / For Invitation)
            </Text>
            <TextInput
              style={[styles.modalTextInput, { backgroundColor: C.bgSoft, color: C.text, borderColor: C.border }]}
              placeholder="e.g. 9876543210"
              placeholderTextColor={C.subtext}
              keyboardType="phone-pad"
              value={playerPhoneInput}
              onChangeText={setPlayerPhoneInput}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.border }]}
                onPress={() => setPlayerModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: C.subtext }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#0F766E' }]}
                onPress={handleSavePlayer}
                disabled={savingTeams}
              >
                {savingTeams ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Add Player</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  heroWrap: {
    width: '100%',
    height: 190,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  heroBadgesRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroSportChip: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  heroSportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: SPACING.md,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  hostName: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  viewTurfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  viewTurfText: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  creatorInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 12,
  },
  creatorLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  creatorVal: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  userCreatedBadge: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  userCreatedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricBox: {
    width: '48%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  cricketOversRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    marginTop: 4,
  },
  cricketOversTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  cricketOversSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  teamCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  teamNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  capacityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  capacityPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  capacityTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  capacityBar: {
    height: '100%',
    borderRadius: 2,
  },
  playersListWrap: {
    marginBottom: 6,
  },
  playerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: 6,
  },
  playerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  playerPhoneText: {
    fontSize: 10,
    marginTop: 1,
  },
  playerRemoveBtn: {
    padding: 4,
    marginLeft: 6,
  },
  noPlayersText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  addPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addPlayerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  shareSub: {
    fontSize: 12,
    marginBottom: 10,
  },
  shareBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginBottom: 12,
  },
  shareUrlText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  copyBtn: {
    padding: 4,
  },
  shareBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  shareBigBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ownerActionsWrap: {
    marginTop: 6,
  },
  publishActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
  },
  publishActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  cancelActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 16,
  },
  backBtnPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
<<<<<<< HEAD

  // ── Capacity Section ──
  capacityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  capacityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  capacityTagText: {
    fontSize: 11,
    fontFamily: FONT.bold,
  },
  capacityNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  capacityNumCol: {
    flex: 1,
    alignItems: 'center',
  },
  capacityDivider: {
    width: 1,
    height: 30,
  },
  capacityNumLabel: {
    fontSize: 11,
    fontFamily: FONT.regular,
  },
  capacityNumVal: {
    fontSize: 15,
    fontFamily: FONT.bold,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },

  // ── User Application Card ──
  myAppTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  myAppLabel: {
    fontSize: 11,
    fontFamily: FONT.regular,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myAppTeamName: {
    fontSize: 16,
    fontFamily: FONT.bold,
    marginTop: 2,
  },
  myAppStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  myAppStatusText: {
    fontSize: 12,
    fontFamily: FONT.bold,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    flex: 1,
  },
  rejectionReasonDetail: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 3,
  },
  myAppRosterSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  myAppRosterItem: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },

  // ── Register CTA ──
  registerCtaWrap: {
    marginBottom: 16,
  },
  registerBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
  },
  registerBigBtnText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
  },
  blockedCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  blockedCtaText: {
    fontSize: 13,
    fontFamily: FONT.bold,
=======
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalTextInput: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
>>>>>>> 4d1ada6 (Describe your changes)
  },
});
