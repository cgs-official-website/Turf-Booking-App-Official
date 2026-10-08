import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, FlatList, ActivityIndicator, Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import { getSportIconComponent } from '../components/SportChip';
import { matchStorage } from '../utils/matchStorage';
import { turfsApi } from '../api/turfs';
import PrimaryButton from '../components/PrimaryButton';

const ALL_SPORTS = ['Cricket', 'Football', 'Badminton', 'Volleyball', 'Basketball', 'Tennis'];

const DEFAULT_STADIUMS = [];

export default function CreateMatchScreen({ route, navigation }) {
  const params = route.params || {};
  const { C, dark } = useTheme();

  const [place, setPlace] = useState(params.venue || params.place || '');
  const [selectedTurf, setSelectedTurf] = useState(null);
  const [turfModal, setTurfModal] = useState(false);
  const [turfsList, setTurfsList] = useState([]);
  const [loadingTurfs, setLoadingTurfs] = useState(false);
  const [turfSearch, setTurfSearch] = useState('');
  const [customVenueInput, setCustomVenueInput] = useState('');

  const [sport, setSport] = useState(params.sport || 'Cricket');
  const [sportModal, setSportModal] = useState(false);
  const [date, setDate] = useState(params.date ? String(params.date) : 'Today');
  const [time, setTime] = useState(params.time || '07:00 PM');
  const [dateModal, setDateModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);

  const DATE_OPTIONS = ['Today', 'Tomorrow', 'This Weekend', 'Next Week'];
  const TIME_OPTIONS = ['06:00 AM', '07:00 AM', '08:00 AM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'];
  const [strangers, setStrangers] = useState(null); // 'yes' | 'no'
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingTurfs(true);
    turfsApi.getTurfs({ limit: 50 })
      .then((res) => {
        const list = res?.items || res?.turfs || res?.data || (Array.isArray(res) ? res : []);
        setTurfsList(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.warn('Failed to load turfs for match:', err);
        setTurfsList([]);
      })
      .finally(() => setLoadingTurfs(false));
  }, []);

  const filteredTurfs = useMemo(() => {
    if (!turfSearch.trim()) return turfsList;
    const q = turfSearch.toLowerCase();
    return turfsList.filter((t) =>
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.address && t.address.toLowerCase().includes(q))
    );
  }, [turfsList, turfSearch]);

  // Only show sports available at the selected turf; fall back to full list if no turf or no sport data
  const availableSports = useMemo(() => {
    if (!selectedTurf) return ALL_SPORTS;
    const turfSports = selectedTurf.sports || selectedTurf.sportTypes;
    if (!Array.isArray(turfSports) || turfSports.length === 0) return ALL_SPORTS;

    // Normalise casing: match against canonical list
    const normalised = turfSports.map((s) => {
      const lower = String(s).trim().toLowerCase();
      return ALL_SPORTS.find((a) => a.toLowerCase() === lower) || s;
    }).filter(Boolean);

    const uniqueList = Array.from(new Set(normalised));
    return uniqueList.length > 0 ? uniqueList : ALL_SPORTS;
  }, [selectedTurf]);

  const canProceed = place.trim().length > 0 && sport && strangers !== null;

  const handleNext = async () => {
    if (!canProceed || saving) return;
    setSaving(true);
    try {
      const match = await matchStorage.createMatch({
        bookingId: params.bookingId || null,
        turfId: selectedTurf?.id || selectedTurf?._id || null,
        place,
        sport,
        date,
        time,
        playWithStrangers: strangers === 'yes',
      });
      navigation.navigate('SelectPlayers', { matchId: match.id });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Create Match Room</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Step progress */}
      <View style={styles.stepsRow}>
        <View style={[styles.stepBar, { backgroundColor: C.primary }]} />
        <View style={[styles.stepBar, { backgroundColor: C.border }]} />
        <View style={[styles.stepBar, { backgroundColor: C.border }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Match Configuration</Text>

        <Text style={[styles.label, { color: C.text }]}>Venue / Stadium</Text>
        <TouchableOpacity
          style={[styles.inputBox, { backgroundColor: C.card, borderColor: place ? C.primary : C.border }]}
          onPress={() => setTurfModal(true)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Feather name="map-pin" size={16} color={C.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.inputText, { color: place ? C.text : C.caption }]} numberOfLines={1}>
              {place || 'Select ground / stadium'}
            </Text>
          </View>
          <Feather name="chevron-down" size={18} color={C.subtext} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: C.text }]}>Sport Category</Text>
        <TouchableOpacity
          style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => setSportModal(true)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
            {getSportIconComponent(sport, 16, C.primary)}
            <Text style={[styles.inputText, { marginLeft: 8, color: C.text }]} numberOfLines={1}>
              {sport || 'Choose sport'}
            </Text>
          </View>
          <Feather name="chevron-down" size={18} color={C.subtext} />
        </TouchableOpacity>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Game Date</Text>
            <TouchableOpacity
              style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => setDateModal(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.inputText, { color: C.text }]} numberOfLines={1}>{date}</Text>
              <Feather name="calendar" size={16} color={C.primary} />
            </TouchableOpacity>
          </View>
          <View style={{ width: SPACING.md }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Match Time</Text>
            <TouchableOpacity
              style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => setTimeModal(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.inputText, { color: C.text }]} numberOfLines={1}>{time}</Text>
              <Feather name="clock" size={16} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Play with strangers */}
        <Text style={[styles.label, { marginTop: SPACING.lg, color: C.text }]}>
          Open to Public Players?
        </Text>
        <Text style={[styles.sublabel, { color: C.subtext }]}>
          Allow other players in your city to request joining this match room
        </Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: strangers === 'yes' ? C.primary : C.card, borderColor: strangers === 'yes' ? C.primary : C.border },
            ]}
            onPress={() => setStrangers('yes')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: strangers === 'yes' ? '#FFFFFF' : C.text }]}>
              Yes, Open Match
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: strangers === 'no' ? C.primary : C.card, borderColor: strangers === 'no' ? C.primary : C.border },
            ]}
            onPress={() => setStrangers('no')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: strangers === 'no' ? '#FFFFFF' : C.text }]}>
              No, Private Squad
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <PrimaryButton
          title="Continue to Select Players →"
          onPress={handleNext}
          loading={saving}
          disabled={!canProceed}
        />
      </View>

      {/* Venue selection modal */}
      <Modal visible={turfModal} transparent animationType="slide" onRequestClose={() => setTurfModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTurfModal(false)}
        >
          <View
            style={[
              styles.turfModalBox,
              { backgroundColor: C.card, borderColor: C.border },
              SHADOW.floating,
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: C.text, marginBottom: 0 }]}>Select Venue / Stadium</Text>
              <TouchableOpacity onPress={() => setTurfModal(false)}>
                <Feather name="x" size={20} color={C.subtext} />
              </TouchableOpacity>
            </View>

            {/* Search ground */}
            <View style={[styles.searchBox, { backgroundColor: dark ? '#18273D' : '#F1F5F9', borderColor: C.border }]}>
              <Feather name="search" size={16} color={C.subtext} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: C.text }]}
                placeholder="Search stadium or city..."
                placeholderTextColor={C.caption}
                value={turfSearch}
                onChangeText={setTurfSearch}
              />
              {turfSearch.length > 0 && (
                <TouchableOpacity onPress={() => setTurfSearch('')}>
                  <Feather name="x-circle" size={16} color={C.subtext} />
                </TouchableOpacity>
              )}
            </View>

            {loadingTurfs ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator color={C.primary} />
                <Text style={{ color: C.subtext, marginTop: 8 }}>Loading available stadiums...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredTurfs}
                keyExtractor={(item) => String(item.id || item._id)}
                style={{ maxHeight: 280 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: C.subtext }}>No stadiums found</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = place === item.name;
                  const loc = item.address || item.city || item.location?.city || '';
                  return (
                    <TouchableOpacity
                      style={[
                        styles.turfOptionRow,
                        {
                          borderBottomColor: C.border,
                          backgroundColor: isSelected ? C.primaryLight : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setPlace(item.name);
                        setSelectedTurf(item);
                        const tSports = item.sports || item.sportTypes || [];
                        if (Array.isArray(tSports) && tSports.length > 0) {
                          const matchedList = tSports.map((s) => {
                            const lower = String(s).trim().toLowerCase();
                            return ALL_SPORTS.find((a) => a.toLowerCase() === lower) || s;
                          }).filter(Boolean);
                          if (matchedList.length > 0 && !matchedList.includes(sport)) {
                            setSport(matchedList[0]);
                          }
                        }
                        setTurfModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.turfRowName, { color: C.text }]}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 6 }}>
                          {!!loc && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Feather name="map-pin" size={12} color={C.subtext} style={{ marginRight: 4 }} />
                              <Text style={[styles.turfRowLoc, { color: C.subtext }]} numberOfLines={1}>{loc}</Text>
                            </View>
                          )}
                          {Array.isArray(item.sports || item.sportTypes) && (item.sports || item.sportTypes).length > 0 && (
                            <Text style={{ fontSize: 11, color: C.primary, fontWeight: '700' }}>
                              • {(item.sports || item.sportTypes).join(', ')}
                            </Text>
                          )}
                        </View>
                      </View>
                      {isSelected ? (
                        <Feather name="check-circle" size={20} color={C.primary} />
                      ) : (
                        <Feather name="chevron-right" size={18} color={C.subtext} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Custom ground input option */}
            <View style={[styles.customGroundWrap, { borderTopColor: C.border }]}>
              <Text style={[styles.customGroundLabel, { color: C.subtext }]}>Or enter custom stadium name:</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <TextInput
                  style={[styles.customGroundInput, { backgroundColor: dark ? '#18273D' : '#F1F5F9', color: C.text, borderColor: C.border }]}
                  placeholder="e.g. City Sports Complex"
                  placeholderTextColor={C.caption}
                  value={customVenueInput}
                  onChangeText={setCustomVenueInput}
                />
                <TouchableOpacity
                  style={[styles.customApplyBtn, { backgroundColor: C.primary, opacity: customVenueInput.trim() ? 1 : 0.5 }]}
                  disabled={!customVenueInput.trim()}
                  onPress={() => {
                    setPlace(customVenueInput.trim());
                    setSelectedTurf(null);
                    setTurfModal(false);
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sport selection modal */}
      <Modal visible={sportModal} transparent animationType="fade" onRequestClose={() => setSportModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSportModal(false)}
        >
          <View style={[styles.modalBox, { backgroundColor: C.card, borderColor: C.border }, SHADOW.floating]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Select Sport</Text>
            {selectedTurf && availableSports.length < ALL_SPORTS.length && (
              <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 6, textAlign: 'center' }}>
                Showing sports available at {place}
              </Text>
            )}
            <FlatList
              data={availableSports}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sportRow, { borderBottomColor: C.border }]}
                  onPress={() => { setSport(item); setSportModal(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.sportIconWrap, { backgroundColor: C.bgSoft }]}>
                      {getSportIconComponent(item, 18, C.primary)}
                    </View>
                    <Text style={[styles.sportRowText, { color: C.text }]}>{item}</Text>
                  </View>
                  {sport === item && <Feather name="check" size={18} color={C.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date selection modal */}
      <Modal visible={dateModal} transparent animationType="fade" onRequestClose={() => setDateModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDateModal(false)}>
          <View style={[styles.modalBox, { backgroundColor: C.card, borderColor: C.border }, SHADOW.floating]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Select Game Date</Text>
            {DATE_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.sportRow, { borderBottomColor: C.border }]}
                onPress={() => { setDate(item); setDateModal(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.sportRowText, { color: C.text }]}>{item}</Text>
                {date === item && <Feather name="check" size={18} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Time selection modal */}
      <Modal visible={timeModal} transparent animationType="fade" onRequestClose={() => setTimeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimeModal(false)}>
          <View style={[styles.modalBox, { backgroundColor: C.card, borderColor: C.border }, SHADOW.floating]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Select Match Time</Text>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(i) => i}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sportRow, { borderBottomColor: C.border }]}
                  onPress={() => { setTime(item); setTimeModal(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sportRowText, { color: C.text }]}>{item}</Text>
                  {time === item && <Feather name="check" size={18} color={C.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...FONT.h2, fontSize: 18, fontWeight: '800' },
  stepsRow:    { flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.lg, marginBottom: 12 },
  stepBar:     { flex: 1, height: 4, borderRadius: 2 },
  sectionTitle:{ ...FONT.h2, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  label:       { fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  sublabel:    { fontSize: 12, marginBottom: 8 },
  inputBox:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 14, height: 50 },
  inputText:   { fontSize: 14, flex: 1 },
  row2:        { flexDirection: 'row', marginTop: 4 },
  toggleRow:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  toggleBtn:   { flex: 1, borderWidth: 1.5, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  toggleText:  { fontWeight: '800', fontSize: 13 },
  footer:      { padding: SPACING.lg, borderTopWidth: 1 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: SPACING.lg },
  modalBox:    { borderRadius: RADIUS.xxl, padding: 20, borderWidth: 1 },
  turfModalBox:{ borderRadius: RADIUS.xxl, padding: 20, borderWidth: 1, maxHeight: '80%' },
  modalHeaderRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle:  { ...FONT.h2, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  turfOptionRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderRadius: RADIUS.sm },
  turfRowName: { fontSize: 15, fontWeight: '800' },
  turfRowLoc:  { fontSize: 12 },
  customGroundWrap:{ marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  customGroundLabel:{ fontSize: 12, fontWeight: '600' },
  customGroundInput:{ flex: 1, height: 42, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, fontSize: 13 },
  customApplyBtn:{ paddingHorizontal: 16, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  sportRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  sportIconWrap:{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sportRowText:{ fontSize: 15, fontWeight: '700' },
});