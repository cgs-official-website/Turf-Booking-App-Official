import { Platform } from 'react-native';

// ── Brand & Dark Mode Colors ───────────────────────────────────────────────
export const LIGHT_COLORS = {
  bg:          '#FFFFFF',
  bgSoft:      '#F7F9F8',
  card:        '#FFFFFF',
  text:        '#0F1B14',
  subtext:     '#6B7280',
  border:      '#E5E7EB',
  primary:     '#0CB053',
  primaryDark: '#0F1F17',
  primaryLight:'#DCFCE7',
  accent:      '#22C55E',
  orange:      '#F97316',
  orangeBg:    '#FFF3E8',
  yellow:      '#F59E0B',
  red:         '#EF4444',
  redBg:       '#FEE2E2',
  greenSoft:   '#E9F8EF',
};

export const DARK_COLORS = {
  bg:          '#1E1E1E',   // Background colour
  bgSoft:      '#2C2C2C',   // Card colour (used as soft bg)
  card:        '#2C2C2C',   // Card colour
  text:        '#F4F4F4',   // Text colour
  subtext:     '#ADADAD',   // Gray text
  border:      '#333333',   // Gray border (lighter for visibility)
  primary:     '#0CB053',   // Brand colour (same in dark)
  primaryDark: '#0CB053',
  primaryLight:'#1a3d2b',
  accent:      '#0CB053',
  orange:      '#FFA040',   // Warning
  orangeBg:    '#3d2a1a',
  yellow:      '#F59E0B',
  red:         '#FF3B3B',   // Alert Color
  redBg:       '#3d1a1a',
  greenSoft:   '#1a3d2b',
};

// Default export (light) - screens use getColors(darkMode) instead
export const COLORS = LIGHT_COLORS;

// ── Helper hook-free function ──────────────────────────────────────────────
export const getColors = (darkMode = false) =>
  darkMode ? DARK_COLORS : LIGHT_COLORS;

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const RADIUS  = { sm: 6, md: 10, lg: 16, xl: 24, round: 999 };

export const FONT = {
  family: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  h1:     { fontSize: 24, fontWeight: 'bold' },
  h2:     { fontSize: 20, fontWeight: '600' },
  h3:     { fontSize: 16, fontWeight: '600' },
  body:   { fontSize: 14, lineHeight: 20 },
  button: { fontSize: 16, fontWeight: '700' },
};

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
};

export const FONTS = {
  xs: 11, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, xxxl: 28, display: 36,
};

export const WEIGHT = {
  regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800',
};