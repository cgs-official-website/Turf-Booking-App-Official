import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { matchStorage } from '../utils/matchStorage';
import { SPACING, RADIUS, SHADOW } from '../utils/theme';

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

const oversStr = (balls) => `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
const sr = (runs, balls) => (balls > 0 ? (((runs || 0) / balls) * 100).toFixed(1) : '0.0');
const eco = (runs, balls) => (balls > 0 ? ((runs || 0) / (balls / 6)).toFixed(1) : '0.0');

function formatCleanName(id, match) {
  if (!id) return '';
  if (typeof id === 'object') {
    if (id.name && !String(id.name).startsWith('guest_')) return id.name;
    if (id.id) id = id.id;
  }
  const str = String(id);
  if (str === 'host_creator' || str === match?.createdBy) {
    return match?.creatorName || 'Host';
  }

  if (match?.playerNames && match.playerNames[str]) {
    return match.playerNames[str];
  }
  if (match?.scorecard?.playerNames && match.scorecard.playerNames[str]) {
    return match.scorecard.playerNames[str];
  }

  const teamPlayers = [
    ...(match?.teams?.A?.players || match?.teams?.teamA?.players || []),
    ...(match?.teams?.B?.players || match?.teams?.teamB?.players || []),
  ];
  const foundInTeam = teamPlayers.find((p) => typeof p === 'object' && (p.id === str || p.userId === str));
  if (foundInTeam && foundInTeam.name && !String(foundInTeam.name).startsWith('guest_')) {
    return foundInTeam.name;
  }

  if (str.startsWith('user_') || str.includes('_gmail_com')) {
    const clean = str
      .replace(/^user_/, '')
      .replace(/_gmail_com$/, '')
      .replace(/_/g, ' ')
      .trim();
    if (clean && isNaN(clean)) {
      return clean.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  if (str.startsWith('guest_')) {
    const parts = str.split('_');
    const maybeName = parts.slice(2).join(' ');
    if (maybeName && isNaN(maybeName) && maybeName.toLowerCase() !== 'player') {
      return maybeName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return 'Player';
  }

  if (!isNaN(str) && str.length > 2) {
    return 'Player';
  }

  return str;
}

function getLiveScorecardRoute(sport = '') {
  const s = String(sport).toLowerCase();
  if (s.includes('football')) return 'FootballScorecard';
  if (s.includes('badminton')) return 'BadmintonScorecard';
  if (s.includes('volleyball')) return 'VolleyballScorecard';
  if (s.includes('basketball')) return 'BasketballScorecard';
  if (s.includes('tennis')) return 'TennisScorecard';
  return 'Scorecard';
}

export default function PastMatchDetailsScreen({ route, navigation }) {
  const { matchId, matchData: paramMatch } = route.params;
  const { C, dark } = useTheme();

  const [match, setMatch] = useState(paramMatch || null);
  const [loading, setLoading] = useState(!paramMatch);
  const [activeInningsTab, setActiveInningsTab] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const m = await matchStorage.getMatch(matchId);
        if (m) setMatch(m);
      } catch (err) {
        console.warn('Failed to load match details:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  if (loading && !match) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.loadingTxt, { color: C.subtext }]}>Loading match details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          >
            <Feather name="arrow-left" size={18} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Match Details</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: C.text }]}>Match Not Found</Text>
          <Text style={[styles.emptySub, { color: C.subtext }]}>
            Unable to retrieve the requested match details.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const sport = (match.sport || 'Cricket').toLowerCase();
  const isCricket = sport.includes('cricket');
  const isFootball = sport.includes('football');
  const isBadminton = sport.includes('badminton');
  const isVolleyball = sport.includes('volleyball');
  const isBasketball = sport.includes('basketball');
  const isTennis = sport.includes('tennis');

  const statusLower = (match.status || 'completed').toLowerCase();
  const isLive = statusLower === 'live' || statusLower === 'toss';
  const isCompleted = statusLower === 'completed';
  const isCreated = statusLower === 'created' || statusLower === 'upcoming';

  const teamAName = match.teams?.A?.name || match.teams?.teamA?.name || 'Team A';
  const teamBName = match.teams?.B?.name || match.teams?.teamB?.name || 'Team B';

  const lastManEnabled = Boolean(
    match.lastManEnabled || match.toss?.lastManEnabled || match.scorecard?.lastManEnabled
  );

  const resultMessage = match.resultText || match.result || match.scorecard?.resultText || match.scorecard?.result || '';

  const playerById = (id) => {
    if (!id) return null;

    if (match.playerNames && match.playerNames[id]) {
      return { id, name: match.playerNames[id] };
    }

    if (match.scorecard?.playerNames && match.scorecard.playerNames[id]) {
      return { id, name: match.scorecard.playerNames[id] };
    }

    const found = match.players?.find((p) => (typeof p === 'object' ? (p.id === id || p.userId === id) : p === id));
    if (found && typeof found === 'object' && found.name && !String(found.name).startsWith('guest_')) return found;

    const teamPlayers = [...(match.teams?.A?.players || []), ...(match.teams?.B?.players || [])];
    const foundInTeam = teamPlayers.find((p) => typeof p === 'object' && (p.id === id || p.userId === id));
    if (foundInTeam && foundInTeam.name && !String(foundInTeam.name).startsWith('guest_')) return foundInTeam;

    return { id, name: formatCleanName(id, match) };
  };

  const getPlayersList = (teamObj) => {
    if (!teamObj) return [];
    const raw = teamObj.players || teamObj.playerIds || teamObj.members || [];
    return raw.map((p) => {
      if (typeof p === 'object' && p !== null) {
        const rawName = p.name || p.playerName;
        const pName = (rawName && !rawName.startsWith('guest_') && isNaN(rawName)) 
          ? rawName 
          : (match.playerNames?.[p.id || p.userId] || match.scorecard?.playerNames?.[p.id || p.userId] || formatCleanName(p.name || p.id || p.userId, match));
        return { ...p, name: pName || 'Guest Player' };
      }
      return playerById(p);
    }).filter(Boolean);
  };

  const teamAPlayers = getPlayersList(match.teams?.A || match.teams?.teamA);
  const teamBPlayers = getPlayersList(match.teams?.B || match.teams?.teamB);

  const handleResumeMatch = () => {
    if (isLive) {
      const routeName = getLiveScorecardRoute(match.sport);
      navigation.navigate(routeName, { matchId: match.id });
    } else if (isCreated) {
      navigation.navigate('Match', { matchId: match.id });
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>{match.sport || 'Match'} Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Match Identity Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.heroHeader}>
            <View style={[styles.sportChip, { backgroundColor: C.primaryLight }]}>
              <Text style={styles.sportEmoji}>{getSportEmoji(match.sport)}</Text>
              <Text style={[styles.sportChipTxt, { color: C.primary }]}>{match.sport || 'Sport'}</Text>
            </View>

            {/* Dynamic Status Badge based on actual match status */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isCompleted
                    ? 'rgba(12, 176, 83, 0.12)'
                    : isLive
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(59, 130, 246, 0.12)',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusTxt,
                  {
                    color: isCompleted
                      ? '#0CB053'
                      : isLive
                      ? '#EF4444'
                      : '#3B82F6',
                  },
                ]}
              >
                {statusLower.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Teams Header */}
          <View style={styles.versusContainer}>
            <View style={styles.teamHeroBox}>
              <Text style={[styles.teamHeroName, { color: C.text }]}>{teamAName}</Text>
            </View>
            <Text style={[styles.vsHeroTxt, { color: C.primary }]}>VS</Text>
            <View style={styles.teamHeroBoxRight}>
              <Text style={[styles.teamHeroName, { color: C.text }]}>{teamBName}</Text>
            </View>
          </View>

          {/* Winner Result Banner */}
          {!!resultMessage && (
            <View style={[styles.resultHeroBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="trophy" size={18} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={[styles.resultHeroTxt, { color: '#B45309' }]}>{resultMessage}</Text>
            </View>
          )}

          {/* Meta details strip */}
          <View style={[styles.metaStrip, { backgroundColor: C.bgSoft || '#F8FAFC' }]}>
            <View style={styles.metaCell}>
              <Feather name="map-pin" size={13} color={C.subtext} style={{ marginRight: 4 }} />
              <Text style={[styles.metaCellTxt, { color: C.text }]} numberOfLines={1}>
                {match.place || 'Turf Arena'}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCell}>
              <Feather name="calendar" size={13} color={C.subtext} style={{ marginRight: 4 }} />
              <Text style={[styles.metaCellTxt, { color: C.text }]}>
                {match.date || match.matchDate || 'Today'}
              </Text>
            </View>
            {!!(match.time || match.matchTime) && (
              <>
                <View style={styles.metaDivider} />
                <View style={styles.metaCell}>
                  <Feather name="clock" size={13} color={C.subtext} style={{ marginRight: 4 }} />
                  <Text style={[styles.metaCellTxt, { color: C.text }]}>{match.time || match.matchTime}</Text>
                </View>
              </>
            )}
          </View>

          {/* Room details */}
          <View style={styles.codeRow}>
            {!!match.joinCode && (
              <View style={styles.codePill}>
                <Text style={[styles.codeLabel, { color: C.subtext }]}>Join Code: </Text>
                <Text style={[styles.codeVal, { color: C.primary }]}>{match.joinCode}</Text>
              </View>
            )}

            {isCricket && (
              <View style={[styles.lastManPill, { backgroundColor: lastManEnabled ? 'rgba(234, 88, 12, 0.12)' : C.border }]}>
                <Text style={[styles.lastManTxt, { color: lastManEnabled ? '#EA580C' : C.subtext }]}>
                  Last Man: {lastManEnabled ? 'ON (Solo Batter)' : 'OFF (Normal)'}
                </Text>
              </View>
            )}
          </View>

          {/* LIVE RESUME BUTTON (ONLY FOR LIVE MATCHES) */}
          {isLive && (
            <TouchableOpacity
              style={[styles.resumeActionBtn, { backgroundColor: '#EF4444' }]}
              onPress={handleResumeMatch}
              activeOpacity={0.88}
            >
              <Ionicons name="flash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.resumeActionTxt}>Resume Live Scoring</Text>
            </TouchableOpacity>
          )}

          {/* START SETUP BUTTON (ONLY FOR CREATED MATCHES) */}
          {isCreated && (
            <TouchableOpacity
              style={[styles.resumeActionBtn, { backgroundColor: C.primary }]}
              onPress={handleResumeMatch}
              activeOpacity={0.88}
            >
              <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.resumeActionTxt}>Start Toss & Setup</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ──────────────── COMMON TOSS DETAILS ──────────────── */}
        {!!match.toss && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 16 }, SHADOW.card]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="disc-outline" size={18} color={C.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: C.text, fontSize: 15 }]}>Toss Details</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 11, color: C.subtext, fontWeight: '700', textTransform: 'uppercase' }}>Toss Winner</Text>
                <Text style={{ fontSize: 15, color: C.text, fontWeight: '800', marginTop: 2 }}>
                  {match.toss.wonByName || (match.toss.wonBy === 'A' ? teamAName : match.toss.wonBy === 'B' ? teamBName : match.toss.winner) || 'Team'}
                </Text>
              </View>
              {!!match.toss.decision && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: C.subtext, fontWeight: '700', textTransform: 'uppercase' }}>Decision</Text>
                  <Text style={{ fontSize: 15, color: C.primary, fontWeight: '800', marginTop: 2 }}>
                    {String(match.toss.decision).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ──────────────── CRICKET DETAILED SCORECARD ──────────────── */}
        {isCricket && Array.isArray(match.innings) && match.innings.length > 0 && (
          <View style={styles.scorecardSection}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Cricket Scorecard</Text>

            {/* Innings Selector Tabs */}
            <View style={styles.inningsTabRow}>
              {match.innings.map((inn, idx) => {
                const battingTeamKey = inn.battingTeam || (idx === 0 ? 'A' : 'B');
                const tName = match.teams?.[battingTeamKey]?.name || `Innings ${idx + 1}`;
                const active = activeInningsTab === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.innTabBtn,
                      { backgroundColor: active ? C.primary : C.card, borderColor: C.border },
                    ]}
                    onPress={() => setActiveInningsTab(idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.innTabTxt, { color: active ? '#FFFFFF' : C.text }]}>
                      {tName} ({inn.totalRuns || 0}/{inn.wickets || 0})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Active Innings Details */}
            {(() => {
              const inn = match.innings[activeInningsTab];
              if (!inn) return null;
              const bTeamKey = inn.battingTeam || (activeInningsTab === 0 ? 'A' : 'B');
              const bTeamName = match.teams?.[bTeamKey]?.name || 'Batting Team';
              const battersList = inn.batters ? Object.keys(inn.batters).map((id) => ({ id, ...inn.batters[id] })) : [];
              const bowlersList = inn.bowlers ? Object.keys(inn.bowlers).map((id) => ({ id, ...inn.bowlers[id] })) : [];

              return (
                <View style={[styles.innCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
                  {/* Total Runs Summary */}
                  <View style={[styles.innHeaderStrip, { backgroundColor: C.bgSoft || '#F8FAFC' }]}>
                    <Text style={[styles.innTitle, { color: C.text }]}>{bTeamName} Batting</Text>
                    <Text style={[styles.innScoreBig, { color: C.primary }]}>
                      {inn.totalRuns || 0} - {inn.wickets || 0}
                      <Text style={[styles.innOversTxt, { color: C.subtext }]}>
                        {' '}
                        ({oversStr(inn.legalBalls)} ov)
                      </Text>
                    </Text>
                  </View>

                  {/* Batting Table */}
                  <Text style={[styles.subSectionTitle, { color: C.text }]}>Batting</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thName, { color: C.subtext }]}>Batter</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>R</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>B</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>4s</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>6s</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>SR</Text>
                  </View>

                  {battersList.length > 0 ? (
                    battersList.map((b, bIdx) => {
                      const p = playerById(b.id);
                      const isNotOut = b.out === false;
                      const batterDisplayName = (p?.name || `Batter ${bIdx + 1}`) + (isNotOut ? '*' : '');
                      return (
                        <View key={bIdx} style={[styles.tableRow, { borderBottomColor: C.border }]}>
                          <View style={styles.tdNameWrap}>
                            <Text style={[styles.tdName, { color: C.text }]} numberOfLines={1}>
                              {batterDisplayName}
                            </Text>
                            <Text style={[styles.tdStatus, { color: b.out ? '#EF4444' : '#0CB053' }]}>
                              {b.out ? 'out' : 'not out'}
                            </Text>
                          </View>
                          <Text style={[styles.tdNum, { color: C.text, fontWeight: '800' }]}>{b.runs || 0}</Text>
                          <Text style={[styles.tdNum, { color: C.subtext }]}>{b.balls || 0}</Text>
                          <Text style={[styles.tdNum, { color: C.subtext }]}>{b.fours || 0}</Text>
                          <Text style={[styles.tdNum, { color: C.subtext }]}>{b.sixes || 0}</Text>
                          <Text style={[styles.tdNum, { color: C.subtext }]}>{sr(b.runs, b.balls)}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[styles.noDataTxt, { color: C.subtext }]}>No batting records for this innings.</Text>
                  )}

                  {/* Extras & Totals Strip */}
                  <View style={[styles.extrasRow, { borderTopColor: C.border, borderBottomColor: C.border }]}>
                    <Text style={[styles.extrasLabel, { color: C.subtext }]}>Extras</Text>
                    <Text style={[styles.extrasVal, { color: C.text }]}>{inn.extras || 0}</Text>
                  </View>

                  {/* Bowling Table */}
                  <Text style={[styles.subSectionTitle, { color: C.text, marginTop: 16 }]}>Bowling</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thName, { color: C.subtext }]}>Bowler</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>O</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>R</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>W</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>ECO</Text>
                  </View>

                  {bowlersList.length > 0 ? (
                    bowlersList.map((bw, bwIdx) => {
                      const p = playerById(bw.id);
                      return (
                        <View key={bwIdx} style={[styles.tableRow, { borderBottomColor: C.border }]}>
                          <Text style={[styles.tdName, { color: C.text }]} numberOfLines={1}>
                            {p?.name || `Bowler ${bwIdx + 1}`}
                          </Text>
                          <Text style={[styles.tdNum, { color: C.subtext }]}>{oversStr(bw.balls)}</Text>
                          <Text style={[styles.tdNum, { color: C.subtext }]}>{bw.runs || 0}</Text>
                          <Text style={[styles.tdNum, { color: C.primary, fontWeight: '800' }]}>{bw.wickets || 0}</Text>
                          <Text style={[styles.tdNum, { color: C.subtext }]}>{eco(bw.runs, bw.balls)}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[styles.noDataTxt, { color: C.subtext }]}>No bowling records for this innings.</Text>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* ──────────────── FOOTBALL SCORECARD ──────────────── */}
        {isFootball && match.football && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 16 }, SHADOW.card]}>
            <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 12 }]}>Football Match Summary</Text>
            
            <View style={[styles.scoreDisplayBox, { backgroundColor: C.bgSoft || '#F8FAFC' }]}>
              <Text style={[styles.scoreBigTxt, { color: C.primary }]}>
                {match.football.scores?.A ?? match.football.scoreA ?? 0} - {match.football.scores?.B ?? match.football.scoreB ?? 0}
              </Text>
              <Text style={[styles.subScoreTxt, { color: C.subtext }]}>
                Stage: {match.football.stage || 'Full Time'}
              </Text>
            </View>

            {Array.isArray(match.football.events) && match.football.events.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.subSectionTitle, { color: C.text, marginBottom: 8 }]}>Events Timeline</Text>
                {match.football.events.map((ev, i) => (
                  <View key={i} style={[styles.eventRow, { borderBottomColor: C.border }]}>
                    <Text style={{ fontSize: 13, marginRight: 6 }}>
                      {ev.type === 'goal' ? '⚽' : ev.type === 'card' ? (ev.cardType === 'red' ? '🟥' : '🟨') : ev.type === 'sub' ? '🔄' : '📌'}
                    </Text>
                    <Text style={[styles.eventTxt, { color: C.text }]}>
                      {ev.minute ? `${ev.minute}' ` : ''}{ev.text || ev.description || `${ev.type} by ${ev.playerName || 'Player'}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ──────────────── BASKETBALL SCORECARD ──────────────── */}
        {isBasketball && match.basketball && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 16 }, SHADOW.card]}>
            <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 12 }]}>Basketball Match Summary</Text>
            
            <View style={[styles.scoreDisplayBox, { backgroundColor: C.bgSoft || '#F8FAFC' }]}>
              <Text style={[styles.scoreBigTxt, { color: C.primary }]}>
                {match.basketball.scores?.A ?? match.basketball.scoreA ?? 0} - {match.basketball.scores?.B ?? match.basketball.scoreB ?? 0}
              </Text>
              <Text style={[styles.subScoreTxt, { color: C.subtext }]}>
                Status: {match.basketball.quarter || 'Final'}
              </Text>
            </View>

            {match.basketball.quarterScores && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.subSectionTitle, { color: C.text, marginBottom: 8 }]}>Quarter Breakdown</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.thName, { color: C.subtext }]}>Team</Text>
                  <Text style={[styles.thNum, { color: C.subtext }]}>Q1</Text>
                  <Text style={[styles.thNum, { color: C.subtext }]}>Q2</Text>
                  <Text style={[styles.thNum, { color: C.subtext }]}>Q3</Text>
                  <Text style={[styles.thNum, { color: C.subtext }]}>Q4</Text>
                </View>
                <View style={[styles.tableRow, { borderBottomColor: C.border }]}>
                  <Text style={[styles.tdName, { color: C.text }]} numberOfLines={1}>{teamAName}</Text>
                  <Text style={[styles.tdNum, { color: C.text }]}>{match.basketball.quarterScores.Q1?.A ?? 0}</Text>
                  <Text style={[styles.tdNum, { color: C.text }]}>{match.basketball.quarterScores.Q2?.A ?? 0}</Text>
                  <Text style={[styles.tdNum, { color: C.text }]}>{match.basketball.quarterScores.Q3?.A ?? 0}</Text>
                  <Text style={[styles.tdNum, { color: C.text }]}>{match.basketball.quarterScores.Q4?.A ?? 0}</Text>
                </View>
                <View style={[styles.tableRow, { borderBottomColor: C.border }]}>
                  <Text style={[styles.tdName, { color: C.text }]} numberOfLines={1}>{teamBName}</Text>
                  <Text style={[styles.tdNum, { color: C.text }]}>{match.basketball.quarterScores.Q1?.B ?? 0}</Text>
                  <Text style={[styles.tdNum, { color: C.text }]}>{match.basketball.quarterScores.Q2?.B ?? 0}</Text>
                  <Text style={[styles.tdNum, { color: C.text }]}>{match.basketball.quarterScores.Q3?.B ?? 0}</Text>
                  <Text style={[styles.tdNum, { color: C.text }]}>{match.basketball.quarterScores.Q4?.B ?? 0}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ──────────────── BADMINTON / VOLLEYBALL / TENNIS SCORECARD ──────────────── */}
        {(isBadminton || isVolleyball || isTennis) && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 16 }, SHADOW.card]}>
            <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 12 }]}>{match.sport} Match Summary</Text>
            <View style={[styles.scoreDisplayBox, { backgroundColor: C.bgSoft || '#F8FAFC' }]}>
              <Text style={[styles.scoreBigTxt, { color: C.primary }]}>
                {match.badminton
                  ? `${match.badminton.gamesWon?.A ?? match.badminton.gamesA ?? 0} - ${match.badminton.gamesWon?.B ?? match.badminton.gamesB ?? 0}`
                  : match.volleyball
                  ? `${match.volleyball.setsWon?.A ?? match.volleyball.setsA ?? 0} - ${match.volleyball.setsWon?.B ?? match.volleyball.setsB ?? 0}`
                  : match.tennis
                  ? `${match.tennis.setsWon?.A ?? match.tennis.setsA ?? 0} - ${match.tennis.setsWon?.B ?? match.tennis.setsB ?? 0}`
                  : 'Completed'}
              </Text>
              <Text style={[styles.subScoreTxt, { color: C.subtext }]}>Sets / Games Won</Text>
            </View>

            {/* History Table */}
            {(() => {
              const history = match.badminton?.gameHistory || match.volleyball?.setHistory || match.tennis?.setHistory || [];
              if (history.length === 0) return null;
              return (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.subSectionTitle, { color: C.text, marginBottom: 8 }]}>Set Breakdown</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thName, { color: C.subtext }]}>Set / Game</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>{teamAName}</Text>
                    <Text style={[styles.thNum, { color: C.subtext }]}>{teamBName}</Text>
                  </View>
                  {history.map((h, i) => (
                    <View key={i} style={[styles.tableRow, { borderBottomColor: C.border }]}>
                      <Text style={[styles.tdName, { color: C.text }]}>Set {h.game || h.set || (i + 1)}</Text>
                      <Text style={[styles.tdNum, { color: h.winner === 'A' ? C.primary : C.text, fontWeight: h.winner === 'A' ? '800' : '400' }]}>{h.A ?? 0}</Text>
                      <Text style={[styles.tdNum, { color: h.winner === 'B' ? C.primary : C.text, fontWeight: h.winner === 'B' ? '800' : '400' }]}>{h.B ?? 0}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}

        {/* ──────────────── SQUADS & PLAYER ROSTER ──────────────── */}
        <Text style={[styles.sectionTitle, { color: C.text, marginTop: 4, marginBottom: 10 }]}>Participating Squads</Text>
        <View style={styles.squadsRow}>
          {/* Team A Roster */}
          <View style={[styles.squadBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.squadTitle, { color: C.primary }]}>{teamAName}</Text>
            {teamAPlayers.length > 0 ? (
              teamAPlayers.map((p, idx) => (
                <View key={idx} style={styles.playerRowItem}>
                  <Feather name="user" size={13} color={C.subtext} style={{ marginRight: 6 }} />
                  <Text style={[styles.playerNameTxt, { color: C.text }]} numberOfLines={1}>
                    {p.name || `Player ${idx + 1}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noPlayerTxt, { color: C.subtext }]}>No registered players</Text>
            )}
          </View>

          {/* Team B Roster */}
          <View style={[styles.squadBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.squadTitle, { color: C.primary }]}>{teamBName}</Text>
            {teamBPlayers.length > 0 ? (
              teamBPlayers.map((p, idx) => (
                <View key={idx} style={styles.playerRowItem}>
                  <Feather name="user" size={13} color={C.subtext} style={{ marginRight: 6 }} />
                  <Text style={[styles.playerNameTxt, { color: C.text }]} numberOfLines={1}>
                    {p.name || `Player ${idx + 1}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noPlayerTxt, { color: C.subtext }]}>No registered players</Text>
            )}
          </View>
        </View>
      </ScrollView>
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

  content: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 8,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  sportEmoji: {
    fontSize: 15,
    marginRight: 6,
  },
  sportChipTxt: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusTxt: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  versusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  teamHeroBox: { flex: 1 },
  teamHeroBoxRight: { flex: 1, alignItems: 'flex-end' },
  teamHeroName: { fontSize: 18, fontWeight: '800' },
  vsHeroTxt: { fontSize: 14, fontWeight: '900', paddingHorizontal: 12 },

  resultHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultHeroTxt: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },

  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  metaCellTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeLabel: { fontSize: 11, fontWeight: '600' },
  codeVal: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  lastManPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lastManTxt: { fontSize: 11, fontWeight: '700' },

  resumeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  resumeActionTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },

  scorecardSection: {
    marginBottom: 16,
  },
  inningsTabRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  innTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  innTabTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  innCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  innHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  innTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  innScoreBig: {
    fontSize: 16,
    fontWeight: '900',
  },
  innOversTxt: {
    fontSize: 12,
    fontWeight: '600',
  },

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thName: { flex: 2.5, fontSize: 11, fontWeight: '800' },
  thNum: { flex: 1, fontSize: 11, fontWeight: '800', textAlign: 'center' },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  tdNameWrap: { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tdName: { fontSize: 12, fontWeight: '600', flex: 1 },
  tdStatus: { fontSize: 10, fontWeight: '700' },
  tdNum: { flex: 1, fontSize: 12, textAlign: 'center' },
  noDataTxt: { fontSize: 12, fontStyle: 'italic', paddingVertical: 10 },

  extrasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  extrasLabel: { fontSize: 12, fontWeight: '700' },
  extrasVal: { fontSize: 12, fontWeight: '800' },

  scoreDisplayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  scoreBigTxt: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  subScoreTxt: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  eventTxt: { fontSize: 12, fontWeight: '600', flex: 1 },

  squadsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  squadBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  squadTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  playerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  playerNameTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
  noPlayerTxt: {
    fontSize: 11,
    fontStyle: 'italic',
  },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center' },
});
