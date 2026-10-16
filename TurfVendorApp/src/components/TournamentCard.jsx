import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import Feather from 'react-native-vector-icons/Feather';

const TournamentCard = ({ onPress, activeCount = 0 }) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#16222F' : '#F0FDF4',
          borderColor: isDark ? 'rgba(15, 118, 110, 0.4)' : '#BBF7D0',
        },
        SHADOWS.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
          <Icon name="award" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Tournaments</Text>
            <View style={[styles.badgePill, { backgroundColor: isDark ? 'rgba(15, 118, 110, 0.25)' : '#DCFCE7' }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>PHASE 1</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Organize & publish tournaments for your turf
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

      <View style={styles.bottomRow}>
        <View style={styles.metricWrap}>
          <Feather name="flag" size={14} color={colors.primary} />
          <Text style={[styles.metricText, { color: colors.text }]}>
            {activeCount > 0 ? `${activeCount} Tournament${activeCount > 1 ? 's' : ''}` : 'Ready to Host'}
          </Text>
        </View>

        <View style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.actionBtnText}>Manage</Text>
          <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: SIZES.base + 1,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: SIZES.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
});

export default TournamentCard;
