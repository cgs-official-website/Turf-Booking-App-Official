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

  const turfImage =
    tournament.bannerUrl ||
    tournament.turf?.images?.[0] ||
    DEFAULT_SPORT_IMAGES[tournament.sport] ||
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800';

  const hostDisplay = isCommunity
    ? (tournament.creatorName || 'Community Member')
    : (tournament.turf?.name || tournament.turfName || 'Host Arena');

  const locationDisplay = isCommunity
    ? 'Community Hosted'
    : (tournament.turf?.city || tournament.turf?.location?.city || 'Verified Turf');

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
        message: `🏆 Check out the "${tournament.name}" (${tournament.sport}) tournament on Namma Ooru Turf!\n\n📅 Dates: ${tournament.startDate} to ${tournament.endDate}\n👥 Teams: ${tournament.numberOfTeams} (${tournament.playersPerTeam} players/team)${isCricket && tournament.oversPerTeam ? `\n🏏 Overs: ${tournament.oversPerTeam}` : ''}\n\nView details & follow updates:\n${shareUrl}`,
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
                ? 'rgba(109, 40, 217, 0.92)'
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
            {isCommunity ? 'COMMUNITY' : 'TURF HOSTED'}
          </Text>
        </View>

        {/* Status Badge (Top Right) */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isPublished
                ? 'rgba(16, 185, 129, 0.95)'
                : isDraft
                ? 'rgba(245, 158, 11, 0.95)'
                : isCancelled
                ? 'rgba(239, 68, 68, 0.95)'
                : 'rgba(100, 116, 139, 0.95)',
            },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {tournament.status ? tournament.status.toUpperCase() : 'PUBLISHED'}
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

        {/* Host & Location */}
        <View style={styles.hostRow}>
          <Feather
            name={isCommunity ? 'user' : 'map-pin'}
            size={13}
            color={isCommunity ? '#8B5CF6' : C.primary}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.hostText, { color: C.subtext }]} numberOfLines={1}>
            {hostDisplay} • <Text style={{ color: C.caption }}>{locationDisplay}</Text>
          </Text>
        </View>

        {/* Schedule & Rules Meta Grid */}
        <View style={[styles.metaGrid, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={C.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaValue, { color: C.text }]} numberOfLines={1}>
              {tournament.startDate}
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
            style={[styles.viewDetailsBtn, { backgroundColor: isCommunity ? '#8B5CF6' : C.primary }]}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Feather name="chevron-right" size={14} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareIconBtn, { borderColor: C.border, backgroundColor: C.card }]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Feather name="share-2" size={15} color={C.text} />
          </TouchableOpacity>
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
  viewDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    marginRight: 10,
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  shareIconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
