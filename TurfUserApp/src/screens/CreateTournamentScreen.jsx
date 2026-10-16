import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { SPACING, RADIUS, SHADOW, FONT } from '../utils/theme';
import { createUserTournamentApi } from '../api/tournaments';

const SPORTS = [
  { id: 'Cricket', label: 'Cricket', icon: 'activity' },
  { id: 'Football', label: 'Football', icon: 'disc' },
  { id: 'Badminton', label: 'Badminton', icon: 'zap' },
  { id: 'Tennis', label: 'Tennis', icon: 'circle' },
  { id: 'Basketball', label: 'Basketball', icon: 'target' },
  { id: 'Volleyball', label: 'Volleyball', icon: 'sun' },
  { id: 'Other', label: 'Other', icon: 'award' },
];

const SAMPLE_BANNERS = [
  {
    sport: 'Cricket',
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
    label: 'Stadium Turf',
  },
  {
    sport: 'Football',
    url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    label: 'Night Arena',
  },
  {
    sport: 'Badminton',
    url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
    label: 'Indoor Court',
  },
  {
    sport: 'Tennis',
    url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800',
    label: 'Clay Court',
  },
];

const pad = (n) => String(n).padStart(2, '0');
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function CreateTournamentScreen({ navigation }) {
  const { C, dark } = useTheme();

  // Form State
  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState('Cricket');
  const [customSport, setCustomSport] = useState('');

  // Default dates: tomorrow to +4 days
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(tomorrow.getDate() + 4);

  const [startDate, setStartDate] = useState(toDateString(tomorrow));
  const [endDate, setEndDate] = useState(toDateString(nextWeek));

  const [numberOfTeams, setNumberOfTeams] = useState('8');
  const [playersPerTeam, setPlayersPerTeam] = useState('11');
  const [oversPerTeam, setOversPerTeam] = useState('10');

  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Modals & UI States
  const [datePickerTarget, setDatePickerTarget] = useState(null); // 'start' | 'end' | null
  const [selectedBannerModal, setSelectedBannerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

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
        errs.oversPerTeam = 'Overs per team must be at least 1';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (publishNow = false) => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the highlighted fields before submitting.');
      return;
    }

    const payload = {
      name: name.trim(),
      sport: effectiveSport,
      category: effectiveSport,
      startDate,
      endDate,
      numberOfTeams: parseInt(numberOfTeams, 10),
      playersPerTeam: parseInt(playersPerTeam, 10),
      oversPerTeam: isCricket ? parseInt(oversPerTeam, 10) : null,
      description: description.trim() || null,
      rules: rules.trim() || null,
      bannerUrl: bannerUrl.trim() || null,
      publishNow,
    };

    setSubmitting(true);
    try {
      const res = await createUserTournamentApi(payload);
      const created = res?.tournament || res?.data?.tournament;

      if (publishNow) {
        Alert.alert(
          'Tournament Published! 🎉',
          `"${name}" is live! You can now share the link with teams and players.`,
          [
            {
              text: 'View Tournament',
              onPress: () => {
                navigation.replace('TournamentDetail', {
                  tournamentId: created?.id,
                  tournament: created,
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Draft Saved ✅',
          'Your tournament draft has been saved. You can edit and publish it anytime from "My Tournaments".',
          [
            {
              text: 'View Draft',
              onPress: () => {
                navigation.replace('TournamentDetail', {
                  tournamentId: created?.id,
                  tournament: created,
                });
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error('Failed to create tournament:', err);
      Alert.alert(
        'Submission Failed',
        err.message || 'Failed to create tournament. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for quick date selection presets
  const handleDatePreset = (daysFromToday) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const dateStr = toDateString(d);

    if (datePickerTarget === 'start') {
      setStartDate(dateStr);
      // Auto-adjust end date if needed
      if (endDate < dateStr) {
        const next = new Date(d);
        next.setDate(next.getDate() + 3);
        setEndDate(toDateString(next));
      }
    } else if (datePickerTarget === 'end') {
      if (dateStr < startDate) {
        Alert.alert('Invalid Date', 'End date cannot be earlier than start date');
        return;
      }
      setEndDate(dateStr);
    }
    setDatePickerTarget(null);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Custom Header ── */}
      <View style={[styles.headerRow, { borderBottomColor: C.border, backgroundColor: C.card }]}>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Host Tournament</Text>
          <Text style={[styles.headerSub, { color: C.subtext }]}>Create community tournament</Text>
        </View>
        <View style={styles.badgeCommunity}>
          <Text style={styles.badgeCommunityText}>COMMUNITY</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Form Card: Basic Info ── */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
              <Feather name="award" size={16} color="#7C3AED" />
            </View>
            <Text style={[styles.cardTitle, { color: C.text }]}>Tournament Details</Text>
          </View>

          {/* Tournament Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: C.text }]}>
              Tournament Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: C.bgSoft, borderColor: errors.name ? C.error : C.border, color: C.text },
              ]}
              placeholder="e.g. Coimbatore Premier League 2026"
              placeholderTextColor={C.subtext}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
              }}
              maxLength={80}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          {/* Sport Selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: C.text }]}>
              Sport / Category <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
              {SPORTS.map((s) => {
                const isSelected = selectedSport === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.sportChip,
                      {
                        backgroundColor: isSelected ? C.primary : C.bgSoft,
                        borderColor: isSelected ? C.primary : C.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedSport(s.id);
                      if (errors.sport) setErrors((prev) => ({ ...prev, sport: null }));
                    }}
                    activeOpacity={0.75}
                  >
                    <Feather
                      name={s.icon}
                      size={14}
                      color={isSelected ? '#FFFFFF' : C.subtext}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.sportChipText,
                        { color: isSelected ? '#FFFFFF' : C.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedSport === 'Other' && (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: C.bgSoft,
                    borderColor: errors.sport ? C.error : C.border,
                    color: C.text,
                    marginTop: 8,
                  },
                ]}
                placeholder="Enter sport name (e.g. Table Tennis, Kabaddi)"
                placeholderTextColor={C.subtext}
                value={customSport}
                onChangeText={(text) => {
                  setCustomSport(text);
                  if (errors.sport) setErrors((prev) => ({ ...prev, sport: null }));
                }}
              />
            )}
            {errors.sport ? <Text style={styles.errorText}>{errors.sport}</Text> : null}
          </View>
        </View>

        {/* ── Form Card: Dates & Format ── */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Feather name="calendar" size={16} color="#0284C7" />
            </View>
            <Text style={[styles.cardTitle, { color: C.text }]}>Schedule & Squad Rules</Text>
          </View>

          {/* Dates Row */}
          <View style={styles.row}>
            {/* Start Date */}
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: C.text }]}>
                Start Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateBtn,
                  { backgroundColor: C.bgSoft, borderColor: errors.startDate ? C.error : C.border },
                ]}
                onPress={() => setDatePickerTarget('start')}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={15} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.dateBtnText, { color: C.text }]}>{startDate}</Text>
              </TouchableOpacity>
              {errors.startDate ? <Text style={styles.errorText}>{errors.startDate}</Text> : null}
            </View>

            {/* End Date */}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.label, { color: C.text }]}>
                End Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateBtn,
                  { backgroundColor: C.bgSoft, borderColor: errors.endDate ? C.error : C.border },
                ]}
                onPress={() => setDatePickerTarget('end')}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={15} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.dateBtnText, { color: C.text }]}>{endDate}</Text>
              </TouchableOpacity>
              {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}
            </View>
          </View>

          {/* Team & Player Settings */}
          <View style={[styles.row, { marginTop: 14 }]}>
            {/* Number of Teams */}
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: C.text }]}>
                Total Teams <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: C.bgSoft, borderColor: errors.numberOfTeams ? C.error : C.border, color: C.text },
                ]}
                keyboardType="numeric"
                value={numberOfTeams}
                onChangeText={(val) => {
                  setNumberOfTeams(val.replace(/[^0-9]/g, ''));
                  if (errors.numberOfTeams) setErrors((prev) => ({ ...prev, numberOfTeams: null }));
                }}
                placeholder="Min 2"
                placeholderTextColor={C.subtext}
              />
              {errors.numberOfTeams ? <Text style={styles.errorText}>{errors.numberOfTeams}</Text> : null}
            </View>

            {/* Players per Team */}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.label, { color: C.text }]}>
                Players / Team <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: C.bgSoft, borderColor: errors.playersPerTeam ? C.error : C.border, color: C.text },
                ]}
                keyboardType="numeric"
                value={playersPerTeam}
                onChangeText={(val) => {
                  setPlayersPerTeam(val.replace(/[^0-9]/g, ''));
                  if (errors.playersPerTeam) setErrors((prev) => ({ ...prev, playersPerTeam: null }));
                }}
                placeholder="Min 1"
                placeholderTextColor={C.subtext}
              />
              {errors.playersPerTeam ? <Text style={styles.errorText}>{errors.playersPerTeam}</Text> : null}
            </View>
          </View>

          {/* Cricket Overs */}
          {isCricket && (
            <View style={[styles.fieldGroup, { marginTop: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.label, { color: C.text, marginBottom: 0 }]}>
                  Overs per Inning / Team <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.cricketTag, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={styles.cricketTagText}>CRICKET ONLY</Text>
                </View>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: C.bgSoft, borderColor: errors.oversPerTeam ? C.error : C.border, color: C.text },
                ]}
                keyboardType="numeric"
                value={oversPerTeam}
                onChangeText={(val) => {
                  setOversPerTeam(val.replace(/[^0-9]/g, ''));
                  if (errors.oversPerTeam) setErrors((prev) => ({ ...prev, oversPerTeam: null }));
                }}
                placeholder="e.g. 10 or 20"
                placeholderTextColor={C.subtext}
              />
              {errors.oversPerTeam ? <Text style={styles.errorText}>{errors.oversPerTeam}</Text> : null}
            </View>
          )}
        </View>

        {/* ── Form Card: Description & Rules ── */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="file-text" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.cardTitle, { color: C.text }]}>Description & Tournament Rules</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: C.text }]}>Description (Optional)</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: C.bgSoft, borderColor: C.border, color: C.text },
              ]}
              placeholder="Tell players about the prize pool, match schedule, or tournament format..."
              placeholderTextColor={C.subtext}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={[styles.fieldGroup, { marginTop: 10 }]}>
            <Text style={[styles.label, { color: C.text }]}>Rules & Regulations (Optional)</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: C.bgSoft, borderColor: C.border, color: C.text },
              ]}
              placeholder="e.g. Standard ICC rules apply. Leather balls provided. Knockout format."
              placeholderTextColor={C.subtext}
              multiline
              numberOfLines={3}
              value={rules}
              onChangeText={setRules}
            />
          </View>

          {/* Banner Selector */}
          <View style={[styles.fieldGroup, { marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.label, { color: C.text, marginBottom: 0 }]}>Banner Image (Optional)</Text>
              <TouchableOpacity onPress={() => setSelectedBannerModal(true)}>
                <Text style={[styles.presetLink, { color: C.primary }]}>Pick Sample Banner</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: C.bgSoft, borderColor: C.border, color: C.text }]}
              placeholder="Paste image URL (https://...)"
              placeholderTextColor={C.subtext}
              value={bannerUrl}
              onChangeText={setBannerUrl}
            />
            {bannerUrl ? (
              <View style={styles.bannerPreviewWrap}>
                <Image source={{ uri: bannerUrl }} style={styles.bannerPreviewImg} resizeMode="cover" />
                <TouchableOpacity style={styles.clearBannerBtn} onPress={() => setBannerUrl('')}>
                  <Feather name="x" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionContainer}>
          {/* Publish Button */}
          <TouchableOpacity
            style={[styles.publishBtn, { backgroundColor: C.primary }, SHADOW.floating]}
            onPress={() => handleSubmit(true)}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.publishBtnText}>Publish Tournament</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Save Draft Button */}
          <TouchableOpacity
            style={[styles.draftBtn, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={() => handleSubmit(false)}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Feather name="save" size={16} color={C.text} style={{ marginRight: 8 }} />
            <Text style={[styles.draftBtnText, { color: C.text }]}>Save as Draft</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Quick Date Selector Modal ── */}
      <Modal
        visible={Boolean(datePickerTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDatePickerTarget(null)}
        >
          <View style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>
                Select {datePickerTarget === 'start' ? 'Start Date' : 'End Date'}
              </Text>
              <TouchableOpacity onPress={() => setDatePickerTarget(null)}>
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: C.subtext }]}>
              Quickly pick schedule dates for your tournament:
            </Text>

            <View style={styles.presetGrid}>
              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={() => handleDatePreset(0)}
              >
                <Text style={[styles.presetBtnTitle, { color: C.text }]}>Today</Text>
                <Text style={[styles.presetBtnSub, { color: C.subtext }]}>Kick off now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={() => handleDatePreset(1)}
              >
                <Text style={[styles.presetBtnTitle, { color: C.text }]}>Tomorrow</Text>
                <Text style={[styles.presetBtnSub, { color: C.subtext }]}>+1 Day</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={() => handleDatePreset(3)}
              >
                <Text style={[styles.presetBtnTitle, { color: C.text }]}>In 3 Days</Text>
                <Text style={[styles.presetBtnSub, { color: C.subtext }]}>Mid-week</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={() => handleDatePreset(7)}
              >
                <Text style={[styles.presetBtnTitle, { color: C.text }]}>Next Week</Text>
                <Text style={[styles.presetBtnSub, { color: C.subtext }]}>+7 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={() => handleDatePreset(14)}
              >
                <Text style={[styles.presetBtnTitle, { color: C.text }]}>In 2 Weeks</Text>
                <Text style={[styles.presetBtnSub, { color: C.subtext }]}>+14 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={() => handleDatePreset(30)}
              >
                <Text style={[styles.presetBtnTitle, { color: C.text }]}>Next Month</Text>
                <Text style={[styles.presetBtnSub, { color: C.subtext }]}>+30 Days</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Preset Banner Picker Modal ── */}
      <Modal
        visible={selectedBannerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBannerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedBannerModal(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Choose Sports Banner</Text>
              <TouchableOpacity onPress={() => setSelectedBannerModal(false)}>
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {SAMPLE_BANNERS.map((banner, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.sampleBannerRow, { borderColor: C.border }]}
                  onPress={() => {
                    setBannerUrl(banner.url);
                    setSelectedBannerModal(false);
                  }}
                >
                  <Image source={{ uri: banner.url }} style={styles.sampleBannerThumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.sampleBannerName, { color: C.text }]}>{banner.sport}</Text>
                    <Text style={[styles.sampleBannerSub, { color: C.subtext }]}>{banner.label}</Text>
                  </View>
                  <Feather name="check" size={18} color={bannerUrl === banner.url ? C.primary : 'transparent'} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  badgeCommunity: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  badgeCommunityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.6,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  fieldGroup: {
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  sportScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    marginRight: 8,
  },
  sportChipText: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
  },
  dateBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cricketTag: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  cricketTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  presetLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  bannerPreviewWrap: {
    marginTop: 8,
    position: 'relative',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  bannerPreviewImg: {
    width: '100%',
    height: 120,
    borderRadius: RADIUS.md,
  },
  clearBannerBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: RADIUS.round,
    padding: 4,
  },
  actionContainer: {
    marginTop: 10,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
  },
  publishBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  draftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  draftBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 16,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetBtn: {
    width: '48%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  presetBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetBtnSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sampleBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sampleBannerThumb: {
    width: 60,
    height: 40,
    borderRadius: RADIUS.sm,
  },
  sampleBannerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  sampleBannerSub: {
    fontSize: 11,
  },
});
