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
 * Vendor "Matches & Scoring" screen.
 * - Generate knockout bracket from accepted teams
 * - Toss, live score entry, confirm winner (auto-advances to next round)
 * Only the vendor who CREATED the tournament can manage it (backend enforces this too).
 * Users only see the same data read-only in the User App.
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

    // Score modal
    const [scoreMatch, setScoreMatch] = useState(null);
    const [scoreA, setScoreA] = useState('');
    const [scoreB, setScoreB] = useState('');
    const [summary, setSummary] = useState('');

    // Winner modal
    const [winnerMatch, setWinnerMatch] = useState(null);
    const [winnerId, setWinnerId] = useState('');

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

    // Live scores: silent refresh every 15s once fixtures exist
    useEffect(() => {
        if (!tournament?.bracket) return undefined;
        const t = setInterval(() => {
            if (!busy && !tossMatch && !scoreMatch && !winnerMatch) load();
        }, 15000);
        return () => clearInterval(t);
    }, [tournament?.bracket, busy, tossMatch, scoreMatch, winnerMatch, load]);

    const isCricket = String(tournament?.sport || '').toLowerCase().includes('cricket');
    // Vendor-created tournament -> vendor scores. User-created tournaments are scored by that user.
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
                ? 'Only 2 teams are accepted, so they will play a single Final match. Registration will close. Continue?'
                : `Randomly pair the ${acceptedCount} accepted teams into knockout fixtures? Registration will close and the draw is FINAL (cannot be changed or redone).`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: two ? 'Create Match' : 'Draw Now',
                    onPress: () => run(() => generateBracketApi(tournament.id, {}), two ? 'Match Ready ⚡' : 'Bracket Ready ⚡'),
                },
            ]
        );
    };

    const openToss = (m) => {
        setTossMatch(m);
        setTossWinnerId(m.toss?.wonBy || m.teamA.id);
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
        setScoreMatch(m);
        setScoreA(m.score?.teamA || '');
        setScoreB(m.score?.teamB || '');
        setSummary(m.score?.summary || '');
    };
    const saveScore = async () => {
        if (!scoreA.trim() && !scoreB.trim()) {
            Alert.alert('Required', 'Please enter at least one team score.');
            return;
        }
        const ok = await run(
            () =>
                updateMatchScoreApi(tournament.id, scoreMatch.id, {
                    score: { teamA: scoreA.trim(), teamB: scoreB.trim(), summary: summary.trim() },
                    status: 'live',
                }),
            'Score Updated 📝'
        );
        if (ok) setScoreMatch(null);
    };

    // Finish match: winner is decided by the ENTERED SCORE (server validates).
    // Only if scores are level do we ask for the tie-breaker winner.
    const finishMatch = (m) => {
        const isFinal = !m.nextMatchId;
        Alert.alert(
            isFinal ? 'Finish Final 👑' : 'Finish Match 🏁',
            isFinal
                ? 'The team with the higher score will be crowned champion. Continue?'
                : 'The team with the higher score wins and moves to the next round automatically. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Finish',
                    onPress: async () => {
                        setBusy(true);
                        try {
                            const res = await confirmMatchWinnerApi(tournament.id, m.id, {});
                            applyResult(res);
                            Alert.alert(isFinal ? '👑 Champion Crowned!' : '🏆 Winner Advanced!', res?.message || '');
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

    // Tie-breaker (penalties / super over / golden goal)
    const saveTiebreak = async () => {
        setBusy(true);
        try {
            const res = await confirmMatchWinnerApi(tournament.id, winnerMatch.id, { winnerTeamId: winnerId });
            applyResult(res);
            setWinnerMatch(null);
            Alert.alert('Result saved', res?.message || '');
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

    const teamName = (t) => (t ? t.name || t.teamName || 'Team' : 'TBD');

    const statusMeta = (m) => {
        if (m.status === 'completed') return { label: m.isBye ? 'BYE' : 'COMPLETED', bg: '#10B981' };
        if (m.status === 'live') return { label: 'LIVE', bg: '#EF4444' };
        if (m.status === 'toss') return { label: 'TOSS DONE', bg: '#F59E0B' };
        if (m.status === 'pending') return { label: 'READY', bg: '#6366F1' };
        return { label: 'WAITING', bg: '#94A3B8' };
    };

    const TeamRow = ({ team, score, isWinner }) => (
        <View style={styles.teamRow}>
            <View style={{ flex: 1 }}>
                <Text
                    style={[styles.teamName, { color: team ? colors.text : colors.textSecondary }, isWinner && styles.winnerText]}
                    numberOfLines={1}
                >
                    {isWinner ? '🏆 ' : ''}
                    {teamName(team)}
                </Text>
            </View>
            <Text style={[styles.teamScore, { color: colors.text }]}>{score || '-'}</Text>
        </View>
    );

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
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
                    <Text style={[styles.title, { color: colors.text }]}>{tournament.name}</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                        {tournament.sport} • {acceptedCount} accepted teams
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

                {Boolean(bracket?.winner) && (
                    <View style={[styles.champion]}>
                        <Text style={styles.championLabel}>👑 CHAMPION</Text>
                        <Text style={styles.championName}>{teamName(bracket.winner)}</Text>
                        {Boolean(bracket.runnerUp) && (
                            <Text style={{ color: '#92400E', marginTop: 4 }}>🥈 Runner-up: {teamName(bracket.runnerUp)}</Text>
                        )}
                    </View>
                )}

                {!bracket ? (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
                        <Feather name="git-merge" size={34} color={colors.primary} />
                        <Text style={[styles.title, { color: colors.text, marginTop: 10 }]}>{acceptedCount === 2 ? 'Match not created' : 'Bracket not generated'}</Text>
                        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
                            {acceptedCount === 2 ? 'Only 2 teams are accepted, so they simply play each other in the Final. No draw is needed.' : 'Accept team applications, then generate fixtures. Teams are paired by a RANDOM DRAW - nobody (not even you) can choose or change who plays whom, and the draw cannot be redone.'}
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
                                    <Text style={styles.primaryBtnText}>{acceptedCount === 2 ? '🏏 Create Match (2 teams)' : `🎲 Random Draw (${acceptedCount} teams)`}</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            <Choice selected={roundTab === 'all'} label="All" onPress={() => setRoundTab('all')} />
                            {bracket.rounds.map((r) => (
                                <Choice
                                    key={r.roundNumber}
                                    selected={String(roundTab) === String(r.roundNumber)}
                                    label={r.name}
                                    onPress={() => setRoundTab(r.roundNumber)}
                                />
                            ))}
                        </ScrollView>

                        {visibleRounds.map((round) => (
                            <View key={round.roundNumber} style={{ marginBottom: 8 }}>
                                <Text style={[styles.roundTitle, { color: colors.text }]}>{round.name}</Text>
                                {(round.matches || []).map((m) => {
                                    const meta = statusMeta(m);
                                    const bothTeams = Boolean(m.teamA && m.teamB);
                                    const done = m.status === 'completed';
                                    const finalMatch = !m.nextMatchId;
                                    return (
                                        <View
                                            key={m.id}
                                            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}
                                        >
                                            <View style={styles.matchHeader}>
                                                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Match {m.matchNumber}</Text>
                                                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                                                    <Text style={styles.badgeText}>{meta.label}</Text>
                                                </View>
                                            </View>

                                            {Boolean(m.toss) && (
                                                <Text style={styles.tossText}>
                                                    🪙 {m.toss.winnerName} won the toss and chose {m.toss.decision}
                                                </Text>
                                            )}

                                            <TeamRow team={m.teamA} score={m.score?.teamA} isWinner={done && m.winner?.id === m.teamA?.id} />
                                            <TeamRow team={m.teamB} score={m.score?.teamB} isWinner={done && m.winner?.id === m.teamB?.id} />

                                            {Boolean(m.score?.summary) && (
                                                <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: SIZES.sm }}>
                                                    {m.score.summary}
                                                </Text>
                                            )}

                                            {canManage && bothTeams && !m.isBye && (
                                                <View style={styles.actionsRow}>
                                                    {!done && (
                                                        <TouchableOpacity
                                                            style={[styles.actionBtn, { borderColor: '#F59E0B' }]}
                                                            onPress={() => openToss(m)}
                                                        >
                                                            <Text style={{ color: '#B45309', fontWeight: '700' }}>🪙 {m.toss ? 'Edit Toss' : 'Toss'}</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    {!done && (
                                                        <TouchableOpacity
                                                            style={[styles.actionBtn, { borderColor: '#0284C7' }]}
                                                            onPress={() => openScore(m)}
                                                        >
                                                            <Text style={{ color: '#0284C7', fontWeight: '700' }}>{m.score ? 'Update Score' : 'Enter Score'}</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    {!done && (
                                                        <TouchableOpacity
                                                            style={[styles.actionBtn, { backgroundColor: finalMatch ? '#D97706' : colors.primary, borderColor: 'transparent' }]}
                                                            onPress={() => finishMatch(m)}
                                                        >
                                                            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                                                                {finalMatch ? '👑 Finish Final' : '🏁 Finish'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
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

            {/* Toss modal */}
            <Modal visible={Boolean(tossMatch)} transparent animationType="slide" onRequestClose={() => setTossMatch(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.title, { color: colors.text }]}>Match Toss</Text>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Toss winner</Text>
                        <View style={styles.rowWrap}>
                            <Choice selected={tossWinnerId === tossMatch?.teamA?.id} label={teamName(tossMatch?.teamA)} onPress={() => setTossWinnerId(tossMatch.teamA.id)} />
                            <Choice selected={tossWinnerId === tossMatch?.teamB?.id} label={teamName(tossMatch?.teamB)} onPress={() => setTossWinnerId(tossMatch.teamB.id)} />
                        </View>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Elected to</Text>
                        <View style={styles.rowWrap}>
                            {(isCricket ? ['bat', 'bowl'] : ['kickoff', 'defend']).map((d) => (
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

            {/* Score modal */}
            <Modal visible={Boolean(scoreMatch)} transparent animationType="slide" onRequestClose={() => setScoreMatch(null)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.title, { color: colors.text }]}>Enter Score</Text>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>{teamName(scoreMatch?.teamA)}</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            value={scoreA}
                            onChangeText={setScoreA}
                            placeholder={isCricket ? 'e.g. 142/6 (10.0 ov)' : 'e.g. 2'}
                            placeholderTextColor={colors.textLight}
                            maxLength={40}
                        />
                        <Text style={[styles.label, { color: colors.textSecondary }]}>{teamName(scoreMatch?.teamB)}</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            value={scoreB}
                            onChangeText={setScoreB}
                            placeholder={isCricket ? 'e.g. 138/9 (10.0 ov)' : 'e.g. 1'}
                            placeholderTextColor={colors.textLight}
                            maxLength={40}
                        />
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Match summary (optional)</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            value={summary}
                            onChangeText={setSummary}
                            placeholder="e.g. Team A won by 4 runs"
                            placeholderTextColor={colors.textLight}
                            maxLength={300}
                        />
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

            {/* Winner modal */}
            <Modal visible={Boolean(winnerMatch)} transparent animationType="slide" onRequestClose={() => setWinnerMatch(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Tie-Breaker
                        </Text>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Scores are level. Who won the {isCricket ? 'super over' : 'penalty shoot-out / golden goal'}?
                        </Text>
                        <View style={styles.rowWrap}>
                            <Choice selected={winnerId === winnerMatch?.teamA?.id} label={teamName(winnerMatch?.teamA)} onPress={() => setWinnerId(winnerMatch.teamA.id)} />
                            <Choice selected={winnerId === winnerMatch?.teamB?.id} label={teamName(winnerMatch?.teamB)} onPress={() => setWinnerId(winnerMatch.teamB.id)} />
                        </View>
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => setWinnerMatch(null)}>
                                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]} onPress={saveTiebreak} disabled={busy}>
                                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Confirm</Text>}
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
    roundTitle: { fontSize: SIZES.md, fontWeight: '800', marginBottom: 8, marginTop: 4 },
    notice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 10 },
    noticeText: { color: '#92400E', marginLeft: 8, flex: 1, fontSize: SIZES.sm },
    champion: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 12 },
    championLabel: { color: '#92400E', fontWeight: '800', letterSpacing: 1 },
    championName: { color: '#78350F', fontSize: 20, fontWeight: '900', marginTop: 4 },
    matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    tossText: { color: '#B45309', fontSize: SIZES.sm, marginBottom: 6 },
    teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    teamName: { fontSize: SIZES.md, fontWeight: '700' },
    winnerText: { color: '#059669' },
    teamScore: { fontSize: SIZES.md, fontWeight: '800', marginLeft: 8 },
    actionsRow: { flexDirection: 'row', marginTop: 10 },
    actionBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginRight: 8 },
    choice: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, maxWidth: 220 },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    primaryBtn: { marginTop: 14, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', alignSelf: 'stretch' },
    primaryBtnSmall: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800' },
    secondaryBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginRight: 10 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    label: { marginTop: 14, marginBottom: 6, fontWeight: '700', fontSize: SIZES.sm },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: SIZES.md },
    modalBtns: { flexDirection: 'row', marginTop: 20 },
});

export default TournamentMatchesScreen;
