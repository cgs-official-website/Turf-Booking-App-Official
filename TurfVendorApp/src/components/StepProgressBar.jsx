import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GREEN = '#1E9E4E';
const GRAY = '#D9DEDA';

/**
 * step: current step number (1-indexed)
 * total: total steps
 */
export default function StepProgressBar({ step, total }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Step {step} out of {total}</Text>
      <View style={styles.barRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < step ? GREEN : GRAY },
              i !== total - 1 && { marginRight: 6 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  barRow: { flexDirection: 'row' },
  segment: { flex: 1, height: 4, borderRadius: 2 },
});