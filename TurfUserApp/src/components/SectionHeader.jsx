import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import useTheme from '../hooks/useTheme';
import { FONT } from '../utils/theme';

export default function SectionHeader({
  title,
  subtitle,
  actionText = 'See All',
  onActionPress,
  style,
}) {
  const { C } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: C.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: C.subtext }]}>{subtitle}</Text>
        )}
      </View>
      {onActionPress && (
        <TouchableOpacity
          onPress={onActionPress}
          activeOpacity={0.7}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionText, { color: C.primary }]}>{actionText}</Text>
          <Feather name="chevron-right" size={16} color={C.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    ...FONT.h2,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    ...FONT.caption,
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionText: {
    ...FONT.caption,
    fontWeight: '700',
    fontSize: 13,
    marginRight: 2,
  },
});
