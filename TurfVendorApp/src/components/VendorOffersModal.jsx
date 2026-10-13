import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  getTurfOffersApi,
  createTurfOfferApi,
  updateTurfOfferApi,
  toggleTurfOfferStatusApi,
  deleteTurfOfferApi,
} from '../api';
import { getImageUrl } from '../api/client';
import { SIZES, SHADOWS, RADIUS as THEME_RADIUS } from '../utils/theme';

const RADIUS = THEME_RADIUS || {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 9999,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WEEKDAY_OPTIONS = [
  { id: 1, label: 'Mon', name: 'Monday' },
  { id: 2, label: 'Tue', name: 'Tuesday' },
  { id: 3, label: 'Wed', name: 'Wednesday' },
  { id: 4, label: 'Thu', name: 'Thursday' },
  { id: 5, label: 'Fri', name: 'Friday' },
  { id: 6, label: 'Sat', name: 'Saturday' },
  { id: 0, label: 'Sun', name: 'Sunday' },
];

const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function VendorOffersModal({
  visible,
  onClose,
  activeTurf,
  availableSlots = [],
  currentDateStr,
  colors = {},
  onOffersChanged,
}) {
  const turfId = activeTurf?._id || activeTurf?.id;
  const regularRate = Number(activeTurf?.pricePerHour || activeTurf?.price || 500);

  // Offers list state
  const [offers, setOffers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, scheduled: 0, paused: 0, expired: 0 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'all' | 'create'

  // Editing state (null = creating new)
  const [editingOffer, setEditingOffer] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState('20');
  const [scope, setScope] = useState('date_range'); // 'slot' | 'day' | 'weekdays' | 'date_range'
  const [startDate, setStartDate] = useState(currentDateStr || toDateStr(new Date()));
  const [endDate, setEndDate] = useState(currentDateStr || toDateStr(new Date()));
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedWeekdays, setSelectedWeekdays] = useState([1, 2, 3, 4, 5]); // Default Mon-Fri
  const [bannerUri, setBannerUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch offers
  const loadOffers = async () => {
    if (!turfId) return;
    setLoading(true);
    try {
      const res = await getTurfOffersApi(turfId);
      const data = res?.data || res || {};
      const list = data.offers || [];
      setOffers(list);
      setSummary(data.summary || {
        total: list.length,
        active: list.filter((o) => o.dynamicStatus === 'active').length,
        scheduled: list.filter((o) => o.dynamicStatus === 'scheduled').length,
        paused: list.filter((o) => o.dynamicStatus === 'paused').length,
        expired: list.filter((o) => o.dynamicStatus === 'expired').length,
      });
      if (onOffersChanged) onOffersChanged(list);
    } catch (err) {
      console.warn('Failed to load turf offers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && turfId) {
      loadOffers();
    }
  }, [visible, turfId]);

  // Reset form
  const resetForm = () => {
    setEditingOffer(null);
    setTitle('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('20');
    setScope('date_range');
    const today = currentDateStr || toDateStr(new Date());
    setStartDate(today);
    setEndDate(today);
    setSelectedSlots([]);
    setSelectedWeekdays([1, 2, 3, 4, 5]);
    setBannerUri(null);
  };

  // Populate form for editing
  const handleStartEdit = (offer) => {
    setEditingOffer(offer);
    setTitle(offer.title || '');
    setDescription(offer.description || '');
    setDiscountType(offer.discountType || 'percentage');
    setDiscountValue(String(offer.discountValue || ''));
    setScope(offer.scope || 'date_range');
    setStartDate(offer.startDate || currentDateStr || toDateStr(new Date()));
    setEndDate(offer.endDate || currentDateStr || toDateStr(new Date()));
    setSelectedSlots(Array.isArray(offer.applicableSlots) ? offer.applicableSlots : []);
    setSelectedWeekdays(Array.isArray(offer.weekdays) ? offer.weekdays : [1, 2, 3, 4, 5]);
    setBannerUri(offer.bannerUrl ? getImageUrl(offer.bannerUrl) : null);
    setActiveTab('create');
  };

  // Image Picker
  const handlePickBanner = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.85, selectionLimit: 1 },
      (res) => {
        if (res.didCancel || res.errorCode) return;
        if (res.assets?.length) {
          setBannerUri(res.assets[0].uri);
        }
      }
    );
  };

  // Toggle slot selection for 'slot' scope
  const toggleSlotSelection = (slotKey) => {
    setSelectedSlots((prev) =>
      prev.includes(slotKey) ? prev.filter((s) => s !== slotKey) : [...prev, slotKey]
    );
  };

  // Toggle weekday selection for 'weekdays' scope
  const toggleWeekdaySelection = (dayId) => {
    setSelectedWeekdays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  // Live calculations for preview
  const preview = useMemo(() => {
    const val = Number(discountValue) || 0;
    let finalHourlyPrice = regularRate;
    let savingsPerHour = 0;
    let percentageOff = 0;

    if (discountType === 'percentage') {
      percentageOff = Math.min(99, Math.max(1, Math.round(val)));
      finalHourlyPrice = Math.max(1, Math.round((regularRate * (100 - percentageOff)) / 100));
      savingsPerHour = regularRate - finalHourlyPrice;
    } else {
      finalHourlyPrice = Math.max(1, Math.round(val));
      savingsPerHour = Math.max(0, regularRate - finalHourlyPrice);
      percentageOff = regularRate > 0 ? Math.round((savingsPerHour / regularRate) * 100) : 0;
    }

    return {
      regularRate,
      finalHourlyPrice,
      savingsPerHour,
      percentageOff,
    };
  }, [regularRate, discountType, discountValue]);

  // Save / Update Offer
  const handleSaveOffer = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length < 3) {
      Alert.alert('Title Required', 'Please enter a clear title of at least 3 characters.');
      return;
    }

    const numVal = Number(discountValue);
    if (!Number.isFinite(numVal) || numVal <= 0) {
      Alert.alert('Invalid Discount', 'Please enter a discount value greater than 0.');
      return;
    }

    if (discountType === 'percentage' && (numVal < 1 || numVal > 99)) {
      Alert.alert('Invalid Percentage', 'Percentage discount must be between 1% and 99%.');
      return;
    }

    if (discountType === 'fixed' && numVal >= regularRate) {
      Alert.alert(
        'Invalid Fixed Price',
        `Fixed offer price (₹${numVal}/hr) must be strictly less than the regular price (₹${regularRate}/hr).`
      );
      return;
    }

    const cleanStartDate = (startDate || '').trim();
    const isSingleDateScope = scope === 'day' || scope === 'slot';
    const effectiveEndDate = isSingleDateScope ? cleanStartDate : (endDate || '').trim();

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(cleanStartDate)) {
      Alert.alert('Invalid Date Format', 'Please enter start date in YYYY-MM-DD format (e.g. 2026-10-15).');
      return;
    }

    if (!isSingleDateScope) {
      if (!dateRegex.test(effectiveEndDate)) {
        Alert.alert('Invalid Date Format', 'Please enter end date in YYYY-MM-DD format (e.g. 2026-10-22).');
        return;
      }
      if (cleanStartDate > effectiveEndDate) {
        Alert.alert('Invalid Dates', 'Start date cannot be after end date.');
        return;
      }
    }

    if (scope === 'slot' && selectedSlots.length === 0) {
      Alert.alert('Slot Required', 'Please select at least one time slot for this offer.');
      return;
    }

    if (scope === 'weekdays' && selectedWeekdays.length === 0) {
      Alert.alert('Weekday Required', 'Please select at least one weekday.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: cleanTitle,
        description: description.trim(),
        discountType,
        discountValue: numVal,
        scope,
        startDate: cleanStartDate,
        endDate: effectiveEndDate,
        applicableSlots: scope === 'slot' ? selectedSlots : [],
        weekdays: scope === 'weekdays' ? selectedWeekdays : [],
        bannerUri,
      };

      if (editingOffer) {
        await updateTurfOfferApi(turfId, editingOffer.id, payload);
        Alert.alert('Success', 'Offer updated successfully.');
      } else {
        await createTurfOfferApi(turfId, payload);
        Alert.alert('Success', 'New offer created and activated.');
      }

      resetForm();
      setActiveTab('active');
      await loadOffers();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save offer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Pause / Resume
  const handleToggleStatus = async (offer) => {
    try {
      const targetStatus = offer.status === 'active' ? 'paused' : 'active';
      await toggleTurfOfferStatusApi(turfId, offer.id, targetStatus);
      await loadOffers();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update offer status.');
    }
  };

  // Delete Offer
  const handleDeleteOffer = (offer) => {
    Alert.alert(
      'Delete Offer',
      `Are you sure you want to permanently delete "${offer.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTurfOfferApi(turfId, offer.id);
              await loadOffers();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete offer.');
            }
          },
        },
      ]
    );
  };

  // Filtered offers by active tab
  const displayedOffers = useMemo(() => {
    if (activeTab === 'active') {
      return offers.filter((o) => o.dynamicStatus === 'active');
    }
    return offers;
  }, [offers, activeTab]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background || '#0B132B' }]}>
        {/* Top Header Bar */}
        <View style={[styles.header, { borderBottomColor: colors.border || '#1E293B' }]}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="tag" size={18} color={colors.primary || '#0F766E'} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: colors.text || '#FFFFFF' }]}>Offers & Discounts</Text>
            </View>
            <Text style={[styles.headerSub, { color: colors.textSecondary || '#94A3B8' }]}>
              {activeTurf?.name || 'Your Turf'} • Base: ₹{regularRate}/hr
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.text || '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border || '#1E293B' }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'active' && { borderBottomColor: colors.primary || '#0F766E' }]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'active' ? colors.primary || '#0F766E' : colors.textSecondary || '#94A3B8' },
              ]}
            >
              Active ({summary.active})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'all' && { borderBottomColor: colors.primary || '#0F766E' }]}
            onPress={() => setActiveTab('all')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'all' ? colors.primary || '#0F766E' : colors.textSecondary || '#94A3B8' },
              ]}
            >
              All ({summary.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              styles.createTabItem,
              activeTab === 'create' && { borderBottomColor: colors.primary || '#0F766E' },
            ]}
            onPress={() => {
              if (activeTab !== 'create') resetForm();
              setActiveTab('create');
            }}
          >
            <Feather
              name={editingOffer ? 'edit-2' : 'plus'}
              size={14}
              color={activeTab === 'create' ? colors.primary || '#0F766E' : colors.textSecondary || '#94A3B8'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'create' ? colors.primary || '#0F766E' : colors.textSecondary || '#94A3B8' },
              ]}
            >
              {editingOffer ? 'Edit Offer' : 'Create Offer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'create' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Offer Title & Description */}
            <Text style={[styles.sectionTitle, { color: colors.text || '#FFFFFF' }]}>Offer Details</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary || '#94A3B8' }]}>Title *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card || '#131E2F', borderColor: colors.border || '#1E293B', color: colors.text || '#FFFFFF' },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekend Night Blitz, Monsoon Special"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary || '#94A3B8', marginTop: 12 }]}>
              Short Description (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.card || '#131E2F', borderColor: colors.border || '#1E293B', color: colors.text || '#FFFFFF' },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Flat 30% off for all evening slots after 6 PM"
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={2}
            />

            {/* Discount Type & Value */}
            <Text style={[styles.sectionTitle, { color: colors.text || '#FFFFFF', marginTop: 20 }]}>Discount Type & Value</Text>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  discountType === 'percentage' && { backgroundColor: colors.primary || '#0F766E' },
                ]}
                onPress={() => setDiscountType('percentage')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    discountType === 'percentage' && { color: '#FFFFFF', fontWeight: '800' },
                  ]}
                >
                  Percentage (%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  discountType === 'fixed' && { backgroundColor: colors.primary || '#0F766E' },
                ]}
                onPress={() => setDiscountType('fixed')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    discountType === 'fixed' && { color: '#FFFFFF', fontWeight: '800' },
                  ]}
                >
                  Fixed Price (₹/hr)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.valueRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary || '#94A3B8' }]}>
                  {discountType === 'percentage' ? 'Discount Percentage (1-99%)' : `Offer Hourly Price (Must be < ₹${regularRate})`}
                </Text>
                <View
                  style={[
                    styles.valueInputWrap,
                    { backgroundColor: colors.card || '#131E2F', borderColor: colors.border || '#1E293B' },
                  ]}
                >
                  <Text style={[styles.valuePrefix, { color: colors.primary || '#0F766E' }]}>
                    {discountType === 'percentage' ? '%' : '₹'}
                  </Text>
                  <TextInput
                    style={[styles.valueTextInput, { color: colors.text || '#FFFFFF' }]}
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    keyboardType="numeric"
                    placeholder={discountType === 'percentage' ? '20' : '400'}
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>
            </View>

            {/* Live Pricing Preview Card */}
            <View
              style={[
                styles.previewCard,
                { backgroundColor: colors.card || '#131E2F', borderColor: colors.primary || '#0F766E' },
              ]}
            >
              <View style={styles.previewHeaderRow}>
                <Feather name="eye" size={14} color={colors.primary || '#0F766E'} style={{ marginRight: 6 }} />
                <Text style={[styles.previewHeading, { color: colors.primary || '#0F766E' }]}>Pricing Preview</Text>
              </View>
              <View style={styles.previewGrid}>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Regular Price</Text>
                  <Text style={[styles.previewValue, { color: colors.textSecondary || '#94A3B8', textDecorationLine: 'line-through' }]}>
                    ₹{preview.regularRate}/hr
                  </Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Offer Price</Text>
                  <Text style={[styles.previewValue, { color: colors.success || '#10B981', fontWeight: '800' }]}>
                    ₹{preview.finalHourlyPrice}/hr
                  </Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Customer Saves</Text>
                  <Text style={[styles.previewValue, { color: colors.warning || '#F59E0B' }]}>
                    ₹{preview.savingsPerHour}/hr ({preview.percentageOff}% off)
                  </Text>
                </View>
              </View>
            </View>

            {/* Scope Selection */}
            <Text style={[styles.sectionTitle, { color: colors.text || '#FFFFFF', marginTop: 20 }]}>Applicable Scope</Text>
            <View style={styles.scopeGrid}>
              {[
                { id: 'date_range', label: 'Entire Date Range', icon: 'calendar', desc: 'Applies to all slots in date range' },
                { id: 'day', label: 'Single Day', icon: 'sun', desc: 'Applies to all slots on specific date' },
                { id: 'weekdays', label: 'Selected Weekdays', icon: 'check-square', desc: 'e.g. Mon-Fri or weekends' },
                { id: 'slot', label: 'Specific Time Slots', icon: 'clock', desc: 'Select individual slots' },
              ].map((s) => {
                const isSelected = scope === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.scopeOption,
                      { backgroundColor: colors.card || '#131E2F', borderColor: isSelected ? colors.primary || '#0F766E' : colors.border || '#1E293B' },
                      isSelected && styles.scopeOptionActive,
                    ]}
                    onPress={() => {
                      setScope(s.id);
                      if (s.id === 'day' || s.id === 'slot') {
                        setEndDate(startDate);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Feather
                        name={s.icon}
                        size={15}
                        color={isSelected ? colors.primary || '#0F766E' : colors.textSecondary || '#94A3B8'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.scopeTitle,
                          { color: isSelected ? colors.primary || '#0F766E' : colors.text || '#FFFFFF' },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </View>
                    <Text style={[styles.scopeDesc, { color: colors.textSecondary || '#94A3B8' }]}>{s.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date Pickers */}
            <Text style={[styles.sectionTitle, { color: colors.text || '#FFFFFF', marginTop: 20 }]}>Validity Period</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1, marginRight: (scope === 'day' || scope === 'slot') ? 0 : 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary || '#94A3B8' }]}>
                  {scope === 'day'
                    ? 'Offer Date (YYYY-MM-DD)'
                    : scope === 'slot'
                    ? 'Date for Slots (YYYY-MM-DD)'
                    : 'Start Date (YYYY-MM-DD)'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.card || '#131E2F', borderColor: colors.border || '#1E293B', color: colors.text || '#FFFFFF' },
                  ]}
                  value={startDate}
                  onChangeText={(val) => {
                    setStartDate(val);
                    if (scope === 'day' || scope === 'slot') {
                      setEndDate(val);
                    }
                  }}
                  placeholder="2026-10-15"
                  placeholderTextColor="#64748B"
                />
              </View>
              {scope !== 'day' && scope !== 'slot' && (
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary || '#94A3B8' }]}>End Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.card || '#131E2F', borderColor: colors.border || '#1E293B', color: colors.text || '#FFFFFF' },
                    ]}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="2026-10-22"
                    placeholderTextColor="#64748B"
                  />
                </View>
              )}
            </View>

            {/* Scope = Weekdays selector */}
            {scope === 'weekdays' && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary || '#94A3B8' }]}>Select Applicable Days</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAY_OPTIONS.map((w) => {
                    const isSelected = selectedWeekdays.includes(w.id);
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={[
                          styles.weekdayChip,
                          {
                            backgroundColor: isSelected ? colors.primary || '#0F766E' : colors.card || '#131E2F',
                            borderColor: isSelected ? colors.primary || '#0F766E' : colors.border || '#1E293B',
                          },
                        ]}
                        onPress={() => toggleWeekdaySelection(w.id)}
                      >
                        <Text style={[styles.weekdayText, { color: isSelected ? '#FFFFFF' : colors.text || '#FFFFFF' }]}>
                          {w.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Scope = Specific Slot selector */}
            {scope === 'slot' && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary || '#94A3B8' }]}>
                  Select Slots for {startDate} ({selectedSlots.length} selected)
                </Text>
                {availableSlots.length > 0 ? (
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((s) => {
                      const slotKey = s.slotKey || `${s.startTime}-${s.endTime}`;
                      const isSelected = selectedSlots.includes(slotKey) || selectedSlots.includes(s.startTime);
                      return (
                        <TouchableOpacity
                          key={slotKey}
                          style={[
                            styles.slotChip,
                            {
                              backgroundColor: isSelected ? colors.primary || '#0F766E' : colors.card || '#131E2F',
                              borderColor: isSelected ? colors.primary || '#0F766E' : colors.border || '#1E293B',
                            },
                          ]}
                          onPress={() => toggleSlotSelection(slotKey)}
                        >
                          <Text style={[styles.slotChipText, { color: isSelected ? '#FFFFFF' : colors.text || '#FFFFFF' }]}>
                            {s.startTime || s.start}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.hintText, { color: colors.textSecondary || '#94A3B8' }]}>
                    No slots loaded. You can also specify common slots by comma (e.g. 18:00-19:00, 19:00-20:00).
                  </Text>
                )}
              </View>
            )}

            {/* Banner Image Upload */}
            <Text style={[styles.sectionTitle, { color: colors.text || '#FFFFFF', marginTop: 20 }]}>
              Banner Image (Optional)
            </Text>
            <TouchableOpacity
              style={[
                styles.bannerPicker,
                { backgroundColor: colors.card || '#131E2F', borderColor: colors.border || '#1E293B' },
              ]}
              onPress={handlePickBanner}
              activeOpacity={0.8}
            >
              {bannerUri ? (
                <View style={styles.bannerPreviewWrap}>
                  <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" />
                  <View style={styles.changeBannerOverlay}>
                    <Feather name="camera" size={16} color="#FFFFFF" />
                    <Text style={styles.changeBannerText}>Change Banner</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Feather name="image" size={28} color={colors.primary || '#0F766E'} />
                  <Text style={[styles.bannerPickerTitle, { color: colors.text || '#FFFFFF' }]}>
                    Upload Offer Banner (16:9 Recommended)
                  </Text>
                  <Text style={[styles.bannerPickerSub, { color: colors.textSecondary || '#94A3B8' }]}>
                    If none provided, a polished default banner will be displayed automatically.
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Submit Action */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary || '#0F766E' },
                submitting && { opacity: 0.7 },
              ]}
              onPress={handleSaveOffer}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>{editingOffer ? 'Update Offer' : 'Publish Offer'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* Offers List Tab */
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listScroll}
          >
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary || '#0F766E'} />
                <Text style={[styles.loadingText, { color: colors.textSecondary || '#94A3B8' }]}>
                  Loading offers...
                </Text>
              </View>
            ) : displayedOffers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="tag" size={42} color="#64748B" style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: colors.text || '#FFFFFF' }]}>
                  {activeTab === 'active' ? 'No Active Offers Right Now' : 'No Offers Created Yet'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary || '#94A3B8' }]}>
                  Create an offer to attract players with discounted weekday, evening, or slot pricing.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyCreateBtn, { backgroundColor: colors.primary || '#0F766E' }]}
                  onPress={() => {
                    resetForm();
                    setActiveTab('create');
                  }}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyCreateBtnText}>Create Your First Offer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              displayedOffers.map((item) => {
                const isPaused = item.status === 'paused';
                const dynamicStatus = item.dynamicStatus;
                const bannerSrc = item.bannerUrl ? getImageUrl(item.bannerUrl) : null;

                const statusColor =
                  dynamicStatus === 'active'
                    ? '#10B981'
                    : dynamicStatus === 'scheduled'
                    ? '#3B82F6'
                    : dynamicStatus === 'paused'
                    ? '#F59E0B'
                    : '#94A3B8';

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.offerCard,
                      {
                        backgroundColor: colors.card || '#131E2F',
                        borderColor: dynamicStatus === 'active' ? colors.primary || '#0F766E' : colors.border || '#1E293B',
                      },
                      SHADOWS.sm,
                    ]}
                  >
                    {/* Banner or Default Header */}
                    {bannerSrc ? (
                      <View style={styles.cardBannerWrap}>
                        <Image source={{ uri: bannerSrc }} style={styles.cardBannerImg} resizeMode="cover" />
                        <View style={styles.bannerBadgeOverlay}>
                          <Text style={styles.bannerBadgeText}>
                            {item.discountType === 'percentage'
                              ? `${Math.round(item.discountValue)}% OFF`
                              : `₹${Math.round(item.discountValue)}/hr`}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.defaultBanner, { backgroundColor: colors.primary || '#0F766E' }]}>
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>
                            {item.discountType === 'percentage'
                              ? `${Math.round(item.discountValue)}% OFF`
                              : `₹${Math.round(item.discountValue)}/hr`}
                          </Text>
                        </View>
                        <Text style={styles.defaultBannerTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>
                    )}

                    {/* Card Content */}
                    <View style={styles.cardBody}>
                      <View style={styles.cardTopRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.cardTitle, { color: colors.text || '#FFFFFF' }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {!!item.description && (
                            <Text style={[styles.cardDesc, { color: colors.textSecondary || '#94A3B8' }]} numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
                          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {dynamicStatus.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Scope & Date Range Pills */}
                      <View style={styles.metaRow}>
                        <View style={[styles.metaPill, { backgroundColor: colors.background || '#0B132B' }]}>
                          <Feather name="calendar" size={12} color={colors.primary || '#0F766E'} style={{ marginRight: 4 }} />
                          <Text style={[styles.metaText, { color: colors.textSecondary || '#94A3B8' }]}>
                            {item.startDate} → {item.endDate}
                          </Text>
                        </View>

                        <View style={[styles.metaPill, { backgroundColor: colors.background || '#0B132B' }]}>
                          <Feather name="tag" size={12} color={colors.primary || '#0F766E'} style={{ marginRight: 4 }} />
                          <Text style={[styles.metaText, { color: colors.textSecondary || '#94A3B8' }]}>
                            {item.scope === 'date_range'
                              ? 'Date Range'
                              : item.scope === 'day'
                              ? 'Single Day'
                              : item.scope === 'weekdays'
                              ? 'Weekdays'
                              : `${item.applicableSlots?.length || 0} Slots`}
                          </Text>
                        </View>
                      </View>

                      {/* Actions: Pause/Resume, Edit, Delete */}
                      <View style={[styles.cardActions, { borderTopColor: colors.border || '#1E293B' }]}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: colors.border || '#1E293B' }]}
                          onPress={() => handleToggleStatus(item)}
                          activeOpacity={0.7}
                        >
                          <Feather
                            name={isPaused ? 'play' : 'pause'}
                            size={14}
                            color={isPaused ? colors.success || '#10B981' : colors.warning || '#F59E0B'}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.actionBtnText,
                              { color: isPaused ? colors.success || '#10B981' : colors.warning || '#F59E0B' },
                            ]}
                          >
                            {isPaused ? 'Resume' : 'Pause'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: colors.border || '#1E293B' }]}
                          onPress={() => handleStartEdit(item)}
                          activeOpacity={0.7}
                        >
                          <Feather name="edit-2" size={14} color={colors.primary || '#0F766E'} style={{ marginRight: 6 }} />
                          <Text style={[styles.actionBtnText, { color: colors.primary || '#0F766E' }]}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: colors.border || '#1E293B' }]}
                          onPress={() => handleDeleteOffer(item)}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  createTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    marginRight: 0,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  formScroll: {
    padding: 16,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
  },
  textArea: {
    height: 68,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  segmentedRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.md || 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  valueRow: {
    marginBottom: 14,
  },
  valueInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  valuePrefix: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  valueTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    height: 48,
  },
  previewCard: {
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewHeading: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  previewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewItem: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  scopeGrid: {
    gap: 8,
  },
  scopeOption: {
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  scopeOptionActive: {
    borderWidth: 1.5,
  },
  scopeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  scopeDesc: {
    fontSize: 11,
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  weekdayChip: {
    borderRadius: RADIUS.sm || 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  slotChip: {
    borderRadius: RADIUS.sm || 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  slotChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  bannerPicker: {
    borderRadius: RADIUS.md || 10,
    borderWidth: 1,
    overflow: 'hidden',
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bannerPickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  bannerPickerSub: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  bannerPreviewWrap: {
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  changeBannerOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm || 6,
  },
  changeBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  saveBtn: {
    height: 50,
    borderRadius: RADIUS.lg || 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADIUS.md || 10,
    marginTop: 20,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  offerCard: {
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardBannerWrap: {
    height: 120,
    width: '100%',
  },
  cardBannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerBadgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm || 6,
  },
  bannerBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  defaultBanner: {
    height: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm || 6,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  defaultBannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  cardBody: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm || 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm || 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm || 6,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
