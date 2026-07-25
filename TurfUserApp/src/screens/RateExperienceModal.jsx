import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SPACING, RADIUS } from '../utils/theme';
import api from '../api/apiClient'; // ← adjust to your axios wrapper path

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const submitReview = ({ bookingId, turfId, rating, comment }) =>
  api.post('/reviews', { bookingId, turfId, rating, comment }).then((r) => r.data);

export default function RateExperienceModal({ visible, booking, onClose, onSubmitted }) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setRating(0); setComment(''); setLoading(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }
    setLoading(true);
    try {
      await submitReview({
        bookingId: booking._id,
        turfId:    booking.turf?._id || booking.turf,
        rating,
        comment:   comment.trim(),
      });
      reset();
      onSubmitted(booking._id);
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit. Try again.');
    }
  };

  if (!booking) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Rate Your Experience</Text>
          <Text style={styles.subtitle}>
            we'd love to hear how was your game at{'\n'}
            <Text style={styles.turfLink}>{booking.turf?.name || 'this Turf'}</Text>
          </Text>

          <Text style={styles.question}>What would be your turf experience</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starBtn} activeOpacity={0.7}>
                <Icon name={rating >= i ? 'star' : 'star-outline'} size={38} color="#F5C518" />
                <Text style={styles.starLabel}>{STAR_LABELS[i - 1]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter your review"
            placeholderTextColor="#AAAAAA"
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitText}>Submit Review</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  sheet:       { backgroundColor: '#fff', borderRadius: 20, padding: SPACING.xl, width: '100%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
  title:       { fontSize: 24, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 8 },
  subtitle:    { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },
  turfLink:    { color: '#00A86B', fontWeight: '600' },
  question:    { fontSize: 13, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: SPACING.md },
  starsRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg },
  starBtn:     { alignItems: 'center', gap: 5 },
  starLabel:   { fontSize: 10, color: '#666', fontWeight: '500' },
  input:       { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 13, color: '#111', minHeight: 100, marginBottom: SPACING.lg },
  btnRow:      { flexDirection: 'row', gap: SPACING.md },
  cancelBtn:   { flex: 1, borderWidth: 1.5, borderColor: '#00A86B', borderRadius: RADIUS.round, paddingVertical: 14, alignItems: 'center' },
  cancelText:  { color: '#111', fontWeight: '600', fontSize: 14 },
  submitBtn:   { flex: 1.6, backgroundColor: '#00A86B', borderRadius: RADIUS.round, paddingVertical: 14, alignItems: 'center' },
  submitText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});