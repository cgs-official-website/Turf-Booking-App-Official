import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import useTheme from '../hooks/useTheme';
import { RADIUS, FONT } from '../utils/theme';

export default function SecondaryButton({
  title,
  onPress,
  disabled = false,
  icon = null,
  style,
  textStyle,
  outlined = true,
}) {
  const { C } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: outlined ? 'transparent' : C.bgSoft,
          borderColor: C.border,
          borderWidth: outlined ? 1.5 : 0,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={[styles.text, { color: disabled ? C.caption : C.text }, textStyle]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginRight: 8,
  },
  text: {
    ...FONT.button,
    fontSize: 14,
  },
});
