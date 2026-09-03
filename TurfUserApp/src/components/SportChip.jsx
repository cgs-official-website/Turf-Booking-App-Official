import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Feather from 'react-native-vector-icons/Feather';
import useTheme from '../hooks/useTheme';
import { RADIUS, FONT, SHADOW } from '../utils/theme';

export const getSportIconComponent = (sportName, size = 16, color = '#FFFFFF') => {
  const norm = String(sportName || '').toLowerCase().trim();

  if (norm.includes('football') || norm.includes('soccer')) {
    return <Ionicons name="football" size={size} color={color} />;
  }
  if (norm.includes('cricket')) {
    return <MaterialCommunityIcons name="cricket" size={size} color={color} />;
  }
  if (norm.includes('badminton')) {
    return <MaterialCommunityIcons name="badminton" size={size} color={color} />;
  }
  if (norm.includes('tennis')) {
    return <Ionicons name="tennisball-outline" size={size} color={color} />;
  }
  if (norm.includes('basketball')) {
    return <Ionicons name="basketball-outline" size={size} color={color} />;
  }
  if (norm.includes('volleyball')) {
    return <MaterialCommunityIcons name="volleyball" size={size} color={color} />;
  }
  if (norm.includes('swimming')) {
    return <Ionicons name="water-outline" size={size} color={color} />;
  }
  if (norm.includes('gym') || norm.includes('fitness')) {
    return <Ionicons name="barbell-outline" size={size} color={color} />;
  }
  if (norm === 'all') {
    return <Ionicons name="grid-outline" size={size} color={color} />;
  }
  return <Feather name="activity" size={size} color={color} />;
};

export default function SportChip({
  name,
  icon,
  selected = false,
  onPress,
}) {
  const { C, dark } = useTheme();
  const iconColor = selected ? '#FFFFFF' : C.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? C.primary
            : (dark ? '#131E2F' : '#FFFFFF'),
          borderColor: selected
            ? C.primary
            : (dark ? '#223249' : '#E2E8F0'),
        },
        selected && SHADOW.glow,
        !selected && SHADOW.subtle,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : C.bgSoft },
        ]}
      >
        {icon && typeof icon === 'object' && icon.uri ? (
          <Image source={icon} style={styles.icon} resizeMode="contain" />
        ) : (
          getSportIconComponent(name, 16, iconColor)
        )}
      </View>
      <Text
        style={[
          styles.text,
          {
            color: selected
              ? '#FFFFFF'
              : C.text,
          },
        ]}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    marginRight: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  icon: {
    width: 16,
    height: 16,
  },
  text: {
    ...FONT.caption,
    fontSize: 13,
    fontWeight: '700',
  },
});
