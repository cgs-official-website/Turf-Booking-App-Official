import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import { getTournamentByIdApi, updateTournamentApi } from '../api/tournaments';

const SPORTS = [
  { id: 'Cricket', label: 'Cricket', icon: 'activity' },
  { id: 'Football', label: 'Football', icon: 'circle' },
  { id: 'Badminton', label: 'Badminton', icon: 'zap' },
  { id: 'Tennis', label: 'Tennis', icon: 'disc' },
  { id: 'Basketball', label: 'Basketball', icon: 'target' },
  { id: 'Volleyball', label: 'Volleyball', icon: 'sun' },
  { id: 'Other', label: 'Other Sport', icon: 'award' },
];

const pad = (n) => String(n).padStart(2, '0');
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const EditTournamentScreen = ({ navigation, route }) => {
  const { tournamentId } = route.params || {};
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState('Cricket');
  const [customSport, setCustomSport] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfTeams, setNumberOfTeams] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState('');
  const [oversPerTeam, setOversPerTeam] = useState('');
  const [turfName, setTurfName] = useState('');

  // Date Pickers state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Field focus & validation errors
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Edit Tournament',
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
    });
  }, [navigation, colors]);

  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      try {
        const res = await getTournamentByIdApi(tournamentId);
        const data = res?.data?.tournament || res?.tournament;
        if (data) {
          setName(data.name || '');
          const isStandardSport = SPORTS.some(
            (s) => s.id.toLowerCase() === (data.sport || '').toLowerCase()
          );
          if (isStandardSport) {
            setSelectedSport(
              SPORTS.find((s) => s.id.toLowerCase() === (data.sport || '').toLowerCase()).id
            );
          } else {
            setSelectedSport('Other');
            setCustomSport(data.sport || '');
          }
          setStartDate(data.startDate || '');
          setEndDate(data.endDate || '');
          setNumberOfTeams(String(data.numberOfTeams || ''));
          setPlayersPerTeam(String(data.playersPerTeam || ''));
          setOversPerTeam(data.oversPerTeam ? String(data.oversPerTeam) : '');
          setTurfName(data.turfName || data.turf?.name || '');
        }
      } catch (err) {
        console.error('Failed to load tournament for edit:', err);
        Alert.alert('Load Error', 'Could not load tournament details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [tournamentId]);

  const effectiveSport = selectedSport === 'Other' ? customSport.trim() : selectedSport;
  const isCricket = effectiveSport.toLowerCase().includes('cricket');

  // Client-side Validation
  const validateForm = () => {
    const errs = {};

    if (!name.trim()) {
      errs.name = 'Tournament name is required';
    } else if (name.trim().length < 3) {
      errs.name = 'Tournament name must be at least 3 characters';
    }

    if (!effectiveSport) {
      errs.sport = 'Please select or enter a sport';
    }

    if (!startDate) {
      errs.startDate = 'Start date is required';
    }
    if (!endDate) {
      errs.endDate = 'End date is required';
    }

    if (startDate && endDate) {
      if (endDate < startDate) {
        errs.endDate = 'End date cannot be earlier than start date';
      }
    }

    const teamsNum = parseInt(numberOfTeams, 10);
    if (!numberOfTeams || isNaN(teamsNum) || teamsNum < 2) {
      errs.numberOfTeams = 'Minimum 2 teams required';
    }

    const playersNum = parseInt(playersPerTeam, 10);
    if (!playersPerTeam || isNaN(playersNum) || playersNum < 1) {
      errs.playersPerTeam = 'Minimum 1 player per team required';
    }

    if (isCricket) {
      const oversNum = parseInt(oversPerTeam, 10);
      if (!oversPerTeam || isNaN(oversNum) || oversNum < 1) {
        errs.oversPerTeam = 'Valid overs per team required for cricket (min 1)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdate = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the highlighted fields before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        sport: effectiveSport,
        startDate,
        endDate,
        numberOfTeams: parseInt(numberOfTeams, 10),
        playersPerTeam: parseInt(playersPerTeam, 10),
        oversPerTeam: isCricket ? parseInt(oversPerTeam, 10) : null,
      };

      const res = await updateTournamentApi(tournamentId, payload);
      const updated = res?.data?.tournament || res?.tournament;

      if (!updated || !updated.id) {
        throw new Error(res?.error?.message || 'Could not update tournament');
      }

      Alert.alert('Tournament Updated', 'Your tournament details have been updated successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error('Failed to update tournament:', err);
      Alert.alert('Update Failed', err.message || 'An error occurred while updating the tournament.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartDateChange = (event, selected) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selected) {
      const formatted = toDateString(selected);
      setStartDate(formatted);
      if (endDate < formatted) {
        setEndDate(formatted);
      }
      setErrors((prev) => ({ ...prev, startDate: null }));
    }
  };

  const handleEndDateChange = (event, selected) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selected) {
      const formatted = toDateString(selected);
      setEndDate(formatted);
      setErrors((prev) => ({ ...prev, endDate: null }));
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>Loading tournament...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {turfName ? (
          <View style={[styles.turfBanner, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <View style={[styles.turfIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Feather name="map-pin" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.turfBannerSubtitle, { color: colors.textSecondary }]}>Facility</Text>
              <Text style={[styles.turfBannerName, { color: colors.text }]} numberOfLines={1}>
                {turfName}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Section: Basic Info */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Tournament Details</Text>

          {/* Tournament Name */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Tournament Name *</Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.inputBg,
                borderColor: errors.name ? colors.error : focusedField === 'name' ? colors.primary : colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Champions Cricket League 2026"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
              }}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
          {errors.name ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text> : null}

          {/* Sport Selector Chips */}
          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 14 }]}>Sport / Category *</Text>
          <View style={styles.sportsGrid}>
            {SPORTS.map((sport) => {
              const isSelected = selectedSport === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#F1F5F9',
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedSport(sport.id);
                    setErrors((prev) => ({ ...prev, sport: null }));
                  }}
                  activeOpacity={0.75}
                >
                  <Feather
                    name={sport.icon}
                    size={14}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.sportChipText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {sport.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedSport === 'Other' && (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Specify Sport Name *</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errors.sport ? colors.error : focusedField === 'customSport' ? colors.primary : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. Table Tennis, Kabaddi"
                  placeholderTextColor={colors.textSecondary}
                  value={customSport}
                  onChangeText={(text) => {
                    setCustomSport(text);
                    if (errors.sport) setErrors((prev) => ({ ...prev, sport: null }));
                  }}
                  onFocus={() => setFocusedField('customSport')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.sport ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.sport}</Text> : null}
            </View>
          )}
        </View>

        {/* Section: Dates */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Schedule & Dates</Text>

          <View style={styles.datesRow}>
            {/* Start Date */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Start Date *</Text>
              <TouchableOpacity
                style={[
                  styles.dateBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errors.startDate ? colors.error : colors.border,
                  },
                ]}
                onPress={() => setShowStartDatePicker(true)}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.dateBtnText, { color: colors.text }]}>
                  {startDate || 'Select Date'}
                </Text>
              </TouchableOpacity>
              {errors.startDate ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.startDate}</Text> : null}
            </View>

            {/* End Date */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>End Date *</Text>
              <TouchableOpacity
                style={[
                  styles.dateBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errors.endDate ? colors.error : colors.border,
                  },
                ]}
                onPress={() => setShowEndDatePicker(true)}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.dateBtnText, { color: colors.text }]}>
                  {endDate || 'Select Date'}
                </Text>
              </TouchableOpacity>
              {errors.endDate ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.endDate}</Text> : null}
            </View>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={new Date(startDate || Date.now())}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartDateChange}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={new Date(endDate || startDate || Date.now())}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
              minimumDate={new Date(startDate || Date.now())}
            />
          )}
        </View>

        {/* Section: Teams & Format */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Teams & Roster Format</Text>

          <View style={styles.metricsFormRow}>
            {/* Number of Teams */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Number of Teams *</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errors.numberOfTeams ? colors.error : focusedField === 'teams' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather name="users" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="8"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={numberOfTeams}
                  onChangeText={(text) => {
                    setNumberOfTeams(text.replace(/[^0-9]/g, ''));
                    if (errors.numberOfTeams) setErrors((prev) => ({ ...prev, numberOfTeams: null }));
                  }}
                  onFocus={() => setFocusedField('teams')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.numberOfTeams ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.numberOfTeams}</Text>
              ) : null}
            </View>

            {/* Players per Team */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Players / Team *</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errors.playersPerTeam ? colors.error : focusedField === 'players' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather name="user" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="11"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={playersPerTeam}
                  onChangeText={(text) => {
                    setPlayersPerTeam(text.replace(/[^0-9]/g, ''));
                    if (errors.playersPerTeam) setErrors((prev) => ({ ...prev, playersPerTeam: null }));
                  }}
                  onFocus={() => setFocusedField('players')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.playersPerTeam ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.playersPerTeam}</Text>
              ) : null}
            </View>
          </View>

          {/* Cricket Specific Format */}
          {isCricket && (
            <View style={{ marginTop: 14 }}>
              <View style={styles.cricketHeaderRow}>
                <Feather name="activity" size={14} color="#D97706" />
                <Text style={[styles.cricketHeaderText, { color: colors.text }]}>Cricket Format Rules</Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 8 }]}>Overs per Team *</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errors.oversPerTeam ? colors.error : focusedField === 'overs' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather name="clock" size={16} color="#D97706" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. 10 or 20"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={oversPerTeam}
                  onChangeText={(text) => {
                    setOversPerTeam(text.replace(/[^0-9]/g, ''));
                    if (errors.oversPerTeam) setErrors((prev) => ({ ...prev, oversPerTeam: null }));
                  }}
                  onFocus={() => setFocusedField('overs')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.oversPerTeam ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.oversPerTeam}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleUpdate}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="check-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  turfBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    gap: 10,
  },
  turfIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turfBannerSubtitle: {
    fontSize: SIZES.xs - 1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  turfBannerName: {
    fontSize: SIZES.md,
    fontWeight: '800',
  },
  formCard: {
    padding: 16,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
  },
  sectionHeading: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: SIZES.xs + 1,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: SIZES.sm + 1,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sportChipText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '700',
  },
  datesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 46,
  },
  dateBtnText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '600',
  },
  metricsFormRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cricketHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  cricketHeaderText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm + 1,
    fontWeight: '700',
  },
});

export default EditTournamentScreen;
