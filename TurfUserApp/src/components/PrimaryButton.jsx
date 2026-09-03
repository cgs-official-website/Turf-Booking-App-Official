import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import useTheme from '../hooks/useTheme';
import { RADIUS, FONT, SHADOW } from '../utils/theme';

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon = null,
  style,
  textStyle,
  variant = 'primary', // 'primary' | 'danger' | 'warning'
}) {
  const { C } = useTheme();

  const getBgColor = () => {
    if (disabled) return C.border;
    if (variant === 'danger') return C.error;
    if (variant === 'warning') return C.warning;
    return C.primary;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBgColor() },
        !disabled && variant === 'primary' && SHADOW.glow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, { color: disabled ? C.caption : '#FFFFFF' }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  },
});
