import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveTurf } from '../redux/vendorSlice';
import { getImageUrl } from '../api/client';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const STATUS_LABEL = {
  active: 'ACTIVE',
  pending: 'UNDER REVIEW',
  rejected: 'REJECTED',
  inactive: 'INACTIVE',
};

const TurfAvatar = ({ turf, size = 44 }) => {
  const { colors } = useTheme();
  const uri = turf?.images?.[0] ? getImageUrl(turf.images[0]) : null;
  return uri ? (
    <Image
      source={{ uri }}
      style={[
        { backgroundColor: colors.inputBg },
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  ) : (
    <View
      style={[
        { backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' },
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Icon name="image" size={size * 0.45} color={colors.textLight} />
    </View>
  );
};

// Header row (turf avatar + name + vendor name + switcher chevron + bell)
// used at the top of the Home screen, plus the dropdown sheet it opens.
const TurfSwitcher = ({ navigation, onBellPress }) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { turfs, activeTurfId, unreadNotificationCount } = useSelector((s) => s.vendor);
  const { vendor } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);

  const activeTurf = turfs.find((t) => t._id === activeTurfId) || turfs[0] || null;

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
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => setOpen(true)} activeOpacity={0.7}>
          <TurfAvatar turf={activeTurf} />
          <View style={styles.headerText}>
            <View style={styles.turfNameRow}>
              <Text style={styles.turfName} numberOfLines={1}>
                {activeTurf?.name || 'Add your first turf'}
              </Text>
              <Icon name="chevron-down" size={16} color={colors.text} style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.vendorName} numberOfLines={1}>{vendor?.name || ''}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bellBtn} onPress={onBellPress} activeOpacity={0.7}>
          <Icon name="bell" size={20} color={colors.text} />
          {unreadNotificationCount > 0 && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheetWrap}>
            <TouchableOpacity activeOpacity={1} style={[styles.sheet, SHADOWS.md]}>
              <FlatList
                data={turfs}
                keyExtractor={(t) => t._id}
                ItemSeparatorComponent={() => <View style={styles.divider} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => handleSelect(item._id)}
                    activeOpacity={0.7}
                  >
                    <TurfAvatar turf={item} size={40} />
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    {item._id === activeTurfId && (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>{STATUS_LABEL[item.status] || 'ACTIVE'}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  <>
                    {turfs.length > 0 && <View style={styles.divider} />}
                    <TouchableOpacity style={styles.row} onPress={handleAddTurf} activeOpacity={0.7}>
                      <View style={styles.addIconBox}>
                        <Icon name="plus" size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.rowName, { color: colors.primary, fontWeight: '700' }]}>Add New Turf</Text>
                    </TouchableOpacity>
                  </>
                }
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const getStyles = (colors) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, paddingBottom: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  headerText: { marginLeft: 10, flexShrink: 1 },
  turfNameRow: { flexDirection: 'row', alignItems: 'center' },
  turfName: { fontSize: SIZES.base, fontWeight: '700', color: colors.text, maxWidth: 190 },
  vendorName: { fontSize: SIZES.sm, color: colors.textSecondary, marginTop: 1 },
  bellBtn: { padding: 6 },
  bellDot: {
    position: 'absolute', top: 4, right: 6, width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.card,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start' },
  sheetWrap: { marginTop: 90, paddingHorizontal: SIZES.padding },
  sheet: { backgroundColor: colors.card, borderRadius: SIZES.radiusLg, overflow: 'hidden', maxHeight: 360 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  rowName: { fontSize: SIZES.base, color: colors.text, fontWeight: '600', marginLeft: 12, flex: 1 },
  divider: { height: 1, backgroundColor: colors.border },
  activePill: { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activePillText: { fontSize: 10, fontWeight: '700', color: colors.primaryDark, letterSpacing: 0.3 },
  addIconBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default TurfSwitcher;