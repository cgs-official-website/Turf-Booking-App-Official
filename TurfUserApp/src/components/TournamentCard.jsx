import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Share } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { SPACING, RADIUS, SHADOW } from '../utils/theme';

const SPORT_ICONS = {
  Cricket: 'activity',
  Football: 'disc',
  Badminton: 'zap',
  Tennis: 'circle',
  Basketball: 'target',
  Volleyball: 'sun',
};

const DEFAULT_SPORT_IMAGES = {
  Cricket: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
  Football: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
  Badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
  Tennis: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800',
  Basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
  Volleyball: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
};

export default function TournamentCard({ tournament, onPress, onShare }) {
  const { C, dark } = useTheme();

  if (!tournament) return null;

  const isCricket = String(tournament.sport || '').toLowerCase().includes('cricket');
  const isCommunity = tournament.creatorType === 'USER' || tournament.source === 'COMMUNITY' || Boolean(tournament.userId);
  const isPublished = tournament.status === 'published';
  const isDraft = tournament.status === 'draft';
  const isCancelled = tournament.status === 'cancelled';
  const isPendingApproval = tournament.status === 'pending_approval' || tournament.approvalStatus === 'pending';
  const isRejected = tournament.status === 'rejected' || tournament.approvalStatus === 'rejected';

  const totalTeams = tournament.numberOfTeams || tournament.totalTeams || 16;
  const acceptedTeamsCount = tournament.acceptedTeamsCount !== undefined ? tournament.acceptedTeamsCount : 0;
  const remainingSlots = tournament.remainingSlots !== undefined
    ? tournament.remainingSlots
    : Math.max(0, totalTeams - acceptedTeamsCount);

  const todayStr = new Date().toISOString().slice(0, 10);
  const startStr = tournament?.startDate ? String(tournament.startDate).slice(0, 10) : '';
  const endStr = tournament?.endDate ? String(tournament.endDate).slice(0, 10) : '';
  const regStartStr = tournament?.registrationStartDate ? String(tournament.registrationStartDate).slice(0, 10) : '';
  const regEndStr = tournament?.registrationEndDate ? String(tournament.registrationEndDate).slice(0, 10) : '';

  let statusBadgeText = 'TOURNAMENT UPCOMING';
  let statusBadgeBg = 'rgba(99, 102, 241, 0.95)';

  if (isCancelled) {
    statusBadgeText = 'CANCELLED';
    statusBadgeBg = 'rgba(239, 68, 68, 0.95)';
  } else if (isRejected) {
    statusBadgeText = 'REJECTED';
    statusBadgeBg = 'rgba(239, 68, 68, 0.95)';
  } else if (isPendingApproval) {
    statusBadgeText = 'PENDING APPROVAL';
    statusBadgeBg = 'rgba(245, 158, 11, 0.95)';
  } else if (isDraft) {
    statusBadgeText = 'DRAFT';
    statusBadgeBg = 'rgba(245, 158, 11, 0.95)';
  } else if (tournament?.lifecycleStatus === 'completed' || (endStr && todayStr > endStr)) {
    statusBadgeText = 'TOURNAMENT COMPLETED';
    statusBadgeBg = 'rgba(100, 116, 139, 0.95)';
  } else if (startStr && todayStr >= startStr && (!endStr || todayStr <= endStr)) {
    // "Ongoing" must be based only on the Tournament Schedule
    statusBadgeText = 'TOURNAMENT ONGOING';
    statusBadgeBg = 'rgba(2, 132, 199, 0.95)';
  } else if (remainingSlots === 0) {
    statusBadgeText = 'REGISTRATION CLOSED';
    statusBadgeBg = 'rgba(245, 158, 11, 0.95)';
  } else if (regEndStr && todayStr > regEndStr) {
    statusBadgeText = 'REGISTRATION CLOSED';
    statusBadgeBg = 'rgba(245, 158, 11, 0.95)';
  } else if (regStartStr && todayStr < regStartStr) {
    statusBadgeText = 'TOURNAMENT UPCOMING';
    statusBadgeBg = 'rgba(99, 102, 241, 0.95)';
  } else {
    // Within registration open window
    statusBadgeText = remainingSlots > 0 ? `REGISTRATION OPEN • ${remainingSlots} SLOTS` : 'REGISTRATION OPEN';
    statusBadgeBg = 'rgba(16, 185, 129, 0.95)';
  }

  const turfImage =
    tournament.bannerUrl ||
    tournament.turf?.images?.[0] ||
    DEFAULT_SPORT_IMAGES[tournament.sport] ||
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800';

  const hostTurfName = tournament.turf?.name || tournament.turfName || 'Selected Turf';
  const turfLocation =
    tournament.turf?.city ||
    tournament.turf?.location?.city ||
    tournament.turf?.address ||
    'Host Venue';

  const handleShare = async (e) => {
    e?.stopPropagation?.();
    if (onShare) {
      onShare(tournament);
      return;
    }
    try {
      const shareUrl = tournament.shareableUrl || `https://turfbookingapp.com/tournament/${tournament.shareableIdentifier || tournament.id}`;
      await Share.share({
        title: tournament.name,
        message: `🏆 Check out "${tournament.name}" (${tournament.sport}) hosted at ${hostTurfName}!\n\n📅 Dates: ${tournament.startDate} to ${tournament.endDate}\n👥 Teams: ${tournament.numberOfTeams} (${tournament.playersPerTeam} players/team)${isCricket && tournament.oversPerTeam ? `\n🏏 Overs: ${tournament.oversPerTeam}` : ''}\n\nView details & follow updates:\n${shareUrl}`,
      });
    } catch (_) { }
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          backgroundColor: C.card,
          borderColor: isCommunity ? (dark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE') : C.border,
        },
        SHADOW.card,
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* ── Top Header Image with Overlays ── */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: turfImage }} style={styles.bannerImage} resizeMode="cover" />
        <View style={styles.imageGradientOverlay} />

        {/* Source Badge (Top Left) */}
        <View
          style={[
            styles.sourceBadge,
            {
              backgroundColor: isCommunity
                ? 'rgba(15, 118, 110, 0.92)'
                : 'rgba(15, 118, 110, 0.92)',
            },
          ]}
        >
          <Ionicons
            name={isCommunity ? 'people' : 'shield-checkmark'}
            size={12}
            color="#FFFFFF"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.sourceBadgeText}>
            {isCommunity ? 'USER CREATED' : 'TURF HOSTED'}
          </Text>
        </View>

        {/* Status Badge (Top Right) */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusBadgeBg,
            },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {statusBadgeText}
          </Text>
        </View>

        {/* Sport Chip (Bottom Left of Image) */}
        <View style={styles.sportPill}>
          <Feather
            name={SPORT_ICONS[tournament.sport] || 'activity'}
            size={12}
            color="#FFFFFF"
            style={{ marginRight: 5 }}
          />
          <Text style={styles.sportPillText}>{tournament.sport}</Text>
        </View>
      </View>

      {/* ── Body Content ── */}
      <View style={styles.contentWrap}>
        {/* Title */}
        <Text style={[styles.titleText, { color: C.text }]} numberOfLines={1}>
          {tournament.name}
        </Text>

        {/* Host Turf & Location */}
        <View style={styles.hostRow}>
          <Feather
            name="map-pin"
            size={13}
            color={C.primary}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.hostText, { color: C.text }]} numberOfLines={1}>
            {hostTurfName} • <Text style={{ color: C.subtext }}>{turfLocation}</Text>
          </Text>
        </View>

        {isCommunity && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Feather name="user" size={11} color="#0F766E" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 11, color: C.subtext }} numberOfLines={1}>
              Created by <Text style={{ fontWeight: '700', color: C.text }}>{tournament.creatorName || 'Community Member'}</Text>
            </Text>
          </View>
        )}

        {/* Schedule & Rules Meta Grid */}
        <View style={[styles.metaGrid, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={C.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaValue, { color: C.text }]} numberOfLines={1}>
              {tournament.startDate} to {tournament.endDate}
            </Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: C.border }]} />
          <View style={styles.metaItem}>
            <Feather name="users" size={12} color="#3B82F6" style={{ marginRight: 4 }} />
            <Text style={[styles.metaValue, { color: C.text }]}>
              {tournament.numberOfTeams} Teams
            </Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: C.border }]} />
          <View style={styles.metaItem}>
            <Feather name="user-check" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={[styles.metaValue, { color: C.text }]}>
              {tournament.playersPerTeam} / team
            </Text>
          </View>
        </View>

        {/* Cricket Overs Indicator if applicable */}
        {isCricket && Boolean(tournament.oversPerTeam) && (
          <View style={[styles.oversRow, { backgroundColor: dark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7' }]}>
            <Ionicons name="baseball-outline" size={13} color="#D97706" style={{ marginRight: 5 }} />
            <Text style={[styles.oversText, { color: dark ? '#FBBF24' : '#B45309' }]}>
              Cricket Match Rule: {tournament.oversPerTeam} Overs per team
            </Text>
          </View>
        )}

        {/* Action Row */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.viewTournamentBtn, { backgroundColor: '#0F766E' }]}
            onPress={onPress}
            activeOpacity={0.82}
          >
            <Text style={styles.viewTournamentText} numberOfLines={1}>View Tournament</Text>
            <Feather name="arrow-right" size={13} color="#FFFFFF" style={{ marginLeft: 5 }} />
          </TouchableOpacity>

          {isPublished && (
            <TouchableOpacity
              style={[styles.shareIconBtn, { borderColor: C.border, backgroundColor: C.card }]}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={15} color={C.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  imageWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sourceBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  sourceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sportPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  sportPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  contentWrap: {
    padding: SPACING.md,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hostText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 14,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  oversRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
  },
  oversText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  viewTournamentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full || 999,
    marginRight: 10,
    minHeight: 36,
  },
  viewTournamentText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  shareIconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full || 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
