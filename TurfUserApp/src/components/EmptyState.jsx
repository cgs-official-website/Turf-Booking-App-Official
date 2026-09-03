import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import useTheme from '../hooks/useTheme';
import PrimaryButton from './PrimaryButton';
import { RADIUS, FONT } from '../utils/theme';

export default function EmptyState({
  icon = 'inbox',
  title = 'No items found',
  description = 'There are no records available to display at this time.',
  actionText,
  onActionPress,
  style,
}) {
  const { C, dark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: dark ? '#132032' : 'rgba(12, 176, 83, 0.1)',
            borderColor: dark ? '#223249' : 'rgba(12, 176, 83, 0.2)',
          },
        ]}
      >
        <Feather name={icon} size={32} color={C.primary} />
      </View>
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.description, { color: C.subtext }]}>{description}</Text>
      {actionText && onActionPress && (
        <PrimaryButton
          title={actionText}
          onPress={onActionPress}
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...FONT.h3,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    ...FONT.body,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  actionButton: {
    marginTop: 20,
    minWidth: 160,
    height: 46,
  },
});
