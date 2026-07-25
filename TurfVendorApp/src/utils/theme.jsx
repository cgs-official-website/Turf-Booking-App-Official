import { StyleSheet } from 'react-native';

// ---- Light palette (existing colors, unchanged) ----------------------------
export const lightColors = {
  primary: '#00C566',
  primaryDark: '#00A855',
  primaryLight: '#E6FFF4',
  secondary: '#1A1A2E',
  background: '#F8F9FA',
  white: '#FFFFFF',
  black: '#000000',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  card: '#FFFFFF',
  inputBg: '#F3F4F6',
  shadow: 'rgba(0,0,0,0.08)',
  onAccent: '#FFFFFF', // text/icon color for use on colored surfaces (banners, CTA buttons, plan cards) — always literal white, unlike `white` which is a surface color that flips in dark mode
};

// ---- Dark palette ------------------------------------------------------------
export const darkColors = {
  primary: '#00C566',
  primaryDark: '#00A855',
  primaryLight: '#0F3D2A',
  secondary: '#0F0F1A',
  background: '#0E0E10',
  white: '#1C1C1E',       // "white" surfaces become dark surfaces
  black: '#FFFFFF',
  text: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textLight: '#71717A',
  border: '#2A2A2E',
  error: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  card: '#1C1C1E',
  inputBg: '#242426',
  shadow: 'rgba(0,0,0,0.5)',
  onAccent: '#FFFFFF', // text/icon color for use on colored surfaces (banners, CTA buttons, plan cards) — always literal white, unlike `white` which is a surface color that flips in dark mode
};

// Kept for any file that hasn't migrated yet — defaults to light.
// @deprecated: use useTheme().colors instead of importing COLORS directly.
export const COLORS = lightColors;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  radius: 12,
  radiusLg: 20,
  padding: 16,
  paddingLg: 24,
};

export const SHADOWS = StyleSheet.create({
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});