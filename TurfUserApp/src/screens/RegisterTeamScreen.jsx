import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { SPACING, RADIUS, SHADOW, FONT } from '../utils/theme';
import { registerTournamentTeamApi } from '../api/tournaments';

export default function RegisterTeamScreen({ route, navigation }) {
  const { tournament } = route.params || {};
  const { C, dark } = useTheme();
  const { user } = useSelector((s) => s.auth);

  const playersPerTeam = tournament?.playersPerTeam
    ? Number(tournament.playersPerTeam)
    : 11;

  // Form State
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState(user?.name || '');
  const [captainPhone, setCaptainPhone] = useState(user?.phone || '');
  const [captainEmail, setCaptainEmail] = useState(user?.email || '');

  // Initialize dynamic player entries strictly based on playersPerTeam
  const [players, setPlayers] = useState(() => {
    return Array.from({ length: playersPerTeam }, (_, idx) => ({
      index: idx + 1,
      name: idx === 0 && user?.name ? user.name : '',
      phone: idx === 0 && user?.phone ? user.phone : '',
    }));
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!tournament) {
      Alert.alert('Error', 'Tournament details not available', [
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const startStr = tournament.startDate ? String(tournament.startDate).slice(0, 10) : '';
    const endStr = tournament.endDate ? String(tournament.endDate).slice(0, 10) : '';
    const regStartStr = tournament.registrationStartDate ? String(tournament.registrationStartDate).slice(0, 10) : '';
    const regEndStr = tournament.registrationEndDate ? String(tournament.registrationEndDate).slice(0, 10) : '';

    if (endStr && todayStr > endStr) {
      Alert.alert('Tournament Completed', 'This tournament has already ended. Registrations are closed.', [
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    } else if (startStr && todayStr >= startStr) {
      Alert.alert('Tournament Ongoing', 'This tournament is already ongoing. Registrations are closed.', [
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    } else if (regEndStr && todayStr > regEndStr) {
      Alert.alert('Registration Closed', 'The registration period for this tournament has ended.', [
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    } else if (regStartStr && todayStr < regStartStr) {
      Alert.alert(
        'Registration Not Open',
        `Registration for this tournament opens on ${tournament.registrationStartDate}. Please check back then.`,
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    }
  }, [tournament, navigation]);

  const updatePlayer = (index, field, value) => {
    setPlayers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });

    // Clear field-specific error if present
    if (errors[`player_${index + 1}_${field}`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`player_${index + 1}_${field}`];
        return copy;
      });
    }
  };

  const handleUseCaptainAsPlayer1 = () => {
    if (!captainName && !captainPhone) {
      Alert.alert('Incomplete Captain Info', 'Please enter captain name and phone first.');
      return;
    }
    updatePlayer(0, 'name', captainName);
    updatePlayer(0, 'phone', captainPhone);
  };

  const validate = () => {
    const errs = {};
    if (!teamName.trim()) {
      errs.teamName = 'Team name is required';
    }

    if (!captainName.trim()) {
      errs.captainName = 'Captain name is required';
    }

    const cleanCapPhone = captainPhone.replace(/[^0-9]/g, '');
    if (!captainPhone.trim()) {
      errs.captainPhone = 'Captain phone number is required';
    } else if (cleanCapPhone.length < 10) {
      errs.captainPhone = 'Enter a valid 10-digit phone number';
    }

    const seenPhones = new Set();
    let hasPlayerError = false;

    players.forEach((p, idx) => {
      const pNum = idx + 1;
      if (!p.name.trim()) {
        errs[`player_${pNum}_name`] = `Player #${pNum} name required`;
        hasPlayerError = true;
      }
      const cleanPhone = p.phone.replace(/[^0-9]/g, '');
      if (!p.phone.trim()) {
        errs[`player_${pNum}_phone`] = `Player #${pNum} phone required`;
        hasPlayerError = true;
      } else if (cleanPhone.length < 10) {
        errs[`player_${pNum}_phone`] = `Player #${pNum} phone must be 10 digits`;
        hasPlayerError = true;
      } else if (seenPhones.has(cleanPhone)) {
        errs[`player_${pNum}_phone`] = `Duplicate phone for Player #${pNum}`;
        hasPlayerError = true;
      }
      seenPhones.add(cleanPhone);
    });

    if (hasPlayerError && !errs.players) {
      errs.players = 'Please complete all player entries with valid details';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startStr = tournament?.startDate ? String(tournament.startDate).slice(0, 10) : '';
    const endStr = tournament?.endDate ? String(tournament.endDate).slice(0, 10) : '';
    const regStartStr = tournament?.registrationStartDate ? String(tournament.registrationStartDate).slice(0, 10) : '';
    const regEndStr = tournament?.registrationEndDate ? String(tournament.registrationEndDate).slice(0, 10) : '';

    if (endStr && todayStr > endStr) {
      Alert.alert('Tournament Completed', 'This tournament has already completed. Registrations are closed.');
      return;
    }
    if (startStr && todayStr >= startStr) {
      Alert.alert('Tournament Ongoing', 'This tournament is already ongoing. New team registrations are closed.');
      return;
    }
    if (regEndStr && todayStr > regEndStr) {
      Alert.alert('Registration Closed', 'The registration period for this tournament has ended.');
      return;
    }
    if (regStartStr && todayStr < regStartStr) {
      Alert.alert(
        'Registration Not Open',
        `Registration for this tournament opens on ${tournament.registrationStartDate}. Please check back then.`
      );
      return;
    }

    if (!validate()) {
      Alert.alert('Validation Error', 'Please check the form and fill all required fields correctly.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teamName: teamName.trim(),
        captainName: captainName.trim(),
        captainPhone: captainPhone.trim(),
        captainEmail: captainEmail ? captainEmail.trim().toLowerCase() : undefined,
        players: players.map((p, idx) => ({
          index: idx + 1,
          name: p.name.trim(),
          phone: p.phone.trim(),
        })),
      };

      const res = await registerTournamentTeamApi(tournament.id, payload);

      Alert.alert(
        'Registration Submitted! 🎉',
        `Your team "${teamName.trim()}" has been submitted for "${tournament.name}".\n\nStatus: Pending Approval\n\nThe turf owner will review and approve your team.`,
        [
          {
            text: 'View Tournament',
            onPress: () => {
              navigation.navigate('TournamentDetail', {
                tournamentId: tournament.id,
                refresh: Date.now(),
              });
            },
          },
        ]
      );
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit registration.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filledPlayersCount = players.filter((p) => p.name.trim() && p.phone.trim()).length;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Top Bar ── */}
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
            Register Your Team
          </Text>
          <Text style={[styles.headerSub, { color: C.subtext }]} numberOfLines={1}>
            {tournament?.name}
          </Text>
        </View>
        <View style={[styles.sportPill, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.sportPillText, { color: C.primary }]}>{tournament?.sport}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Tournament Info Banner ── */}
          <View style={[styles.bannerCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={styles.bannerTopRow}>
              <View style={[styles.trophyIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Ionicons name="trophy" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.bannerTournamentName, { color: C.text }]} numberOfLines={1}>
                  {tournament?.name}
                </Text>
                <Text style={[styles.bannerTurfName, { color: C.subtext }]} numberOfLines={1}>
                  📍 {tournament?.turf?.name || tournament?.turfName || 'Turf Arena'}
                </Text>
              </View>
            </View>

            <View style={[styles.bannerDivider, { backgroundColor: C.border }]} />

            <View style={styles.bannerStatsRow}>
              <View style={styles.bannerStatCol}>
                <Text style={[styles.bannerStatLabel, { color: C.subtext }]}>Squad Size</Text>
                <Text style={[styles.bannerStatVal, { color: C.text }]}>{playersPerTeam} Players / Team</Text>
              </View>
              <View style={[styles.bannerStatDivider, { backgroundColor: C.border }]} />
              <View style={styles.bannerStatCol}>
                <Text style={[styles.bannerStatLabel, { color: C.subtext }]}>Slots Remaining</Text>
                <Text style={[styles.bannerStatVal, { color: '#10B981' }]}>
                  {tournament?.remainingSlots !== undefined ? tournament.remainingSlots : 'Available'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Section: Team & Captain Details ── */}
          <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="shield" size={18} color={C.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionHeading, { color: C.text }]}>Team & Captain Information</Text>
            </View>

            {/* Team Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Team Name <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: C.bgSoft, borderColor: errors.teamName ? '#EF4444' : C.border, color: C.text },
                ]}
                placeholder="e.g. Chennai Super Strikers"
                placeholderTextColor={C.subtext}
                value={teamName}
                onChangeText={(val) => {
                  setTeamName(val);
                  if (errors.teamName) setErrors((e) => ({ ...e, teamName: undefined }));
                }}
              />
              {errors.teamName && <Text style={styles.errorText}>{errors.teamName}</Text>}
            </View>

            {/* Captain Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Captain Name <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: C.bgSoft, borderColor: errors.captainName ? '#EF4444' : C.border, color: C.text },
                ]}
                placeholder="Full Name"
                placeholderTextColor={C.subtext}
                value={captainName}
                onChangeText={(val) => {
                  setCaptainName(val);
                  if (errors.captainName) setErrors((e) => ({ ...e, captainName: undefined }));
                }}
              />
              {errors.captainName && <Text style={styles.errorText}>{errors.captainName}</Text>}
            </View>

            {/* Captain Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Captain Phone Number <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.phoneInputWrap, { backgroundColor: C.bgSoft, borderColor: errors.captainPhone ? '#EF4444' : C.border }]}>
                <Text style={[styles.phonePrefix, { color: C.subtext }]}>+91</Text>
                <TextInput
                  style={[styles.phoneTextInput, { color: C.text }]}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={C.subtext}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={captainPhone}
                  onChangeText={(val) => {
                    setCaptainPhone(val);
                    if (errors.captainPhone) setErrors((e) => ({ ...e, captainPhone: undefined }));
                  }}
                />
              </View>
              {errors.captainPhone && <Text style={styles.errorText}>{errors.captainPhone}</Text>}
            </View>

            {/* Captain Email (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Captain Email <Text style={[styles.optionalTag, { color: C.subtext }]}>- Optional</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: C.bgSoft, borderColor: C.border, color: C.text }]}
                placeholder="captain@example.com"
                placeholderTextColor={C.subtext}
                keyboardType="email-address"
                autoCapitalize="none"
                value={captainEmail}
                onChangeText={setCaptainEmail}
              />
            </View>
          </View>

          {/* ── Section: Dynamic Players Roster ── */}
          <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={styles.playersHeaderRow}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="people" size={18} color={C.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.sectionHeading, { color: C.text }]}>Team Players</Text>
                </View>
                <Text style={[styles.playersSubtext, { color: C.subtext }]}>
                  {filledPlayersCount} of {playersPerTeam} entries completed
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.useCaptainBtn, { borderColor: C.primary, backgroundColor: C.primaryLight }]}
                onPress={handleUseCaptainAsPlayer1}
                activeOpacity={0.7}
              >
                <Feather name="user-check" size={13} color={C.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.useCaptainBtnText, { color: C.primary }]}>Captain as #1</Text>
              </TouchableOpacity>
            </View>

            {errors.players && (
              <View style={[styles.generalErrorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Feather name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.generalErrorText}>{errors.players}</Text>
              </View>
            )}

            {/* Render exactly playersPerTeam player cards */}
            {players.map((player, idx) => {
              const pNum = idx + 1;
              const nameError = errors[`player_${pNum}_name`];
              const phoneError = errors[`player_${pNum}_phone`];

              return (
                <View
                  key={`player-${pNum}`}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: C.bgSoft,
                      borderColor: (nameError || phoneError) ? '#EF4444' : C.border,
                    },
                  ]}
                >
                  <View style={styles.playerCardHeader}>
                    <View style={[styles.playerNumBadge, { backgroundColor: C.primary }]}>
                      <Text style={styles.playerNumBadgeText}>#{pNum}</Text>
                    </View>
                    <Text style={[styles.playerCardTitle, { color: C.text }]}>
                      {idx === 0 ? 'Player 1 (Captain)' : `Player ${pNum}`}
                    </Text>
                  </View>

                  {/* Player Name */}
                  <View style={styles.playerInputRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.smallInputLabel, { color: C.subtext }]}>Name *</Text>
                      <TextInput
                        style={[
                          styles.playerInput,
                          {
                            backgroundColor: C.card,
                            borderColor: nameError ? '#EF4444' : C.border,
                            color: C.text,
                          },
                        ]}
                        placeholder={`Player ${pNum} Name`}
                        placeholderTextColor={C.subtext}
                        value={player.name}
                        onChangeText={(val) => updatePlayer(idx, 'name', val)}
                      />
                      {nameError && <Text style={styles.errorTextSmall}>{nameError}</Text>}
                    </View>

                    {/* Player Phone */}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.smallInputLabel, { color: C.subtext }]}>Phone *</Text>
                      <TextInput
                        style={[
                          styles.playerInput,
                          {
                            backgroundColor: C.card,
                            borderColor: phoneError ? '#EF4444' : C.border,
                            color: C.text,
                          },
                        ]}
                        placeholder="10 Digits"
                        placeholderTextColor={C.subtext}
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={player.phone}
                        onChangeText={(val) => updatePlayer(idx, 'phone', val)}
                      />
                      {phoneError && <Text style={styles.errorTextSmall}>{phoneError}</Text>}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Privacy Note */}
          <View style={[styles.privacyBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
            <Feather name="lock" size={14} color={C.subtext} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={[styles.privacyText, { color: C.subtext }]}>
              Player contact numbers are confidential and visible only to the verified turf organizer for tournament scheduling and team communication.
            </Text>
          </View>

          {/* ── Submit Button ── */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: C.primary },
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Submit Team Registration</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 1,
  },
  sportPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sportPillText: {
    fontSize: 12,
    fontFamily: FONT.bold,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTournamentName: {
    fontSize: 16,
    fontFamily: FONT.bold,
  },
  bannerTurfName: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  bannerDivider: {
    height: 1,
    marginVertical: 12,
  },
  bannerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  bannerStatDivider: {
    width: 1,
    height: 24,
  },
  bannerStatLabel: {
    fontSize: 11,
    fontFamily: FONT.regular,
  },
  bannerStatVal: {
    fontSize: 13,
    fontFamily: FONT.bold,
    marginTop: 2,
  },

  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontFamily: FONT.bold,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: FONT.medium,
    marginBottom: 6,
  },
  optionalTag: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONT.regular,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  phonePrefix: {
    fontSize: 14,
    fontFamily: FONT.bold,
    marginRight: 8,
  },
  phoneTextInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONT.regular,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 4,
  },
  errorTextSmall: {
    color: '#EF4444',
    fontSize: 10,
    fontFamily: FONT.regular,
    marginTop: 2,
  },

  playersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  playersSubtext: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  useCaptainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  useCaptainBtnText: {
    fontSize: 11,
    fontFamily: FONT.bold,
  },
  generalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  generalErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: FONT.medium,
    flex: 1,
  },

  playerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  playerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  playerNumBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONT.bold,
  },
  playerCardTitle: {
    fontSize: 13,
    fontFamily: FONT.bold,
  },
  playerInputRow: {
    flexDirection: 'row',
  },
  smallInputLabel: {
    fontSize: 10,
    fontFamily: FONT.regular,
    marginBottom: 3,
  },
  playerInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: FONT.regular,
  },

  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FONT.regular,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONT.bold,
  },
});
