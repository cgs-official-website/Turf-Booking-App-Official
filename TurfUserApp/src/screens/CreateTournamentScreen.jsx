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
import { createUserTournamentApi, updateTournamentApi } from '../api/tournaments';
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const parseYMD = (str) => {
  if (!str) return new Date();
  const parts = String(str).split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
};

export default function CreateTournamentScreen({ route, navigation }) {
  const { C, dark } = useTheme();

  // Wizard Steps:
  // 1: 'select_turf'
  // 2: 'tournament_form'
  // 3: 'manage_teams'
  // 4: 'summary_confirm'
  // Edit mode: opened from the tournament detail screen by the creator.
  // The host turf is locked (changing it would need a fresh turf-owner approval).
  const editTournament = route.params?.editTournament || null;
  const isEdit = Boolean(editTournament?.id);
  const initialTurfParam = route.params?.turf || (isEdit ? (editTournament.turf || { id: editTournament.turfId, name: editTournament.venueName }) : null);
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

  const today = new Date();
  const regCloseDefault = new Date(today);
  regCloseDefault.setDate(regCloseDefault.getDate() + 2);
  const tournStartDefault = new Date(today);
  tournStartDefault.setDate(tournStartDefault.getDate() + 3);
  const tournEndDefault = new Date(today);
  tournEndDefault.setDate(tournEndDefault.getDate() + 7);

  const [registrationStartDate, setRegistrationStartDate] = useState(toDateString(today));
  const [registrationEndDate, setRegistrationEndDate] = useState(toDateString(regCloseDefault));
  const [startDate, setStartDate] = useState(toDateString(tournStartDefault));
  const [endDate, setEndDate] = useState(toDateString(tournEndDefault));
  const [numberOfTeams, setNumberOfTeams] = useState('8');
  const [playersPerTeam, setPlayersPerTeam] = useState('11');
  const [oversPerTeam, setOversPerTeam] = useState('10');
  const [cupsCount, setCupsCount] = useState(1); // 1, 2, or 4 Cups
  const [cupPrizes, setCupPrizes] = useState(['', '', '', '']);
  // Total pool is always the sum of the prize given to each cup
  const prizePool = String(cupPrizes.slice(0, Number(cupsCount) || 1).reduce((sum, v) => sum + (Number(v) || 0), 0) || '');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [selectedBannerModal, setSelectedBannerModal] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState(null); // 'regStart' | 'regEnd' | 'tournStart' | 'tournEnd' | null
  const [calendarViewYear, setCalendarViewYear] = useState(today.getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = useState(today.getMonth());
  const [tempDate, setTempDate] = useState('');

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

  // Prefill the form with the existing tournament when editing
  useEffect(() => {
    if (!isEdit) return;
    const t = editTournament;
    setName(t.name || '');
    const sportName = t.sport || 'Cricket';
    if (SPORTS.some((sp) => sp.id === sportName && sp.id !== 'Other')) {
      setSelectedSport(sportName);
    } else {
      setSelectedSport('Other');
      setCustomSport(sportName);
    }
    const d10 = (v) => (v ? String(v).slice(0, 10) : '');
    if (t.registrationStartDate) setRegistrationStartDate(d10(t.registrationStartDate));
    if (t.registrationEndDate) setRegistrationEndDate(d10(t.registrationEndDate));
    if (t.startDate) setStartDate(d10(t.startDate));
    if (t.endDate) setEndDate(d10(t.endDate));
    if (t.numberOfTeams) setNumberOfTeams(String(t.numberOfTeams));
    if (t.playersPerTeam) setPlayersPerTeam(String(t.playersPerTeam));
    if (t.oversPerTeam) setOversPerTeam(String(t.oversPerTeam));
    if (t.prizeDetails?.cupsCount) setCupsCount(Number(t.prizeDetails.cupsCount));
    if (Array.isArray(t.prizeDetails?.cupPrizes)) {
      setCupPrizes([0, 1, 2, 3].map((i) => (t.prizeDetails.cupPrizes[i] ? String(t.prizeDetails.cupPrizes[i]) : '')));
    } else if (t.prizePool) {
      setCupPrizes([String(t.prizePool), '', '', '']);
    }
    setDescription(t.description || '');
    setRules(t.rules || '');
    setBannerUrl(t.bannerUrl || '');
    if (Array.isArray(t.teams) && t.teams.length > 0) {
      setTeams(
        t.teams.map((tm, i) => ({
          id: tm.id || `team_${i + 1}`,
          name: tm.name || `Team ${i + 1}`,
          players: Array.isArray(tm.players) ? tm.players : [],
        }))
      );
    }
  }, []);

  // Load available turfs for Step 1
  useEffect(() => {
    let mounted = true;
    const fetchTurfs = async () => {
      try {
        setLoadingTurfs(true);
        const res = await turfsApi.getTurfs({ take: 50 });
        const list = res?.turfs || res?.items || res?.data?.turfs || res?.data?.items || (Array.isArray(res) ? res : []);
        if (mounted) {
          setTurfsList(list);
          // If a turfId was passed via route params, match it
          if (route.params?.turfId && !selectedTurf) {
            const match = list.find((t) => (t.id || t._id) === route.params.turfId);
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

    const todayStr = toDateString(new Date());

    // 1. Registration Period Validation
    if (!registrationStartDate) {
      errs.registrationStartDate = 'Registration open date is required';
    } else if (registrationStartDate < todayStr && !(isEdit && registrationStartDate === String(editTournament.registrationStartDate || '').slice(0, 10))) {
      errs.registrationStartDate = 'Registration open date cannot be in the past';
    }

    if (!registrationEndDate) {
      errs.registrationEndDate = 'Registration close date is required';
    } else if (registrationEndDate < registrationStartDate) {
      errs.registrationEndDate = 'Registration close date cannot be earlier than open date';
    }

    // 2. Tournament Schedule Validation
    if (!startDate) {
      errs.startDate = 'Tournament start date is required';
    } else if (startDate < todayStr && !(isEdit && startDate === String(editTournament.startDate || '').slice(0, 10))) {
      errs.startDate = 'Tournament start date cannot be in the past';
    } else if (registrationEndDate && startDate < registrationEndDate) {
      errs.startDate = 'Tournament start date cannot be earlier than registration close date';
    }

    if (!endDate) {
      errs.endDate = 'Tournament end date is required';
    } else if (endDate < startDate) {
      errs.endDate = 'Tournament end date cannot be earlier than tournament start date';
    }

    const teamsNum = parseInt(numberOfTeams, 10);
    if (!numberOfTeams || isNaN(teamsNum) || teamsNum < 2) {
      errs.numberOfTeams = 'Minimum 2 teams required';
    } else if (isEdit) {
      const confirmed = Number(editTournament.acceptedTeamsCount || 0);
      if (teamsNum < confirmed) {
        errs.numberOfTeams = `Cannot be less than the ${confirmed} team(s) already confirmed`;
      }
      if (editTournament.hasBracket || editTournament.bracket) {
        if (teamsNum !== Number(editTournament.numberOfTeams)) {
          errs.numberOfTeams = 'Cannot change the number of teams after the bracket is generated';
        }
      }
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

  // ── Interactive Date Picker Handlers ──
  const handleOpenDatePicker = (target) => {
    setDatePickerTarget(target);
    let initialVal = '';
    if (target === 'regStart') initialVal = registrationStartDate;
    else if (target === 'regEnd') initialVal = registrationEndDate;
    else if (target === 'tournStart') initialVal = startDate;
    else if (target === 'tournEnd') initialVal = endDate;

    const baseDate = parseYMD(initialVal || toDateString(new Date()));
    setCalendarViewYear(baseDate.getFullYear());
    setCalendarViewMonth(baseDate.getMonth());
    setTempDate(initialVal || toDateString(new Date()));
  };

  const handleConfirmDate = () => {
    if (!tempDate) {
      setDatePickerTarget(null);
      return;
    }
    const todayStr = toDateString(new Date());

    if (datePickerTarget === 'regStart') {
      if (tempDate < todayStr) {
        Alert.alert('Invalid Date', 'Registration open date cannot be in the past.');
        return;
      }
      setRegistrationStartDate(tempDate);
      // Auto-bump later dates if needed
      if (registrationEndDate && registrationEndDate < tempDate) {
        setRegistrationEndDate(tempDate);
      }
      if (startDate && startDate < tempDate) {
        setStartDate(tempDate);
      }
      if (endDate && endDate < tempDate) {
        setEndDate(tempDate);
      }
      setErrors((prev) => ({
        ...prev,
        registrationStartDate: null,
        registrationEndDate: null,
        startDate: null,
        endDate: null,
      }));
    } else if (datePickerTarget === 'regEnd') {
      if (tempDate < (registrationStartDate || todayStr)) {
        Alert.alert('Invalid Date', 'Registration close date cannot be earlier than registration open date.');
        return;
      }
      setRegistrationEndDate(tempDate);
      // Ensure tournament start is on or after registration close
      if (startDate && startDate < tempDate) {
        setStartDate(tempDate);
      }
      if (endDate && endDate < tempDate) {
        setEndDate(tempDate);
      }
      setErrors((prev) => ({
        ...prev,
        registrationEndDate: null,
        startDate: null,
      }));
    } else if (datePickerTarget === 'tournStart') {
      if (tempDate < todayStr) {
        Alert.alert('Invalid Date', 'Tournament start date cannot be in the past.');
        return;
      }
      if (registrationEndDate && tempDate < registrationEndDate) {
        Alert.alert(
          'Invalid Date',
          `Tournament start date cannot be earlier than registration close date (${registrationEndDate}).`
        );
        return;
      }
      setStartDate(tempDate);
      if (endDate && endDate < tempDate) {
        setEndDate(tempDate);
      }
      setErrors((prev) => ({ ...prev, startDate: null, endDate: null }));
    } else if (datePickerTarget === 'tournEnd') {
      if (tempDate < (startDate || todayStr)) {
        Alert.alert('Invalid Date', 'Tournament end date cannot be earlier than tournament start date.');
        return;
      }
      setEndDate(tempDate);
      setErrors((prev) => ({ ...prev, endDate: null }));
    }
    setDatePickerTarget(null);
  };

  const handlePrevMonth = () => {
    if (calendarViewMonth === 0) {
      setCalendarViewMonth(11);
      setCalendarViewYear((y) => y - 1);
    } else {
      setCalendarViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarViewMonth === 11) {
      setCalendarViewMonth(0);
      setCalendarViewYear((y) => y + 1);
    } else {
      setCalendarViewMonth((m) => m + 1);
    }
  };

  const getPresets = () => {
    const today = new Date();
    const todayStr = toDateString(today);
    if (datePickerTarget === 'regStart') {
      const tomorrowDate = new Date(today);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const in2Days = new Date(today);
      in2Days.setDate(in2Days.getDate() + 2);
      const in1Week = new Date(today);
      in1Week.setDate(in1Week.getDate() + 7);
      return [
        { label: 'Today', value: todayStr },
        { label: 'Tomorrow', value: toDateString(tomorrowDate) },
        { label: '+2 Days', value: toDateString(in2Days) },
        { label: '+1 Week', value: toDateString(in1Week) },
      ];
    } else if (datePickerTarget === 'regEnd') {
      const base = parseYMD(registrationStartDate || todayStr);
      const in1 = new Date(base);
      in1.setDate(in1.getDate() + 1);
      const in2 = new Date(base);
      in2.setDate(in2.getDate() + 2);
      const in5 = new Date(base);
      in5.setDate(in5.getDate() + 5);
      return [
        { label: 'Same Day', value: registrationStartDate || todayStr },
        { label: '+1 Day', value: toDateString(in1) },
        { label: '+2 Days', value: toDateString(in2) },
        { label: '+5 Days', value: toDateString(in5) },
      ];
    } else if (datePickerTarget === 'tournStart') {
      const base = parseYMD(registrationEndDate || todayStr);
      const in1 = new Date(base);
      in1.setDate(in1.getDate() + 1);
      const in3 = new Date(base);
      in3.setDate(in3.getDate() + 3);
      const in7 = new Date(base);
      in7.setDate(in7.getDate() + 7);
      return [
        { label: 'Reg Close Day', value: registrationEndDate || todayStr },
        { label: '+1 Day', value: toDateString(in1) },
        { label: '+3 Days', value: toDateString(in3) },
        { label: '+1 Week', value: toDateString(in7) },
      ];
    } else {
      const base = parseYMD(startDate || todayStr);
      const plus1 = new Date(base);
      plus1.setDate(plus1.getDate() + 1);
      const plus3 = new Date(base);
      plus3.setDate(plus3.getDate() + 3);
      const plus7 = new Date(base);
      plus7.setDate(plus7.getDate() + 7);
      return [
        { label: 'Same Day', value: startDate || todayStr },
        { label: '+1 Day', value: toDateString(plus1) },
        { label: '+3 Days', value: toDateString(plus3) },
        { label: '+1 Week', value: toDateString(plus7) },
      ];
    }
  };

  const handleSelectPreset = (val) => {
    setTempDate(val);
    const d = parseYMD(val);
    setCalendarViewYear(d.getFullYear());
    setCalendarViewMonth(d.getMonth());
  };

  const renderCalendarDays = () => {
    const todayStr = toDateString(new Date());
    const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarViewYear, calendarViewMonth, 1).getDay();

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarDayCellEmpty} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarViewYear}-${pad(calendarViewMonth + 1)}-${pad(day)}`;
      const isSelected = tempDate === dateStr;
      const isToday = dateStr === todayStr;

      let isDisabled = false;
      if (datePickerTarget === 'regStart') {
        if (dateStr < todayStr) isDisabled = true;
      } else if (datePickerTarget === 'regEnd') {
        if (dateStr < (registrationStartDate || todayStr)) isDisabled = true;
      } else if (datePickerTarget === 'tournStart') {
        if (dateStr < todayStr || (registrationEndDate && dateStr < registrationEndDate)) isDisabled = true;
      } else if (datePickerTarget === 'tournEnd') {
        if (dateStr < (startDate || todayStr)) isDisabled = true;
      }

      cells.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.calendarDayCell,
            isSelected && { backgroundColor: '#0F766E' },
            isToday && !isSelected && { borderColor: C.primary, borderWidth: 1.5 },
            isDisabled && { opacity: 0.28 },
          ]}
          disabled={isDisabled}
          onPress={() => setTempDate(dateStr)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.calendarDayText,
              { color: isSelected ? '#FFFFFF' : isDisabled ? C.subtext : C.text },
              isSelected && { fontWeight: '800' },
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return cells;
  };

  // Add / Edit Player in active team
  const handleSavePlayer = () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Player Name Required', 'Please enter a name for this player.');
      return;
    }

    const cleanedPhone = newPlayerPhone.replace(/\D/g, '').slice(0, 10);
    if (newPlayerPhone.trim() && cleanedPhone.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Phone number must be exactly 10 numeric digits.');
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
      phone: cleanedPhone || '',
      isInvited: Boolean(cleanedPhone),
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
        turfId: selectedTurf?.id || selectedTurf?._id,
        name: name.trim(),
        sport: effectiveSport,
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate,
        numberOfTeams: parseInt(numberOfTeams, 10),
        playersPerTeam: parseInt(playersPerTeam, 10),
        oversPerTeam: isCricket ? parseInt(oversPerTeam, 10) : null,
        prizePool: prizePool ? Number(prizePool) : 0,
        prizeDetails: {
          cupsCount: Number(cupsCount) || 1,
          cupPrizes: cupPrizes.slice(0, Number(cupsCount) || 1).map((v) => Number(v) || 0),
          structure: cupsCount === 4 ? '1st, 2nd, 3rd & 4th Cups + Playoff' : (cupsCount === 2 ? 'Winner & Runner-up Cups' : 'Champion Cup'),
        },
        description: description.trim() || null,
        rules: rules.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        teams,
        publishNow,
      };

      if (isEdit) {
        // Edits never touch the host turf or the approval status.
        const { turfId: _turfId, publishNow: _publishNow, ...editPayload } = payload;
        await updateTournamentApi(editTournament.id, editPayload);
        Alert.alert('Tournament Updated', 'Your changes have been saved.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

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
        message: `🏆 Check out "${createdTournamentResult.name}" (${createdTournamentResult.sport}) at ${selectedTurf?.name || 'our local turf'}!\n\n📝 Registration: ${createdTournamentResult.registrationStartDate || registrationStartDate} to ${createdTournamentResult.registrationEndDate || registrationEndDate}\n📅 Tournament Dates: ${createdTournamentResult.startDate} to ${createdTournamentResult.endDate}\n👥 Teams: ${createdTournamentResult.numberOfTeams} (${createdTournamentResult.playersPerTeam} players/team)${isCricket && createdTournamentResult.oversPerTeam ? `\n🏏 Overs: ${createdTournamentResult.oversPerTeam}` : ''}\n\nView details and participate:\n${shareUrl}`,
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
              const isSelected = (selectedTurf?.id || selectedTurf?._id) === (item.id || item._id);
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
                  {/* Left: Turf Image */}
                  <Image source={{ uri: turfImg }} style={styles.turfPickerThumb} />

                  {/* Middle: Venue Details */}
                  <View style={styles.turfPickerMiddle}>
                    <Text style={[styles.turfPickerName, { color: C.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>

                    <View style={styles.turfPickerMetaRow}>
                      <Feather name="map-pin" size={12} color={C.primary} style={{ marginRight: 4, flexShrink: 0 }} />
                      <Text style={[styles.turfPickerLocation, { color: C.subtext }]} numberOfLines={1}>
                        {locationStr}
                      </Text>
                    </View>

                    <View style={styles.turfPickerSportsWrap}>
                      <View style={[styles.sportPillSm, { backgroundColor: C.bgSoft }]}>
                        <Text style={[styles.sportPillSmText, { color: C.text }]} numberOfLines={1}>
                          {Array.isArray(item.sports) ? item.sports.join(', ') : (item.sports || 'All Sports')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Selection Indicator & Hourly Price */}
                  <View style={styles.turfPickerRight}>
                    {isSelected ? (
                      <View style={[styles.checkCircle, { backgroundColor: C.primary }]}>
                        <Feather name="check" size={13} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={[styles.uncheckCircle, { borderColor: C.border }]} />
                    )}

                    {item.pricePerHour ? (
                      <View
                        style={[
                          styles.turfPriceBadge,
                          {
                            backgroundColor: dark ? 'rgba(15, 118, 110, 0.2)' : '#E6FFFA',
                            borderColor: dark ? 'rgba(15, 118, 110, 0.4)' : '#B2F5EA',
                          },
                        ]}
                      >
                        <Text style={[styles.turfPriceText, { color: C.primary }]}>
                          ₹{item.pricePerHour}/hr
                        </Text>
                      </View>
                    ) : null}
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

        {/* ── CARD 1: REGISTRATION PERIOD ── */}
        <View style={[styles.dateSectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <View style={styles.dateCardHeader}>
            <View style={[styles.dateCardIconCircle, { backgroundColor: dark ? 'rgba(15, 118, 110, 0.22)' : '#CCFBF1' }]}>
              <Feather name="user-check" size={16} color="#0F766E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dateCardTitle, { color: C.text }]}>REGISTRATION PERIOD</Text>
              <Text style={[styles.dateCardSubtitle, { color: C.subtext }]}>
                When users are allowed to apply and register their teams
              </Text>
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Registration Opens <Text style={{ color: C.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: C.bgSoft, borderColor: errors.registrationStartDate ? C.error : C.border },
                ]}
                onPress={() => handleOpenDatePicker('regStart')}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={15} color="#0F766E" style={{ marginRight: 6 }} />
                <Text style={[styles.dateButtonText, { color: C.text }]}>{registrationStartDate}</Text>
              </TouchableOpacity>
              {errors.registrationStartDate ? (
                <Text style={styles.errorText}>{errors.registrationStartDate}</Text>
              ) : null}
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Registration Closes <Text style={{ color: C.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: C.bgSoft, borderColor: errors.registrationEndDate ? C.error : C.border },
                ]}
                onPress={() => handleOpenDatePicker('regEnd')}
                activeOpacity={0.8}
              >
                <Feather name="clock" size={15} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={[styles.dateButtonText, { color: C.text }]}>{registrationEndDate}</Text>
              </TouchableOpacity>
              {errors.registrationEndDate ? (
                <Text style={styles.errorText}>{errors.registrationEndDate}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── CARD 2: TOURNAMENT SCHEDULE ── */}
        <View style={[styles.dateSectionCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <View style={styles.dateCardHeader}>
            <View style={[styles.dateCardIconCircle, { backgroundColor: dark ? 'rgba(2, 132, 199, 0.22)' : '#E0F2FE' }]}>
              <Feather name="play-circle" size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dateCardTitle, { color: C.text }]}>TOURNAMENT SCHEDULE</Text>
              <Text style={[styles.dateCardSubtitle, { color: C.subtext }]}>
                When the tournament games and matches take place
              </Text>
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Tournament Starts <Text style={{ color: C.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: C.bgSoft, borderColor: errors.startDate ? C.error : C.border },
                ]}
                onPress={() => handleOpenDatePicker('tournStart')}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={15} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={[styles.dateButtonText, { color: C.text }]}>{startDate}</Text>
              </TouchableOpacity>
              {errors.startDate ? <Text style={styles.errorText}>{errors.startDate}</Text> : null}
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.inputLabel, { color: C.text }]}>
                Tournament Ends <Text style={{ color: C.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: C.bgSoft, borderColor: errors.endDate ? C.error : C.border },
                ]}
                onPress={() => handleOpenDatePicker('tournEnd')}
                activeOpacity={0.8}
              >
                <Feather name="flag" size={15} color="#059669" style={{ marginRight: 6 }} />
                <Text style={[styles.dateButtonText, { color: C.text }]}>{endDate}</Text>
              </TouchableOpacity>
              {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}
            </View>
          </View>
        </View>

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

        {/* 5b. Tournament Prizes & Cups Configuration */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: C.text }]}>Tournament Prizes & Cups</Text>
          <Text style={{ fontSize: 12, color: C.subtext, marginBottom: 8, fontWeight: '500' }}>
            Choose trophies awarded to the tournament finalists
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: cupsCount === 1 ? '#D97706' : C.border,
                backgroundColor: cupsCount === 1 ? (dark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7') : C.card,
                borderRadius: 12,
                padding: 10,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 90,
              }}
              onPress={() => setCupsCount(1)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}><Ionicons name="trophy" size={20} color="#D97706" /></View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>1 Cup</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.subtext, marginTop: 2 }}>Champion</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: cupsCount === 2 ? '#D97706' : C.border,
                backgroundColor: cupsCount === 2 ? (dark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7') : C.card,
                borderRadius: 12,
                padding: 10,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 90,
              }}
              onPress={() => setCupsCount(2)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}><Ionicons name="trophy" size={20} color="#D97706" /><Ionicons name="medal" size={18} color="#94A3B8" /></View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>2 Cups</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.subtext, marginTop: 2 }}>Winner + Runner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: cupsCount === 4 ? '#D97706' : C.border,
                backgroundColor: cupsCount === 4 ? (dark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7') : C.card,
                borderRadius: 12,
                padding: 10,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 90,
              }}
              onPress={() => setCupsCount(4)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}><Ionicons name="trophy" size={20} color="#D97706" /><Ionicons name="medal" size={18} color="#94A3B8" /><Ionicons name="medal" size={18} color="#C2410C" /><Ionicons name="medal" size={18} color="#2563EB" /></View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>4 Cups</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.subtext, marginTop: 2 }}>1st, 2nd, 3rd, 4th</Text>
            </TouchableOpacity>
          </View>

          {cupsCount === 4 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: dark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF', borderWidth: 1, borderColor: dark ? '#1E3A8A' : '#BFDBFE', marginTop: 8 }}>
              <Ionicons name="information-circle-outline" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: dark ? '#93C5FD' : '#1E40AF' }}>
                A 3rd Place Playoff fixture will automatically be scheduled to decide 3rd and 4th place cups!
              </Text>
            </View>
          )}

          <Text style={[styles.inputLabel, { color: C.text, marginTop: 14 }]}>Prize Amount per Cup (₹ Optional)</Text>
          {['Champion (1st Prize)', 'Runner-up (2nd Prize)', '3rd Place Prize', '4th Place Prize'].slice(0, Number(cupsCount) || 1).map((label, idx) => (
            <View key={`cupprize_${idx}`} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.subtext, marginBottom: 4 }}>{label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 }}>
                <Text style={{ color: C.subtext, fontWeight: '700', marginRight: 6, fontSize: 16 }}>₹</Text>
                <TextInput
                  style={{ flex: 1, color: C.text, paddingVertical: 10, fontSize: 15 }}
                  placeholder="e.g. 10000"
                  placeholderTextColor={C.subtext}
                  keyboardType="numeric"
                  value={cupPrizes[idx]}
                  onChangeText={(text) => setCupPrizes((prev) => prev.map((v, i) => (i === idx ? text.replace(/[^0-9]/g, '') : v)))}
                />
              </View>
            </View>
          ))}
          {Number(prizePool) > 0 && (
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.text, marginTop: 2 }}>Total Prize Pool: ₹{Number(prizePool).toLocaleString('en-IN')}</Text>
          )}
        </View>

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

        {/* Bottom Primary Action (Top Back button provides previous step navigation) */}
        <TouchableOpacity
          style={[styles.continuePrimaryBtn, { backgroundColor: '#0F766E' }, SHADOW.card]}
          onPress={() => setCurrentStep(4)}
          activeOpacity={0.85}
        >
          <Text style={styles.continuePrimaryBtnText}>Review & Publish →</Text>
        </TouchableOpacity>
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
                <Feather name="user-check" size={13} color="#0F766E" style={{ marginRight: 4 }} />
                <Text style={[styles.summaryMetricVal, { color: C.text }]}>
                  Registration: {registrationStartDate} → {registrationEndDate}
                </Text>
              </View>

              <View style={[styles.summaryMetricItem, { backgroundColor: C.bgSoft }]}>
                <Feather name="calendar" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={[styles.summaryMetricVal, { color: C.text }]}>
                  Schedule: {startDate} → {endDate}
                </Text>
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

        {/* Actions: Save Draft or Publish (or Save Changes when editing) */}
        {isEdit ? (
          <View style={styles.summaryActionButtons}>
            <TouchableOpacity
              style={[styles.publishTournamentBtn, { backgroundColor: '#0F766E' }, SHADOW.card]}
              disabled={submitting}
              onPress={() => handleSubmit(false)}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="check" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.publishTournamentBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Top Header ── */}
      <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={() => {
            if (currentStep > (isEdit ? 2 : 1)) {
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
          <Text style={[styles.headerTitle, { color: C.text }]}>{isEdit ? 'Edit Tournament' : 'Create Tournament'}</Text>
          <Text style={[styles.headerSubtitle, { color: C.subtext }]}>
            {currentStep === 1
              ? 'Select Venue'
              : currentStep === 2
                ? 'Basic Details'
                : currentStep === 3
                  ? 'Teams & Players'
                  : isEdit
                    ? 'Review & Save'
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

      {/* ── Interactive Calendar Date Picker Modal ── */}
      <Modal visible={Boolean(datePickerTarget)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.datePickerModalCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { color: C.text }]}>
                  {datePickerTarget === 'regStart'
                    ? 'Registration Opens'
                    : datePickerTarget === 'regEnd'
                      ? 'Registration Closes'
                      : datePickerTarget === 'tournStart'
                        ? 'Tournament Starts'
                        : 'Tournament Ends'}
                </Text>
                <Text style={[styles.modalSubtitleText, { color: C.subtext }]}>
                  {datePickerTarget === 'regStart'
                    ? 'When users are allowed to apply and register their teams'
                    : datePickerTarget === 'regEnd'
                      ? `Must be on or after ${registrationStartDate || 'Registration Opens'}`
                      : datePickerTarget === 'tournStart'
                        ? `Must be on or after ${registrationEndDate || 'Registration Closes'}`
                        : `Must be on or after ${startDate || 'Tournament Starts'}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDatePickerTarget(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            {/* Presets Chips */}
            <View style={styles.datePresetsRow}>
              {getPresets().map((preset) => {
                const isSelected = tempDate === preset.value;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.datePresetChip,
                      {
                        backgroundColor: isSelected ? (dark ? 'rgba(15, 118, 110, 0.25)' : '#E6FFFA') : C.bgSoft,
                        borderColor: isSelected ? C.primary : C.border,
                      },
                    ]}
                    onPress={() => handleSelectPreset(preset.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.datePresetChipText,
                        { color: isSelected ? C.primary : C.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Month & Year Navigation */}
            <View style={styles.calendarMonthNav}>
              <TouchableOpacity
                style={[styles.calNavBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={handlePrevMonth}
                activeOpacity={0.7}
              >
                <Feather name="chevron-left" size={18} color={C.text} />
              </TouchableOpacity>

              <Text style={[styles.calendarMonthTitle, { color: C.text }]}>
                {MONTH_NAMES[calendarViewMonth]} {calendarViewYear}
              </Text>

              <TouchableOpacity
                style={[styles.calNavBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                onPress={handleNextMonth}
                activeOpacity={0.7}
              >
                <Feather name="chevron-right" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            {/* Day of Week Labels */}
            <View style={styles.calendarWeekRow}>
              {DAY_LABELS.map((label, idx) => (
                <View key={idx} style={styles.calendarWeekLabelCell}>
                  <Text style={[styles.calendarWeekLabelText, { color: C.subtext }]}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>

            {/* Selected Date Summary & Modal Actions */}
            <View style={[styles.datePickerFooter, { borderTopColor: C.border }]}>
              <View style={styles.selectedDateBadge}>
                <Feather name="calendar" size={13} color={C.primary} style={{ marginRight: 5 }} />
                <Text style={[styles.selectedDateBadgeText, { color: C.text }]}>
                  {tempDate || 'None'}
                </Text>
              </View>

              <View style={styles.datePickerActionButtons}>
                <TouchableOpacity
                  style={[styles.datePickerCancelBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                  onPress={() => setDatePickerTarget(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.datePickerCancelBtnText, { color: C.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePickerConfirmBtn, { backgroundColor: '#0F766E' }]}
                  onPress={handleConfirmDate}
                  activeOpacity={0.85}
                >
                  <Text style={styles.datePickerConfirmBtnText}>Confirm Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
                keyboardType="numeric"
                maxLength={10}
                value={newPlayerPhone}
                onChangeText={(text) => setNewPlayerPhone(text.replace(/\D/g, '').slice(0, 10))}
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

      {/* ── Success & Approval Status Modal ── */}
      <Modal visible={showSuccessModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.successModalCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
            <View
              style={[
                styles.successIconCircle,
                {
                  backgroundColor:
                    createdTournamentResult?.status === 'pending_approval' || createdTournamentResult?.approvalStatus === 'pending'
                      ? '#FEF3C7'
                      : createdTournamentResult?.status === 'published'
                        ? '#DCFCE7'
                        : '#F1F5F9',
                },
              ]}
            >
              <Ionicons
                name={
                  createdTournamentResult?.status === 'pending_approval' || createdTournamentResult?.approvalStatus === 'pending'
                    ? 'hourglass'
                    : createdTournamentResult?.status === 'published'
                      ? 'checkmark-circle'
                      : 'document-text'
                }
                size={44}
                color={
                  createdTournamentResult?.status === 'pending_approval' || createdTournamentResult?.approvalStatus === 'pending'
                    ? '#D97706'
                    : createdTournamentResult?.status === 'published'
                      ? '#10B981'
                      : '#64748B'
                }
              />
            </View>

            <Text style={[styles.successModalTitle, { color: C.text }]}>
              {createdTournamentResult?.status === 'pending_approval' || createdTournamentResult?.approvalStatus === 'pending'
                ? 'Submitted for Turf Approval! 🎉'
                : createdTournamentResult?.status === 'published'
                  ? 'Tournament Published!'
                  : 'Tournament Saved as Draft!'}
            </Text>

            <Text style={[styles.successModalSubtitle, { color: C.subtext }]}>
              {createdTournamentResult?.status === 'pending_approval' || createdTournamentResult?.approvalStatus === 'pending'
                ? `"${createdTournamentResult?.name}" has been requested at ${selectedTurf?.name || 'the selected turf'}. The turf owner has been notified and will review your request.`
                : `"${createdTournamentResult?.name}" has been saved.`}
            </Text>

            {/* Pending Approval Notice Pill */}
            {(createdTournamentResult?.status === 'pending_approval' || createdTournamentResult?.approvalStatus === 'pending') && (
              <View style={[styles.pendingNoticePill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Feather name="shield" size={14} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>
                  Awaiting Turf Owner Response
                </Text>
              </View>
            )}

            {createdTournamentResult?.status === 'published' && createdTournamentResult?.shareableUrl ? (
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
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.navigate('TournamentDetail', {
                    tournamentId: createdTournamentResult?.id,
                    id: createdTournamentResult?.id,
                  });
                }}
                activeOpacity={0.85}
              >
                <Feather name="eye" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.nativeShareBtnText}>View Tournament Details</Text>
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
    borderRadius: RADIUS.lg,
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
    padding: 12,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    alignItems: 'center',
  },
  turfPickerThumb: {
    width: 76,
    height: 76,
    borderRadius: RADIUS.md,
    flexShrink: 0,
  },
  turfPickerMiddle: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  turfPickerName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  turfPickerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  turfPickerLocation: {
    fontSize: 12,
    flexShrink: 1,
  },
  turfPickerSportsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportPillSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    maxWidth: '100%',
  },
  sportPillSmText: {
    fontSize: 11,
    fontWeight: '600',
  },
  turfPickerRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 76,
    flexShrink: 0,
  },
  turfPriceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turfPriceText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  continuePrimaryBtn: {
    height: 48,
    borderRadius: RADIUS.lg,
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
  changeTurfBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.lg, borderWidth: 1 },
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
  dateSectionCard: {
    padding: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateCardIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dateCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  dateCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  rowInputs: { flexDirection: 'row', alignItems: 'center' },
  dateButton: {
    height: 46,
    borderRadius: RADIUS.lg,
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
    borderRadius: RADIUS.lg,
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
    borderRadius: RADIUS.lg,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
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
    borderRadius: RADIUS.lg,
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
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftBtnText: { fontSize: 14, fontWeight: '700' },
  publishTournamentBtn: {
    flex: 1.3,
    height: 48,
    borderRadius: RADIUS.lg,
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
  savePlayerBtn: { height: 46, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
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
  nativeShareBtn: { height: 46, borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nativeShareBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  doneSuccessBtn: { height: 46, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  doneSuccessBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  /* ── Interactive Date Picker Modal Styles ── */
  datePickerModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  modalSubtitleText: {
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  datePresetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
    gap: 6,
  },
  datePresetChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePresetChipText: {
    fontSize: 11,
  },
  calendarMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 4,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarWeekLabelCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  calendarDayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    marginVertical: 2,
  },
  calendarDayCellEmpty: {
    width: '14.28%',
    height: 36,
    marginVertical: 2,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  datePickerFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedDateBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  datePickerActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  datePickerCancelBtn: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  datePickerConfirmBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pendingNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
  },
});
