import React, { useState, useEffect, useMemo } from 'react';
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
  FlatList,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { SPACING, RADIUS, SHADOW, FONT } from '../utils/theme';
import { createUserTournamentApi } from '../api/tournaments';
import { turfsApi } from '../api/turfs';

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

export default function CreateTournamentScreen({ route, navigation }) {
  const { C, dark } = useTheme();

  // Wizard Steps:
  // 1: 'select_turf'
  // 2: 'tournament_form'
  // 3: 'manage_teams'
  // 4: 'summary_confirm'
  const initialTurfParam = route.params?.turf || null;
  const [currentStep, setCurrentStep] = useState(initialTurfParam ? 2 : 1);

  // ── Step 1: Turf Selection State ──
  const [turfsList, setTurfsList] = useState([]);
  const [loadingTurfs, setLoadingTurfs] = useState(true);
  const [turfSearchQuery, setTurfSearchQuery] = useState('');
  const [selectedTurf, setSelectedTurf] = useState(initialTurfParam);

  // ── Step 2: Tournament Details State ──
  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState('Cricket');
  const [customSport, setCustomSport] = useState('');

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
  const [selectedBannerModal, setSelectedBannerModal] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState(null);

  // ── Step 3: Team and Player Management State ──
  // Array of { id, name, players: [ { id, name, phone, isInvited } ] }
  const [teams, setTeams] = useState([]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayerIndex, setEditingPlayerIndex] = useState(null);

  // ── Step 4: Submission & Share Modal State ──
  const [submitting, setSubmitting] = useState(false);
  const [createdTournamentResult, setCreatedTournamentResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState({});

  const effectiveSport = selectedSport === 'Other' ? customSport.trim() : selectedSport;
  const isCricket = effectiveSport.toLowerCase().includes('cricket');

  // Load available turfs for Step 1
  useEffect(() => {
    let mounted = true;
    const fetchTurfs = async () => {
      try {
        setLoadingTurfs(true);
        const res = await turfsApi.getTurfs({ take: 50 });
        const list = res?.turfs || res?.data?.turfs || [];
        if (mounted) {
          setTurfsList(list);
          // If a turfId was passed via route params, match it
          if (route.params?.turfId && !selectedTurf) {
            const match = list.find((t) => t.id === route.params.turfId);
            if (match) {
              setSelectedTurf(match);
              setCurrentStep(2);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch turfs for tournament creation:', err.message);
      } finally {
        if (mounted) setLoadingTurfs(false);
      }
    };
    fetchTurfs();
    return () => { mounted = false; };
  }, [route.params?.turfId]);

  // Filtered turfs for search
  const filteredTurfs = useMemo(() => {
    if (!turfSearchQuery.trim()) return turfsList;
    const q = turfSearchQuery.toLowerCase();
    return turfsList.filter((t) => {
      const tName = (t.name || '').toLowerCase();
      const tCity = (t.city || t.location?.city || '').toLowerCase();
      const tAddress = (t.address || t.location?.address || '').toLowerCase();
      return tName.includes(q) || tCity.includes(q) || tAddress.includes(q);
    });
  }, [turfsList, turfSearchQuery]);

  // Synchronize team slots whenever numberOfTeams changes
  const initializeTeams = (teamsCount, playersCount) => {
    const count = parseInt(teamsCount, 10) || 2;
    const maxP = parseInt(playersCount, 10) || 11;
    setTeams((prev) => {
      const newTeams = [];
      for (let i = 0; i < count; i++) {
        const existing = prev[i];
        if (existing) {
          newTeams.push({
            ...existing,
            players: existing.players.slice(0, maxP),
          });
        } else {
          newTeams.push({
            id: `team_${i + 1}`,
            name: `Team ${i + 1}`,
            players: [],
          });
        }
      }
      return newTeams;
    });
  };

  // Validate Step 2 Form
  const validateForm = () => {
    const errs = {};

    if (!selectedTurf) {
      errs.turf = 'Please select a host turf facility first';
    }

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

    if (startDate && endDate && endDate < startDate) {
      errs.endDate = 'End date cannot be earlier than start date';
    }

    const teamsNum = parseInt(numberOfTeams, 10);
    if (!numberOfTeams || isNaN(teamsNum) || teamsNum < 2) {
      errs.numberOfTeams = 'Minimum 2 teams required';
    }

    const playersNum = parseInt(playersPerTeam, 10);
    if (!playersPerTeam || isNaN(playersNum) || playersNum < 1) {
      errs.playersPerTeam = 'Players per team must be at least 1';
    }

    if (isCricket) {
      const oversNum = parseInt(oversPerTeam, 10);
      if (!oversPerTeam || isNaN(oversNum) || oversNum < 1) {
        errs.oversPerTeam = 'Overs per team required (> 0) for Cricket';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToTeams = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please complete all required fields correctly before proceeding.');
      return;
    }
    initializeTeams(numberOfTeams, playersPerTeam);
    setCurrentStep(3);
  };

  // Add / Edit Player in active team
  const handleSavePlayer = () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Player Name Required', 'Please enter a name for this player.');
      return;
    }

    const maxCapacity = parseInt(playersPerTeam, 10) || 11;
    const currentTeam = teams[activeTeamIndex];
    if (!currentTeam) return;

    if (editingPlayerIndex === null && currentTeam.players.length >= maxCapacity) {
      Alert.alert('Team Capacity Full', `This team cannot exceed the configured capacity of ${maxCapacity} players.`);
      return;
    }

    const updatedTeams = [...teams];
    const playerRecord = {
      id: editingPlayerIndex !== null ? currentTeam.players[editingPlayerIndex].id : `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: newPlayerName.trim(),
      phone: newPlayerPhone.trim(),
      isInvited: Boolean(newPlayerPhone.trim()),
    };

    if (editingPlayerIndex !== null) {
      // Replace / edit existing player
      updatedTeams[activeTeamIndex].players[editingPlayerIndex] = playerRecord;
    } else {
      // Add new player
      updatedTeams[activeTeamIndex].players.push(playerRecord);
    }

    setTeams(updatedTeams);
    setNewPlayerName('');
    setNewPlayerPhone('');
    setEditingPlayerIndex(null);
    setPlayerModalOpen(false);
  };

  const handleRemovePlayer = (teamIdx, playerIdx) => {
    const updatedTeams = [...teams];
    updatedTeams[teamIdx].players.splice(playerIdx, 1);
    setTeams(updatedTeams);
  };

  const handleUpdateTeamName = (text, teamIdx) => {
    const updatedTeams = [...teams];
    updatedTeams[teamIdx].name = text;
    setTeams(updatedTeams);
  };

  // Final Submit (Save as Draft or Publish)
  const handleSubmit = async (publishNow = false) => {
    if (!validateForm()) {
      Alert.alert('Error', 'Tournament details are incomplete. Please review required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        turfId: selectedTurf.id,
        name: name.trim(),
        sport: effectiveSport,
        startDate,
        endDate,
        numberOfTeams: parseInt(numberOfTeams, 10),
        playersPerTeam: parseInt(playersPerTeam, 10),
        oversPerTeam: isCricket ? parseInt(oversPerTeam, 10) : null,
        description: description.trim() || null,
        rules: rules.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        teams,
        publishNow,
      };

      const res = await createUserTournamentApi(payload);
      const created = res?.tournament || res?.data?.tournament;

      setCreatedTournamentResult(created);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Submit tournament error:', err);
      Alert.alert('Submission Failed', err.message || 'Could not save tournament. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!createdTournamentResult) return;
    try {
      const shareUrl =
        createdTournamentResult.shareableUrl ||
        `https://turfbookingapp.com/tournament/${createdTournamentResult.shareableIdentifier || createdTournamentResult.id}`;

      await Share.share({
        title: createdTournamentResult.name,
        message: `🏆 Check out "${createdTournamentResult.name}" (${createdTournamentResult.sport}) at ${selectedTurf?.name || 'our local turf'}!\n\n📅 Dates: ${createdTournamentResult.startDate} to ${createdTournamentResult.endDate}\n👥 Teams: ${createdTournamentResult.numberOfTeams} (${createdTournamentResult.playersPerTeam} players/team)${isCricket && createdTournamentResult.oversPerTeam ? `\n🏏 Overs: ${createdTournamentResult.oversPerTeam}` : ''}\n\nView details and participate:\n${shareUrl}`,
      });
    } catch (_) { }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER STEP 1: SELECT TURF FIRST
  // ─────────────────────────────────────────────────────────────
  const renderStep1SelectTurf = () => {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeaderCard}>
          <View style={[styles.stepNumberBadge, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.stepNumberText, { color: C.primary }]}>Step 1 of 4</Text>
          </View>
          <Text style={[styles.stepTitle, { color: C.text }]}>Select Tournament Venue</Text>
          <Text style={[styles.stepSubtitle, { color: C.subtext }]}>
            Tournaments must be conducted at a verified turf. Choose where your tournament will be hosted.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.turfSearchBox, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <Feather name="search" size={18} color={C.subtext} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.turfSearchInput, { color: C.text }]}
            placeholder="Search turf name, area, or city..."
            placeholderTextColor={C.subtext}
            value={turfSearchQuery}
            onChangeText={setTurfSearchQuery}
          />
          {turfSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setTurfSearchQuery('')}>
              <Feather name="x" size={16} color={C.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {loadingTurfs ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.loadingText, { color: C.subtext }]}>Loading available turfs...</Text>
          </View>
        ) : filteredTurfs.length === 0 ? (
          <View style={[styles.emptyTurfCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="map-pin" size={32} color={C.subtext} />
            <Text style={[styles.emptyTurfTitle, { color: C.text }]}>No Turfs Found</Text>
            <Text style={[styles.emptyTurfSubtitle, { color: C.subtext }]}>
              Try searching with another name or area.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTurfs}
            keyExtractor={(item) => String(item.id || item._id)}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isSelected = selectedTurf?.id === item.id;
              const turfImg = item.images?.[0] || item.image || item.logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800';
              const locationStr = item.address || item.city || item.location?.address || item.location?.city || 'Verified Arena';

              return (
                <TouchableOpacity
                  style={[
                    styles.turfPickerCard,
                    {
                      backgroundColor: C.card,
                      borderColor: isSelected ? C.primary : C.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                    isSelected && { backgroundColor: dark ? 'rgba(15, 118, 110, 0.15)' : '#F0FDF4' },
                    SHADOW.subtle,
                  ]}
                  onPress={() => setSelectedTurf(item)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: turfImg }} style={styles.turfPickerThumb} />
                  <View style={styles.turfPickerInfo}>
                    <View style={styles.turfPickerHeader}>
                      <Text style={[styles.turfPickerName, { color: C.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {isSelected ? (
                        <View style={[styles.checkCircle, { backgroundColor: C.primary }]}>
                          <Feather name="check" size={13} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={[styles.uncheckCircle, { borderColor: C.border }]} />
                      )}
                    </View>

                    <View style={styles.turfPickerMetaRow}>
                      <Feather name="map-pin" size={12} color={C.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.turfPickerLocation, { color: C.subtext }]} numberOfLines={1}>
                        {locationStr}
                      </Text>
                    </View>

                    <View style={styles.turfPickerBadgeRow}>
                      <View style={[styles.sportPillSm, { backgroundColor: C.bgSoft }]}>
                        <Text style={[styles.sportPillSmText, { color: C.text }]}>
                          {Array.isArray(item.sports) ? item.sports.join(', ') : 'All Sports'}
                        </Text>
                      </View>
                      {item.pricePerHour ? (
                        <Text style={[styles.turfPriceText, { color: C.primary }]}>
                          ₹{item.pricePerHour}/hr
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continuePrimaryBtn,
            { backgroundColor: selectedTurf ? '#0F766E' : C.border },
            SHADOW.card,
          ]}
          disabled={!selectedTurf}
          onPress={() => {
            if (!selectedTurf) {
              Alert.alert('Select a Turf', 'Please choose the turf where the tournament will be conducted.');
              return;
            }
            setCurrentStep(2);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.continuePrimaryBtnText}>
            {selectedTurf ? `Continue with ${selectedTurf.name} →` : 'Select a Turf to Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER STEP 2: TOURNAMENT DETAILS FORM
  // ─────────────────────────────────────────────────────────────
  const renderStep2DetailsForm = () => {
    return (
      <View style={styles.stepContainer}>
        {/* Selected Venue Header Strip (Mandatory & Changeable) */}
        {selectedTurf && (
          <View style={[styles.venueBannerCard, { backgroundColor: C.card, borderColor: C.primary }, SHADOW.subtle]}>
            <View style={styles.venueBannerLeft}>
              <View style={[styles.venueIconCircle, { backgroundColor: C.primaryLight }]}>
                <Feather name="map-pin" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.venueBannerTag, { color: C.primary }]}>TOURNAMENT VENUE</Text>
                <Text style={[styles.venueBannerName, { color: C.text }]} numberOfLines={1}>
                  {selectedTurf.name}
                </Text>
                <Text style={[styles.venueBannerLocation, { color: C.subtext }]} numberOfLines={1}>
                  {selectedTurf.address || selectedTurf.city || selectedTurf.location?.address || 'Verified Pitch'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.changeTurfBtn, { borderColor: C.primary }]}
              onPress={() => setCurrentStep(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.changeTurfBtnText, { color: C.primary }]}>Change Turf</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.stepHeaderCard}>
          <View style={[styles.stepNumberBadge, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.stepNumberText, { color: C.primary }]}>Step 2 of 4</Text>
          </View>
          <Text style={[styles.stepTitle, { color: C.text }]}>Tournament Information</Text>
          <Text style={[styles.stepSubtitle, { color: C.subtext }]}>
            Specify tournament rules, dates, team capacity, and cricket overs.
          </Text>
        </View>

        {/* 1. Tournament Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: C.text }]}>
            Tournament Name <Text style={{ color: C.error }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: C.card, borderColor: errors.name ? C.error : C.border, color: C.text },
            ]}
            placeholder="e.g. Sunday Super League Cup"
            placeholderTextColor={C.subtext}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors((e) => ({ ...e, name: null }));
            }}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>

        {/* 2. Sport / Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: C.text }]}>
            Sport / Category <Text style={{ color: C.error }}>*</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportsScroll}>
            {SPORTS.map((sp) => {
              const active = selectedSport === sp.id;
              return (
                <TouchableOpacity
                  key={sp.id}
                  style={[
                    styles.sportSelectChip,
                    {
                      backgroundColor: active ? C.primary : C.card,
                      borderColor: active ? C.primary : C.border,
                    },
                    SHADOW.subtle,
                  ]}
                  onPress={() => setSelectedSport(sp.id)}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={sp.icon}
                    size={14}
                    color={active ? '#FFFFFF' : C.subtext}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.sportSelectChipText, { color: active ? '#FFFFFF' : C.text }]}>
                    {sp.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedSport === 'Other' && (
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: C.card, borderColor: C.border, color: C.text, marginTop: 8 },
              ]}
              placeholder="Enter Custom Sport / Category"
              placeholderTextColor={C.subtext}
              value={customSport}
              onChangeText={setCustomSport}
            />
          )}
        </View>

        {/* 3. Dates: Start & End */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: C.text }]}>
              Start Date <Text style={{ color: C.error }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: C.card, borderColor: errors.startDate ? C.error : C.border },
              ]}
              onPress={() => setDatePickerTarget('start')}
              activeOpacity={0.8}
            >
              <Feather name="calendar" size={15} color={C.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.dateButtonText, { color: C.text }]}>{startDate}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: C.text }]}>
              End Date <Text style={{ color: C.error }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: C.card, borderColor: errors.endDate ? C.error : C.border },
              ]}
              onPress={() => setDatePickerTarget('end')}
              activeOpacity={0.8}
            >
              <Feather name="calendar" size={15} color={C.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.dateButtonText, { color: C.text }]}>{endDate}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}

        {/* 4. Teams & Players Counts */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: C.text }]}>
              Teams (Min 2) <Text style={{ color: C.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: C.card, borderColor: errors.numberOfTeams ? C.error : C.border, color: C.text },
              ]}
              placeholder="e.g. 8"
              placeholderTextColor={C.subtext}
              keyboardType="number-pad"
              value={numberOfTeams}
              onChangeText={(t) => {
                setNumberOfTeams(t);
                if (errors.numberOfTeams) setErrors((e) => ({ ...e, numberOfTeams: null }));
              }}
            />
            {errors.numberOfTeams ? <Text style={styles.errorText}>{errors.numberOfTeams}</Text> : null}
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: C.text }]}>
              Players/Team (Min 1) <Text style={{ color: C.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: C.card, borderColor: errors.playersPerTeam ? C.error : C.border, color: C.text },
              ]}
              placeholder="e.g. 11"
              placeholderTextColor={C.subtext}
              keyboardType="number-pad"
              value={playersPerTeam}
              onChangeText={(t) => {
                setPlayersPerTeam(t);
                if (errors.playersPerTeam) setErrors((e) => ({ ...e, playersPerTeam: null }));
              }}
            />
            {errors.playersPerTeam ? <Text style={styles.errorText}>{errors.playersPerTeam}</Text> : null}
          </View>
        </View>

        {/* 5. Cricket Overs (Mandatory only if Cricket) */}
        {isCricket && (
          <View style={styles.inputGroup}>
            <View style={styles.labelWithHint}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Overs Per Team <Text style={{ color: C.error }}>*</Text>
              </Text>
              <Text style={[styles.hintTag, { color: '#D97706' }]}>Cricket Match Rule</Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: C.card, borderColor: errors.oversPerTeam ? C.error : C.border, color: C.text },
              ]}
              placeholder="e.g. 10 or 20"
              placeholderTextColor={C.subtext}
              keyboardType="number-pad"
              value={oversPerTeam}
              onChangeText={(t) => {
                setOversPerTeam(t);
                if (errors.oversPerTeam) setErrors((e) => ({ ...e, oversPerTeam: null }));
              }}
            />
            {errors.oversPerTeam ? <Text style={styles.errorText}>{errors.oversPerTeam}</Text> : null}
          </View>
        )}

        {/* 6. Optional: Description & Rules */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: C.text }]}>Description (Optional)</Text>
          <TextInput
            style={[styles.textAreaInput, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
            placeholder="About this tournament, format, schedule, contact info..."
            placeholderTextColor={C.subtext}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: C.text }]}>Tournament Rules (Optional)</Text>
          <TextInput
            style={[styles.textAreaInput, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
            placeholder="Match rules, equipment requirements, timings, conduct..."
            placeholderTextColor={C.subtext}
            multiline
            numberOfLines={3}
            value={rules}
            onChangeText={setRules}
          />
        </View>

        {/* 7. Banner Image Selection */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: C.text }]}>Tournament Banner (Optional)</Text>
          {bannerUrl ? (
            <View style={styles.bannerPreviewBox}>
              <Image source={{ uri: bannerUrl }} style={styles.bannerPreviewImg} />
              <TouchableOpacity
                style={styles.removeBannerBtn}
                onPress={() => setBannerUrl('')}
                activeOpacity={0.8}
              >
                <Feather name="x" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.selectBannerBtn, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}
              onPress={() => setSelectedBannerModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="image" size={18} color={C.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectBannerBtnText, { color: C.primary }]}>Choose High-Res Banner</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Proceed to Teams */}
        <TouchableOpacity
          style={[styles.continuePrimaryBtn, { backgroundColor: '#0F766E' }, SHADOW.card]}
          onPress={handleProceedToTeams}
          activeOpacity={0.85}
        >
          <Text style={styles.continuePrimaryBtnText}>Next: Configure Teams & Players →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER STEP 3: TEAMS & PLAYERS MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  const renderStep3TeamsAndPlayers = () => {
    const maxCapacity = parseInt(playersPerTeam, 10) || 11;
    const currentTeam = teams[activeTeamIndex] || { id: 'team_1', name: 'Team 1', players: [] };
    const currentPlayers = currentTeam.players || [];
    const isFull = currentPlayers.length >= maxCapacity;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeaderCard}>
          <View style={[styles.stepNumberBadge, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.stepNumberText, { color: C.primary }]}>Step 3 of 4</Text>
          </View>
          <Text style={[styles.stepTitle, { color: C.text }]}>Teams & Player Management</Text>
          <Text style={[styles.stepSubtitle, { color: C.subtext }]}>
            Configure each team name, invite teammates, and manage player rosters. Capacity is strictly enforced.
          </Text>
        </View>

        {/* Horizontal Teams Tab Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamTabsScroll}>
          {teams.map((tm, idx) => {
            const isActive = idx === activeTeamIndex;
            const pCount = tm.players?.length || 0;
            return (
              <TouchableOpacity
                key={tm.id || idx}
                style={[
                  styles.teamTabChip,
                  {
                    backgroundColor: isActive ? C.primary : C.card,
                    borderColor: isActive ? C.primary : C.border,
                  },
                  SHADOW.subtle,
                ]}
                onPress={() => setActiveTeamIndex(idx)}
                activeOpacity={0.8}
              >
                <Text style={[styles.teamTabChipTitle, { color: isActive ? '#FFFFFF' : C.text }]}>
                  {tm.name || `Team ${idx + 1}`}
                </Text>
                <View
                  style={[
                    styles.teamTabChipBadge,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : C.bgSoft },
                  ]}
                >
                  <Text style={[styles.teamTabChipBadgeText, { color: isActive ? '#FFFFFF' : C.subtext }]}>
                    {pCount}/{maxCapacity}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Team Card */}
        <View style={[styles.activeTeamCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          <View style={styles.activeTeamHeader}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.activeTeamLabel, { color: C.subtext }]}>TEAM NAME</Text>
              <TextInput
                style={[styles.teamNameEditInput, { color: C.text, borderBottomColor: C.border }]}
                value={currentTeam.name}
                onChangeText={(text) => handleUpdateTeamName(text, activeTeamIndex)}
                placeholder="Enter team name..."
                placeholderTextColor={C.subtext}
              />
            </View>

            {/* Capacity Pill */}
            <View
              style={[
                styles.capacityPill,
                {
                  backgroundColor: isFull
                    ? (dark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7')
                    : (dark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE'),
                  borderColor: isFull ? '#10B981' : '#3B82F6',
                },
              ]}
            >
              <Text style={[styles.capacityPillText, { color: isFull ? '#10B981' : '#2563EB' }]}>
                {currentPlayers.length} / {maxCapacity} Players
              </Text>
            </View>
          </View>

          {/* Player List for Active Team */}
          <View style={styles.playersListWrap}>
            <View style={styles.playersListHeader}>
              <Text style={[styles.playersListTitle, { color: C.text }]}>Roster ({currentPlayers.length})</Text>
              <TouchableOpacity
                style={[
                  styles.addPlayerTriggerBtn,
                  { backgroundColor: isFull ? C.border : '#0F766E' },
                ]}
                disabled={isFull}
                onPress={() => {
                  if (isFull) {
                    Alert.alert('Capacity Reached', `This team already has the maximum ${maxCapacity} players.`);
                    return;
                  }
                  setNewPlayerName('');
                  setNewPlayerPhone('');
                  setEditingPlayerIndex(null);
                  setPlayerModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.addPlayerTriggerBtnText}>Add / Invite</Text>
              </TouchableOpacity>
            </View>

            {currentPlayers.length === 0 ? (
              <View style={[styles.emptyRosterCard, { backgroundColor: C.bgSoft }]}>
                <Ionicons name="people-outline" size={26} color={C.subtext} />
                <Text style={[styles.emptyRosterText, { color: C.subtext }]}>
                  No players added yet. Tap "+ Add / Invite" to add teammates.
                </Text>
              </View>
            ) : (
              currentPlayers.map((p, pIdx) => (
                <View
                  key={p.id || pIdx}
                  style={[styles.playerItemRow, { borderBottomColor: C.border }]}
                >
                  <View style={[styles.playerNumCircle, { backgroundColor: C.bgSoft }]}>
                    <Text style={[styles.playerNumText, { color: C.text }]}>{pIdx + 1}</Text>
                  </View>
                  <View style={styles.playerInfoCol}>
                    <Text style={[styles.playerNameText, { color: C.text }]}>{p.name}</Text>
                    {p.phone ? (
                      <View style={styles.playerPhoneRow}>
                        <Feather name="phone" size={10} color={C.subtext} style={{ marginRight: 3 }} />
                        <Text style={[styles.playerPhoneText, { color: C.subtext }]}>{p.phone}</Text>
                        <Text style={[styles.invitedPill, { color: C.primary }]}>Invited</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.playerActionsRow}>
                    <TouchableOpacity
                      style={styles.playerActionBtn}
                      onPress={() => {
                        setNewPlayerName(p.name);
                        setNewPlayerPhone(p.phone || '');
                        setEditingPlayerIndex(pIdx);
                        setPlayerModalOpen(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-2" size={14} color={C.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.playerActionBtn}
                      onPress={() => handleRemovePlayer(activeTeamIndex, pIdx)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={14} color={C.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Navigation Controls */}
        <View style={styles.stepButtonsRow}>
          <TouchableOpacity
            style={[styles.backStepBtn, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={() => setCurrentStep(2)}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={16} color={C.text} style={{ marginRight: 6 }} />
            <Text style={[styles.backStepBtnText, { color: C.text }]}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continuePrimaryBtn, { flex: 1, marginLeft: 10, backgroundColor: '#0F766E' }, SHADOW.card]}
            onPress={() => setCurrentStep(4)}
            activeOpacity={0.85}
          >
            <Text style={styles.continuePrimaryBtnText}>Review & Publish →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER STEP 4: REVIEW, CONFIRMATION & PUBLISH
  // ─────────────────────────────────────────────────────────────
  const renderStep4SummaryAndConfirm = () => {
    const totalPlayersAdded = teams.reduce((acc, tm) => acc + (tm.players?.length || 0), 0);
    const totalCapacity = (parseInt(numberOfTeams, 10) || 2) * (parseInt(playersPerTeam, 10) || 11);

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeaderCard}>
          <View style={[styles.stepNumberBadge, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.stepNumberText, { color: C.primary }]}>Step 4 of 4</Text>
          </View>
          <Text style={[styles.stepTitle, { color: C.text }]}>Summary & Confirmation</Text>
          <Text style={[styles.stepSubtitle, { color: C.subtext }]}>
            Review all details before publishing. After publishing, your tournament will be listed and you'll get a shareable link.
          </Text>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          {bannerUrl ? (
            <Image source={{ uri: bannerUrl }} style={styles.summaryBannerImg} />
          ) : null}

          <View style={styles.summaryCardBody}>
            <View style={styles.summaryBadgeRow}>
              <View style={[styles.sourceBadgeSm, { backgroundColor: '#0F766E' }]}>
                <Text style={styles.sourceBadgeSmText}>USER CREATED</Text>
              </View>
              <View style={[styles.sportPillSm, { backgroundColor: C.bgSoft }]}>
                <Text style={[styles.sportPillSmText, { color: C.text }]}>{effectiveSport}</Text>
              </View>
            </View>

            <Text style={[styles.summaryTournamentName, { color: C.text }]}>{name}</Text>

            {/* Venue Highlight */}
            {selectedTurf && (
              <View style={[styles.summaryVenueBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                <Feather name="map-pin" size={14} color={C.primary} style={{ marginRight: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryVenueName, { color: C.text }]}>{selectedTurf.name}</Text>
                  <Text style={[styles.summaryVenueLocation, { color: C.subtext }]}>
                    {selectedTurf.address || selectedTurf.city}
                  </Text>
                </View>
              </View>
            )}

            {/* Key Metrics */}
            <View style={styles.summaryMetricsGrid}>
              <View style={[styles.summaryMetricItem, { backgroundColor: C.bgSoft }]}>
                <Feather name="calendar" size={13} color={C.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.summaryMetricVal, { color: C.text }]}>{startDate} to {endDate}</Text>
              </View>

              <View style={[styles.summaryMetricItem, { backgroundColor: C.bgSoft }]}>
                <Feather name="users" size={13} color="#3B82F6" style={{ marginRight: 4 }} />
                <Text style={[styles.summaryMetricVal, { color: C.text }]}>
                  {numberOfTeams} Teams ({playersPerTeam}/team)
                </Text>
              </View>

              {isCricket && oversPerTeam ? (
                <View style={[styles.summaryMetricItem, { backgroundColor: dark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
                  <Ionicons name="baseball-outline" size={13} color="#D97706" style={{ marginRight: 4 }} />
                  <Text style={[styles.summaryMetricVal, { color: dark ? '#FBBF24' : '#B45309' }]}>
                    {oversPerTeam} Overs per team
                  </Text>
                </View>
              ) : null}

              <View style={[styles.summaryMetricItem, { backgroundColor: C.bgSoft }]}>
                <Feather name="user-check" size={13} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={[styles.summaryMetricVal, { color: C.text }]}>
                  {totalPlayersAdded} / {totalCapacity} Roster Filled
                </Text>
              </View>
            </View>

            {/* Teams Roster Preview */}
            <View style={styles.summaryTeamsList}>
              <Text style={[styles.summarySectionTitle, { color: C.text }]}>Teams ({teams.length})</Text>
              {teams.map((tm, idx) => (
                <View key={tm.id || idx} style={[styles.summaryTeamRow, { borderBottomColor: C.border }]}>
                  <Text style={[styles.summaryTeamName, { color: C.text }]}>{tm.name}</Text>
                  <Text style={[styles.summaryTeamRosterCount, { color: C.subtext }]}>
                    {tm.players?.length || 0} players added
                  </Text>
                </View>
              ))}
            </View>

            {description ? (
              <View style={styles.summarySectionWrap}>
                <Text style={[styles.summarySectionTitle, { color: C.text }]}>Description</Text>
                <Text style={[styles.summarySectionContent, { color: C.subtext }]}>{description}</Text>
              </View>
            ) : null}

            {rules ? (
              <View style={styles.summarySectionWrap}>
                <Text style={[styles.summarySectionTitle, { color: C.text }]}>Tournament Rules</Text>
                <Text style={[styles.summarySectionContent, { color: C.subtext }]}>{rules}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Actions: Save Draft or Publish */}
        <View style={styles.summaryActionButtons}>
          <TouchableOpacity
            style={[styles.saveDraftBtn, { backgroundColor: C.card, borderColor: C.border }]}
            disabled={submitting}
            onPress={() => handleSubmit(false)}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={C.text} size="small" />
            ) : (
              <>
                <Feather name="save" size={16} color={C.text} style={{ marginRight: 6 }} />
                <Text style={[styles.saveDraftBtnText, { color: C.text }]}>Save as Draft</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.publishTournamentBtn, { backgroundColor: '#0F766E' }, SHADOW.card]}
            disabled={submitting}
            onPress={() => handleSubmit(true)}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.publishTournamentBtnText}>Publish Tournament</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Top Header ── */}
      <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => {
            if (currentStep > 1) {
              setCurrentStep(currentStep - 1);
            } else {
              navigation.goBack();
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Create Tournament</Text>
          <Text style={[styles.headerSubtitle, { color: C.subtext }]}>
            {currentStep === 1
              ? 'Select Venue'
              : currentStep === 2
              ? 'Basic Details'
              : currentStep === 3
              ? 'Teams & Players'
              : 'Review & Publish'}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Step Progress Indicator ── */}
      <View style={[styles.progressBarRow, { borderBottomColor: C.border }]}>
        {[1, 2, 3, 4].map((step) => {
          const isDone = currentStep > step;
          const isCurrent = currentStep === step;
          return (
            <View key={step} style={styles.progressStepWrap}>
              <View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor: isDone || isCurrent ? C.primary : C.border,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {currentStep === 1 && renderStep1SelectTurf()}
        {currentStep === 2 && renderStep2DetailsForm()}
        {currentStep === 3 && renderStep3TeamsAndPlayers()}
        {currentStep === 4 && renderStep4SummaryAndConfirm()}
      </ScrollView>

      {/* ── Add / Edit Player Modal ── */}
      <Modal visible={playerModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>
                {editingPlayerIndex !== null ? 'Edit Player' : 'Add Teammate'}
              </Text>
              <TouchableOpacity onPress={() => setPlayerModalOpen(false)}>
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: C.text }]}>Player Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: C.bgSoft, borderColor: C.border, color: C.text }]}
                placeholder="e.g. Suresh Kumar"
                placeholderTextColor={C.subtext}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
              />

              <Text style={[styles.inputLabel, { color: C.text, marginTop: 12 }]}>
                Phone Number (Invite Teammate)
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: C.bgSoft, borderColor: C.border, color: C.text }]}
                placeholder="e.g. 9876543210"
                placeholderTextColor={C.subtext}
                keyboardType="phone-pad"
                value={newPlayerPhone}
                onChangeText={setNewPlayerPhone}
              />

              <TouchableOpacity
                style={[styles.savePlayerBtn, { backgroundColor: '#0F766E' }]}
                onPress={handleSavePlayer}
                activeOpacity={0.85}
              >
                <Text style={styles.savePlayerBtnText}>
                  {editingPlayerIndex !== null ? 'Update Player' : 'Add to Team'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── High-Res Banner Picker Modal ── */}
      <Modal visible={selectedBannerModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.bannerModalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Select Banner Asset</Text>
              <TouchableOpacity onPress={() => setSelectedBannerModal(false)}>
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {SAMPLE_BANNERS.map((banner, bIdx) => (
                <TouchableOpacity
                  key={bIdx}
                  style={styles.bannerSampleItem}
                  onPress={() => {
                    setBannerUrl(banner.url);
                    setSelectedBannerModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: banner.url }} style={styles.bannerSampleImg} />
                  <View style={styles.bannerSampleOverlay}>
                    <Text style={styles.bannerSampleText}>{banner.label} ({banner.sport})</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Success & Native Share Dialog Modal ── */}
      <Modal visible={showSuccessModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.successModalCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View style={[styles.successIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>

            <Text style={[styles.successModalTitle, { color: C.text }]}>
              {createdTournamentResult?.status === 'published'
                ? 'Tournament Published!'
                : 'Tournament Saved as Draft!'}
            </Text>

            <Text style={[styles.successModalSubtitle, { color: C.subtext }]}>
              "{createdTournamentResult?.name}" has been created and associated with {selectedTurf?.name}.
            </Text>

            {createdTournamentResult?.shareableUrl ? (
              <View style={[styles.shareBox, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                <Text style={[styles.shareBoxLabel, { color: C.subtext }]}>Unique Shareable Link:</Text>
                <Text style={[styles.shareBoxUrl, { color: C.primary }]} numberOfLines={1}>
                  {createdTournamentResult.shareableUrl}
                </Text>
              </View>
            ) : null}

            <View style={styles.successModalActions}>
              <TouchableOpacity
                style={[styles.nativeShareBtn, { backgroundColor: '#0F766E' }]}
                onPress={handleNativeShare}
                activeOpacity={0.85}
              >
                <Feather name="share-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.nativeShareBtnText}>Share Tournament</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.doneSuccessBtn, { backgroundColor: C.card, borderColor: '#0F766E', borderWidth: 1.5 }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.navigate('Tournament');
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.doneSuccessBtnText, { color: '#0F766E' }]}>Go to Tournaments</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  progressStepWrap: { flex: 1, paddingHorizontal: 3 },
  progressLine: { height: 4, borderRadius: 2 },
  scrollContent: { paddingBottom: 60 },
  stepContainer: { padding: SPACING.md },
  stepHeaderCard: { marginBottom: 16 },
  stepNumberBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginBottom: 6,
  },
  stepNumberText: { fontSize: 11, fontWeight: '700' },
  stepTitle: { fontSize: 19, fontWeight: '800' },
  stepSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  turfSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  turfSearchInput: { flex: 1, fontSize: 14 },
  centerContainer: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13 },
  emptyTurfCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 10,
  },
  emptyTurfTitle: { fontSize: 16, fontWeight: '700', marginTop: 10 },
  emptyTurfSubtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  turfPickerCard: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  turfPickerThumb: { width: 72, height: 72, borderRadius: RADIUS.sm },
  turfPickerInfo: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  turfPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  turfPickerName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 6 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  uncheckCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  turfPickerMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  turfPickerLocation: { fontSize: 12 },
  turfPickerBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  sportPillSm: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.xs },
  sportPillSmText: { fontSize: 11, fontWeight: '600' },
  turfPriceText: { fontSize: 12, fontWeight: '700' },
  continuePrimaryBtn: {
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  continuePrimaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  venueBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  venueBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  venueIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  venueBannerTag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  venueBannerName: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  venueBannerLocation: { fontSize: 12, marginTop: 1 },
  changeTurfBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm, borderWidth: 1 },
  changeTurfBtnText: { fontSize: 12, fontWeight: '700' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorText: { color: '#EF4444', fontSize: 11, marginTop: 4 },
  sportsScroll: { paddingVertical: 4 },
  sportSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: 8,
  },
  sportSelectChipText: { fontSize: 13, fontWeight: '600' },
  rowInputs: { flexDirection: 'row', alignItems: 'center' },
  dateButton: {
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dateButtonText: { fontSize: 13, fontWeight: '600' },
  labelWithHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  hintTag: { fontSize: 11, fontWeight: '700' },
  selectBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  selectBannerBtnText: { fontSize: 14, fontWeight: '700' },
  bannerPreviewBox: { position: 'relative', borderRadius: RADIUS.md, overflow: 'hidden' },
  bannerPreviewImg: { width: '100%', height: 120, borderRadius: RADIUS.md },
  removeBannerBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamTabsScroll: { paddingVertical: 6, marginBottom: 12 },
  teamTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamTabChipTitle: { fontSize: 13, fontWeight: '700', marginRight: 6 },
  teamTabChipBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  teamTabChipBadgeText: { fontSize: 11, fontWeight: '700' },
  activeTeamCard: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 18 },
  activeTeamHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  activeTeamLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  teamNameEditInput: { fontSize: 16, fontWeight: '700', borderBottomWidth: 1, paddingVertical: 2 },
  capacityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  capacityPillText: { fontSize: 12, fontWeight: '700' },
  playersListWrap: { marginTop: 4 },
  playersListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  playersListTitle: { fontSize: 14, fontWeight: '700' },
  addPlayerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  addPlayerTriggerBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  emptyRosterCard: { padding: 20, alignItems: 'center', borderRadius: RADIUS.sm },
  emptyRosterText: { fontSize: 12, marginTop: 6, textAlign: 'center' },
  playerItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  playerNumCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  playerNumText: { fontSize: 12, fontWeight: '700' },
  playerInfoCol: { flex: 1 },
  playerNameText: { fontSize: 14, fontWeight: '600' },
  playerPhoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  playerPhoneText: { fontSize: 11, marginRight: 6 },
  invitedPill: { fontSize: 10, fontWeight: '700' },
  playerActionsRow: { flexDirection: 'row', alignItems: 'center' },
  playerActionBtn: { padding: 6, marginLeft: 4 },
  stepButtonsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  backStepBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backStepBtnText: { fontSize: 14, fontWeight: '700' },
  summaryCard: { borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  summaryBannerImg: { width: '100%', height: 140 },
  summaryCardBody: { padding: 14 },
  summaryBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sourceBadgeSm: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs, marginRight: 6 },
  sourceBadgeSmText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  summaryTournamentName: { fontSize: 19, fontWeight: '800', marginBottom: 10 },
  summaryVenueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryVenueName: { fontSize: 14, fontWeight: '700' },
  summaryVenueLocation: { fontSize: 12 },
  summaryMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  summaryMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
  },
  summaryMetricVal: { fontSize: 12, fontWeight: '600' },
  summaryTeamsList: { marginTop: 10, marginBottom: 10 },
  summarySectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  summaryTeamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  summaryTeamName: { fontSize: 13, fontWeight: '600' },
  summaryTeamRosterCount: { fontSize: 12 },
  summarySectionWrap: { marginTop: 10 },
  summarySectionContent: { fontSize: 13, lineHeight: 18 },
  summaryActionButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  saveDraftBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftBtnText: { fontSize: 14, fontWeight: '700' },
  publishTournamentBtn: {
    flex: 1.3,
    height: 48,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishTournamentBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalBody: { padding: 14 },
  savePlayerBtn: { height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  savePlayerBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  bannerModalCard: { width: '100%', maxWidth: 380, maxHeight: '80%', borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  bannerSampleItem: { position: 'relative', height: 90, borderRadius: RADIUS.sm, overflow: 'hidden', marginBottom: 10 },
  bannerSampleImg: { width: '100%', height: '100%' },
  bannerSampleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
  },
  bannerSampleText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  successModalCard: { width: '100%', maxWidth: 360, padding: 20, borderRadius: RADIUS.lg, borderWidth: 1, alignItems: 'center' },
  successIconCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  successModalTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  successModalSubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  shareBox: { width: '100%', padding: 10, borderRadius: RADIUS.sm, borderWidth: 1, marginTop: 14 },
  shareBoxLabel: { fontSize: 11, fontWeight: '600' },
  shareBoxUrl: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  successModalActions: { width: '100%', marginTop: 18, gap: 10 },
  nativeShareBtn: { height: 46, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nativeShareBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  doneSuccessBtn: { height: 46, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  doneSuccessBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
