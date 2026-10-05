// src/components/NearbyTurfsModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Linking,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Geolocation from '@react-native-community/geolocation';

try {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'auto',
    locationProvider: 'playServices',
  });
} catch (_) { }
import useTheme from '../hooks/useTheme';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import { nearbyTurfsApi } from '../api/nearbyTurfsApi';

const { width } = Dimensions.get('window');

export default function NearbyTurfsModal({ visible, onClose, navigation }) {
  const { C, dark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState(null); // 'permission_denied' | 'gps_off' | 'api_error' | null
  const [turfs, setTurfs] = useState([]);
  const [userCoords, setUserCoords] = useState(null);

  /**
   * Request device location permission
   */
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    return true; // iOS handles automatically via Geolocation
  };

  /**
   * Fetch current GPS location and query nearby turfs
   */
  const fetchNearbyTurfs = useCallback(async () => {
    setLoading(true);
    setErrorType(null);
    setTurfs([]);

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setErrorType('permission_denied');
      setLoading(false);
      return;
    }

    const onLocationSuccess = async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        // Call API: GET /api/turfs/nearby?lat=..&lng=..&radius=5
        const res = await nearbyTurfsApi.getNearbyTurfs({
          lat: latitude,
          lng: longitude,
          radius: 5,
        });

        const list = res.data?.turfs || res.turfs || [];
        setTurfs(list);
      } catch (apiErr) {
        console.warn('Nearby turfs API error:', apiErr.message);
        setErrorType('api_error');
      } finally {
        setLoading(false);
      }
    };

    const onLocationFailure = (geoErr) => {
      if (geoErr && geoErr.code === 1) {
        // PERMISSION_DENIED
        setErrorType('permission_denied');
      } else {
        // POSITION_UNAVAILABLE or TIMEOUT (GPS off)
        setErrorType('gps_off');
      }
      setLoading(false);
    };

    // First attempt with high accuracy (GPS).
    // If it times out or position is unavailable, automatically fallback to fused provider
    Geolocation.getCurrentPosition(
      onLocationSuccess,
      (geoErr) => {
        if (geoErr && (geoErr.code === 3 || geoErr.code === 2)) {
          Geolocation.getCurrentPosition(
            onLocationSuccess,
            onLocationFailure,
            {
              enableHighAccuracy: false,
              timeout: 6000,
              maximumAge: 120000,
            }
          );
        } else {
          onLocationFailure(geoErr);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    if (visible) {
      fetchNearbyTurfs();
    }
  }, [visible, fetchNearbyTurfs]);

  const handleOpenSettings = async () => {
    if (Platform.OS === 'android' && errorType === 'gps_off') {
      try {
        await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
        return;
      } catch { }
    }
    Linking.openSettings().catch(() => { });
  };

  const handleCardPress = (turf) => {
    onClose();
    if (navigation) {
      navigation.navigate('TurfDetail', { turfId: turf.id, turf });
    }
  };

  const renderTurfCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{
            uri:
              item.image ||
              'https://images.unsplash.com/photo-1529900245534-5e117b604e5a?auto=format&fit=crop&w=800&q=80',
          }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        <View style={styles.cardBody}>
          {/* Top Row: Name & Distance */}
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.distBadge, { backgroundColor: C.primaryLight }]}>
              <Feather name="navigation" size={10} color={C.primary} style={{ marginRight: 3 }} />
              <Text style={[styles.distText, { color: C.primary }]}>
                {item.distanceText || `${item.distance} km`}
              </Text>
            </View>
          </View>

          {/* Middle Row: Type & City */}
          <View style={styles.cardMetaRow}>
            <View style={[styles.typeBadge, { backgroundColor: dark ? '#1E293B' : '#F1F5F9' }]}>
              <Text style={[styles.typeText, { color: C.subtext }]}>
                {item.type || 'Turf'}
              </Text>
            </View>
            <Text style={[styles.cardCity, { color: C.caption }]} numberOfLines={1}>
              📍 {item.city || item.address || 'Local Ground'}
            </Text>
          </View>

          {/* Bottom Row: Price */}
          <View style={styles.cardPriceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={[styles.priceAmount, { color: C.primary }]}>
                ₹{item.price}
              </Text>
              <Text style={[styles.priceUnit, { color: C.subtext }]}> / hour</Text>
            </View>

            <View style={styles.viewBtn}>
              <Text style={[styles.viewBtnText, { color: C.primary }]}>View</Text>
              <Feather name="chevron-right" size={14} color={C.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: C.bg }]}>
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandleWrap}>
            <View style={[styles.dragHandle, { backgroundColor: C.border }]} />
          </View>

          {/* Sheet Header */}
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>Turfs Near You</Text>
                <View style={[styles.radiusPill, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.radiusPillText, { color: C.primary }]}>Within 5 km</Text>
                </View>
              </View>
              <Text style={[styles.sheetSubtitle, { color: C.subtext }]}>
                Sorted nearest first from your GPS location
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: C.card, borderColor: C.border }]}
              activeOpacity={0.7}
            >
              <Feather name="x" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Content Body */}
          <View style={styles.bodyContainer}>
            {loading ? (
              <View style={styles.centerContainer}>
                <View style={[styles.loadingCircle, { backgroundColor: C.primaryLight }]}>
                  <ActivityIndicator size="large" color={C.primary} />
                </View>
                <Text style={[styles.loadingTitle, { color: C.text }]}>
                  Detecting Location...
                </Text>
                <Text style={[styles.loadingSub, { color: C.subtext }]}>
                  Searching active turfs within 5 km radius
                </Text>
              </View>
            ) : errorType === 'permission_denied' || errorType === 'gps_off' ? (
              <View style={styles.centerContainer}>
                <View style={[styles.errorCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Feather
                    name={errorType === 'gps_off' ? 'crosshair' : 'alert-circle'}
                    size={36}
                    color="#EF4444"
                  />
                </View>
                <Text style={[styles.errorTitle, { color: C.text }]}>
                  {errorType === 'gps_off' ? 'GPS is Turned Off' : 'Location Access Denied'}
                </Text>
                <Text style={[styles.errorSubtitle, { color: C.subtext }]}>
                  {errorType === 'gps_off'
                    ? 'Please enable GPS or Location Services to discover turfs within 5 km of your current position.'
                    : 'Location permission is required to detect nearby turf pitches. Please allow location access in your device settings.'}
                </Text>

                <TouchableOpacity
                  style={[styles.settingsBtn, { backgroundColor: C.primary }]}
                  onPress={handleOpenSettings}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={errorType === 'gps_off' ? 'navigation' : 'settings'}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.settingsBtnText}>
                    {errorType === 'gps_off' ? 'Turn On Location' : 'Open Settings'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.retryBtn, { borderColor: C.border }]}
                  onPress={fetchNearbyTurfs}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.retryBtnText, { color: C.text }]}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : turfs.length === 0 ? (
              <View style={styles.centerContainer}>
                <View style={[styles.emptyCircle, { backgroundColor: C.card, borderColor: C.border }]}>
                  <Feather name="map-pin" size={40} color={C.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.text }]}>
                  No turfs found within 5 km
                </Text>
                <Text style={[styles.emptySubtitle, { color: C.subtext }]}>
                  We could not find any available pitches within 5 km of your current spot. You can explore all available venues across the city.
                </Text>

                <View style={styles.emptyActionRow}>
                  <TouchableOpacity
                    style={[styles.browseAllBtn, { backgroundColor: C.primary }]}
                    onPress={() => {
                      onClose();
                      if (navigation) navigation.navigate('Explore');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.browseAllText}>Browse All Turfs</Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.emptyRetryBtn, { borderColor: C.border }]}
                    onPress={fetchNearbyTurfs}
                    activeOpacity={0.7}
                  >
                    <Feather name="refresh-cw" size={14} color={C.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.emptyRetryText, { color: C.text }]}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <FlatList
                data={turfs}
                keyExtractor={(item) => item.id}
                renderItem={renderTurfCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: RADIUS.xl || 24,
    borderTopRightRadius: RADIUS.xl || 24,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg || 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: FONT.sizes?.lg || 18,
    fontWeight: '700',
  },
  radiusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  radiusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: FONT.sizes?.xs || 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bodyContainer: {
    minHeight: 320,
    paddingHorizontal: SPACING.md || 14,
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 10,
  },
  cardImage: {
    width: 95,
    height: 95,
    borderRadius: RADIUS.md || 12,
    backgroundColor: '#E2E8F0',
  },
  cardBody: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: FONT.sizes?.md || 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  distText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardCity: {
    fontSize: 12,
    flex: 1,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceAmount: {
    fontSize: FONT.sizes?.md || 16,
    fontWeight: '800',
  },
  priceUnit: {
    fontSize: 12,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  centerContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  loadingSub: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.md || 12,
    marginBottom: 10,
  },
  settingsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: RADIUS.md || 12,
  },
  browseAllText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: RADIUS.md || 12,
    borderWidth: 1,
  },
  emptyRetryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
