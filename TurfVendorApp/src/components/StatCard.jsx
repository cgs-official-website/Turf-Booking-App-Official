import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

// `icon` is now a Feather icon name (e.g. "calendar"), not an emoji.
const StatCard = ({ title, value, icon, color, subtitle }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const accentColor = color || colors.primary;

  return (
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={[styles.iconBox, { backgroundColor: accentColor + '1A' }]}>
        <Icon name={icon} size={20} color={accentColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    padding: 16,
    margin: 6,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  title: {
    fontSize: SIZES.sm,
    color: colors.textSecondary,
  },
  subtitle: {
    fontSize: SIZES.xs,
    color: colors.primary,
    marginTop: 2,
  },
});

export default StatCard;