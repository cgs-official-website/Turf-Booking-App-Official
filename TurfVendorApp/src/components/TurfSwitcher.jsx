import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveTurf } from '../redux/vendorSlice';
import { getImageUrl } from '../api/client';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const STATUS_CONFIG = {
  active: { label: 'ACTIVE', color: '#00C566', bg: 'rgba(0, 197, 102, 0.12)' },
  pending: { label: 'REVIEW', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  rejected: { label: 'REJECTED', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  inactive: { label: 'INACTIVE', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' },
};

const TurfAvatar = ({ turf, size = 46 }) => {
  const { colors } = useTheme();
  const uri = turf?.images?.[0] ? getImageUrl(turf.images[0]) : (turf?.logo ? getImageUrl(turf.logo) : null);

  return uri ? (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: colors.inputBg,
      }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="football" size={size * 0.5} color={colors.primary} />
    </View>
  );
};

const TurfSwitcher = ({ navigation, onBellPress }) => {
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const { turfs, activeTurfId, unreadNotificationCount } = useSelector((s) => s.vendor);
  const { vendor } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);

  const safeTurfs = Array.isArray(turfs) ? turfs : [];
  const activeTurf = safeTurfs.find((t) => (t._id || t.id) === activeTurfId) || safeTurfs[0] || null;

  const handleSelect = (turfId) => {
    dispatch(setActiveTurf(turfId));
    setOpen(false);
  };

  const handleAddTurf = () => {
    setOpen(false);
    navigation.navigate('AddTurf');
  };

  return (
    <>
      {/* Top Switcher Bar */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.headerLeft, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}
          onPress={() => setOpen(true)}
          activeOpacity={0.75}
        >
          <TurfAvatar turf={activeTurf} size={38} />

          <View style={styles.headerText}>
            <View style={styles.turfNameRow}>
              <Text style={[styles.turfName, { color: colors.text }]} numberOfLines={1}>
                {activeTurf?.name || 'My Turf Arena'}
              </Text>
              <Feather name="chevron-down" size={15} color={colors.primary} style={{ marginLeft: 4 }} />
            </View>
            <Text style={[styles.vendorSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {vendor?.name ? `${vendor.name} • Active` : 'Partner Facility'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bell Action Button */}
        <TouchableOpacity
          style={[styles.bellBtn, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}
          onPress={onBellPress}
          activeOpacity={0.75}
        >
          <Feather name="bell" size={19} color={colors.text} />
          {unreadNotificationCount > 0 && (
            <View style={[styles.bellDot, { backgroundColor: colors.error || '#EF4444' }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Switcher Modal Sheet */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheetContainer}>
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.sheet,
                { backgroundColor: colors.card, borderColor: colors.border },
                SHADOWS.md,
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Switch Active Turf</Text>
                  <Text style={[styles.modalSubTitle, { color: colors.textSecondary }]}>
                    Manage schedules and bookings for your arenas
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalBtn}>
                  <Feather name="x" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

              <FlatList
                data={safeTurfs}
                keyExtractor={(t) => String(t._id || t.id || Math.random())}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => {
                  const itemId = item._id || item.id;
                  const isActive = itemId === activeTurfId;
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.active;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.turfItemCard,
                        { backgroundColor: colors.inputBg, borderColor: isActive ? colors.primary : colors.border },
                        isActive && styles.turfItemActive,
                      ]}
                      onPress={() => handleSelect(itemId)}
                      activeOpacity={0.75}
                    >
                      <TurfAvatar turf={item} size={42} />

                      <View style={styles.turfItemInfo}>
                        <Text style={[styles.turfItemName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.turfItemAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.location?.city || item.city || item.address || 'Verified Facility'}
                        </Text>
                      </View>

                      <View style={[styles.statusPill, { backgroundColor: statusConf.bg }]}>
                        <Text style={[styles.statusPillText, { color: statusConf.color }]}>
                          {statusConf.label}
                        </Text>
                      </View>

                      {isActive && (
                        <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                          <Feather name="check" size={13} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={
                  <TouchableOpacity
                    style={[styles.addTurfCard, { borderColor: colors.primary }]}
                    onPress={handleAddTurf}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.addIconCircle, { backgroundColor: colors.primaryLight }]}>
                      <Feather name="plus" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.addTurfText, { color: colors.primary }]}>Register Another Turf</Text>
                  </TouchableOpacity>
                }
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  turfNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  turfName: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    maxWidth: 160,
  },
  vendorSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  sheetContainer: {
    marginTop: 85,
    paddingHorizontal: SIZES.padding,
  },
  sheet: {
    borderRadius: SIZES.radiusLg,
    padding: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: SIZES.base + 1,
    fontWeight: '800',
  },
  modalSubTitle: {
    fontSize: SIZES.xs,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    marginVertical: 14,
  },

  turfItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  turfItemActive: {
    borderWidth: 1.5,
  },
  turfItemInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  turfItemName: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  turfItemAddress: {
    fontSize: 10,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addTurfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 6,
    gap: 8,
  },
  addIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTurfText: {
    fontSize: SIZES.xs,
    fontWeight: '800',
  },
});

export default TurfSwitcher;