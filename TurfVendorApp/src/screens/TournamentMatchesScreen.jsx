import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import {
    getTournamentByIdApi,
    generateBracketApi,
    conductMatchTossApi,
    updateMatchScoreApi,
    confirmMatchWinnerApi,
} from '../api/tournaments';
import ScheduleSelectorModal from '../components/ScheduleSelectorModal';
import MatchSetupWizardModal from '../components/MatchSetupWizardModal';
import CricketScorerModal from '../components/CricketScorerModal';
import PlayerPerformanceModal from '../components/PlayerPerformanceModal';
import TournamentAwardsLeaderboardsModal from '../components/TournamentAwardsLeaderboardsModal';
import LiveScoreboardModal from '../components/LiveScoreboardModal';

/**
 * Extracts structured cricket scores from a match object or fallback strings
 */
export function getMatchCricketScore(match) {
    const score = match?.score || {};
    let runsA = score.runsA !== undefined && score.runsA !== null ? Number(score.runsA) : null;
    let wicketsA = score.wicketsA !== undefined && score.wicketsA !== null ? Number(score.wicketsA) : null;
    let oversA = score.oversA !== undefined && score.oversA !== null && score.oversA !== '' ? String(score.oversA) : null;

    let runsB = score.runsB !== undefined && score.runsB !== null ? Number(score.runsB) : null;
    let wicketsB = score.wicketsB !== undefined && score.wicketsB !== null ? Number(score.wicketsB) : null;
    let oversB = score.oversB !== undefined && score.oversB !== null && score.oversB !== '' ? String(score.oversB) : null;

    // Read directly from liveCricket if present
    if (match?.liveCricket) {
        const lc = match.liveCricket;
        const inn1 = lc.innings1;
        const inn2 = lc.innings2;
        const isTeamAInn1 = inn1 && inn1.battingTeamId === match.teamA?.id;
        if (inn1) {
            if (isTeamAInn1) {
                if (runsA === null) runsA = inn1.runs;
                if (wicketsA === null) wicketsA = inn1.wickets;
                if (!oversA || oversA === '0.0') oversA = inn1.overs;
            } else {
                if (runsB === null) runsB = inn1.runs;
                if (wicketsB === null) wicketsB = inn1.wickets;
                if (!oversB || oversB === '0.0') oversB = inn1.overs;
            }
        }
        if (inn2) {
            if (isTeamAInn1) {
                if (runsB === null) runsB = inn2.runs;
                if (wicketsB === null) wicketsB = inn2.wickets;
                if (!oversB || oversB === '0.0') oversB = inn2.overs;
            } else {
                if (runsA === null) runsA = inn2.runs;
                if (wicketsA === null) wicketsA = inn2.wickets;
                if (!oversA || oversA === '0.0') oversA = inn2.overs;
            }
        }
    }

    if (runsA === null && score.teamA) {
        const m = String(score.teamA).match(/^(\d+)(?:\s*\/\s*(\d+))?(?:\s*\(?([\d.]+)\s*(?:ov|overs)?\)?)?/i);
        if (m) {
            runsA = parseInt(m[1], 10) || 0;
            wicketsA = m[2] !== undefined ? parseInt(m[2], 10) : 0;
            oversA = m[3] ? m[3] : '0.0';
        }
    }

    if (runsB === null && score.teamB) {
        const m = String(score.teamB).match(/^(\d+)(?:\s*\/\s*(\d+))?(?:\s*\(?([\d.]+)\s*(?:ov|overs)?\)?)?/i);
        if (m) {
            runsB = parseInt(m[1], 10) || 0;
            wicketsB = m[2] !== undefined ? parseInt(m[2], 10) : 0;
            oversB = m[3] ? m[3] : '0.0';
        }
    }

    const hasScoreA = runsA !== null;
    const hasScoreB = runsB !== null;

    return {
        runsA: runsA !== null ? runsA : 0,
        wicketsA: wicketsA !== null ? wicketsA : 0,
        oversA: oversA || '0.0',
        runsB: runsB !== null ? runsB : 0,
        wicketsB: wicketsB !== null ? wicketsB : 0,
        oversB: oversB || '0.0',
        hasScoreA,
        hasScoreB,
        hasScore: hasScoreA || hasScoreB,
        summary: score.summary || '',
        leadText: score.leadText || '',
        winMarginText: score.winMarginText || '',
    };
}

/**
 * Returns clean team name or feeder placeholder without exposing UUIDs
 */
export const getTeamDisplayName = (team, placeholder = 'TBD') => {
    if (team) {
        return team.name || team.teamName || 'Team';
    }
    return placeholder || 'TBD';
};

const TournamentMatchesScreen = ({ route, navigation }) => {
    const tournamentId = route.params?.tournamentId || route.params?.id;
    const { colors, isDark } = useTheme();

    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [roundTab, setRoundTab] = useState('all');

    // New Modals for Professional Cricket Flow
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [setupMatch, setSetupMatch] = useState(null);
    const [liveScorerMatch, setLiveScorerMatch] = useState(null);
    const [performanceMatch, setPerformanceMatch] = useState(null);
    const [scoreboardMatch, setScoreboardMatch] = useState(null);
    const [showAwardsModal, setShowAwardsModal] = useState(false);

    // Tiebreaker modal (Scores level)
    const [winnerMatch, setWinnerMatch] = useState(null);
    const [winnerId, setWinnerId] = useState('');
    const [tiebreakNote, setTiebreakNote] = useState('Super Over');

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: 'Cricket Matches & Scoring',
            headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
        });
    }, [navigation, colors]);

    const load = useCallback(async () => {
        if (!tournamentId) return;
        try {
            const res = await getTournamentByIdApi(tournamentId);
            const data = res?.tournament || res?.data?.tournament || res;
            if (data?.id) setTournament(data);
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to load tournament');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        load();
    }, [load]);

    // Live score auto-refresh
    useEffect(() => {
        if (!tournament?.bracket) return undefined;
        const t = setInterval(() => {
            if (!busy && !setupMatch && !liveScorerMatch && !winnerMatch) load();
        }, 12000);
        return () => clearInterval(t);
    }, [tournament?.bracket, busy, setupMatch, liveScorerMatch, winnerMatch, load]);

    const canManage = Boolean(tournament && tournament.creatorType !== 'USER' && tournament.canEdit);
    const bracket = tournament?.bracket && Array.isArray(tournament.bracket.rounds) ? tournament.bracket : null;
    const acceptedCount = (tournament?.acceptedTeams || []).length;
    const cupsCount = Number(bracket?.cupsCount || tournament?.prizeDetails?.cupsCount || 1);

    const applyResult = (res) => {
        const updated = res?.tournament || res?.data?.tournament;
        if (updated) {
            setTournament(updated);
            if (liveScorerMatch) {
                const rounds = updated.bracket?.rounds || [];
                for (const r of rounds) {
                    const found = (r.matches || []).find((m) => m.id === liveScorerMatch.id);
                    if (found) {
                        setLiveScorerMatch(found);
                        break;
                    }
                }
            }
        }
    };

    const run = async (fn, okTitle, okMsg) => {
        setBusy(true);
        try {
            const res = await fn();
            applyResult(res);
            if (okTitle) Alert.alert(okTitle, res?.message || okMsg || '');
            return true;
        } catch (err) {
            Alert.alert('Error', err.message || 'Something went wrong');
            return false;
        } finally {
            setBusy(false);
        }
    };

    // Auto schedule handler
    const handleAutoSchedule = async (cups) => {
        const ok = await run(
            () => generateBracketApi(tournament.id, { scheduleType: 'auto', force: true, cupsCount: cups }),
            'Knockout Draw Ready ⚡',
            'Rounds generated successfully.'
        );
        if (ok) setShowScheduleModal(false);
    };

    // Manual fixture handler
    const handleManualSchedule = async (fixtureData) => {
        const ok = await run(
            () => generateBracketApi(tournament.id, {
                scheduleType: 'manual',
                manualAction: 'create_match',
                roundName: fixtureData.roundName,
                teamAId: fixtureData.teamAId,
                teamBId: fixtureData.teamBId,
                cupsCount,
            }),
            'Fixture Scheduled 📅',
            'Match added to the tournament schedule.'
        );
        if (ok) setShowScheduleModal(false);
    };

    // Start match from Setup Wizard
    const handleStartMatchSetup = async (setupPayload) => {
        setBusy(true);
        try {
            const res = await conductMatchTossApi(tournament.id, setupMatch.id, setupPayload);
            applyResult(res);
            const updatedMatch = res?.match || setupMatch;
            setSetupMatch(null);
            // Open live ball-by-ball scorer immediately
            setLiveScorerMatch(updatedMatch);
        } catch (err) {
            Alert.alert('Setup Failed', err.message || 'Failed to start match');
        } finally {
            setBusy(false);
        }
    };

    // Sync ball-by-ball state from live scorer
    const handleSyncLiveCricket = async (liveCricket) => {
        if (!liveScorerMatch) return;
        try {
            const res = await updateMatchScoreApi(tournament.id, liveScorerMatch.id, {
                liveCricket,
                status: 'live',
            });
            applyResult(res);
            if (res?.match) {
                setLiveScorerMatch(res.match);
            }
        } catch (err) {
            console.warn('Sync live cricket error:', err.message);
        }
    };

    const executeFinishApi = async (m, finalLiveCricket) => {
        setBusy(true);
        const isFinal = !m.nextMatchId && !m.isThirdPlaceMatch;
        try {
            const payload = finalLiveCricket ? { liveCricket: finalLiveCricket } : {};
            const res = await confirmMatchWinnerApi(tournament.id, m.id, payload);
            applyResult(res);
            setLiveScorerMatch(null);
            Alert.alert(
                isFinal ? '👑 Champion Crowned!' : (m.isThirdPlaceMatch ? '🥉 3rd Place Decided!' : '🏆 Winner Advanced!'),
                res?.message || 'Match completed successfully.'
            );
        } catch (err) {
            if (err.code === 'TIE_NEEDS_TIEBREAK') {
                setWinnerMatch(m);
                setWinnerId(m.teamA?.id);
            } else {
                Alert.alert('Error', err.message || 'Failed to finish match');
            }
        } finally {
            setBusy(false);
        }
    };

    // Finish match
    const finishMatch = (m, finalLiveCricket) => {
        // If caller passed finalLiveCricket (e.g. from CricketScorerModal confirmation dialog),
        // execute finish API directly to avoid double native confirmation dialogs
        if (finalLiveCricket) {
            executeFinishApi(m, finalLiveCricket);
            return;
        }

        const isFinal = !m.nextMatchId && !m.isThirdPlaceMatch;
        const cs = getMatchCricketScore(m);
        if (!cs.hasScore) {
            Alert.alert('Score Required', 'Please score deliveries before finishing this match.');
            return;
        }

        const teamAName = getTeamDisplayName(m.teamA, m.placeholderA);
        const teamBName = getTeamDisplayName(m.teamB, m.placeholderB);

        let previewSummary = '';
        if (cs.runsA > cs.runsB) {
            previewSummary = `${teamAName} (${cs.runsA}/${cs.wicketsA}) leads ${teamBName} (${cs.runsB}/${cs.wicketsB})`;
        } else if (cs.runsB > cs.runsA) {
            previewSummary = `${teamBName} (${cs.runsB}/${cs.wicketsB}) leads ${teamAName} (${cs.runsA}/${cs.wicketsA})`;
        } else {
            previewSummary = 'Scores are tied. Tie-breaker winner will be requested.';
        }

        Alert.alert(
            isFinal ? 'Finish Final & Crown Champion 👑' : (m.isThirdPlaceMatch ? 'Finish 3rd Place Playoff 🥉' : 'Finish Match & Advance Winner 🏁'),
            `${previewSummary}\n\n` +
            (isFinal
                ? 'The team with the higher score will be crowned Tournament Champion. Continue?'
                : (m.isThirdPlaceMatch
                    ? 'Confirm winner for 3rd Place and runner for 4th Place. Continue?'
                    : 'The team with the higher score wins and automatically advances. Continue?')),
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Finish Match',
                    onPress: () => executeFinishApi(m),
                },
            ]
        );
    };

    // Tie-breaker confirm
    const saveTiebreak = async () => {
        setBusy(true);
        try {
            const res = await confirmMatchWinnerApi(tournament.id, winnerMatch.id, {
                winnerTeamId: winnerId,
                tiebreakNote: tiebreakNote.trim() || 'Super Over',
            });
            applyResult(res);
            setWinnerMatch(null);
            setLiveScorerMatch(null);
            Alert.alert('Result saved', res?.message || 'Winner advanced successfully.');
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to save result');
        } finally {
            setBusy(false);
        }
    };

    const visibleRounds = useMemo(() => {
        if (!bracket) return [];
        return roundTab === 'all'
            ? bracket.rounds
            : bracket.rounds.filter((r) => String(r.roundNumber) === String(roundTab));
    }, [bracket, roundTab]);

    const statusMeta = (m) => {
        if (m.status === 'completed') return { label: m.isBye ? 'BYE' : 'COMPLETED', bg: '#10B981' };
        if (m.status === 'live') return { label: 'LIVE', bg: '#EF4444' };
        if (m.status === 'toss') return { label: 'TOSS DONE', bg: '#F59E0B' };
        if (m.status === 'pending') return { label: 'READY', bg: '#3B82F6' };
        return { label: 'WAITING', bg: '#94A3B8' };
    };

    const Choice = ({ selected, label, onPress }) => (
        <TouchableOpacity
            style={[
                styles.choice,
                { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card },
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontWeight: '700' }} numberOfLines={1}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!tournament) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.textSecondary }}>Tournament not found.</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            load();
                        }}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Tournament Header Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: colors.text }]}>{tournament.name}</Text>
                            <Text style={{ color: colors.textSecondary, marginTop: 4, fontWeight: '600' }}>
                                {tournament.sport} • {acceptedCount} Registered Teams • {cupsCount} Cup{cupsCount > 1 ? 's' : ''}
                            </Text>
                        </View>
                        {canManage && (
                            <TouchableOpacity
                                style={[styles.scheduleBtnPill, { backgroundColor: colors.primary }]}
                                onPress={() => setShowScheduleModal(true)}
                            >
                                <Feather name="calendar" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={styles.scheduleBtnText}>Schedule</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Awards & Leaderboards Header Button */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        marginBottom: 12,
                    }}
                    onPress={() => setShowAwardsModal(true)}
                    activeOpacity={0.85}
                >
                    <Text style={{ fontSize: 16, marginRight: 8 }}>🏆</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#FBBF24' : '#B45309' }}>
                            Awards & Player Leaderboards
                        </Text>
                        <Text style={{ fontSize: 11, color: isDark ? '#FCD34D' : '#92400E' }}>
                            {bracket?.winner ? 'Official final winners & rankings' : 'Live standings: Runs, Wickets, SR, Econ, Fielding'}
                        </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={isDark ? '#FBBF24' : '#B45309'} />
                </TouchableOpacity>

                {/* Champion Banner */}
                {Boolean(bracket?.winner) && (
                    <View style={styles.champion}>
                        <Text style={styles.championLabel}>👑 TOURNAMENT CHAMPION</Text>
                        <Text style={styles.championName}>{getTeamDisplayName(bracket.winner)}</Text>
                        {Boolean(bracket.runnerUp) && (
                            <Text style={{ color: '#92400E', marginTop: 4, fontWeight: '700' }}>
                                🥈 Runner-up: {getTeamDisplayName(bracket.runnerUp)}
                            </Text>
                        )}
                        {Boolean(bracket.thirdPlace) && (
                            <Text style={{ color: '#92400E', marginTop: 2, fontWeight: '600' }}>
                                🥉 3rd Place: {getTeamDisplayName(bracket.thirdPlace)}
                                {Boolean(bracket.fourthPlace) && ` • 4th: ${getTeamDisplayName(bracket.fourthPlace)}`}
                            </Text>
                        )}
                        <TouchableOpacity
                            style={{
                                marginTop: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#D97706',
                                paddingVertical: 8,
                                paddingHorizontal: 14,
                                borderRadius: 8,
                            }}
                            onPress={() => setShowAwardsModal(true)}
                            activeOpacity={0.85}
                        >
                            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12, marginRight: 6 }}>
                                🏆 View Final Awards & Leaderboards
                            </Text>
                            <Feather name="arrow-right" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 1. TOURNAMENT SCHEDULE SELECTION (If not yet scheduled) */}
                {!bracket ? (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 18 }]}>
                        <Text style={[styles.schedulePromptTitle, { color: colors.text }]}>
                            How do you want to schedule?
                        </Text>
                        <Text style={[styles.schedulePromptSub, { color: colors.textSecondary }]}>
                            {acceptedCount} registered & accepted teams ready for action
                        </Text>

                        {/* AUTO CARD */}
                        <TouchableOpacity
                            style={[styles.scheduleOptionCard, { borderColor: '#10B981', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5' }]}
                            onPress={() => handleAutoSchedule(cupsCount)}
                            activeOpacity={0.8}
                            disabled={busy}
                        >
                            <View style={[styles.optIconBox, { backgroundColor: '#10B981' }]}>
                                <Feather name="shuffle" size={20} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[styles.optTitle, { color: colors.text }]}>AUTO</Text>
                                    <View style={[styles.badgeTag, { backgroundColor: '#10B981' }]}>
                                        <Text style={styles.badgeTagText}>ONE TAP</Text>
                                    </View>
                                </View>
                                <Text style={[styles.optDesc, { color: colors.textSecondary }]}>
                                    Randomly pair registered/accepted teams and generate correct rounds based on team count.
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#10B981" />
                        </TouchableOpacity>

                        {/* MANUAL CARD */}
                        <TouchableOpacity
                            style={[styles.scheduleOptionCard, { borderColor: '#3B82F6', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF', marginTop: 12 }]}
                            onPress={() => setShowScheduleModal(true)}
                            activeOpacity={0.8}
                            disabled={busy}
                        >
                            <View style={[styles.optIconBox, { backgroundColor: '#3B82F6' }]}>
                                <Feather name="edit-3" size={20} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[styles.optTitle, { color: colors.text }]}>MANUAL</Text>
                                    <View style={[styles.badgeTag, { backgroundColor: '#3B82F6' }]}>
                                        <Text style={styles.badgeTagText}>CUSTOM</Text>
                                    </View>
                                </View>
                                <Text style={[styles.optDesc, { color: colors.textSecondary }]}>
                                    Select round (League / QF / SF / Final), then pick Team A vs Team B from registered teams.
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Round Filter Tabs */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            <Choice selected={roundTab === 'all'} label="All Rounds" onPress={() => setRoundTab('all')} />
                            {bracket.rounds.map((r) => (
                                <Choice
                                    key={r.roundNumber}
                                    selected={String(roundTab) === String(r.roundNumber)}
                                    label={r.name}
                                    onPress={() => setRoundTab(r.roundNumber)}
                                />
                            ))}
                        </ScrollView>

                        {/* Matches List */}
                        {visibleRounds.map((round) => (
                            <View key={round.roundNumber} style={{ marginBottom: 14 }}>
                                <Text style={[styles.roundTitle, { color: colors.text }]}>{round.name.toUpperCase()}</Text>
                                {(round.matches || []).map((m) => {
                                    const meta = statusMeta(m);
                                    const bothTeams = Boolean(m.teamA && m.teamB);
                                    const done = m.status === 'completed';
                                    const isLive = m.status === 'live';
                                    const finalMatch = !m.nextMatchId && !m.isThirdPlaceMatch;
                                    const cs = getMatchCricketScore(m);

                                    const teamAWon = done && m.winner?.id === m.teamA?.id;
                                    const teamBWon = done && m.winner?.id === m.teamB?.id;

                                    return (
                                        <View
                                            key={m.id}
                                            style={[styles.matchCard, { backgroundColor: colors.card, borderColor: isLive ? '#EF4444' : colors.border }, SHADOWS.sm]}
                                        >
                                            {/* Top Row */}
                                            <View style={styles.matchHeader}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {m.isThirdPlaceMatch && <Text style={{ fontSize: 13, marginRight: 4 }}>🥉</Text>}
                                                    <Text style={[styles.matchRoundTag, { color: isLive ? '#EF4444' : colors.primary }]}>
                                                        {(m.roundName || round.name).toUpperCase()}
                                                    </Text>
                                                    <Text style={{ color: colors.textSecondary, marginHorizontal: 6, fontWeight: '700' }}>•</Text>
                                                    <Text style={[styles.matchNumberTag, { color: colors.text }]}>
                                                        {m.matchCode || `M#${m.matchNumber}`}
                                                    </Text>
                                                </View>
                                                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                                                    <Text style={styles.badgeText}>{meta.label}</Text>
                                                </View>
                                            </View>

                                            {/* Toss Banner */}
                                            {Boolean(m.toss) && (
                                                <View style={[styles.tossBanner, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                                                    <Text style={[styles.tossBannerText, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                                                        🪙 <Text style={{ fontWeight: '800' }}>{m.toss.winnerName}</Text> won toss & elected to <Text style={{ fontWeight: '800' }}>{String(m.toss.decision || 'bat').toUpperCase()}</Text>
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Team A Box */}
                                            <View style={[styles.teamBlock, teamAWon && styles.winningTeamBlock]}>
                                                <View style={styles.teamTitleRow}>
                                                    <Text style={[styles.teamHeadingName, { color: colors.text }, teamAWon && styles.winnerText]}>
                                                        {getTeamDisplayName(m.teamA, m.placeholderA).toUpperCase()}
                                                    </Text>
                                                    {teamAWon && (
                                                        <View style={[styles.winnerBadgePill, { backgroundColor: '#10B981' }]}>
                                                            <Text style={styles.winnerBadgePillText}>{finalMatch ? 'CHAMPION 👑' : (m.isThirdPlaceMatch ? '3RD PLACE 🥉' : 'WINNER')}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                {cs.hasScoreA ? (
                                                    <View style={styles.scoreRow}>
                                                        <Text style={[styles.runsWicketsText, { color: colors.text }]}>
                                                            {cs.runsA} / {cs.wicketsA}
                                                        </Text>
                                                        <Text style={[styles.oversText, { color: colors.textSecondary }]}>
                                                            {cs.oversA} ov
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>
                                                        Yet to bat
                                                    </Text>
                                                )}
                                            </View>

                                            {/* VS Divider */}
                                            <View style={styles.vsDividerWrap}>
                                                <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
                                                <View style={[styles.vsBadge, { backgroundColor: colors.border }]}>
                                                    <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
                                                </View>
                                                <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
                                            </View>

                                            {/* Team B Box */}
                                            <View style={[styles.teamBlock, teamBWon && styles.winningTeamBlock]}>
                                                <View style={styles.teamTitleRow}>
                                                    <Text style={[styles.teamHeadingName, { color: colors.text }, teamBWon && styles.winnerText]}>
                                                        {getTeamDisplayName(m.teamB, m.placeholderB).toUpperCase()}
                                                    </Text>
                                                    {teamBWon && (
                                                        <View style={[styles.winnerBadgePill, { backgroundColor: '#10B981' }]}>
                                                            <Text style={styles.winnerBadgePillText}>{finalMatch ? 'CHAMPION 👑' : (m.isThirdPlaceMatch ? '3RD PLACE 🥉' : 'WINNER')}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                {cs.hasScoreB ? (
                                                    <View style={styles.scoreRow}>
                                                        <Text style={[styles.runsWicketsText, { color: colors.text }]}>
                                                            {cs.runsB} / {cs.wicketsB}
                                                        </Text>
                                                        <Text style={[styles.oversText, { color: colors.textSecondary }]}>
                                                            {cs.oversB} ov
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>
                                                        Yet to bat
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Result or Live Status */}
                                            {done && Boolean(m.score?.winMarginText || m.score?.summary) && (
                                                <View style={styles.completedResultBox}>
                                                    <Text style={styles.completedWinnerText}>
                                                        {getTeamDisplayName(m.winner).toUpperCase()} WON
                                                    </Text>
                                                    <Text style={styles.completedMarginText}>
                                                        {m.score?.winMarginText || m.score?.summary}
                                                    </Text>
                                                </View>
                                            )}

                                            {!done && Boolean(cs.leadText || m.score?.summary) && (
                                                <View style={styles.liveLeadBox}>
                                                    <Text style={styles.liveLeadText}>
                                                        {cs.leadText || m.score?.summary}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* ── PROFESSIONAL ACTION BUTTONS ── */}
                                            <View style={styles.actionsRow}>
                                                {/* Manager Controls: Setup & Start */}
                                                {canManage && bothTeams && !m.isBye && !done && !isLive && (
                                                    <TouchableOpacity
                                                        style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
                                                        onPress={() => setSetupMatch(m)}
                                                    >
                                                        <Feather name="play-circle" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                                                        <Text style={styles.actionBtnPrimaryText}>Setup & Start Match</Text>
                                                    </TouchableOpacity>
                                                )}

                                                {/* Manager Controls: Live Scorer & Finish Match */}
                                                {canManage && bothTeams && !m.isBye && isLive && (
                                                    <>
                                                        <TouchableOpacity
                                                            style={[styles.actionBtnLive, { backgroundColor: '#EF4444' }]}
                                                            onPress={() => setLiveScorerMatch(m)}
                                                        >
                                                            <Feather name="edit-2" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                                                            <Text style={styles.actionBtnPrimaryText}>Live Scorer</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={[styles.actionBtnOutline, { borderColor: '#10B981' }]}
                                                            onPress={() => finishMatch(m)}
                                                        >
                                                            <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 12 }}>Finish Match</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}

                                                {/* Full Scorecard for Live & Completed */}
                                                {(isLive || done || cs.hasScore) && (
                                                    <TouchableOpacity
                                                        style={[styles.actionBtnOutline, { borderColor: colors.border }]}
                                                        onPress={() => setScoreboardMatch(m)}
                                                    >
                                                        <Feather name="bar-chart-2" size={13} color={colors.text} style={{ marginRight: 4 }} />
                                                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 11 }}>Full Scorecard</Text>
                                                    </TouchableOpacity>
                                                )}

                                                {/* Player Ratings Button */}
                                                {(done || isLive) && (
                                                    <TouchableOpacity
                                                        style={[styles.actionBtnRatings, { borderColor: colors.border }]}
                                                        onPress={() => setPerformanceMatch(m)}
                                                    >
                                                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 11 }}>🎖️ Player Ratings</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>

            {/* Schedule Choice Modal */}
            <ScheduleSelectorModal
                visible={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                tournament={tournament}
                acceptedTeams={tournament.acceptedTeams || []}
                onAutoSchedule={handleAutoSchedule}
                onManualSchedule={handleManualSchedule}
                busy={busy}
            />

            {/* Cricket Match Setup Wizard */}
            <MatchSetupWizardModal
                visible={Boolean(setupMatch)}
                onClose={() => setSetupMatch(null)}
                match={setupMatch}
                tournament={tournament}
                onStartMatch={handleStartMatchSetup}
                busy={busy}
            />

            {/* Ball-by-ball Live Scorer Modal */}
            <CricketScorerModal
                visible={Boolean(liveScorerMatch)}
                onClose={() => setLiveScorerMatch(null)}
                match={liveScorerMatch}
                tournament={tournament}
                onSyncLiveCricket={handleSyncLiveCricket}
                onFinishMatch={(latestLive) => finishMatch(liveScorerMatch, latestLive)}
                busy={busy}
            />

            {/* Live & Completed Scoreboard Modal */}
            <LiveScoreboardModal
                visible={Boolean(scoreboardMatch)}
                onClose={() => setScoreboardMatch(null)}
                match={scoreboardMatch}
            />

            {/* Player Performance & Awards Modal */}
            <PlayerPerformanceModal
                visible={Boolean(performanceMatch)}
                onClose={() => setPerformanceMatch(null)}
                match={performanceMatch}
            />

            {/* Tournament Awards & Leaderboards Modal */}
            <TournamentAwardsLeaderboardsModal
                visible={showAwardsModal}
                onClose={() => setShowAwardsModal(false)}
                tournament={tournament}
            />

            {/* Tie-breaker Modal */}
            <Modal visible={Boolean(winnerMatch)} transparent animationType="slide" onRequestClose={() => setWinnerMatch(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.title, { color: colors.text }]}>Tie-Breaker (Super Over)</Text>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Scores are tied. Select the winner of the Super Over:
                        </Text>
                        <View style={styles.rowWrap}>
                            <Choice
                                selected={winnerId === winnerMatch?.teamA?.id}
                                label={getTeamDisplayName(winnerMatch?.teamA)}
                                onPress={() => setWinnerId(winnerMatch.teamA.id)}
                            />
                            <Choice
                                selected={winnerId === winnerMatch?.teamB?.id}
                                label={getTeamDisplayName(winnerMatch?.teamB)}
                                onPress={() => setWinnerId(winnerMatch.teamB.id)}
                            />
                        </View>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg, marginTop: 12 }]}
                            value={tiebreakNote}
                            onChangeText={setTiebreakNote}
                            placeholder="e.g. Won by 2 runs in Super Over"
                            placeholderTextColor={colors.textLight}
                            maxLength={100}
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => setWinnerMatch(null)}>
                                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]} onPress={saveTiebreak} disabled={busy}>
                                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Confirm Winner</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
    title: { fontSize: SIZES.lg || 18, fontWeight: '800' },
    scheduleBtnPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    scheduleBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    roundTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
    champion: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1.5, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 14 },
    championLabel: { color: '#92400E', fontWeight: '800', letterSpacing: 1, fontSize: 13 },
    championName: { color: '#78350F', fontSize: 22, fontWeight: '900', marginTop: 4 },
    schedulePromptTitle: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
    schedulePromptSub: { fontSize: 12, fontWeight: '500', marginBottom: 14 },
    scheduleOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    optIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    optTitle: {
        fontSize: 15,
        fontWeight: '900',
    },
    badgeTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeTagText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
    },
    optDesc: {
        fontSize: 11,
        lineHeight: 15,
        marginTop: 2,
    },
    matchCard: { borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 12 },
    matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    matchRoundTag: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    matchNumberTag: { fontSize: 12, fontWeight: '800' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    tossBanner: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, borderWidth: 1 },
    tossBannerText: { fontSize: 12 },
    teamBlock: { padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.02)' },
    winningTeamBlock: { backgroundColor: 'rgba(16, 185, 129, 0.08)' },
    teamTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    teamHeadingName: { fontSize: 14, fontWeight: '800', flex: 1 },
    winnerText: { color: '#059669' },
    winnerBadgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
    winnerBadgePillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
    runsWicketsText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    oversText: { fontSize: 12, marginLeft: 8, fontWeight: '600' },
    vsDividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
    vsLine: { flex: 1, height: 1 },
    vsBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginHorizontal: 8 },
    vsText: { fontSize: 10, fontWeight: '800' },
    completedResultBox: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10B981' },
    completedWinnerText: { color: '#047857', fontWeight: '900', fontSize: 13 },
    completedMarginText: { color: '#065F46', fontSize: 12, marginTop: 2, fontWeight: '600' },
    liveLeadBox: { marginTop: 10, padding: 8, borderRadius: 8, backgroundColor: 'rgba(2, 132, 199, 0.08)', borderWidth: 1, borderColor: '#0284C7' },
    liveLeadText: { color: '#0284C7', fontWeight: '700', fontSize: 12 },
    actionsRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
    actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    actionBtnPrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    actionBtnLive: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    actionBtnOutline: { flex: 0.9, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    actionBtnRatings: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    choice: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    primaryBtnSmall: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800' },
    secondaryBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginRight: 10 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
    label: { marginTop: 12, marginBottom: 6, fontWeight: '700', fontSize: SIZES.sm },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: SIZES.md },
    modalBtns: { flexDirection: 'row', marginTop: 18 },
});

export default TournamentMatchesScreen;
