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
  getPublicTournamentByShareIdApi,
  publishTournamentApi,
  cancelTournamentApi,
  getMyTournamentRegistrationApi,
  updateTournamentTeamsApi,
  generateBracketApi,
  conductMatchTossApi,
  updateMatchScoreApi,
  confirmMatchWinnerApi,
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
  const targetId =
    route.params?.tournamentId ||
    route.params?.id ||
    route.params?.shareId ||
    route.params?.shareableIdentifier;
  const initialTournament = route.params?.tournament;
  const { C, dark } = useTheme();
  const { user } = useSelector((s) => s.auth);

  const [tournament, setTournament] = useState(initialTournament || null);
  const [loading, setLoading] = useState(!initialTournament);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Squad Rosters Expanded State
  const [expandedTeams, setExpandedTeams] = useState(new Set());

  const toggleTeamExpand = (teamId) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  // Team & Player Management Modal State
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [playerPhoneInput, setPlayerPhoneInput] = useState('');
  const [savingTeams, setSavingTeams] = useState(false);

  // Tournament Bracket & Match Management State
  const [bracketActionLoading, setBracketActionLoading] = useState(false);
  const [selectedRoundTab, setSelectedRoundTab] = useState('all');

  // Toss Modal State
  const [tossModalVisible, setTossModalVisible] = useState(false);
  const [selectedMatchForToss, setSelectedMatchForToss] = useState(null);
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossDecision, setTossDecision] = useState('bat');

  // Score Modal State
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [selectedMatchForScore, setSelectedMatchForScore] = useState(null);
  const [teamAScoreInput, setTeamAScoreInput] = useState('');
  const [teamBScoreInput, setTeamBScoreInput] = useState('');
  const [matchSummaryInput, setMatchSummaryInput] = useState('');

  // Winner & Advance Modal State
  const [winnerModalVisible, setWinnerModalVisible] = useState(false);
  const [selectedMatchForWinner, setSelectedMatchForWinner] = useState(null);
  const [winnerTeamId, setWinnerTeamId] = useState('');

  const loadDetails = useCallback(async () => {
    if (!targetId) {
      setTournament(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let data = null;
      try {
        const res = await getTournamentByIdApi(targetId);
        data = res?.tournament || res?.data?.tournament;
      } catch (err) {
        // Fallback to share identifier resolution
        try {
          const shareRes = await getPublicTournamentByShareIdApi(targetId);
          data = shareRes?.tournament || shareRes?.data?.tournament;
        } catch (shareErr) {
          console.warn('Failed to resolve tournament:', shareErr.message);
        }
      }
      setTournament(data || null);
    } catch (err) {
      console.warn('Failed to load tournament detail:', err.message);
      setTournament(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetId]);

  useEffect(() => {
    setTournament(initialTournament || null);
    loadDetails();
  }, [targetId, loadDetails]);

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

  // STRICT CREATOR OWNERSHIP:
  // ONLY the user who originally created/published the tournament is the Tournament Manager.
  // Ownership is determined strictly from tournament creator/user ID from backend data.
  // Do NOT identify creator based on team registration, team name, captain name, or player name.
  const isCreator = Boolean(
    user?.id && tournament?.userId && String(user.id) === String(tournament.userId)
  );
  const isOwner = isCreator;

  const isPublished = tournament?.status === 'published';
  const isDraft = tournament?.status === 'draft';
  const isCancelled = tournament?.status === 'cancelled';
  const isPendingApproval = tournament?.status === 'pending_approval' || tournament?.approvalStatus === 'pending';
  const isRejected = tournament?.status === 'rejected' || tournament?.approvalStatus === 'rejected';
  const isApproved = tournament?.status === 'published' && (tournament?.approvalStatus === 'approved' || !tournament?.approvalStatus);

  const totalTeams = tournament?.numberOfTeams || tournament?.totalTeams || tournament?.participantCapacity || 16;
  const initialRegs = Array.isArray(tournament?.registrations) ? tournament.registrations : [];
  const initialAcceptedCount = initialRegs.filter((r) => r.status === 'accepted').length;
  const acceptedTeamsCount = tournament?.acceptedTeamsCount !== undefined
    ? Number(tournament.acceptedTeamsCount)
    : initialAcceptedCount;
  const remainingSlots = tournament?.remainingSlots !== undefined
    ? Number(tournament.remainingSlots)
    : Math.max(0, totalTeams - acceptedTeamsCount);
  const isFull = tournament?.isFull || remainingSlots <= 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const startStr = tournament?.startDate ? String(tournament.startDate).slice(0, 10) : '';
  const endStr = tournament?.endDate ? String(tournament.endDate).slice(0, 10) : '';
  const regStartStr = tournament?.registrationStartDate ? String(tournament.registrationStartDate).slice(0, 10) : '';
  const regEndStr = tournament?.registrationEndDate ? String(tournament.registrationEndDate).slice(0, 10) : '';

  // Standard 5-status evaluation:
  // - Registration Open
  // - Registration Closed
  // - Tournament Upcoming
  // - Tournament Ongoing
  // - Tournament Completed
  // "Ongoing" must be based only on the Tournament Schedule.
  let computedStatusKey = 'draft';
  let computedStatusLabel = 'DRAFT';
  let computedStatusBg = '#F59E0B';

  if (isCancelled) {
    computedStatusKey = 'cancelled';
    computedStatusLabel = 'CANCELLED';
    computedStatusBg = '#EF4444';
  } else if (isRejected) {
    computedStatusKey = 'rejected';
    computedStatusLabel = 'REJECTED';
    computedStatusBg = '#EF4444';
  } else if (isPendingApproval) {
    computedStatusKey = 'pending_approval';
    computedStatusLabel = 'PENDING APPROVAL';
    computedStatusBg = '#F59E0B';
  } else if (isDraft) {
    computedStatusKey = 'draft';
    computedStatusLabel = 'DRAFT';
    computedStatusBg = '#F59E0B';
  } else if (endStr && todayStr > endStr) {
    computedStatusKey = 'completed';
    computedStatusLabel = 'Tournament Completed';
    computedStatusBg = '#64748B';
  } else if (startStr && todayStr >= startStr && (!endStr || todayStr <= endStr)) {
    // "Ongoing" is strictly based on tournament match schedule
    computedStatusKey = 'ongoing';
    computedStatusLabel = 'Tournament Ongoing';
    computedStatusBg = '#0284C7';
  } else if (isFull) {
    computedStatusKey = 'registration_closed';
    computedStatusLabel = 'Registration Closed';
    computedStatusBg = '#F59E0B';
  } else if (regEndStr && todayStr > regEndStr) {
    computedStatusKey = 'registration_closed';
    computedStatusLabel = 'Registration Closed';
    computedStatusBg = '#F59E0B';
  } else if (regStartStr && todayStr < regStartStr) {
    computedStatusKey = 'upcoming';
    computedStatusLabel = 'Tournament Upcoming';
    computedStatusBg = '#6366F1';
  } else {
    // Within registration window
    computedStatusKey = 'registration_open';
    computedStatusLabel = 'Registration Open';
    computedStatusBg = '#10B981';
  }

  const lifecycleStatus = computedStatusKey;

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
    if (!isPublished) {
      Alert.alert(
        'Share Link Unavailable',
        isPendingApproval
          ? 'Your tournament request is awaiting turf owner approval. The invite link will become active once approved.'
          : isRejected
          ? 'This tournament request was declined by the turf venue.'
          : 'Please publish this tournament first to generate a shareable link.'
      );
      return;
    }
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
    if (!shareUrl || !isPublished) {
      Alert.alert(
        'Share Link Locked',
        'Shareable links are only available once the tournament is approved by the turf owner.'
      );
      return;
    }
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
      'Publishing will submit this tournament for turf owner approval. Once approved, it will become publicly joinable. Proceed?',
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
                if (updated.status === 'pending_approval' || updated.approvalStatus === 'pending') {
                  Alert.alert(
                    'Submitted for Approval! ⏳',
                    'Your tournament has been submitted to the turf owner for approval. You will receive an FCM push notification as soon as they respond.'
                  );
                } else {
                  Alert.alert(
                    'Tournament Published! 🎉',
                    'Your tournament is now live and published! You can now share the link with teams and players.',
                    [
                      { text: 'Share Now', onPress: handleShare },
                      { text: 'OK' },
                    ]
                  );
                }
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

  // ── Bracket & Match Management Handlers (Creator ONLY) ──
  const handleGenerateBracket = async () => {
    if (!isCreator) {
      Alert.alert('Access Denied', 'Only the tournament manager (creator) can generate match fixtures.');
      return;
    }

    const acceptedList = Array.isArray(tournament?.acceptedTeams) && tournament.acceptedTeams.length > 0
      ? tournament.acceptedTeams
      : (tournament?.registrations || []).filter((r) => r.status === 'accepted');

    if (acceptedList.length < 2) {
      Alert.alert(
        'Insufficient Accepted Teams',
        `At least 2 accepted teams are required to generate tournament matches and bracket fixtures.\n\nCurrently accepted: ${acceptedList.length} team(s).\nCapacity: ${totalTeams} teams.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Generate Tournament Bracket',
      `Generate knockout match fixtures for the ${acceptedList.length} accepted teams?\n\nNote: Matches will be formed using ONLY accepted teams (not empty capacity slots). Only you (the tournament creator) can manage the matches, conduct tosses, and record scores.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Bracket',
          style: 'default',
          onPress: async () => {
            setBracketActionLoading(true);
            try {
              const res = await generateBracketApi(tournament.id);
              const updated = res?.tournament || res?.data?.tournament;
              if (updated) {
                setTournament(updated);
                Alert.alert(
                  'Bracket Ready! ⚡',
                  `Successfully generated match bracket for ${acceptedList.length} accepted teams. You can now conduct tosses, enter scores, and advance winners.`
                );
              }
            } catch (err) {
              Alert.alert('Failed to Generate Bracket', err.message || 'Unable to generate tournament bracket.');
            } finally {
              setBracketActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenTossModal = (match) => {
    if (!isCreator) return;
    if (!match.teamA || !match.teamB) {
      Alert.alert('Match Incomplete', 'Both teams must be determined before conducting the toss.');
      return;
    }
    setSelectedMatchForToss(match);
    setTossWinnerId(match.toss?.wonBy || match.teamA.id);
    setTossDecision(match.toss?.decision || (isCricket ? 'bat' : 'kickoff'));
    setTossModalVisible(true);
  };

  const handleSaveToss = async () => {
    if (!selectedMatchForToss || !tossWinnerId) {
      Alert.alert('Required', 'Please select which team won the toss.');
      return;
    }
    setBracketActionLoading(true);
    try {
      const res = await conductMatchTossApi(tournament.id, selectedMatchForToss.id, {
        winnerTeamId: tossWinnerId,
        decision: tossDecision,
      });
      const updated = res?.tournament || res?.data?.tournament;
      if (updated) {
        setTournament(updated);
      }
      setTossModalVisible(false);
      Alert.alert('Toss Recorded! 🪙', res?.message || 'Coin toss recorded successfully.');
    } catch (err) {
      Alert.alert('Toss Error', err.message || 'Failed to record toss.');
    } finally {
      setBracketActionLoading(false);
    }
  };

  const handleOpenScoreModal = (match) => {
    if (!isCreator) return;
    if (!match.teamA || !match.teamB) {
      Alert.alert('Match Incomplete', 'Both teams must be determined before entering scores.');
      return;
    }
    setSelectedMatchForScore(match);
    setTeamAScoreInput(match.score?.teamA || '');
    setTeamBScoreInput(match.score?.teamB || '');
    setMatchSummaryInput(match.score?.summary || '');
    setScoreModalVisible(true);
  };

  const handleSaveScore = async () => {
    if (!selectedMatchForScore) return;
    if (!teamAScoreInput.trim() && !teamBScoreInput.trim()) {
      Alert.alert('Required', 'Please enter at least one team score.');
      return;
    }
    setBracketActionLoading(true);
    try {
      const res = await updateMatchScoreApi(tournament.id, selectedMatchForScore.id, {
        score: {
          teamA: teamAScoreInput.trim(),
          teamB: teamBScoreInput.trim(),
          summary: matchSummaryInput.trim(),
        },
        status: 'live',
      });
      const updated = res?.tournament || res?.data?.tournament;
      if (updated) {
        setTournament(updated);
      }
      setScoreModalVisible(false);
      Alert.alert('Score Updated! 📝', 'Match score has been updated.');
    } catch (err) {
      Alert.alert('Score Error', err.message || 'Failed to update score.');
    } finally {
      setBracketActionLoading(false);
    }
  };

  const handleOpenWinnerModal = (match) => {
    if (!isCreator) return;
    if (!match.teamA || !match.teamB) {
      Alert.alert('Match Incomplete', 'Both teams must be present to confirm a winner.');
      return;
    }
    setSelectedMatchForWinner(match);
    setWinnerTeamId(match.winner?.id || match.teamA.id);
    setWinnerModalVisible(true);
  };

  const handleConfirmWinner = async () => {
    if (!selectedMatchForWinner || !winnerTeamId) {
      Alert.alert('Required', 'Please select the winning team.');
      return;
    }
    const isFinal = !selectedMatchForWinner.nextMatchId;
    const teamObj = selectedMatchForWinner.teamA?.id === winnerTeamId
      ? selectedMatchForWinner.teamA
      : selectedMatchForWinner.teamB;
    const teamName = teamObj?.name || teamObj?.teamName || 'Selected Team';

    Alert.alert(
      isFinal ? 'Declare Tournament Champion 👑' : 'Advance Winner 🏆',
      isFinal
        ? `Declare ${teamName} as the official Champion of "${tournament.name}"? This will complete the tournament.`
        : `Confirm ${teamName} as the winner and advance them to the next round?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isFinal ? 'Declare Champion 👑' : 'Advance Winner 🏆',
          style: 'default',
          onPress: async () => {
            setBracketActionLoading(true);
            try {
              const res = await confirmMatchWinnerApi(tournament.id, selectedMatchForWinner.id, {
                winnerTeamId,
              });
              const updated = res?.tournament || res?.data?.tournament;
              if (updated) {
                setTournament(updated);
              }
              setWinnerModalVisible(false);
              Alert.alert(
                isFinal ? '👑 Champion Crowned!' : '🏆 Winner Advanced!',
                res?.message || `${teamName} has been recorded as the winner.`
              );
            } catch (err) {
              Alert.alert('Winner Error', err.message || 'Failed to confirm winner.');
            } finally {
              setBracketActionLoading(false);
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
        <Text style={{ fontSize: 13, color: C.subtext, textAlign: 'center', marginTop: 6, marginBottom: 16, paddingHorizontal: 24 }}>
          This tournament link is invalid, unapproved, private, or has ended.
        </Text>
        <TouchableOpacity
          style={[styles.backBtnPill, { backgroundColor: C.primary }]}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main');
            }
          }}
        >
          <Text style={styles.backBtnText}>Explore Tournaments</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const registrations = Array.isArray(tournament.registrations) ? tournament.registrations : [];
  const acceptedSquads = registrations.filter((r) => r.status === 'accepted');
  const pendingSquads = registrations.filter((r) => r.status === 'pending');
  const rejectedSquads = registrations.filter((r) => r.status === 'rejected');

  const manualTeamsWithPlayers = Array.isArray(tournament.teams)
    ? tournament.teams.filter((t) => Array.isArray(t.players) && t.players.length > 0)
    : [];

  const displayTeams = registrations.length > 0
    ? [...acceptedSquads, ...pendingSquads, ...rejectedSquads].map((r, idx) => ({
        id: r.id || `reg_${idx}`,
        name: r.teamName || `Team ${idx + 1}`,
        captainName: r.captainName,
        captainPhone: r.captainPhone,
        captainEmail: r.captainEmail,
        status: r.status || 'pending',
        rejectionReason: r.rejectionReason,
        players: Array.isArray(r.players) ? r.players : [],
        isRegistration: true,
      }))
    : manualTeamsWithPlayers.map((t, idx) => ({
        id: t.id || `manual_${idx}`,
        name: t.name || `Team ${idx + 1}`,
        captainName: t.captainName || null,
        status: 'accepted',
        players: Array.isArray(t.players) ? t.players : [],
        isRegistration: false,
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
                  backgroundColor: computedStatusBg,
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {computedStatusKey === 'registration_open' && remainingSlots > 0
                  ? `REGISTRATION OPEN • ${remainingSlots} SLOTS LEFT`
                  : computedStatusLabel.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Sport Chip on Hero Bottom Left */}
          <View style={styles.heroSportChip}>
            <Feather name="award" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.heroSportText}>{tournament.sport}</Text>
          </View>
        </View>

        {/* ── Creator Approval Status Banner (Requirement 4) ── */}
        {isOwner && (
          <>
            {isPendingApproval && (
              <View style={[styles.approvalStatusCard, { backgroundColor: dark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB', borderColor: '#F59E0B' }]}>
                <View style={styles.approvalStatusHeader}>
                  <View style={[styles.approvalStatusIconBox, { backgroundColor: '#F59E0B' }]}>
                    <Feather name="clock" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.approvalStatusTitle, { color: '#B45309' }]}>
                      Pending Turf Owner Approval
                    </Text>
                    <Text style={[styles.approvalStatusSub, { color: dark ? '#FCD34D' : '#92400E' }]}>
                      Waiting for {hostTurfName} to review & approve
                    </Text>
                  </View>
                </View>
                <Text style={[styles.approvalStatusDesc, { color: dark ? '#FDE68A' : '#78350F' }]}>
                  We have sent an instant mobile notification to the turf owner. Once approved, this tournament will become publicly visible, and you can share the invite link with teams.
                </Text>
                <View style={[styles.approvalNoticePill, { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}>
                  <Ionicons name="notifications-outline" size={13} color="#D97706" style={{ marginRight: 5 }} />
                  <Text style={[styles.approvalNoticePillText, { color: '#B45309' }]}>
                    Mobile notification sent to turf owner
                  </Text>
                </View>
              </View>
            )}

            {isRejected && (
              <View style={[styles.approvalStatusCard, { backgroundColor: dark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2', borderColor: '#EF4444' }]}>
                <View style={styles.approvalStatusHeader}>
                  <View style={[styles.approvalStatusIconBox, { backgroundColor: '#EF4444' }]}>
                    <Feather name="x-circle" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.approvalStatusTitle, { color: '#B91C1C' }]}>
                      Tournament Request Declined
                    </Text>
                    <Text style={[styles.approvalStatusSub, { color: dark ? '#FCA5A5' : '#991B1B' }]}>
                      The turf owner has rejected this tournament request
                    </Text>
                  </View>
                </View>
                {Boolean(tournament.rejectionReason) ? (
                  <View style={[styles.rejectionReasonBox, { backgroundColor: dark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
                    <Text style={[styles.rejectionReasonHeading, { color: '#991B1B' }]}>Reason from Turf Owner:</Text>
                    <Text style={[styles.rejectionReasonText, { color: '#7F1D1D' }]}>
                      "{tournament.rejectionReason}"
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.approvalStatusDesc, { color: dark ? '#FCA5A5' : '#7F1D1D' }]}>
                    This tournament request was declined by the venue. You may contact the turf or create a new tournament at another available date/venue.
                  </Text>
                )}
              </View>
            )}

            {isApproved && isCommunity && (
              <View style={[styles.approvalStatusCard, { backgroundColor: dark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: '#10B981' }]}>
                <View style={styles.approvalStatusHeader}>
                  <View style={[styles.approvalStatusIconBox, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.approvalStatusTitle, { color: '#047857' }]}>
                      Approved & Live! 🎉
                    </Text>
                    <Text style={[styles.approvalStatusSub, { color: dark ? '#6EE7B7' : '#065F46' }]}>
                      Approved by {hostTurfName} • Publicly joinable
                    </Text>
                  </View>
                </View>
                <Text style={[styles.approvalStatusDesc, { color: dark ? '#A7F3D0' : '#064E3B' }]}>
                  Your tournament is officially approved and live in the app. You can now invite teams and share your link!
                </Text>
              </View>
            )}
          </>
        )}

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

        {/* ── Registration Period Card ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <Text style={[styles.sectionHeading, { color: C.text }]}>REGISTRATION PERIOD</Text>
          <Text style={[styles.sectionSubHeading, { color: C.subtext }]}>
            When users are allowed to apply and register their teams
          </Text>

          <View style={styles.metricGrid}>
            {/* Registration Opens */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="calendar" size={16} color={C.primary} />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Registration Opens</Text>
              <Text style={[styles.metricVal, { color: C.text }]}>
                {tournament.registrationStartDate ? formatDate(tournament.registrationStartDate) : 'Open Now'}
              </Text>
            </View>

            {/* Registration Closes */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="clock" size={16} color="#F59E0B" />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Registration Closes</Text>
              <Text style={[styles.metricVal, { color: C.text }]}>
                {tournament.registrationEndDate ? formatDate(tournament.registrationEndDate) : 'Open'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Tournament Schedule Card ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <Text style={[styles.sectionHeading, { color: C.text }]}>TOURNAMENT SCHEDULE</Text>
          <Text style={[styles.sectionSubHeading, { color: C.subtext }]}>
            When the tournament games and matches take place
          </Text>

          <View style={styles.metricGrid}>
            {/* Tournament Starts */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="play-circle" size={16} color={C.primary} />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Tournament Starts</Text>
              <Text style={[styles.metricVal, { color: C.text }]}>{formatDate(tournament.startDate)}</Text>
            </View>

            {/* Tournament Ends */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="flag" size={16} color="#0284C7" />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Tournament Ends</Text>
              <Text style={[styles.metricVal, { color: C.text }]}>{formatDate(tournament.endDate)}</Text>
            </View>
          </View>
        </View>

        {/* ── Structure & Squad Format Card ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <Text style={[styles.sectionHeading, { color: C.text }]}>Tournament Structure</Text>

          <View style={styles.metricGrid}>
            {/* Teams */}
            <View style={[styles.metricBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Ionicons name="people-outline" size={18} color="#7C3AED" />
              <Text style={[styles.metricLabel, { color: C.subtext }]}>Total Capacity</Text>
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
            <View style={[styles.cricketOversRow, { backgroundColor: dark ? '#1E293B' : '#FEF3C7', marginTop: 12 }]}>
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

        {/* ── Register CTA (Part 1 & 3) ── */}
        {!isOwner && !myRegistration && (
          <View style={styles.registerCtaWrap}>
            {(() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const startStr = String(tournament.startDate || '').slice(0, 10);
              const endStr = String(tournament.endDate || '').slice(0, 10);
              const regStartStr = tournament.registrationStartDate ? String(tournament.registrationStartDate).slice(0, 10) : null;
              const regEndStr = tournament.registrationEndDate ? String(tournament.registrationEndDate).slice(0, 10) : null;

              const isCompleted = (endStr && todayStr > endStr) || lifecycleStatus === 'completed';
              const isOngoing = (startStr && todayStr >= startStr && (!endStr || todayStr <= endStr)) || lifecycleStatus === 'ongoing';
              const isTeamsFull = isFull || remainingSlots <= 0 || lifecycleStatus === 'full';
              const isRegEnded = (regEndStr && todayStr > regEndStr) || lifecycleStatus === 'registration_closed';
              const isRegNotOpen = Boolean(regStartStr && todayStr < regStartStr);

              if (isPendingApproval || tournament.status === 'pending_approval') {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="clock" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: '#D97706' }]}>Awaiting Turf Owner Approval (Registration Not Open)</Text>
                  </View>
                );
              }

              if (isRejected || tournament.status === 'rejected') {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="slash" size={16} color={C.error} style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: C.error }]}>Tournament Request Declined</Text>
                  </View>
                );
              }

              if (tournament.status === 'draft') {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="file-text" size={16} color={C.subtext} style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: C.subtext }]}>Draft Tournament (Not Published)</Text>
                  </View>
                );
              }

              if (tournament.status === 'cancelled') {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="slash" size={16} color={C.error} style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: C.error }]}>Tournament Cancelled</Text>
                  </View>
                );
              }

              if (isCompleted) {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="flag" size={16} color={C.subtext} style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: C.subtext }]}>Tournament Completed</Text>
                  </View>
                );
              }

              if (isOngoing) {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="activity" size={16} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: '#0284C7' }]}>Tournament Ongoing (Registration Closed)</Text>
                  </View>
                );
              }

              if (isTeamsFull) {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="lock" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: '#EF4444' }]}>Teams Full</Text>
                  </View>
                );
              }

              if (isRegEnded) {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="clock" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: '#D97706' }]}>Registration Closed</Text>
                  </View>
                );
              }

              if (isRegNotOpen) {
                return (
                  <View style={[styles.blockedCtaCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                    <Feather name="calendar" size={16} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={[styles.blockedCtaText, { color: '#0284C7' }]}>
                      Registration Opens on {formatDate(tournament.registrationStartDate)}
                    </Text>
                  </View>
                );
              }

              // Registration is Open!
              return (
                <TouchableOpacity
                  style={[styles.registerBigBtn, { backgroundColor: '#0F766E' }, SHADOW.floating]}
                  onPress={() => {
                    if (!user) {
                      navigation.navigate('Login');
                      return;
                    }
                    navigation.navigate('RegisterTeam', { tournament });
                  }}
                  activeOpacity={0.88}
                >
                  <Ionicons name="trophy-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.registerBigBtnText}>Register Your Team</Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}
        {/* ── Tournament Bracket & Matches Section ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="git-network-outline" size={20} color="#0F766E" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionHeading, { color: C.text, marginBottom: 2 }]}>
                  Tournament Bracket & Matches
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: C.subtext }]}>
                {tournament.bracket && tournament.bracket.rounds
                  ? `${tournament.bracket.teamsCount || (tournament.acceptedTeams || []).length} Teams • ${tournament.bracket.totalRounds || tournament.bracket.rounds.length} Rounds Knockout Tree`
                  : 'Knockout fixture tree generated from accepted registrations'}
              </Text>
            </View>

            {/* Access Role Badge */}
            <View
              style={[
                styles.bracketRoleBadge,
                {
                  backgroundColor: isCreator
                    ? 'rgba(15, 118, 110, 0.15)'
                    : 'rgba(100, 116, 139, 0.12)',
                  borderColor: isCreator ? '#0F766E' : '#94A3B8',
                },
              ]}
            >
              <Text
                style={[
                  styles.bracketRoleBadgeText,
                  { color: isCreator ? '#0F766E' : '#64748B' },
                ]}
              >
                {isCreator ? '👑 MANAGER ACCESS' : '👁️ VIEW ONLY'}
              </Text>
            </View>
          </View>

          {/* ── Champion Crown Banner (If Tournament Won) ── */}
          {Boolean(tournament.bracket?.winner) && (
            <View style={[styles.championBannerWrap, { borderColor: '#F59E0B' }]}>
              <View style={styles.championBannerIconRow}>
                <Text style={{ fontSize: 26 }}>👑</Text>
                <Text style={styles.championBannerTitle}>TOURNAMENT CHAMPION</Text>
                <Text style={{ fontSize: 26 }}>🏆</Text>
              </View>
              <Text style={styles.championBannerTeamName}>
                {tournament.bracket.winner.name || tournament.bracket.winner.teamName}
              </Text>
              <Text style={styles.championBannerSub}>
                Official Winner of {tournament.name}
              </Text>
            </View>
          )}

          {/* ── Bracket Not Yet Generated ── */}
          {!tournament.bracket || !Array.isArray(tournament.bracket.rounds) ? (
            <View style={[styles.bracketEmptyWrap, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              {isCreator ? (
                <>
                  <View style={[styles.bracketEmptyIconBox, { backgroundColor: 'rgba(15, 118, 110, 0.12)' }]}>
                    <Ionicons name="git-branch" size={28} color="#0F766E" />
                  </View>
                  <Text style={[styles.bracketEmptyTitle, { color: C.text }]}>
                    Generate Knockout Bracket
                  </Text>
                  <Text style={[styles.bracketEmptyDesc, { color: C.subtext }]}>
                    As the Tournament Creator & Manager, you alone control the match fixtures. Matches will be generated using ONLY accepted teams ({(() => {
                      const count = (tournament.acceptedTeams || []).length;
                      return `${count} accepted`;
                    })()}), not empty capacity slots.
                  </Text>

                  {/* Accepted Teams Stats Pill */}
                  <View style={[styles.acceptedTeamsStatPill, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Ionicons name="people" size={15} color="#0F766E" style={{ marginRight: 6 }} />
                    <Text style={[styles.acceptedTeamsStatText, { color: C.text }]}>
                      Accepted Teams: <Text style={{ fontWeight: '800', color: '#0F766E' }}>{(tournament.acceptedTeams || []).length}</Text> / {totalTeams}
                    </Text>
                  </View>

                  {(tournament.acceptedTeams || []).length < 2 ? (
                    <View style={[styles.insufficientTeamsCard, { backgroundColor: dark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB', borderColor: '#F59E0B' }]}>
                      <Feather name="alert-circle" size={16} color="#D97706" style={{ marginRight: 8 }} />
                      <Text style={[styles.insufficientTeamsText, { color: dark ? '#FCD34D' : '#92400E' }]}>
                        At least 2 accepted teams are required to generate tournament match fixtures. Currently accepted: {(tournament.acceptedTeams || []).length}.
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.generateBracketBtn, { backgroundColor: '#0F766E' }, SHADOW.floating]}
                      onPress={handleGenerateBracket}
                      disabled={bracketActionLoading}
                      activeOpacity={0.88}
                    >
                      {bracketActionLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="flash" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.generateBracketBtnText}>
                            Generate Matches & Bracket ({(tournament.acceptedTeams || []).length} Teams)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <View style={[styles.bracketEmptyIconBox, { backgroundColor: 'rgba(100, 116, 139, 0.12)' }]}>
                    <Feather name="clock" size={26} color="#64748B" />
                  </View>
                  <Text style={[styles.bracketEmptyTitle, { color: C.text }]}>
                    Match Fixtures Pending
                  </Text>
                  <Text style={[styles.bracketEmptyDesc, { color: C.subtext }]}>
                    The tournament creator has not generated the match bracket yet. Fixtures, toss results, scores, and winner progression will appear here once published.
                  </Text>
                  <View style={[styles.viewOnlyBadgePill, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Feather name="eye" size={13} color="#64748B" style={{ marginRight: 5 }} />
                    <Text style={[styles.viewOnlyBadgeText, { color: C.subtext }]}>
                      You will be notified once matches are announced
                    </Text>
                  </View>
                </>
              )}
            </View>
          ) : (
            <>
              {/* ── Round Filter Tabs ── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roundTabsScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.roundTabPill,
                    selectedRoundTab === 'all'
                      ? { backgroundColor: '#0F766E', borderColor: '#0F766E' }
                      : { backgroundColor: C.bgSoft, borderColor: C.border },
                  ]}
                  onPress={() => setSelectedRoundTab('all')}
                >
                  <Text
                    style={[
                      styles.roundTabPillText,
                      { color: selectedRoundTab === 'all' ? '#FFFFFF' : C.text },
                    ]}
                  >
                    All Rounds
                  </Text>
                </TouchableOpacity>

                {tournament.bracket.rounds.map((round) => {
                  const isSelected = String(selectedRoundTab) === String(round.roundNumber);
                  return (
                    <TouchableOpacity
                      key={round.roundNumber}
                      style={[
                        styles.roundTabPill,
                        isSelected
                          ? { backgroundColor: '#0F766E', borderColor: '#0F766E' }
                          : { backgroundColor: C.bgSoft, borderColor: C.border },
                      ]}
                      onPress={() => setSelectedRoundTab(String(round.roundNumber))}
                    >
                      <Text
                        style={[
                          styles.roundTabPillText,
                          { color: isSelected ? '#FFFFFF' : C.text },
                        ]}
                      >
                        {round.name} ({round.matches?.length || 0})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ── Matches in Filtered Round(s) ── */}
              {tournament.bracket.rounds
                .filter(
                  (round) =>
                    selectedRoundTab === 'all' || String(selectedRoundTab) === String(round.roundNumber)
                )
                .map((round) => (
                  <View key={round.roundNumber} style={styles.roundGroupWrap}>
                    <View style={styles.roundHeaderRow}>
                      <View style={[styles.roundDot, { backgroundColor: '#0F766E' }]} />
                      <Text style={[styles.roundGroupName, { color: C.text }]}>{round.name}</Text>
                      <Text style={[styles.roundGroupCount, { color: C.subtext }]}>
                        {round.matches?.length || 0} {round.matches?.length === 1 ? 'Match' : 'Matches'}
                      </Text>
                    </View>

                    {(round.matches || []).map((match, mIdx) => {
                      const isCompleted = match.status === 'completed';
                      const isLive = match.status === 'live';
                      const isTossDone = match.status === 'toss';
                      const isBye = Boolean(match.isBye);
                      const hasBothTeams = Boolean(match.teamA && match.teamB);
                      const isMatchFinal = !match.nextMatchId;

                      const teamAWon = match.winner && match.teamA && match.winner.id === match.teamA.id;
                      const teamBWon = match.winner && match.teamB && match.winner.id === match.teamB.id;

                      let statusBadgeBg = '#E2E8F0';
                      let statusBadgeText = '#475569';
                      let statusBadgeLabel = 'Upcoming';

                      if (isCompleted) {
                        statusBadgeBg = 'rgba(16, 185, 129, 0.15)';
                        statusBadgeText = '#10B981';
                        statusBadgeLabel = 'Completed';
                      } else if (isLive) {
                        statusBadgeBg = 'rgba(239, 68, 68, 0.15)';
                        statusBadgeText = '#EF4444';
                        statusBadgeLabel = '● LIVE';
                      } else if (isTossDone) {
                        statusBadgeBg = 'rgba(245, 158, 11, 0.15)';
                        statusBadgeText = '#D97706';
                        statusBadgeLabel = 'Toss Done';
                      } else if (isBye) {
                        statusBadgeBg = 'rgba(100, 116, 139, 0.12)';
                        statusBadgeText = '#64748B';
                        statusBadgeLabel = 'BYE';
                      }

                      return (
                        <View
                          key={match.id || mIdx}
                          style={[
                            styles.bracketMatchCard,
                            { backgroundColor: C.bgSoft, borderColor: C.border },
                            teamAWon || teamBWon ? { borderColor: '#10B981' } : null,
                          ]}
                        >
                          {/* Match Card Top Row */}
                          <View style={styles.matchCardTopRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[styles.matchNumberText, { color: C.subtext }]}>
                                {round.name} • Match #{match.matchNumber || mIdx + 1}
                              </Text>
                              {isMatchFinal && (
                                <View style={[styles.finalBadgePill, { backgroundColor: '#F59E0B' }]}>
                                  <Text style={styles.finalBadgeText}>CHAMPIONSHIP FINAL</Text>
                                </View>
                              )}
                            </View>

                            <View style={[styles.matchStatusBadge, { backgroundColor: statusBadgeBg }]}>
                              <Text style={[styles.matchStatusBadgeText, { color: statusBadgeText }]}>
                                {statusBadgeLabel}
                              </Text>
                            </View>
                          </View>

                          {/* Toss Result Banner */}
                          {Boolean(match.toss) && (
                            <View style={[styles.tossBannerRow, { backgroundColor: dark ? '#1E293B' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                              <Text style={{ fontSize: 13, marginRight: 6 }}>🪙</Text>
                              <Text style={[styles.tossBannerText, { color: dark ? '#FCD34D' : '#92400E' }]}>
                                <Text style={{ fontWeight: '800' }}>{match.toss.winnerName}</Text> won the toss & elected to{' '}
                                <Text style={{ fontWeight: '800', textTransform: 'uppercase' }}>{match.toss.decision}</Text>.
                              </Text>
                            </View>
                          )}

                          {/* Teams Display Row */}
                          <View style={styles.teamsVersusBox}>
                            {/* Team A */}
                            <View
                              style={[
                                styles.bracketTeamRow,
                                teamAWon ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : null,
                              ]}
                            >
                              <View style={styles.teamInfoCol}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text
                                    style={[
                                      styles.bracketTeamName,
                                      { color: C.text },
                                      teamAWon ? { color: '#047857', fontWeight: '800' } : null,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {match.teamA?.name || match.teamA?.teamName || 'TBD (Waiting)'}
                                  </Text>
                                  {teamAWon && (
                                    <View style={styles.winnerCheckBadge}>
                                      <Feather name="check" size={11} color="#FFFFFF" />
                                    </View>
                                  )}
                                </View>
                                {Boolean(match.teamA?.captainName) && (
                                  <Text style={[styles.bracketCaptainName, { color: C.subtext }]}>
                                    Capt: {match.teamA.captainName}
                                  </Text>
                                )}
                              </View>

                              {/* Team A Score Pill */}
                              {Boolean(match.score?.teamA) ? (
                                <View style={[styles.matchScorePill, { backgroundColor: C.card, borderColor: C.border }]}>
                                  <Text style={[styles.matchScorePillText, { color: C.text }]}>
                                    {match.score.teamA}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Versus Divider */}
                            <View style={styles.versusDividerRow}>
                              <View style={[styles.versusLine, { backgroundColor: C.border }]} />
                              <Text style={[styles.versusText, { color: C.subtext }]}>
                                {isBye ? 'BYE' : 'VS'}
                              </Text>
                              <View style={[styles.versusLine, { backgroundColor: C.border }]} />
                            </View>

                            {/* Team B */}
                            <View
                              style={[
                                styles.bracketTeamRow,
                                teamBWon ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : null,
                              ]}
                            >
                              <View style={styles.teamInfoCol}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text
                                    style={[
                                      styles.bracketTeamName,
                                      { color: C.text },
                                      teamBWon ? { color: '#047857', fontWeight: '800' } : null,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {isBye
                                      ? '(Advances Automatically)'
                                      : (match.teamB?.name || match.teamB?.teamName || 'TBD (Waiting)')}
                                  </Text>
                                  {teamBWon && (
                                    <View style={styles.winnerCheckBadge}>
                                      <Feather name="check" size={11} color="#FFFFFF" />
                                    </View>
                                  )}
                                </View>
                                {Boolean(match.teamB?.captainName) && (
                                  <Text style={[styles.bracketCaptainName, { color: C.subtext }]}>
                                    Capt: {match.teamB.captainName}
                                  </Text>
                                )}
                              </View>

                              {/* Team B Score Pill */}
                              {Boolean(match.score?.teamB) ? (
                                <View style={[styles.matchScorePill, { backgroundColor: C.card, borderColor: C.border }]}>
                                  <Text style={[styles.matchScorePillText, { color: C.text }]}>
                                    {match.score.teamB}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          {/* Match Summary Note if Entered */}
                          {Boolean(match.score?.summary) && (
                            <View style={[styles.scoreSummaryBox, { backgroundColor: C.card, borderColor: C.border }]}>
                              <Ionicons name="chatbubble-ellipses-outline" size={13} color="#0F766E" style={{ marginRight: 6 }} />
                              <Text style={[styles.scoreSummaryText, { color: C.text }]} numberOfLines={2}>
                                {match.score.summary}
                              </Text>
                            </View>
                          )}

                          {/* ── STRICT CREATOR MANAGEMENT CONTROLS ── */}
                          {isCreator && !isCompleted && hasBothTeams && (
                            <View style={[styles.managerControlsBar, { backgroundColor: C.card, borderColor: C.border }]}>
                              <View style={styles.managerControlsHeader}>
                                <Feather name="sliders" size={12} color="#0F766E" style={{ marginRight: 5 }} />
                                <Text style={[styles.managerControlsTitle, { color: '#0F766E' }]}>
                                  Manager Controls
                                </Text>
                              </View>

                              <View style={styles.managerBtnsRow}>
                                {/* Toss Control */}
                                <TouchableOpacity
                                  style={[styles.managerActionBtn, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}
                                  onPress={() => handleOpenTossModal(match)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={{ fontSize: 13, marginRight: 4 }}>🪙</Text>
                                  <Text style={[styles.managerActionBtnText, { color: '#B45309' }]}>
                                    {match.toss ? 'Edit Toss' : 'Toss'}
                                  </Text>
                                </TouchableOpacity>

                                {/* Score Entry Control */}
                                <TouchableOpacity
                                  style={[styles.managerActionBtn, { borderColor: '#0284C7', backgroundColor: 'rgba(2, 132, 199, 0.08)' }]}
                                  onPress={() => handleOpenScoreModal(match)}
                                  activeOpacity={0.8}
                                >
                                  <Feather name="edit-3" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                                  <Text style={[styles.managerActionBtnText, { color: '#0284C7' }]}>
                                    {match.score ? 'Edit Score' : 'Score'}
                                  </Text>
                                </TouchableOpacity>

                                {/* Winner / Advance Control */}
                                <TouchableOpacity
                                  style={[
                                    styles.managerActionBtn,
                                    {
                                      backgroundColor: isMatchFinal ? '#D97706' : '#0F766E',
                                      borderColor: isMatchFinal ? '#D97706' : '#0F766E',
                                      flex: 1.3,
                                    },
                                  ]}
                                  onPress={() => handleOpenWinnerModal(match)}
                                  activeOpacity={0.85}
                                >
                                  <Text style={{ fontSize: 13, marginRight: 4 }}>
                                    {isMatchFinal ? '👑' : '🏆'}
                                  </Text>
                                  <Text style={[styles.managerActionBtnText, { color: '#FFFFFF', fontWeight: '800' }]}>
                                    {isMatchFinal ? 'Crown Champion' : 'Advance Winner'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}

                          {/* ── VIEW ONLY NOTICE FOR OTHER USERS ── */}
                          {!isCreator && isCompleted && (
                            <View style={styles.viewOnlyWinnerNotice}>
                              <Ionicons name="trophy" size={13} color="#10B981" style={{ marginRight: 5 }} />
                              <Text style={[styles.viewOnlyWinnerText, { color: '#047857' }]}>
                                Match Winner: <Text style={{ fontWeight: '800' }}>{match.winner?.name || match.winner?.teamName}</Text>
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
            </>
          )}
        </View>
        {/* ── Teams & Squad Rosters Section ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionHeading, { color: C.text, marginBottom: 2 }]}>Teams & Squads</Text>
              <Text style={[styles.sectionSubtitle, { color: C.subtext }]}>
                {acceptedSquads.length} / {totalTeams} Teams Confirmed • {remainingSlots} Slots Left • Max {maxPlayersPerTeam} players/team
              </Text>
            </View>
          </View>

          {displayTeams.length === 0 ? (
            <View style={[styles.emptyTeamsCard, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="shield" size={32} color={C.subtext} style={{ opacity: 0.5, marginBottom: 8 }} />
              <Text style={[styles.emptyTeamsTitle, { color: C.text }]}>No Teams Registered Yet</Text>
              <Text style={[styles.emptyTeamsSub, { color: C.subtext }]}>
                Teams that register will appear here with their confirmed squad rosters.
              </Text>
            </View>
          ) : (
            displayTeams.map((team, idx) => {
              const players = Array.isArray(team.players) ? team.players : [];
              const isFull = players.length >= maxPlayersPerTeam;
              const isExpanded = expandedTeams.has(team.id);

              let statusBg = 'rgba(16, 185, 129, 0.15)';
              let statusBorder = '#10B981';
              let statusText = '#10B981';
              let statusLabel = 'Accepted';

              if (team.status === 'pending') {
                statusBg = 'rgba(245, 158, 11, 0.15)';
                statusBorder = '#F59E0B';
                statusText = '#D97706';
                statusLabel = 'Pending';
              } else if (team.status === 'rejected') {
                statusBg = 'rgba(239, 68, 68, 0.15)';
                statusBorder = '#EF4444';
                statusText = '#EF4444';
                statusLabel = 'Rejected';
              }

              return (
                <View
                  key={team.id || idx}
                  style={[
                    styles.teamCard,
                    { backgroundColor: C.bgSoft, borderColor: C.border },
                  ]}
                >
                  {/* Team Card Header */}
                  <TouchableOpacity
                    style={styles.teamCardHeader}
                    onPress={() => toggleTeamExpand(team.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.teamNameText, { color: C.text }]} numberOfLines={1}>
                        {team.name}
                      </Text>
                      {Boolean(team.captainName) && (
                        <Text style={[styles.teamCaptainText, { color: C.subtext }]}>
                          Captain: <Text style={{ color: C.text, fontWeight: '700' }}>{team.captainName}</Text>
                        </Text>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {/* Status Badge */}
                      <View
                        style={[
                          styles.teamStatusBadge,
                          { backgroundColor: statusBg, borderColor: statusBorder },
                        ]}
                      >
                        <Text style={[styles.teamStatusText, { color: statusText }]}>
                          {statusLabel}
                        </Text>
                      </View>

                      {/* Capacity Pill */}
                      <View
                        style={[
                          styles.capacityPill,
                          {
                            backgroundColor: isFull ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.12)',
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

                      {players.length > 0 && (
                        <Feather
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={C.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Toggle View Squad Button */}
                  {players.length > 0 && (
                    <TouchableOpacity
                      style={styles.toggleSquadBtn}
                      onPress={() => toggleTeamExpand(team.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.toggleSquadText, { color: C.primary }]}>
                        {isExpanded ? 'Hide Squad' : `View Squad (${players.length || maxPlayersPerTeam})`}
                      </Text>
                      <Feather
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={C.primary}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Expanded Players List */}
                  {isExpanded && players.length > 0 && (
                    <View style={[styles.rosterListWrap, { borderColor: C.border }]}>
                      {players.map((p, pIdx) => (
                        <View
                          key={p.id || p.index || pIdx}
                          style={[styles.rosterPlayerRow, { borderBottomColor: C.border }]}
                        >
                          <View style={[styles.rosterNumberBadge, { backgroundColor: C.primaryLight }]}>
                            <Text style={[styles.rosterNumberText, { color: C.primary }]}>
                              #{p.index || pIdx + 1}
                            </Text>
                          </View>
                          <Text style={[styles.rosterPlayerName, { color: C.text }]}>{p.name}</Text>
                          {Boolean(p.phone) && (
                            <Text style={[styles.rosterPlayerPhone, { color: C.subtext }]}>{p.phone}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Rejection Reason Notice if Rejected */}
                  {team.status === 'rejected' && Boolean(team.rejectionReason) && (
                    <View style={styles.rejectedReasonBox}>
                      <Text style={styles.rejectedReasonLabel}>Rejection Reason: </Text>
                      <Text style={styles.rejectedReasonValue}>{team.rejectionReason}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

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

          {isPublished ? (
            <>
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
            </>
          ) : (
            <View style={[styles.lockedShareBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="lock" size={20} color={C.subtext} style={{ marginBottom: 6 }} />
              <Text style={[styles.lockedShareTitle, { color: C.text }]}>Shareable Invite Link Locked</Text>
              <Text style={[styles.lockedShareSub, { color: C.subtext }]}>
                {isPendingApproval
                  ? 'The shareable link will be unlocked as soon as the turf owner approves your tournament request.'
                  : isRejected
                  ? 'This tournament request was declined by the turf venue.'
                  : 'Publish your tournament to activate the shareable link.'}
              </Text>
            </View>
          )}
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

      {/* ── Conduct Match Coin Toss Modal (Creator Only) ── */}
      <Modal visible={tossModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>🪙</Text>
                <View>
                  <Text style={[styles.modalTitle, { color: C.text }]}>Conduct Match Toss</Text>
                  <Text style={[styles.modalSub, { color: C.subtext }]}>
                    {selectedMatchForToss?.roundName || 'Match'} • Toss Recording
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setTossModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalInputLabel, { color: C.text }]}>
              Which team won the coin toss? <Text style={{ color: C.error }}>*</Text>
            </Text>
            <View style={styles.modalOptionGrid}>
              {/* Team A */}
              <TouchableOpacity
                style={[
                  styles.modalSelectCard,
                  { backgroundColor: C.bgSoft, borderColor: C.border },
                  tossWinnerId === selectedMatchForToss?.teamA?.id
                    ? { borderColor: '#0F766E', backgroundColor: 'rgba(15, 118, 110, 0.1)' }
                    : null,
                ]}
                onPress={() => setTossWinnerId(selectedMatchForToss?.teamA?.id)}
                activeOpacity={0.8}
              >
                <View style={styles.modalSelectRadio}>
                  {tossWinnerId === selectedMatchForToss?.teamA?.id && (
                    <View style={[styles.modalRadioInner, { backgroundColor: '#0F766E' }]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.modalSelectCardText,
                    { color: C.text },
                    tossWinnerId === selectedMatchForToss?.teamA?.id ? { fontWeight: '800', color: '#0F766E' } : null,
                  ]}
                  numberOfLines={1}
                >
                  {selectedMatchForToss?.teamA?.name || 'Team A'}
                </Text>
              </TouchableOpacity>

              {/* Team B */}
              <TouchableOpacity
                style={[
                  styles.modalSelectCard,
                  { backgroundColor: C.bgSoft, borderColor: C.border },
                  tossWinnerId === selectedMatchForToss?.teamB?.id
                    ? { borderColor: '#0F766E', backgroundColor: 'rgba(15, 118, 110, 0.1)' }
                    : null,
                ]}
                onPress={() => setTossWinnerId(selectedMatchForToss?.teamB?.id)}
                activeOpacity={0.8}
              >
                <View style={styles.modalSelectRadio}>
                  {tossWinnerId === selectedMatchForToss?.teamB?.id && (
                    <View style={[styles.modalRadioInner, { backgroundColor: '#0F766E' }]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.modalSelectCardText,
                    { color: C.text },
                    tossWinnerId === selectedMatchForToss?.teamB?.id ? { fontWeight: '800', color: '#0F766E' } : null,
                  ]}
                  numberOfLines={1}
                >
                  {selectedMatchForToss?.teamB?.name || 'Team B'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalInputLabel, { color: C.text, marginTop: 14 }]}>
              Toss Winner Elected To:
            </Text>
            <View style={styles.modalOptionGrid}>
              {isCricket ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.modalDecisionBtn,
                      tossDecision === 'bat'
                        ? { backgroundColor: '#0F766E', borderColor: '#0F766E' }
                        : { backgroundColor: C.bgSoft, borderColor: C.border },
                    ]}
                    onPress={() => setTossDecision('bat')}
                  >
                    <Text
                      style={[
                        styles.modalDecisionBtnText,
                        { color: tossDecision === 'bat' ? '#FFFFFF' : C.text },
                      ]}
                    >
                      🏏 Bat First
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalDecisionBtn,
                      tossDecision === 'bowl'
                        ? { backgroundColor: '#0F766E', borderColor: '#0F766E' }
                        : { backgroundColor: C.bgSoft, borderColor: C.border },
                    ]}
                    onPress={() => setTossDecision('bowl')}
                  >
                    <Text
                      style={[
                        styles.modalDecisionBtnText,
                        { color: tossDecision === 'bowl' ? '#FFFFFF' : C.text },
                      ]}
                    >
                      🎯 Bowl First
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.modalDecisionBtn,
                      tossDecision === 'kickoff'
                        ? { backgroundColor: '#0F766E', borderColor: '#0F766E' }
                        : { backgroundColor: C.bgSoft, borderColor: C.border },
                    ]}
                    onPress={() => setTossDecision('kickoff')}
                  >
                    <Text
                      style={[
                        styles.modalDecisionBtnText,
                        { color: tossDecision === 'kickoff' ? '#FFFFFF' : C.text },
                      ]}
                    >
                      ⚽ Kickoff First
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalDecisionBtn,
                      tossDecision === 'side'
                        ? { backgroundColor: '#0F766E', borderColor: '#0F766E' }
                        : { backgroundColor: C.bgSoft, borderColor: C.border },
                    ]}
                    onPress={() => setTossDecision('side')}
                  >
                    <Text
                      style={[
                        styles.modalDecisionBtnText,
                        { color: tossDecision === 'side' ? '#FFFFFF' : C.text },
                      ]}
                    >
                      🛡️ Choose Side
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.border }]}
                onPress={() => setTossModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: C.subtext }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#0F766E' }]}
                onPress={handleSaveToss}
                disabled={bracketActionLoading}
              >
                {bracketActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Record Toss</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Enter Match Score Modal (Creator Only) ── */}
      <Modal visible={scoreModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="edit-3" size={20} color="#0284C7" style={{ marginRight: 8 }} />
                <View>
                  <Text style={[styles.modalTitle, { color: C.text }]}>Enter Match Score</Text>
                  <Text style={[styles.modalSub, { color: C.subtext }]}>
                    {selectedMatchForScore?.roundName} • Live / Final Score Entry
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setScoreModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            {/* Team A Score */}
            <Text style={[styles.modalInputLabel, { color: C.text }]}>
              {selectedMatchForScore?.teamA?.name || 'Team A'} Score:
            </Text>
            <TextInput
              style={[styles.modalTextInput, { backgroundColor: C.bgSoft, color: C.text, borderColor: C.border }]}
              placeholder={isCricket ? "e.g. 142/6 (10.0 ov)" : "e.g. 2"}
              placeholderTextColor={C.subtext}
              value={teamAScoreInput}
              onChangeText={setTeamAScoreInput}
            />

            {/* Team B Score */}
            <Text style={[styles.modalInputLabel, { color: C.text }]}>
              {selectedMatchForScore?.teamB?.name || 'Team B'} Score:
            </Text>
            <TextInput
              style={[styles.modalTextInput, { backgroundColor: C.bgSoft, color: C.text, borderColor: C.border }]}
              placeholder={isCricket ? "e.g. 138/9 (10.0 ov)" : "e.g. 1"}
              placeholderTextColor={C.subtext}
              value={teamBScoreInput}
              onChangeText={setTeamBScoreInput}
            />

            {/* Summary Note */}
            <Text style={[styles.modalInputLabel, { color: C.subtext, fontSize: 12 }]}>
              Match Summary / Status Note (Optional):
            </Text>
            <TextInput
              style={[styles.modalTextInput, { backgroundColor: C.bgSoft, color: C.text, borderColor: C.border }]}
              placeholder="e.g. Spartans CC won by 4 runs or Inning break"
              placeholderTextColor={C.subtext}
              value={matchSummaryInput}
              onChangeText={setMatchSummaryInput}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.border }]}
                onPress={() => setScoreModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: C.subtext }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#0284C7' }]}
                onPress={handleSaveScore}
                disabled={bracketActionLoading}
              >
                {bracketActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Score</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Select Winner & Advance Modal (Creator Only) ── */}
      <Modal visible={winnerModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, marginRight: 8 }}>
                  {!selectedMatchForWinner?.nextMatchId ? '👑' : '🏆'}
                </Text>
                <View>
                  <Text style={[styles.modalTitle, { color: C.text }]}>
                    {!selectedMatchForWinner?.nextMatchId ? 'Declare Champion 👑' : 'Confirm Match Winner 🏆'}
                  </Text>
                  <Text style={[styles.modalSub, { color: C.subtext }]}>
                    {!selectedMatchForWinner?.nextMatchId ? 'Tournament Final Match' : selectedMatchForWinner?.roundName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setWinnerModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalInputLabel, { color: C.text }]}>
              Select the winning team to {!selectedMatchForWinner?.nextMatchId ? 'crown as tournament champion:' : 'advance to the next round:'}
            </Text>

            <View style={{ marginVertical: 8 }}>
              {/* Team A */}
              <TouchableOpacity
                style={[
                  styles.winnerSelectCard,
                  { backgroundColor: C.bgSoft, borderColor: C.border },
                  winnerTeamId === selectedMatchForWinner?.teamA?.id
                    ? { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }
                    : null,
                ]}
                onPress={() => setWinnerTeamId(selectedMatchForWinner?.teamA?.id)}
                activeOpacity={0.8}
              >
                <View style={styles.winnerRadioBox}>
                  {winnerTeamId === selectedMatchForWinner?.teamA?.id && (
                    <Feather name="check" size={14} color="#10B981" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={[
                      styles.winnerTeamNameText,
                      { color: C.text },
                      winnerTeamId === selectedMatchForWinner?.teamA?.id ? { fontWeight: '800', color: '#047857' } : null,
                    ]}
                  >
                    {selectedMatchForWinner?.teamA?.name || 'Team A'}
                  </Text>
                  {Boolean(selectedMatchForWinner?.score?.teamA) && (
                    <Text style={[styles.winnerScoreText, { color: C.subtext }]}>
                      Score: {selectedMatchForWinner.score.teamA}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Team B */}
              <TouchableOpacity
                style={[
                  styles.winnerSelectCard,
                  { backgroundColor: C.bgSoft, borderColor: C.border, marginTop: 10 },
                  winnerTeamId === selectedMatchForWinner?.teamB?.id
                    ? { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }
                    : null,
                ]}
                onPress={() => setWinnerTeamId(selectedMatchForWinner?.teamB?.id)}
                activeOpacity={0.8}
              >
                <View style={styles.winnerRadioBox}>
                  {winnerTeamId === selectedMatchForWinner?.teamB?.id && (
                    <Feather name="check" size={14} color="#10B981" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={[
                      styles.winnerTeamNameText,
                      { color: C.text },
                      winnerTeamId === selectedMatchForWinner?.teamB?.id ? { fontWeight: '800', color: '#047857' } : null,
                    ]}
                  >
                    {selectedMatchForWinner?.teamB?.name || 'Team B'}
                  </Text>
                  {Boolean(selectedMatchForWinner?.score?.teamB) && (
                    <Text style={[styles.winnerScoreText, { color: C.subtext }]}>
                      Score: {selectedMatchForWinner.score.teamB}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <Text style={[styles.winnerNoticeNote, { color: C.subtext }]}>
              {!selectedMatchForWinner?.nextMatchId
                ? '👑 Declaring this winner will crown the team as Tournament Champion and finalize the bracket.'
                : '🏆 Advancing will automatically place this winner into their scheduled next-round bracket slot.'}
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.border }]}
                onPress={() => setWinnerModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: C.subtext }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: !selectedMatchForWinner?.nextMatchId ? '#D97706' : '#10B981',
                  },
                ]}
                onPress={handleConfirmWinner}
                disabled={bracketActionLoading}
              >
                {bracketActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {!selectedMatchForWinner?.nextMatchId ? 'Crown Champion 👑' : 'Confirm & Advance 🏆'}
                  </Text>
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
  teamCaptainText: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONT.regular,
  },
  teamStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  teamStatusText: {
    fontSize: 10,
    fontFamily: FONT.bold,
  },
  toggleSquadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    marginTop: 6,
    borderRadius: 6,
    gap: 4,
  },
  toggleSquadText: {
    fontSize: 12,
    fontFamily: FONT.bold,
  },
  rosterListWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  rosterPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  rosterNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rosterNumberText: {
    fontSize: 10,
    fontFamily: FONT.bold,
  },
  rosterPlayerName: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.medium,
  },
  rosterPlayerPhone: {
    fontSize: 11,
    fontFamily: FONT.regular,
  },
  rejectedReasonBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rejectedReasonLabel: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: '#EF4444',
  },
  rejectedReasonValue: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: '#B91C1C',
  },
  emptyTeamsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  emptyTeamsTitle: {
    fontSize: 14,
    fontFamily: FONT.bold,
    marginBottom: 4,
  },
  emptyTeamsSub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    textAlign: 'center',
    lineHeight: 18,
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
  },
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
  },

  // ── Approval Status Banners & Locked Share ──
  approvalStatusCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  approvalStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  approvalStatusIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalStatusTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  approvalStatusSub: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  approvalStatusDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  approvalNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    marginTop: 10,
  },
  approvalNoticePillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  rejectionReasonBox: {
    padding: 10,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  rejectionReasonHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rejectionReasonText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  lockedShareBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  lockedShareTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  lockedShareSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  bracketRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  bracketRoleBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  championBannerWrap: {
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    padding: SPACING.md,
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  championBannerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  championBannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 1.2,
  },
  championBannerTeamName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#78350F',
    marginTop: 4,
    textAlign: 'center',
  },
  championBannerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 2,
  },
  bracketEmptyWrap: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  bracketEmptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bracketEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  bracketEmptyDesc: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  acceptedTeamsStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    marginBottom: 12,
  },
  acceptedTeamsStatText: {
    fontSize: 12,
  },
  insufficientTeamsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    width: '100%',
  },
  insufficientTeamsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  generateBracketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    width: '100%',
  },
  generateBracketBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  viewOnlyBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  viewOnlyBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  roundTabsScroll: {
    paddingVertical: 8,
    gap: 8,
  },
  roundTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    marginRight: 6,
  },
  roundTabPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  roundGroupWrap: {
    marginTop: 14,
  },
  roundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roundDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  roundGroupName: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  roundGroupCount: {
    fontSize: 11,
    marginLeft: 8,
  },
  bracketMatchCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  matchCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  finalBadgePill: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  finalBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  matchStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  matchStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tossBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: 8,
  },
  tossBannerText: {
    fontSize: 11,
    flex: 1,
  },
  teamsVersusBox: {
    borderRadius: RADIUS.sm,
  },
  bracketTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  teamInfoCol: {
    flex: 1,
  },
  bracketTeamName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  winnerCheckBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  bracketCaptainName: {
    fontSize: 10.5,
    marginTop: 1,
  },
  matchScorePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  matchScorePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  versusDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    paddingHorizontal: 8,
  },
  versusLine: {
    flex: 1,
    height: 1,
  },
  versusText: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  scoreSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginTop: 6,
  },
  scoreSummaryText: {
    fontSize: 11,
    flex: 1,
    fontStyle: 'italic',
  },
  managerControlsBar: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  managerControlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  managerControlsTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  managerBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  managerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  managerActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  viewOnlyWinnerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
  },
  viewOnlyWinnerText: {
    fontSize: 11.5,
  },
  modalSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  modalOptionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  modalSelectCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modalSelectRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modalRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  modalSelectCardText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  modalDecisionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDecisionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  winnerSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  winnerRadioBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerTeamNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  winnerScoreText: {
    fontSize: 11,
    marginTop: 2,
  },
  winnerNoticeNote: {
    fontSize: 11,
    lineHeight: 16,
    marginVertical: 8,
    fontStyle: 'italic',
  },
});
