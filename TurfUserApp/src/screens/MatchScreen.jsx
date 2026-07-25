import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { matchStorage } from '../utils/matchStorage';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'T';

export default function MatchScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const m = await matchStorage.getMatch(matchId);
        if (active) setMatch(m);
      })();
      return () => { active = false; };
    }, [matchId])
  );

  if (!match) return <View style={styles.root} />;

  const teamA = match.teams.A;
  const teamB = match.teams.B;
  const playerById = (id) => match.players.find((p) => p.id === id);
  const captainA = playerById(teamA.captainId);
  const captainB = playerById(teamB.captainId);

  const statusLabel = {
    upcoming: 'UPCOMING',
    toss: 'TOSS DONE',
    live: 'LIVE',
    completed: 'COMPLETED',
  }[match.status] || 'UPCOMING';

  const goToss = () => navigation.navigate('Toss', { matchId });
  const goScorecard = () => navigation.navigate('Scorecard', { matchId });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>
        <View style={styles.topRow}>
          <View style={[styles.badge, match.status === 'live' && styles.badgeLive]}>
            <Text style={[styles.badgeText, match.status === 'live' && styles.badgeTextLive]}>{statusLabel}</Text>
          </View>
          <Text style={styles.sportTag}>{match.sport} · Booking</Text>
        </View>

        <View style={styles.vsCard}>
          <View style={styles.vsTeam}>
            {teamA.logo ? <Image source={{ uri: teamA.logo }} style={styles.logoImg} /> : (
              <View style={styles.logoCircle}><Text style={styles.logoText}>{initials(teamA.name)}</Text></View>
            )}
            <Text style={styles.vsTeamName}>{teamA.name}</Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.vsTeam}>
            {teamB.logo ? <Image source={{ uri: teamB.logo }} style={styles.logoImg} /> : (
              <View style={styles.logoCircle}><Text style={styles.logoText}>{initials(teamB.name)}</Text></View>
            )}
            <Text style={styles.vsTeamName}>{teamB.name}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Icon name="location-outline" size={14} color={COLORS.subtext} />
          <Text style={styles.metaText}>{match.place}</Text>
          <Icon name="calendar-outline" size={14} color={COLORS.subtext} style={{ marginLeft: 12 }} />
          <Text style={styles.metaText}>{match.date} · {match.time}</Text>
        </View>

        {match.status === 'upcoming' && (
          <TouchableOpacity style={styles.actionBtn} onPress={goToss}>
            <Text style={styles.actionBtnText}>Start Toss</Text>
          </TouchableOpacity>
        )}
        {match.status === 'toss' && (
          <TouchableOpacity style={styles.actionBtn} onPress={goScorecard}>
            <Text style={styles.actionBtnText}>Start Scoring</Text>
          </TouchableOpacity>
        )}
        {(match.status === 'live' || match.status === 'completed') && (
          <TouchableOpacity style={styles.actionBtn} onPress={goScorecard}>
            <Text style={styles.actionBtnText}>{match.status === 'live' ? 'View Live Scorecard' : 'View Result'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.captainRow}>
          <View style={styles.captainCard}>
            <Text style={styles.captainLabel}>{teamA.name}</Text>
            <View style={styles.captainInfo}>
              <View style={[styles.captainAvatar, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.captainAvatarText}>{(captainA?.name || 'Y')[0]}</Text>
              </View>
              <Text style={styles.captainName}>{captainA?.name || '—'}</Text>
              <View style={styles.cBadge}><Text style={styles.cBadgeText}>C</Text></View>
            </View>
          </View>
          <View style={styles.captainCard}>
            <Text style={styles.captainLabel}>{teamB.name}</Text>
            <View style={styles.captainInfo}>
              <View style={[styles.captainAvatar, { backgroundColor: COLORS.red }]}>
                <Text style={styles.captainAvatarText}>{(captainB?.name || 'A')[0]}</Text>
              </View>
              <Text style={styles.captainName}>{captainB?.name || '—'}</Text>
              <View style={styles.cBadge}><Text style={styles.cBadgeText}>C</Text></View>
            </View>
          </View>
        </View>

        <Text style={styles.timelineTitle}>Timeline</Text>
        {(match.timeline || []).slice().reverse().map((t, i) => (
          <View key={i} style={styles.timelineRow}>
            <Text style={styles.timelineTime}>
              {new Date(t.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.timelineText}>{t.text}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...FONT.h3, color: COLORS.text },

  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  badge:       { backgroundColor: COLORS.greenSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.round },
  badgeLive:   { backgroundColor: '#fee2e2' },
  badgeText:   { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  badgeTextLive:{ color: COLORS.red },
  sportTag:    { fontSize: 12, color: COLORS.subtext },

  vsCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.bgSoft, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.sm },
  vsTeam:      { flex: 1, alignItems: 'center', gap: 6 },
  logoCircle:  { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  logoImg:     { width: 48, height: 48, borderRadius: 24 },
  logoText:    { color: '#fff', fontWeight: '800', fontSize: 14 },
  vsTeamName:  { fontWeight: '700', fontSize: 13, color: COLORS.text },
  vsText:      { fontWeight: '800', fontSize: 16, color: COLORS.subtext },

  metaRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  metaText:    { fontSize: 12, color: COLORS.subtext, marginLeft: 4 },

  actionBtn:   { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', marginBottom: SPACING.lg },
  actionBtnText:{ color: '#fff', fontWeight: '800', fontSize: 15 },

  captainRow:  { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  captainCard: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md },
  captainLabel:{ fontSize: 11, color: COLORS.subtext, fontWeight: '700', marginBottom: 6 },
  captainInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  captainAvatar:{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  captainAvatarText:{ color: '#fff', fontWeight: '800', fontSize: 12 },
  captainName: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  cBadge:      { backgroundColor: '#fef3c7', paddingHorizontal: 6, borderRadius: RADIUS.round },
  cBadgeText:  { fontSize: 10, fontWeight: '800', color: '#92400e' },

  timelineTitle:{ fontWeight: '800', fontSize: 14, color: COLORS.text, marginBottom: SPACING.sm },
  timelineRow: { flexDirection: 'row', gap: SPACING.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  timelineTime:{ fontSize: 12, color: COLORS.subtext, width: 60 },
  timelineText:{ fontSize: 13, color: COLORS.text },
});