import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SPACING, RADIUS } from '../utils/theme';
import useTheme from '../hooks/useTheme';

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function RateReviewModal({ visible, turfName, onCancel, onClose, onSubmit }) {
  const { C } = useTheme();
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setRating(0); setComment(''); };

  const handleCancel = () => {
    reset();
    if (typeof onCancel === 'function') onCancel();
    if (typeof onClose === 'function') onClose();
  };

  const handleSubmit = async () => {
    if (!rating) return; // require a star rating
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.card, { backgroundColor: C.card }]}
            >
              <Text style={[styles.title, { color: C.text }]}>Rate Your Experience</Text>
              <Text style={[styles.subtitle, { color: C.subtext }]}>
                we'd love to hear how was your game{'\n'}at{' '}
                <Text style={{ color: C.primary, fontWeight: '700' }}>{turfName}</Text>
              </Text>

              <Text style={[styles.question, { color: C.text }]}>
                What would be your turf experience
              </Text>

              <View style={styles.starRow}>
                {RATING_LABELS.map((label, i) => {
                  const value = i + 1;
                  const active = value <= rating;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={styles.starItem}
                      onPress={() => setRating(value)}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name={active ? 'star' : 'star-outline'}
                        size={30}
                        color="#F7C948"
                      />
                      <Text style={[styles.starLabel, { color: C.subtext }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[styles.input, { borderColor: C.border, color: C.text }]}
                placeholder="Enter your review"
                placeholderTextColor={C.subtext}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn, { borderColor: C.primary }]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.cancelText, { color: C.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.submitBtn, { backgroundColor: C.primary, opacity: rating ? 1 : 0.5 }]}
                  onPress={handleSubmit}
                  disabled={!rating || submitting}
                >
                  <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  card: {
    width: '100%', borderRadius: RADIUS.xl, padding: SPACING.xl,
  },
  title:     { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle:  { fontSize: 14, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 20 },
  question:  { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: SPACING.xl },
  starRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
  starItem:  { alignItems: 'center', flex: 1 },
  starLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md,
    marginTop: SPACING.xl, minHeight: 100, fontSize: 14,
  },
  btnRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  btn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center' },
  cancelBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
  cancelText: { fontWeight: '700', fontSize: 15 },
  submitBtn: {},
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});