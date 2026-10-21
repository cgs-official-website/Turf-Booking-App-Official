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
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import {
  getTournamentByIdApi,
  publishTournamentApi,
  getTournamentRegistrationsApi,
  acceptRegistrationApi,
  rejectRegistrationApi,
  approveTournamentApi,
  rejectTournamentApi,
} from '../api/tournaments';

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
  const tournamentId = route.params?.tournamentId || route.params?.id || route.params?.tournament?.id;
  const { colors, isDark } = useTheme();

  const [tournament, setTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectingTournament, setRejectingTournament] = useState(false);
  const [rejectTournamentModalVisible, setRejectTournamentModalVisible] = useState(false);
  const [tournamentRejectionReason, setTournamentRejectionReason] = useState('');
  const [processingRegId, setProcessingRegId] = useState(null);
  const [expandedRegs, setExpandedRegs] = useState(new Set());
  const [expandedSquads, setExpandedSquads] = useState(new Set());
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRegForReject, setSelectedRegForReject] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

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
        tournament && (tournament.canEdit || tournament.creatorType !== 'USER') ? (
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
      // Fetch tournament + registrations IN PARALLEL (was sequential = 2x slower)
      const [tournResult, regsResult] = await Promise.allSettled([
        getTournamentByIdApi(tournamentId),
        getTournamentRegistrationsApi(tournamentId),
      ]);

      let tournData = null;
      if (tournResult.status === 'fulfilled') {
        const tournRes = tournResult.value;
        tournData = tournRes?.data?.tournament || tournRes?.tournament || tournRes;
        if (tournData && tournData.id) {
          setTournament(tournData);
        }
      } else {
        console.warn('⚠️ [TournamentDetail] getTournamentByIdApi failed:', tournResult.reason?.message);
      }

      if (regsResult.status === 'fulfilled') {
        const regsRes = regsResult.value;
        const regs = Array.isArray(regsRes)
          ? regsRes
          : Array.isArray(regsRes?.registrations)
            ? regsRes.registrations
            : Array.isArray(regsRes?.data?.registrations)
              ? regsRes.data.registrations
              : Array.isArray(regsRes?.data)
                ? regsRes.data
                : Array.isArray(tournData?.registrations)
                  ? tournData.registrations
                  : [];
        setRegistrations(regs);
      } else {
        console.warn('⚠️ [TournamentDetail] registrations failed, using tournament registrations:', regsResult.reason?.message);
        if (Array.isArray(tournData?.registrations)) {
          setRegistrations(tournData.registrations);
        }
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

  const toggleExpand = (regId) => {
    setExpandedRegs((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId);
      else next.add(regId);
      return next;
    });
  };

  const toggleSquadExpand = (squadId) => {
    setExpandedSquads((prev) => {
      const next = new Set(prev);
      if (next.has(squadId)) next.delete(squadId);
      else next.add(squadId);
      return next;
    });
  };

  const handleAcceptTeam = (reg) => {
    if (tournament?.creatorType === 'USER' || tournament?.source === 'USER CREATED' || Boolean(tournament?.userId)) {
      Alert.alert(
        'Organizer Approval Required',
        'This tournament was created by an athlete/community member. Only the tournament creator can review and accept team applications.'
      );
      return;
    }

    const totalTeams = tournament?.numberOfTeams || tournament?.totalTeams || tournament?.participantCapacity || 16;
    const acceptedCount = registrations.filter((r) => r.status === 'accepted').length;
    const slotsLeft = Math.max(0, totalTeams - acceptedCount);

    if (slotsLeft <= 0) {
      Alert.alert('Tournament Full', 'All tournament slots have been filled. You cannot accept more teams.');
      return;
    }

    Alert.alert(
      'Accept Team Application',
      `Accept "${reg.teamName}" into "${tournament.name}"?\n\nThis will consume 1 slot (${slotsLeft} remaining).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Team',
          style: 'default',
          onPress: async () => {
            setProcessingRegId(reg.id);
            try {
              const res = await acceptRegistrationApi(tournament.id, reg.id);
              // Update local registrations list atomically
              setRegistrations((prev) =>
                prev.map((r) => (r.id === reg.id ? { ...r, status: 'accepted', rejectionReason: null } : r))
              );
              // Update tournament state
              setTournament((prev) => ({
                ...prev,
                acceptedTeamsCount: (prev?.acceptedTeamsCount || acceptedCount) + 1,
                remainingSlots: Math.max(0, slotsLeft - 1),
              }));
              Alert.alert('Team Accepted! 🎉', `"${reg.teamName}" is now officially registered for this tournament.`);
            } catch (err) {
              const msg = err.response?.data?.message || err.message || 'Failed to accept team application.';
              Alert.alert('Accept Failed', msg);
            } finally {
              setProcessingRegId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenReject = (reg) => {
    if (tournament?.creatorType === 'USER' || tournament?.source === 'USER CREATED' || Boolean(tournament?.userId)) {
      Alert.alert(
        'Organizer Approval Required',
        'This tournament was created by an athlete/community member. Only the tournament creator can review and reject team applications.'
      );
      return;
    }

    setSelectedRegForReject(reg);
    setRejectionReasonInput('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRegForReject) return;
    const regId = selectedRegForReject.id;
    const reason = rejectionReasonInput.trim() || 'Application declined by organizer';

    setProcessingRegId(regId);
    setRejectModalVisible(false);
    try {
      await rejectRegistrationApi(tournament.id, regId, reason);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: 'rejected', rejectionReason: reason } : r))
      );
      Alert.alert('Application Rejected', `"${selectedRegForReject.teamName}" has been rejected.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reject team application.';
      Alert.alert('Reject Failed', msg);
    } finally {
      setProcessingRegId(null);
      setSelectedRegForReject(null);
    }
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

  const handleApproveTournament = async () => {
    Alert.alert(
      'Approve Tournament',
      `Approve "${tournament.name}"? The tournament will immediately become publicly visible in the UserApp, and the creator will receive an FCM notification.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Publish',
          style: 'default',
          onPress: async () => {
            setApproving(true);
            try {
              const res = await approveTournamentApi(tournamentId);
              const updated = res?.data?.tournament || res?.tournament;
              if (updated) {
                setTournament(updated);
              } else {
                loadDetails();
              }
              Alert.alert('Tournament Approved! 🎉', 'The tournament has been approved and published! The organizer has been notified via FCM.');
            } catch (err) {
              console.error('Failed to approve tournament:', err);
              Alert.alert('Approval Failed', err.message || 'Unable to approve tournament.');
            } finally {
              setApproving(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmRejectTournament = async () => {
    setRejectingTournament(true);
    try {
      const reason = tournamentRejectionReason.trim() || 'Turf is unavailable on the requested schedule';
      const res = await rejectTournamentApi(tournamentId, reason);
      const updated = res?.data?.tournament || res?.tournament;
      if (updated) {
        setTournament(updated);
      } else {
        loadDetails();
      }
      setRejectTournamentModalVisible(false);
      Alert.alert('Tournament Request Declined', 'The tournament request was rejected and the creator has been notified.');
    } catch (err) {
      console.error('Failed to decline tournament:', err);
      Alert.alert('Decline Failed', err.message || 'Unable to decline tournament.');
    } finally {
      setRejectingTournament(false);
    }
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
  const isUserCreated = tournament.creatorType === 'USER' || tournament.source === 'USER CREATED' || Boolean(tournament.userId);
  const turfName = tournament.turfName || tournament.turf?.name || 'Partner Facility';
  const turfCity = tournament.turf?.city || tournament.turf?.address || 'Tamil Nadu';
  const maxPlayers = tournament.playersPerTeam || 11;
  const acceptedSquads = Array.isArray(registrations)
    ? registrations
      .filter((r) => r.status === 'accepted')
      .map((r, idx) => ({
        id: r.id || `accepted_${idx}`,
        name: r.teamName || `Accepted Team ${idx + 1}`,
        captainName: r.captainName,
        captainPhone: r.captainPhone,
        captainEmail: r.captainEmail,
        players: Array.isArray(r.players) ? r.players : [],
      }))
    : [];

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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

              <View style={[styles.sportTag, { backgroundColor: colors.primaryLight }]}>
                <Feather name="award" size={13} color={colors.primary} />
                <Text style={[styles.sportTagText, { color: colors.primary }]}>
                  {tournament.sport ? tournament.sport.toUpperCase() : 'TOURNAMENT'}
                </Text>
              </View>
            </View>

            {/* Dynamic Lifecycle Status Badge */}
            {(() => {
              const lifecycleStatus = tournament.lifecycleStatus || (isPublished ? 'published' : 'draft');
              const lifecycleLabel = tournament.lifecycleLabel || (isPublished ? 'PUBLISHED' : 'DRAFT');

              let badgeBg = isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7';
              let badgeBorder = '#10B981';
              let badgeText = '#10B981';

              if (lifecycleStatus === 'cancelled') {
                badgeBg = isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2';
                badgeBorder = '#EF4444';
                badgeText = '#EF4444';
              } else if (lifecycleStatus === 'completed') {
                badgeBg = isDark ? 'rgba(100, 116, 139, 0.15)' : '#F1F5F9';
                badgeBorder = '#64748B';
                badgeText = '#64748B';
              } else if (lifecycleStatus === 'ongoing') {
                badgeBg = isDark ? 'rgba(2, 132, 199, 0.15)' : '#E0F2FE';
                badgeBorder = '#0284C7';
                badgeText = '#0284C7';
              } else if (lifecycleStatus === 'registration_closed') {
                badgeBg = isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7';
                badgeBorder = '#F59E0B';
                badgeText = '#D97706';
              } else if (lifecycleStatus === 'registration_open') {
                badgeBg = isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7';
                badgeBorder = '#10B981';
                badgeText = '#10B981';
              } else if (lifecycleStatus === 'published') {
                badgeBg = isDark ? 'rgba(14, 165, 233, 0.15)' : '#E0F2FE';
                badgeBorder = '#0EA5E9';
                badgeText = '#0284C7';
              } else {
                badgeBg = isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7';
                badgeBorder = '#F59E0B';
                badgeText = '#D97706';
              }

              return (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: badgeBg,
                      borderColor: badgeBorder,
                    },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: badgeText }]} />
                  <Text style={[styles.statusBadgeText, { color: badgeText }]}>
                    {lifecycleLabel}
                  </Text>
                </View>
              );
            })()}
          </View>

          <Text style={[styles.tournamentTitle, { color: colors.text }]}>{tournament.name}</Text>

          {/* ── Pending Turf Owner Approval Card ── */}
          {isUserCreated && (tournament.status === 'pending_approval' || tournament.approvalStatus === 'pending') && (
            <View
              style={[
                styles.approvalRequestCard,
                {
                  backgroundColor: isDark ? '#1C1917' : '#FFFBEB',
                  borderColor: isDark ? '#78350F' : '#FCD34D',
                },
                SHADOWS.sm,
              ]}
            >
              <View style={styles.approvalHeaderRow}>
                <View style={[styles.approvalIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="clock" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.approvalBadgeText, { color: '#B45309' }]}>
                    HOSTING REQUEST • PENDING APPROVAL
                  </Text>
                  <Text style={[styles.approvalTitle, { color: colors.text }]}>
                    Review Tournament Request
                  </Text>
                  <Text style={[styles.approvalSub, { color: colors.textSecondary }]}>
                    A community athlete requested to host this tournament at your venue.
                  </Text>
                </View>
              </View>

              {/* Structured Summary Breakdown */}
              <View style={[styles.approvalSummaryBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: colors.border }]}>
                {/* Creator Details */}
                <View style={styles.approvalDetailRow}>
                  <Feather name="user" size={14} color="#7C3AED" style={{ width: 20 }} />
                  <Text style={[styles.approvalDetailLabel, { color: colors.textSecondary }]}>Requested By:</Text>
                  <Text style={[styles.approvalDetailValue, { color: colors.text }]}>
                    {tournament.creatorName || tournament.user?.name || 'Community Member'}
                    {tournament.user?.phone ? ` (${tournament.user.phone})` : ''}
                  </Text>
                </View>

                {/* Tournament Name */}
                <View style={styles.approvalDetailRow}>
                  <Feather name="award" size={14} color={colors.primary} style={{ width: 20 }} />
                  <Text style={[styles.approvalDetailLabel, { color: colors.textSecondary }]}>Tournament:</Text>
                  <Text style={[styles.approvalDetailValue, { color: colors.text }]}>{tournament.name}</Text>
                </View>

                {/* Sport */}
                <View style={styles.approvalDetailRow}>
                  <Feather name="activity" size={14} color={colors.primary} style={{ width: 20 }} />
                  <Text style={[styles.approvalDetailLabel, { color: colors.textSecondary }]}>Sport Category:</Text>
                  <Text style={[styles.approvalDetailValue, { color: colors.text }]}>
                    {tournament.sport ? tournament.sport.toUpperCase() : 'SPORTS'}
                  </Text>
                </View>

                {/* Tournament Dates */}
                <View style={styles.approvalDetailRow}>
                  <Feather name="calendar" size={14} color="#0284C7" style={{ width: 20 }} />
                  <Text style={[styles.approvalDetailLabel, { color: colors.textSecondary }]}>Tournament Schedule:</Text>
                  <Text style={[styles.approvalDetailValue, { color: colors.text }]}>
                    {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                  </Text>
                </View>

                {/* Registration Period */}
                <View style={styles.approvalDetailRow}>
                  <Feather name="clock" size={14} color="#D97706" style={{ width: 20 }} />
                  <Text style={[styles.approvalDetailLabel, { color: colors.textSecondary }]}>Registration Period:</Text>
                  <Text style={[styles.approvalDetailValue, { color: colors.text }]}>
                    {tournament.registrationStartDate ? formatDate(tournament.registrationStartDate) : 'Open Now'} to {tournament.registrationEndDate ? formatDate(tournament.registrationEndDate) : 'Start Date'}
                  </Text>
                </View>

                {/* Number of Teams & Players */}
                <View style={styles.approvalDetailRow}>
                  <Feather name="users" size={14} color="#10B981" style={{ width: 20 }} />
                  <Text style={[styles.approvalDetailLabel, { color: colors.textSecondary }]}>Teams & Squad:</Text>
                  <Text style={[styles.approvalDetailValue, { color: colors.text }]}>
                    {tournament.numberOfTeams} Teams • {tournament.playersPerTeam} Players / Team
                  </Text>
                </View>

                {/* Selected Turf */}
                <View style={styles.approvalDetailRow}>
                  <Feather name="map-pin" size={14} color="#EA580C" style={{ width: 20 }} />
                  <Text style={[styles.approvalDetailLabel, { color: colors.textSecondary }]}>Selected Turf:</Text>
                  <Text style={[styles.approvalDetailValue, { color: colors.text }]}>
                    {turfName} ({turfCity})
                  </Text>
                </View>
              </View>

              {/* Accept / Reject Buttons */}
              <View style={styles.approvalBtnRow}>
                <TouchableOpacity
                  style={[styles.approvalRejectBtn, { borderColor: '#EF4444' }]}
                  onPress={() => {
                    setTournamentRejectionReason('');
                    setRejectTournamentModalVisible(true);
                  }}
                  disabled={approving || rejectingTournament}
                  activeOpacity={0.8}
                >
                  <Feather name="x-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={[styles.approvalRejectBtnText, { color: '#EF4444' }]}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approvalAcceptBtn, { backgroundColor: '#10B981' }]}
                  onPress={handleApproveTournament}
                  disabled={approving || rejectingTournament}
                  activeOpacity={0.85}
                >
                  {approving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.approvalAcceptBtnText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* User Creator Info Note if Rejected */}
          {isUserCreated && (tournament.status === 'rejected' || tournament.approvalStatus === 'rejected') && (
            <View
              style={[
                styles.rejectedStatusCard,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDark ? '#991B1B' : '#FCA5A5',
                },
              ]}
            >
              <Feather name="slash" size={20} color="#DC2626" style={{ marginTop: 2, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rejectedTitle, { color: '#DC2626' }]}>
                  Tournament Request Declined
                </Text>
                <Text style={[styles.rejectedSub, { color: colors.textSecondary }]}>
                  This user-created tournament request was declined and is not publicly visible.
                </Text>
                {tournament.rejectionReason ? (
                  <Text style={[styles.rejectedReasonText, { color: colors.text }]}>
                    Reason: <Text style={{ fontWeight: '700' }}>{tournament.rejectionReason}</Text>
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* User Creator Info Note if Live & Approved */}
          {isUserCreated && tournament.status === 'published' && (
            <View
              style={[
                styles.creatorBannerBox,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0',
                },
              ]}
            >
              <Feather name="check-circle" size={16} color="#10B981" style={{ marginRight: 8, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.creatorBannerTitle, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                  Approved & Publicly Live
                </Text>
                <Text style={[styles.creatorBannerSub, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                  Created by {tournament.creatorName || tournament.creator || 'Community Athlete'} and hosted at your facility.
                </Text>
              </View>
            </View>
          )}

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

        {/* Registration Period Card */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.cardSectionTitle, { color: colors.text }]}>REGISTRATION PERIOD</Text>
          <Text style={[styles.cardSectionSub, { color: colors.textSecondary }]}>
            Window when players and teams are allowed to register
          </Text>

          <View style={styles.scheduleRow}>
            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>REGISTRATION OPENS</Text>
              <View style={styles.dateValueRow}>
                <Feather name="calendar" size={14} color={colors.primary} />
                <Text style={[styles.dateValue, { color: colors.text }]}>
                  {formatDate(tournament.registrationStartDate || tournament.startDate)}
                </Text>
              </View>
            </View>

            <View style={[styles.scheduleDivider, { backgroundColor: colors.border }]} />

            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>REGISTRATION CLOSES</Text>
              <View style={styles.dateValueRow}>
                <Feather name="calendar" size={14} color={colors.primary} />
                <Text style={[styles.dateValue, { color: colors.text }]}>
                  {formatDate(tournament.registrationEndDate || tournament.startDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tournament Schedule Card */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.cardSectionTitle, { color: colors.text }]}>TOURNAMENT SCHEDULE</Text>
          <Text style={[styles.cardSectionSub, { color: colors.textSecondary }]}>
            When actual match play and games take place
          </Text>

          <View style={styles.scheduleRow}>
            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>TOURNAMENT STARTS</Text>
              <View style={styles.dateValueRow}>
                <Feather name="play-circle" size={14} color={colors.primary} />
                <Text style={[styles.dateValue, { color: colors.text }]}>
                  {formatDate(tournament.startDate)}
                </Text>
              </View>
            </View>

            <View style={[styles.scheduleDivider, { backgroundColor: colors.border }]} />

            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>TOURNAMENT ENDS</Text>
              <View style={styles.dateValueRow}>
                <Feather name="flag" size={14} color={colors.primary} />
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

        {/* ── Matches & Scoring (vendor-created tournaments: vendor enters scores) ── */}
        {tournament.status === 'published' && (
          <TouchableOpacity
            style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center' }, SHADOWS.sm]}
            onPress={() => navigation.navigate('TournamentMatches', { tournamentId: tournament.id })}
            activeOpacity={0.85}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name="activity" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardSectionTitle, { color: colors.text, marginBottom: 2 }]}>Matches & Scoring</Text>
              <Text style={{ color: colors.textSecondary, fontSize: SIZES.sm }}>
                {tournament.creatorType === 'USER'
                  ? 'View fixtures and live scores'
                  : 'Generate fixtures, toss, enter live scores & declare winners'}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* ── Team Registrations Section (Part 3) ── */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.regSectionHeaderRow}>
            <View>
              <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Team Registrations</Text>
              <Text style={[styles.regSectionSubtitle, { color: colors.textSecondary }]}>
                {registrations.length} team applications submitted
              </Text>
            </View>

            {/* Capacity pill */}
            {(() => {
              const totalTeams = tournament?.numberOfTeams || tournament?.totalTeams || tournament?.participantCapacity || 16;
              const acceptedCount = registrations.filter((r) => r.status === 'accepted').length;
              const slotsLeft = Math.max(0, totalTeams - acceptedCount);
              return (
                <View
                  style={[
                    styles.capacityBadge,
                    {
                      backgroundColor:
                        slotsLeft === 0
                          ? isDark
                            ? 'rgba(239, 68, 68, 0.15)'
                            : '#FEE2E2'
                          : isDark
                            ? 'rgba(16, 185, 129, 0.15)'
                            : '#DCFCE7',
                      borderColor: slotsLeft === 0 ? '#EF4444' : '#10B981',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.capacityBadgeText,
                      { color: slotsLeft === 0 ? '#DC2626' : '#10B981' },
                    ]}
                  >
                    {slotsLeft === 0 ? 'FULL' : `${slotsLeft} SLOTS LEFT`}
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* Capacity Breakdown: Total Capacity, Accepted, Remaining, Pending, Rejected */}
          {(() => {
            const totalTeams = tournament?.numberOfTeams || tournament?.totalTeams || tournament?.participantCapacity || 16;
            const acceptedCount = registrations.filter((r) => r.status === 'accepted').length;
            const pendingCount = registrations.filter((r) => r.status === 'pending').length;
            const rejectedCount = registrations.filter((r) => r.status === 'rejected').length;
            const slotsLeft = Math.max(0, totalTeams - acceptedCount);

            return (
              <View
                style={[
                  styles.capacityGridWrap,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: colors.border },
                ]}
              >
                {/* Row 1: Capacity & Slot Summary */}
                <View style={styles.capacityMetricRow}>
                  <View style={styles.capacityMetric}>
                    <Text style={[styles.capacityMetricLabel, { color: colors.textSecondary }]}>TOTAL CAPACITY</Text>
                    <Text style={[styles.capacityMetricVal, { color: colors.text }]}>{totalTeams}</Text>
                  </View>
                  <View style={[styles.capacityMetricDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.capacityMetric}>
                    <Text style={[styles.capacityMetricLabel, { color: colors.textSecondary }]}>ACCEPTED TEAMS</Text>
                    <Text style={[styles.capacityMetricVal, { color: '#10B981' }]}>{acceptedCount}</Text>
                  </View>
                  <View style={[styles.capacityMetricDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.capacityMetric}>
                    <Text style={[styles.capacityMetricLabel, { color: colors.textSecondary }]}>REMAINING SLOTS</Text>
                    <Text style={[styles.capacityMetricVal, { color: slotsLeft > 0 ? colors.primary : '#EF4444' }]}>
                      {slotsLeft}
                    </Text>
                  </View>
                </View>

                {/* Sub Divider */}
                <View style={[styles.capacitySubDivider, { backgroundColor: colors.border }]} />

                {/* Row 2: Applications Status */}
                <View style={styles.capacityMetricRow}>
                  <View style={styles.capacityMetric}>
                    <Text style={[styles.capacityMetricLabel, { color: colors.textSecondary }]}>PENDING APPLICATIONS</Text>
                    <Text style={[styles.capacityMetricVal, { color: pendingCount > 0 ? '#F59E0B' : colors.text }]}>
                      {pendingCount}
                    </Text>
                  </View>
                  <View style={[styles.capacityMetricDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.capacityMetric}>
                    <Text style={[styles.capacityMetricLabel, { color: colors.textSecondary }]}>REJECTED APPLICATIONS</Text>
                    <Text style={[styles.capacityMetricVal, { color: rejectedCount > 0 ? '#EF4444' : colors.textSecondary }]}>
                      {rejectedCount}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Registrations List */}
          {registrations.length === 0 ? (
            <View style={styles.emptyRegsBox}>
              <Feather name="users" size={28} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
              <Text style={[styles.emptyRegsTitle, { color: colors.text }]}>No Applications Yet</Text>
              <Text style={[styles.emptyRegsSub, { color: colors.textSecondary }]}>
                When teams submit their applications through the tournament share link, they will appear here for your review and approval.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              {(() => {
                const totalTeams = tournament?.numberOfTeams || tournament?.totalTeams || tournament?.participantCapacity || 16;
                const acceptedCount = registrations.filter((r) => r.status === 'accepted').length;
                const slotsLeft = Math.max(0, totalTeams - acceptedCount);

                return registrations.map((reg) => {
                  const isExpanded = expandedRegs.has(reg.id);
                  const isPending = reg.status === 'pending';
                  const isAccepted = reg.status === 'accepted';
                  const isRejected = reg.status === 'rejected';
                  const isBusy = processingRegId === reg.id;
                  const regPlayers = Array.isArray(reg.players) ? reg.players : [];

                  return (
                    <View
                      key={reg.id}
                      style={[
                        styles.regCard,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                          borderColor: colors.border,
                        },
                        SHADOWS.sm,
                      ]}
                    >
                      {/* Top Row: Team Name & Status Badge */}
                      <View style={styles.regCardTopRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.regTeamName, { color: colors.text }]} numberOfLines={1}>
                            {reg.teamName}
                          </Text>
                          <Text style={[styles.regCaptainLine, { color: colors.textSecondary }]}>
                            Captain: <Text style={{ color: colors.text, fontWeight: '700' }}>{reg.captainName}</Text>
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={[
                            styles.regStatusBadge,
                            {
                              backgroundColor: isAccepted
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : '#DCFCE7'
                                : isRejected
                                  ? isDark
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : '#FEE2E2'
                                  : isDark
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : '#FEF3C7',
                              borderColor: isAccepted
                                ? '#10B981'
                                : isRejected
                                  ? '#EF4444'
                                  : '#F59E0B',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.regStatusBadgeText,
                              {
                                color: isAccepted
                                  ? '#10B981'
                                  : isRejected
                                    ? '#DC2626'
                                    : '#D97706',
                              },
                            ]}
                          >
                            {isAccepted ? 'Confirmed' : isRejected ? 'Rejected' : 'Pending'}
                          </Text>
                        </View>
                      </View>

                      {/* Meta info row */}
                      <View style={styles.regMetaRow}>
                        <View style={styles.regMetaItem}>
                          <Feather name="phone" size={12} color={colors.primary} />
                          <Text style={[styles.regMetaText, { color: colors.textSecondary }]}>{reg.captainPhone}</Text>
                        </View>

                        <View style={styles.regMetaItem}>
                          <Feather name="users" size={12} color={colors.textSecondary} />
                          <Text style={[styles.regMetaText, { color: colors.textSecondary }]}>
                            {regPlayers.length || tournament?.playersPerTeam || 11} Players
                          </Text>
                        </View>

                        <View style={styles.regMetaItem}>
                          <Feather name="calendar" size={12} color={colors.textSecondary} />
                          <Text style={[styles.regMetaText, { color: colors.textSecondary }]}>
                            {formatDate(reg.createdAt)}
                          </Text>
                        </View>
                      </View>

                      {/* Rejection Reason Notice if Rejected */}
                      {isRejected && Boolean(reg.rejectionReason) && (
                        <View
                          style={[
                            styles.rejectionNoticeBox,
                            { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: '#FECACA' },
                          ]}
                        >
                          <Text style={styles.rejectionNoticeLabel}>Rejection Reason:</Text>
                          <Text style={styles.rejectionNoticeValue}>{reg.rejectionReason}</Text>
                        </View>
                      )}

                      {/* Toggle Players Roster Button */}
                      {regPlayers.length > 0 && (
                        <TouchableOpacity
                          style={styles.toggleRosterBtn}
                          onPress={() => toggleExpand(reg.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.toggleRosterText, { color: colors.primary }]}>
                            {isExpanded ? 'Hide Squad' : `View Squad (${regPlayers.length || 11})`}
                          </Text>
                          <Feather
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                      )}

                      {/* Expanded Players List */}
                      {isExpanded && regPlayers.length > 0 && (
                        <View style={[styles.rosterList, { borderColor: colors.border }]}>
                          {regPlayers.map((p, pIdx) => (
                            <View
                              key={`p-${p.index || pIdx}`}
                              style={[styles.rosterRow, { borderBottomColor: colors.border }]}
                            >
                              <View style={[styles.rosterNum, { backgroundColor: colors.primaryLight }]}>
                                <Text style={[styles.rosterNumText, { color: colors.primary }]}>#{p.index || pIdx + 1}</Text>
                              </View>
                              <Text style={[styles.rosterName, { color: colors.text }]}>{p.name}</Text>
                              <Text style={[styles.rosterPhone, { color: colors.textSecondary }]}>{p.phone}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Pending Action Buttons: Accept / Reject */}
                      {isPending && (
                        isUserCreated ? (
                          <View
                            style={[
                              styles.userCreatedNoticeBox,
                              {
                                backgroundColor: isDark ? 'rgba(124, 58, 237, 0.08)' : '#F5F3FF',
                                borderColor: isDark ? 'rgba(124, 58, 237, 0.3)' : '#DDD6FE',
                              },
                            ]}
                          >
                            <Feather name="info" size={14} color="#7C3AED" style={{ marginRight: 6 }} />
                            <Text style={[styles.userCreatedNoticeText, { color: isDark ? '#DDD6FE' : '#6D28D9' }]}>
                              Team approvals for this user-created tournament are managed directly by the tournament creator.
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.regActionRow}>
                            <TouchableOpacity
                              style={[
                                styles.acceptRegBtn,
                                { backgroundColor: slotsLeft > 0 ? '#10B981' : '#94A3B8' },
                              ]}
                              onPress={() => handleAcceptTeam(reg)}
                              disabled={isBusy || slotsLeft <= 0}
                              activeOpacity={0.85}
                            >
                              {isBusy ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                                  <Text style={styles.acceptRegBtnText}>Accept Team</Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.rejectRegBtn, { borderColor: '#EF4444' }]}
                              onPress={() => handleOpenReject(reg)}
                              disabled={isBusy}
                              activeOpacity={0.8}
                            >
                              <Feather name="x" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                              <Text style={styles.rejectRegBtnText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )
                      )}
                    </View>
                  );
                });
              })()}
            </View>
          )}
        </View>

        {/* Teams & Squad Rosters Card */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Teams & Squad Rosters</Text>
          <Text style={[styles.shareSub, { color: colors.textSecondary }]}>
            Confirmed squad rosters ({acceptedSquads.length} / {tournament.numberOfTeams || 2} teams accepted • max {maxPlayers} players/team):
          </Text>

          {acceptedSquads.length === 0 ? (
            <View style={styles.emptyRegsBox}>
              <Feather name="shield" size={26} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 6 }} />
              <Text style={[styles.emptyRegsTitle, { color: colors.text }]}>No Accepted Squads Yet</Text>
              <Text style={[styles.emptyRegsSub, { color: colors.textSecondary }]}>
                Teams accepted from the Team Registrations section above will appear here with their confirmed squad rosters.
              </Text>
            </View>
          ) : (
            acceptedSquads.map((team, idx) => {
              const players = Array.isArray(team.players) ? team.players : [];
              const isFull = players.length >= maxPlayers;
              const isExpanded = expandedSquads.has(team.id);

              return (
                <View
                  key={team.id || idx}
                  style={[
                    styles.teamCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.teamHeader}
                    onPress={() => toggleSquadExpand(team.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.teamNameText, { color: colors.text }]} numberOfLines={1}>
                        {team.name}
                      </Text>
                      {team.captainName ? (
                        <Text style={[styles.regCaptainLine, { color: colors.textSecondary }]}>
                          Captain: <Text style={{ color: colors.text, fontWeight: '700' }}>{team.captainName}</Text>
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={[
                          styles.capacityPill,
                          {
                            backgroundColor: isFull
                              ? 'rgba(16, 185, 129, 0.15)'
                              : isDark
                                ? 'rgba(255,255,255,0.06)'
                                : '#F1F5F9',
                            borderColor: isFull ? '#10B981' : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.capacityPillText,
                            { color: isFull ? '#10B981' : colors.textSecondary },
                          ]}
                        >
                          {players.length} / {maxPlayers} Players
                        </Text>
                      </View>

                      {players.length > 0 && (
                        <Feather
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Toggle View Squad Button */}
                  {players.length > 0 && (
                    <TouchableOpacity
                      style={styles.toggleRosterBtn}
                      onPress={() => toggleSquadExpand(team.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.toggleRosterText, { color: colors.primary }]}>
                        {isExpanded ? 'Hide Squad' : `View Squad (${players.length || maxPlayers})`}
                      </Text>
                      <Feather
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Expanded Players List */}
                  {isExpanded && players.length > 0 && (
                    <View style={[styles.rosterList, { borderColor: colors.border }]}>
                      {players.map((p, pIdx) => (
                        <View
                          key={p.id || p.index || pIdx}
                          style={[styles.rosterRow, { borderBottomColor: colors.border }]}
                        >
                          <View style={[styles.rosterNum, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.rosterNumText, { color: colors.primary }]}>
                              #{p.index || pIdx + 1}
                            </Text>
                          </View>
                          <Text style={[styles.rosterName, { color: colors.text }]}>{p.name}</Text>
                          {p.phone ? (
                            <Text style={[styles.rosterPhone, { color: colors.textSecondary }]}>
                              {p.phone}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}

                  {players.length === 0 && (
                    <Text style={{ fontSize: 11, fontStyle: 'italic', color: colors.textSecondary, marginTop: 4 }}>
                      No players registered in this squad yet.
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {isUserCreated && (tournament.status === 'pending_approval' || tournament.approvalStatus === 'pending') ? (
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: '#EF4444', flex: 1 }]}
                onPress={() => {
                  setTournamentRejectionReason('');
                  setRejectTournamentModalVisible(true);
                }}
                disabled={approving || rejectingTournament}
                activeOpacity={0.8}
              >
                <Feather name="x-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={[styles.editBtnText, { color: '#EF4444' }]}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.publishActionBtn, { backgroundColor: '#10B981', flex: 2 }]}
                onPress={handleApproveTournament}
                disabled={approving || rejectingTournament}
                activeOpacity={0.85}
              >
                {approving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.publishActionBtnText}>Accept & Publish</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : !isUserCreated && (tournament.canEdit !== false) ? (
            <TouchableOpacity
              style={[styles.editBtn, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate('EditTournament', { tournamentId: tournament.id })}
              activeOpacity={0.8}
            >
              <Feather name="edit" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Details</Text>
            </TouchableOpacity>
          ) : null}

          {/* Regular publish or share for non-pending */}
          {!(isUserCreated && (tournament.status === 'pending_approval' || tournament.approvalStatus === 'pending')) && (
            !isPublished && !isUserCreated ? (
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
            ) : isPublished ? (
              <TouchableOpacity
                style={[styles.publishActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleShare()}
                activeOpacity={0.85}
              >
                <Feather name="share-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.publishActionBtnText}>Share</Text>
              </TouchableOpacity>
            ) : null
          )}
        </View>
      </ScrollView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Application</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Optionally provide a reason for rejecting "{selectedRegForReject?.teamName}". The team captain will see this reason in their app.
            </Text>

            <TextInput
              style={[
                styles.modalTextInput,
                { backgroundColor: colors.inputBg || (isDark ? '#0F172A' : '#F8FAFC'), borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g. Squad requirements not met, or slot conflict"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              value={rejectionReasonInput}
              onChangeText={setRejectionReasonInput}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setRejectModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmReject}
                activeOpacity={0.85}
              >
                <Text style={styles.modalConfirmText}>Reject Team</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Tournament Request Modal */}
      <Modal
        visible={rejectTournamentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTournamentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <Feather name="alert-triangle" size={20} color="#EF4444" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Decline Tournament Request</Text>
            </View>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Please select or enter the reason for declining "{tournament.name}". The creator will be notified via mobile push notification.
            </Text>

            {/* Quick reason chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 }}>
              {[
                'Turf unavailable on selected dates',
                'Slot reserved for another event',
                'Facility under scheduled maintenance',
                'Requested timing conflict',
              ].map((rText) => {
                const isSelected = tournamentRejectionReason === rText;
                return (
                  <TouchableOpacity
                    key={rText}
                    style={[
                      styles.reasonChip,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2')
                          : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                        borderColor: isSelected ? '#EF4444' : colors.border,
                      },
                    ]}
                    onPress={() => setTournamentRejectionReason(rText)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        { color: isSelected ? '#DC2626' : colors.textSecondary },
                      ]}
                    >
                      {rText}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.modalTextInput,
                { backgroundColor: colors.inputBg || (isDark ? '#0F172A' : '#F8FAFC'), borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Or type a custom rejection reason..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              value={tournamentRejectionReason}
              onChangeText={setTournamentRejectionReason}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setRejectTournamentModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmRejectTournament}
                disabled={rejectingTournament}
                activeOpacity={0.85}
              >
                {rejectingTournament ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Decline Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 4,
  },
  cardSectionSub: {
    fontSize: SIZES.xs,
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

  // ── Team Registrations Styles ──
  regSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  regSectionSubtitle: {
    fontSize: SIZES.xs,
    marginTop: 2,
  },
  capacityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  capacityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  capacityGridWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  capacityMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  capacitySubDivider: {
    height: 1,
    marginVertical: 8,
  },
  capacitySummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  capacityMetric: {
    flex: 1,
    alignItems: 'center',
  },
  capacityMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  capacityMetricVal: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginTop: 2,
  },
  capacityMetricDivider: {
    width: 1,
    height: 28,
  },
  emptyRegsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyRegsTitle: {
    fontSize: SIZES.sm + 1,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyRegsSub: {
    fontSize: SIZES.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  regCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  regCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  regTeamName: {
    fontSize: SIZES.sm + 1,
    fontWeight: '800',
  },
  regCaptainLine: {
    fontSize: SIZES.xs,
    marginTop: 2,
  },
  regStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sourceTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  regStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  regMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  regMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  regMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rejectionNoticeBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectionNoticeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  rejectionNoticeValue: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 1,
  },
  toggleRosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleRosterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rosterList: {
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rosterNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  rosterNumText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rosterName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  rosterPhone: {
    fontSize: 11,
  },
  regActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
  },
  acceptRegBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptRegBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectRegBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: SIZES.xs,
    lineHeight: 16,
    marginBottom: 12,
  },
  modalTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: SIZES.xs + 1,
    textAlignVertical: 'top',
    minHeight: 65,
    marginBottom: 14,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: SIZES.xs + 1,
    fontWeight: '700',
  },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  creatorBannerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  creatorBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  creatorBannerSub: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  teamCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamNameText: {
    fontSize: SIZES.sm + 1,
    fontWeight: '700',
  },
  capacityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  capacityPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  playerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  playerNameText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '600',
  },
  // Approval Workflow Styles
  approvalRequestCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 6,
  },
  approvalHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  approvalIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  approvalTitle: {
    fontSize: SIZES.md + 1,
    fontWeight: '800',
    marginTop: 2,
  },
  approvalSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  approvalSummaryBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  approvalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approvalDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 140,
  },
  approvalDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  approvalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  approvalRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  approvalRejectBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  approvalAcceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  approvalAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  rejectedStatusCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 6,
  },
  rejectedTitle: {
    fontSize: SIZES.sm + 1,
    fontWeight: '800',
    marginBottom: 2,
  },
  rejectedSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  rejectedReasonText: {
    fontSize: 12,
    marginTop: 6,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  reasonChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userCreatedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  userCreatedNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
});

export default TournamentDetailScreen;
