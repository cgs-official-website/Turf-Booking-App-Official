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
    KeyboardAvoidingView,
    Platform,
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

/**
 * Vendor "Matches & Scoring" screen.
 * - Generate knockout bracket from accepted teams (2, 4, 8 teams...)
 * - Toss, structured live cricket score entry (Runs, Wickets, Overs)
 * - Automatic winner determination, advancement, and championship crowning
 */
const TournamentMatchesScreen = ({ route, navigation }) => {
    const tournamentId = route.params?.tournamentId || route.params?.id;
    const { colors } = useTheme();

    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [roundTab, setRoundTab] = useState('all');

    // Toss modal
    const [tossMatch, setTossMatch] = useState(null);
    const [tossWinnerId, setTossWinnerId] = useState('');
    const [tossDecision, setTossDecision] = useState('bat');

    // Structured Score modal (Runs, Wickets, Overs)
    const [scoreMatch, setScoreMatch] = useState(null);
    const [runsA, setRunsA] = useState('');
    const [wicketsA, setWicketsA] = useState('');
    const [oversA, setOversA] = useState('');
    const [runsB, setRunsB] = useState('');
    const [wicketsB, setWicketsB] = useState('');
    const [oversB, setOversB] = useState('');
    const [summary, setSummary] = useState('');

    // Tiebreaker modal (Scores level)
    const [winnerMatch, setWinnerMatch] = useState(null);
    const [winnerId, setWinnerId] = useState('');
    const [tiebreakNote, setTiebreakNote] = useState('Super Over');

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: 'Matches & Scoring',
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

    // Live scores: refresh every 15s when fixtures exist
    useEffect(() => {
        if (!tournament?.bracket) return undefined;
        const t = setInterval(() => {
            if (!busy && !tossMatch && !scoreMatch && !winnerMatch) load();
        }, 15000);
        return () => clearInterval(t);
    }, [tournament?.bracket, busy, tossMatch, scoreMatch, winnerMatch, load]);

    const isCricket = String(tournament?.sport || '').toLowerCase().includes('cricket');
    const canManage = Boolean(tournament && tournament.creatorType !== 'USER' && tournament.canEdit);
    const bracket = tournament?.bracket && Array.isArray(tournament.bracket.rounds) ? tournament.bracket : null;
    const acceptedCount = (tournament?.acceptedTeams || []).length;

    const applyResult = (res) => {
        const updated = res?.tournament || res?.data?.tournament;
        if (updated) setTournament(updated);
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

    const handleGenerate = () => {
        if (acceptedCount < 2) {
            Alert.alert(
                'Not enough teams',
                `At least 2 accepted teams are required.\nCurrently accepted: ${acceptedCount}.\n\nAccept team applications from the Tournament Details screen first.`
            );
            return;
        }
        const two = acceptedCount === 2;
        Alert.alert(
            two ? 'Create Final Match 🏏' : 'Conduct Random Draw 🎲',
            two
                ? 'Only 2 teams are accepted, so exactly one Final match will be created. Registration will close. Continue?'
                : `Randomly pair the ${acceptedCount} accepted teams into knockout fixtures? First-round teams are randomly shuffled from the actual accepted teams. Continue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: two ? 'Create Match' : 'Draw Now',
                    onPress: () => run(() => generateBracketApi(tournament.id, { force: true }), two ? 'Match Ready ⚡' : 'Bracket Ready ⚡'),
                },
            ]
        );
    };

    const openToss = (m) => {
        setTossMatch(m);
        setTossWinnerId(m.toss?.wonBy || m.toss?.winnerId || m.teamA?.id);
        setTossDecision(m.toss?.decision || (isCricket ? 'bat' : 'kickoff'));
    };

    const saveToss = async () => {
        const ok = await run(
            () => conductMatchTossApi(tournament.id, tossMatch.id, { winnerTeamId: tossWinnerId, decision: tossDecision }),
            'Toss Recorded 🪙'
        );
        if (ok) setTossMatch(null);
    };

    const openScore = (m) => {
        const cs = getMatchCricketScore(m);
        setScoreMatch(m);
        setRunsA(cs.hasScoreA ? String(cs.runsA) : '');
        setWicketsA(cs.hasScoreA ? String(cs.wicketsA) : '');
        setOversA(cs.hasScoreA ? String(cs.oversA) : '');
        setRunsB(cs.hasScoreB ? String(cs.runsB) : '');
        setWicketsB(cs.hasScoreB ? String(cs.wicketsB) : '');
        setOversB(cs.hasScoreB ? String(cs.oversB) : '');
        setSummary(m.score?.summary || '');
    };

    const saveScore = async () => {
        if (runsA.trim() === '' && runsB.trim() === '') {
            Alert.alert('Required', 'Please enter runs for at least one team.');
            return;
        }
        const ok = await run(
            () =>
                updateMatchScoreApi(tournament.id, scoreMatch.id, {
                    runsA: runsA.trim() === '' ? 0 : parseInt(runsA, 10),
                    wicketsA: wicketsA.trim() === '' ? 0 : parseInt(wicketsA, 10),
                    oversA: oversA.trim() || '0.0',
                    runsB: runsB.trim() === '' ? 0 : parseInt(runsB, 10),
                    wicketsB: wicketsB.trim() === '' ? 0 : parseInt(wicketsB, 10),
                    oversB: oversB.trim() || '0.0',
                    summary: summary.trim(),
                    status: 'live',
                }),
            'Score Updated 📝'
        );
        if (ok) setScoreMatch(null);
    };

    // Finish match: validates score, automatically determines winner, advances winner to next round or crowns champion
    const finishMatch = (m) => {
        const isFinal = !m.nextMatchId;
        const cs = getMatchCricketScore(m);
        if (!cs.hasScore) {
            Alert.alert(
                'Score Required',
                'Please enter the match score before finishing this match.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Update Score', onPress: () => openScore(m) },
                ]
            );
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
            isFinal ? 'Finish Final & Crown Champion 👑' : 'Finish Match & Advance Winner 🏁',
            `${previewSummary}\n\n` +
            (isFinal
                ? 'The team with the higher score will be crowned Tournament Champion. Continue?'
                : 'The team with the higher score wins and automatically advances to the next round fixture. Continue?'),
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Finish Match',
                    onPress: async () => {
                        setBusy(true);
                        try {
                            const res = await confirmMatchWinnerApi(tournament.id, m.id, {});
                            applyResult(res);
                            Alert.alert(
                                isFinal ? '👑 Champion Crowned!' : '🏆 Winner Advanced!',
                                res?.message || 'Match completed successfully.'
                            );
                        } catch (err) {
                            if (err.code === 'TIE_NEEDS_TIEBREAK') {
                                setWinnerMatch(m);
                                setWinnerId(m.teamA.id);
                            } else if (err.code === 'SCORE_REQUIRED') {
                                Alert.alert('Score needed', err.message);
                                openScore(m);
                            } else {
                                Alert.alert('Error', err.message || 'Failed to finish match');
                            }
                        } finally {
                            setBusy(false);
                        }
                    },
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
        if (m.status === 'toss') return { label: 'LIVE', bg: '#EF4444' };
        if (m.status === 'pending') return { label: 'UPCOMING', bg: '#64748B' };
        return { label: 'UPCOMING', bg: '#94A3B8' };
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
                {/* Tournament Info Banner */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
                    <Text style={[styles.title, { color: colors.text }]}>{tournament.name}</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 4, fontWeight: '600' }}>
                        {bracket ? `${bracket.teamsCount || acceptedCount} Teams • ${bracket.totalRounds || bracket.rounds.length} Rounds` : `${tournament.sport} • ${acceptedCount} accepted teams`}
                    </Text>
                    {!canManage && (
                        <View style={styles.notice}>
                            <Feather name="eye" size={14} color="#92400E" />
                            <Text style={styles.noticeText}>
                                View only. Scores for this tournament are managed by its organizer.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Champion Banner */}
                {Boolean(bracket?.winner) && (
                    <View style={styles.champion}>
                        <Text style={styles.championLabel}>👑 TOURNAMENT CHAMPION</Text>
                        <Text style={styles.championName}>{getTeamDisplayName(bracket.winner)}</Text>
                        {Boolean(bracket.runnerUp) && (
                            <Text style={{ color: '#92400E', marginTop: 4, fontWeight: '600' }}>
                                🥈 Runner-up: {getTeamDisplayName(bracket.runnerUp)}
                            </Text>
                        )}
                    </View>
                )}

                {/* Bracket Not Yet Generated */}
                {!bracket ? (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
                        <Feather name="git-merge" size={36} color={colors.primary} />
                        <Text style={[styles.title, { color: colors.text, marginTop: 12 }]}>
                            {acceptedCount === 2 ? 'Final Match Not Created' : 'Bracket Not Generated'}
                        </Text>
                        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 12 }}>
                            {acceptedCount === 2
                                ? '2 accepted teams are ready. Generate the bracket to create the Final match fixture.'
                                : `Accept team applications, then generate fixtures. ${acceptedCount} accepted teams will be randomly shuffled into the first-round fixtures.`}
                        </Text>
                        {canManage && (
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
                                onPress={handleGenerate}
                                disabled={busy}
                                activeOpacity={0.85}
                            >
                                {busy ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.primaryBtnText}>
                                        {acceptedCount === 2 ? '🏏 Create Final Match (2 teams)' : `🎲 Conduct Random Draw (${acceptedCount} teams)`}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
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
                            <View key={round.roundNumber} style={{ marginBottom: 12 }}>
                                <Text style={[styles.roundTitle, { color: colors.text }]}>{round.name.toUpperCase()}</Text>
                                {(round.matches || []).map((m) => {
                                    const meta = statusMeta(m);
                                    const bothTeams = Boolean(m.teamA && m.teamB);
                                    const done = m.status === 'completed';
                                    const isLive = m.status === 'live' || m.status === 'toss';
                                    const finalMatch = !m.nextMatchId;
                                    const cs = getMatchCricketScore(m);

                                    const teamAWon = done && m.winner?.id === m.teamA?.id;
                                    const teamBWon = done && m.winner?.id === m.teamB?.id;

                                    return (
                                        <View
                                            key={m.id}
                                            style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}
                                        >
                                            {/* Match Card Top Row */}
                                            <View style={styles.matchHeader}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <Text style={[styles.matchRoundTag, { color: colors.primary }]}>
                                                        {(m.roundName || round.name).toUpperCase()}
                                                    </Text>
                                                    <Text style={{ color: colors.textSecondary, marginHorizontal: 6, fontWeight: '700' }}>•</Text>
                                                    <Text style={[styles.matchNumberTag, { color: colors.text }]}>
                                                        {m.matchCode ? `${m.matchCode} (MATCH ${m.matchNumber})` : `MATCH ${m.matchNumber}`}
                                                    </Text>
                                                </View>
                                                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                                                    <Text style={styles.badgeText}>{meta.label}</Text>
                                                </View>
                                            </View>

                                            {/* Toss Banner */}
                                            {Boolean(m.toss) && (
                                                <View style={styles.tossBanner}>
                                                    <Text style={styles.tossBannerText}>
                                                        🪙 <Text style={{ fontWeight: '800' }}>{m.toss.winnerName}</Text> won the toss and elected to <Text style={{ fontWeight: '800' }}>{String(m.toss.decision || 'bat').toUpperCase()}</Text>
                                                    </Text>
                                                </View>
                                            )}

                                            {/* ── Structured Team A Box ── */}
                                            <View style={[styles.teamBlock, teamAWon && styles.winningTeamBlock]}>
                                                <View style={styles.teamTitleRow}>
                                                    <Text style={[styles.teamHeadingName, { color: colors.text }, teamAWon && styles.winnerText]}>
                                                        {getTeamDisplayName(m.teamA, m.placeholderA).toUpperCase()}
                                                    </Text>
                                                    {teamAWon && (
                                                        <View style={[styles.winnerBadgePill, { backgroundColor: '#10B981' }]}>
                                                            <Text style={styles.winnerBadgePillText}>{finalMatch ? 'CHAMPION' : 'WINNER'}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                {cs.hasScoreA ? (
                                                    <View style={styles.scoreRow}>
                                                        <Text style={[styles.runsWicketsText, { color: colors.text }]}>
                                                            {cs.runsA} / {cs.wicketsA}
                                                        </Text>
                                                        <Text style={[styles.oversText, { color: colors.textSecondary }]}>
                                                            {cs.oversA} overs
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2, fontStyle: 'italic' }}>
                                                        Score not entered
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

                                            {/* ── Structured Team B Box ── */}
                                            <View style={[styles.teamBlock, teamBWon && styles.winningTeamBlock]}>
                                                <View style={styles.teamTitleRow}>
                                                    <Text style={[styles.teamHeadingName, { color: colors.text }, teamBWon && styles.winnerText]}>
                                                        {getTeamDisplayName(m.teamB, m.placeholderB).toUpperCase()}
                                                    </Text>
                                                    {teamBWon && (
                                                        <View style={[styles.winnerBadgePill, { backgroundColor: '#10B981' }]}>
                                                            <Text style={styles.winnerBadgePillText}>{finalMatch ? 'CHAMPION' : 'WINNER'}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                {cs.hasScoreB ? (
                                                    <View style={styles.scoreRow}>
                                                        <Text style={[styles.runsWicketsText, { color: colors.text }]}>
                                                            {cs.runsB} / {cs.wicketsB}
                                                        </Text>
                                                        <Text style={[styles.oversText, { color: colors.textSecondary }]}>
                                                            {cs.oversB} overs
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2, fontStyle: 'italic' }}>
                                                        Score not entered
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Dynamic Cricket Match Status / Lead / Completed Win Banner */}
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

                                            {/* Vendor Action Buttons */}
                                            {canManage && bothTeams && !m.isBye && !done && (
                                                <View style={styles.actionsRow}>
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.06)' }]}
                                                        onPress={() => openToss(m)}
                                                    >
                                                        <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 13 }}>
                                                            🪙 {m.toss ? 'Edit Toss' : 'Toss'}
                                                        </Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { borderColor: '#0284C7', backgroundColor: 'rgba(2, 132, 199, 0.06)' }]}
                                                        onPress={() => openScore(m)}
                                                    >
                                                        <Text style={{ color: '#0284C7', fontWeight: '700', fontSize: 13 }}>
                                                            📝 Update Score
                                                        </Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { backgroundColor: finalMatch ? '#D97706' : colors.primary, borderColor: 'transparent' }]}
                                                        onPress={() => finishMatch(m)}
                                                    >
                                                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                                                            {finalMatch ? '👑 Finish Final' : '🏁 Finish Match'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>

            {/* Toss Modal */}
            <Modal visible={Boolean(tossMatch)} transparent animationType="slide" onRequestClose={() => setTossMatch(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.title, { color: colors.text }]}>Match Toss</Text>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Toss Winner</Text>
                        <View style={styles.rowWrap}>
                            <Choice
                                selected={tossWinnerId === tossMatch?.teamA?.id}
                                label={getTeamDisplayName(tossMatch?.teamA)}
                                onPress={() => setTossWinnerId(tossMatch.teamA.id)}
                            />
                            <Choice
                                selected={tossWinnerId === tossMatch?.teamB?.id}
                                label={getTeamDisplayName(tossMatch?.teamB)}
                                onPress={() => setTossWinnerId(tossMatch.teamB.id)}
                            />
                        </View>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Elected to</Text>
                        <View style={styles.rowWrap}>
                            {['bat', 'bowl'].map((d) => (
                                <Choice key={d} selected={tossDecision === d} label={d.toUpperCase()} onPress={() => setTossDecision(d)} />
                            ))}
                        </View>
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => setTossMatch(null)}>
                                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]} onPress={saveToss} disabled={busy}>
                                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Save Toss</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Structured Cricket Score Modal */}
            <Modal visible={Boolean(scoreMatch)} transparent animationType="slide" onRequestClose={() => setScoreMatch(null)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.title, { color: colors.text }]}>Update Score</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: SIZES.sm, marginTop: 2 }}>
                                    {(scoreMatch?.roundName || 'Match').toUpperCase()} • Match #{scoreMatch?.matchNumber}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setScoreMatch(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Feather name="x" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Team A Section */}
                        <View style={styles.scoreEntryTeamBox}>
                            <Text style={[styles.scoreEntryTeamName, { color: colors.text }]}>
                                {getTeamDisplayName(scoreMatch?.teamA, scoreMatch?.placeholderA)}
                            </Text>
                            <View style={styles.scoreInputFieldsRow}>
                                <View style={styles.scoreFieldCol}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Runs</Text>
                                    <TextInput
                                        style={[styles.scoreFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                        value={runsA}
                                        onChangeText={setRunsA}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textLight}
                                        maxLength={4}
                                    />
                                </View>
                                <View style={styles.scoreFieldCol}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Wickets</Text>
                                    <TextInput
                                        style={[styles.scoreFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                        value={wicketsA}
                                        onChangeText={setWicketsA}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textLight}
                                        maxLength={2}
                                    />
                                </View>
                                <View style={styles.scoreFieldCol}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Overs</Text>
                                    <TextInput
                                        style={[styles.scoreFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                        value={oversA}
                                        onChangeText={setOversA}
                                        keyboardType="decimal-pad"
                                        placeholder="0.0"
                                        placeholderTextColor={colors.textLight}
                                        maxLength={5}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Team B Section */}
                        <View style={styles.scoreEntryTeamBox}>
                            <Text style={[styles.scoreEntryTeamName, { color: colors.text }]}>
                                {getTeamDisplayName(scoreMatch?.teamB, scoreMatch?.placeholderB)}
                            </Text>
                            <View style={styles.scoreInputFieldsRow}>
                                <View style={styles.scoreFieldCol}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Runs</Text>
                                    <TextInput
                                        style={[styles.scoreFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                        value={runsB}
                                        onChangeText={setRunsB}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textLight}
                                        maxLength={4}
                                    />
                                </View>
                                <View style={styles.scoreFieldCol}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Wickets</Text>
                                    <TextInput
                                        style={[styles.scoreFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                        value={wicketsB}
                                        onChangeText={setWicketsB}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textLight}
                                        maxLength={2}
                                    />
                                </View>
                                <View style={styles.scoreFieldCol}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Overs</Text>
                                    <TextInput
                                        style={[styles.scoreFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                        value={oversB}
                                        onChangeText={setOversB}
                                        keyboardType="decimal-pad"
                                        placeholder="0.0"
                                        placeholderTextColor={colors.textLight}
                                        maxLength={5}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Match Summary Note */}
                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>
                            Match Summary (optional)
                        </Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            value={summary}
                            onChangeText={setSummary}
                            placeholder="e.g. Inning break, rain delay, or custom note"
                            placeholderTextColor={colors.textLight}
                            maxLength={200}
                        />
                        <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>
                            The Match Summary is not used as the match score. Structured Runs, Wickets, and Overs determine the score and winner.
                        </Text>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => setScoreMatch(null)}>
                                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]} onPress={saveScore} disabled={busy}>
                                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Save Score</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
                            Tie-breaker Note (optional)
                        </Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
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
    card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
    title: { fontSize: SIZES.lg || 18, fontWeight: '800' },
    roundTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
    notice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 10 },
    noticeText: { color: '#92400E', marginLeft: 8, flex: 1, fontSize: SIZES.sm },
    champion: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1.5, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 14 },
    championLabel: { color: '#92400E', fontWeight: '800', letterSpacing: 1, fontSize: 13 },
    championName: { color: '#78350F', fontSize: 22, fontWeight: '900', marginTop: 4 },
    matchCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
    matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    matchRoundTag: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    matchNumberTag: { fontSize: 12, fontWeight: '800' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    tossBanner: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A' },
    tossBannerText: { color: '#92400E', fontSize: 12 },
    teamBlock: { padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.02)' },
    winningTeamBlock: { backgroundColor: 'rgba(16, 185, 129, 0.08)' },
    teamTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    teamHeadingName: { fontSize: 15, fontWeight: '800', flex: 1 },
    winnerText: { color: '#059669' },
    winnerBadgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
    winnerBadgePillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
    runsWicketsText: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    oversText: { fontSize: 13, marginLeft: 8, fontWeight: '600' },
    vsDividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
    vsLine: { flex: 1, height: 1 },
    vsBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginHorizontal: 8 },
    vsText: { fontSize: 10, fontWeight: '800' },
    completedResultBox: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10B981' },
    completedWinnerText: { color: '#047857', fontWeight: '900', fontSize: 13 },
    completedMarginText: { color: '#065F46', fontSize: 12, marginTop: 2, fontWeight: '600' },
    liveLeadBox: { marginTop: 10, padding: 8, borderRadius: 8, backgroundColor: 'rgba(2, 132, 199, 0.08)', borderWidth: 1, borderColor: '#0284C7' },
    liveLeadText: { color: '#0284C7', fontWeight: '700', fontSize: 12 },
    actionsRow: { flexDirection: 'row', marginTop: 12 },
    actionBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginHorizontal: 3 },
    choice: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, maxWidth: 220 },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    primaryBtn: { marginTop: 14, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', alignSelf: 'stretch' },
    primaryBtnSmall: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800' },
    secondaryBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginRight: 10 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    label: { marginTop: 12, marginBottom: 6, fontWeight: '700', fontSize: SIZES.sm },
    scoreEntryTeamBox: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.03)' },
    scoreEntryTeamName: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
    scoreInputFieldsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    scoreFieldCol: { flex: 1, marginHorizontal: 4 },
    fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
    scoreFieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, fontWeight: '700', textAlign: 'center' },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: SIZES.md },
    modalBtns: { flexDirection: 'row', marginTop: 18 },
});

export default TournamentMatchesScreen;
