// @theme-ready ✅
import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookingDetail, acceptBooking, rejectBooking, clearSuccessMessage } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather'; // Changed to standard react-native-vector-icons

const Row = ({ label, value, valueColor, styles }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
  </View>
);

const BookingDetailScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const bookingId = route?.params?.bookingId || route?.params?.id || '';
  const dispatch = useDispatch();
  const { selectedBooking: booking, loading, successMessage } = useSelector((s) => s.vendor);
  const [rejectModal, setRejectModal] = useState(false);
  const [reason, setReason] = useState('');

  // Update Header Colors based on Theme
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      headerTintColor: colors.text,
      headerTitleStyle: {
        color: colors.text,
        fontWeight: '700',
      },
    });
  }, [navigation, colors]);

  useEffect(() => { dispatch(fetchBookingDetail(bookingId)); }, [bookingId]);

  useEffect(() => {
    if (successMessage) {
      dispatch(clearSuccessMessage());
      navigation.goBack();
    }
  }, [successMessage]);

  const handleAccept = () => {
    Alert.alert('Accept Booking', 'Confirm acceptance of this booking?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => dispatch(acceptBooking(bookingId)) },
    ]);
  };

  const handleReject = () => {
    if (!reason.trim()) { Alert.alert('Error', 'Please provide a reason for rejection'); return; }
    dispatch(rejectBooking({ id: bookingId, reason }));
    setRejectModal(false);
  };

  if (!booking || loading) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1, marginTop: 40, backgroundColor: colors.background }} />;
  }

  const STATUS_COLOR = {
    pending:   colors.warning,
    confirmed: colors.success,
    rejected:  colors.error,
    cancelled: colors.textSecondary,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: STATUS_COLOR[booking.status] + '15' }]}>
        <Feather name="info" size={20} color={STATUS_COLOR[booking.status]} style={{ marginRight: 8 }} />
        <Text style={[styles.statusText, { color: STATUS_COLOR[booking.status] }]}>
          Booking {booking.status?.toUpperCase()}
        </Text>
      </View>

      {/* User Info */}
      <View style={[styles.card, SHADOWS.sm]}>
        <View style={styles.cardHeader}>
          <Feather name="user" size={20} color={colors.primary} />
          <Text style={styles.cardTitle}>User Details</Text>
        </View>
        <Row label="Name" value={booking.user?.name} styles={styles} />
        <Row label="Phone" value={booking.user?.phone} styles={styles} />
        <Row label="Email" value={booking.user?.email} styles={styles} />
      </View>

      {/* Booking Info */}
      <View style={[styles.card, SHADOWS.sm]}>
        <View style={styles.cardHeader}>
          <Feather name="file-text" size={20} color={colors.primary} />
          <Text style={styles.cardTitle}>Booking Details</Text>
        </View>
        <Row label="Turf" value={booking.turf?.name} styles={styles} />
        <Row label="Date" value={new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} styles={styles} />
        <Row label="Time" value={`${booking.startTime} – ${booking.endTime}`} styles={styles} />
        <Row label="Duration" value={`${booking.duration || 1} hour(s)`} styles={styles} />
        <Row label="Sport" value={booking.sport || 'Football'} styles={styles} />
      </View>

      {/* Payment Info */}
      <View style={[styles.card, SHADOWS.sm]}>
        <View style={styles.cardHeader}>
          <Feather name="credit-card" size={20} color={colors.primary} />
          <Text style={styles.cardTitle}>Payment</Text>
        </View>
        <Row label="Amount" value={`₹${booking.totalAmount || booking.amount || 800}`} valueColor={colors.success || colors.primary} styles={styles} />
        <Row
          label="Payment Mode"
          value={
            booking.paymentMethod === 'cash' || booking.paymentMode === 'hand_cash'
              ? '💵 Hand Cash (Collect at Ground)'
              : '💳 Online Payment (Paid)'
          }
          styles={styles}
        />
        <Row label="Booking ID" value={(booking.id || booking._id || '').slice(-8).toUpperCase()} styles={styles} />
      </View>

      {/* Actions */}
      {booking.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn, loading && { opacity: 0.7 }]}
            onPress={handleAccept}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={colors.onAccent} /> : (
              <>
                <Feather name="check-circle" size={20} color={colors.onAccent} style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Accept Booking</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setRejectModal(true)}>
            <Feather name="x-circle" size={20} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.rejectBtnText}>Reject Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Modal */}
      <Modal visible={rejectModal} transparent animationType="slide" onRequestClose={() => setRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reason for Rejection</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Turf not available on this date"
              placeholderTextColor={colors.textSecondary}
              multiline numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectModal(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: SIZES.base }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalReject} onPress={handleReject}>
                <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: SIZES.base }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: SIZES.padding, paddingBottom: 40, gap: 16 }, 
  
  statusBanner: { 
    borderRadius: SIZES.radius, 
    padding: 16, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  statusText: { fontSize: SIZES.base + 1, fontWeight: '700', letterSpacing: 0.5 },
  
  card: { 
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radius + 4, 
    padding: 20, 
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { 
    fontSize: SIZES.base + 2, 
    fontWeight: '700', 
    color: colors.text, 
    marginLeft: 10 
  },
  
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  rowLabel: { fontSize: SIZES.sm + 1, color: colors.textSecondary, flex: 1 },
  rowValue: { fontSize: SIZES.sm + 1, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  
  actions: { gap: 12, marginTop: 10 },
  actionBtn: { 
    flexDirection: 'row',
    borderRadius: SIZES.radius, 
    paddingVertical: 16, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  acceptBtn: { backgroundColor: colors.primary },
  rejectBtn: { backgroundColor: colors.error + '15', borderWidth: 1, borderColor: colors.error },
  actionBtnText: { fontSize: SIZES.base, fontWeight: '700', color: colors.onAccent },
  rejectBtnText: { fontSize: SIZES.base, fontWeight: '700', color: colors.error },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { 
    backgroundColor: colors.card || colors.background, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24 
  },
  modalTitle: { fontSize: SIZES.lg, fontWeight: '700', color: colors.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: colors.inputBg || colors.border, 
    borderRadius: SIZES.radius,
    padding: 16, 
    fontSize: SIZES.base, 
    color: colors.text,
    height: 120, 
    textAlignVertical: 'top', 
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 16 },
  modalCancel: { flex: 1, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.inputBg || colors.border },
  modalReject: { flex: 1, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.error },
});

export default BookingDetailScreen;