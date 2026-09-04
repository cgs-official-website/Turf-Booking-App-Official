// import { Platform } from 'react-native';

// ── Brand & Sports Theme Color System ─────────────────────────────────────────
export const LIGHT_COLORS = {
  // Backgrounds
  bg:           '#F8FAFC',    // Ultra clean slate-tinted canvas
  bgSoft:       '#F1F5F9',    // Soft card background
  card:         '#FFFFFF',    // Crisp white card surface
  cardElevated: '#FFFFFF',

  // Typography
  text:         '#0F172A',    // High contrast pitch dark
  subtext:      '#64748B',    // Muted slate secondary text
  caption:      '#94A3B8',    // Subtle tertiary text
  inverseText:  '#FFFFFF',

  // Borders & Dividers
  border:       '#E2E8F0',    // Clean subtle border
  borderSubtle: '#F1F5F9',
  borderFocus:  '#10B981',

  // Primary Sports Brand (Emerald Action)
  primary:      '#0CB053',    // Turf Emerald Green
  primaryDark:  '#065F46',    // Deep Forest Green
  primaryLight: '#D1FAE5',    // Soft Mint highlight
  primaryGradient: ['#0CB053', '#059669'],

  // Secondary & Energy Accents
  accent:       '#10B981',
  secondary:    '#0F172A',    // Deep Stadium Navy
  orange:       '#F97316',    // Cricket ball orange
  orangeBg:     '#FFEDD5',
  yellow:       '#F59E0B',    // Solar Amber
  yellowBg:     '#FEF3C7',
  blue:         '#2563EB',    // Action Blue
  blueBg:       '#DBEAFE',

  // Semantic Status Colors
  success:      '#10B981',    // Confirmed / Available
  successBg:    '#D1FAE5',
  warning:      '#F59E0B',    // Held / Pending
  warningBg:    '#FEF3C7',
  error:        '#EF4444',    // Booked / Cancelled / Error
  errorBg:      '#FEE2E2',
  info:         '#3B82F6',
  infoBg:       '#EFF6FF',

  // UI States
  greenSoft:    '#E9F8EF',
  red:          '#EF4444',
  redBg:        '#FEE2E2',
  overlay:      'rgba(15, 23, 42, 0.65)',
  shimmer:      ['#F1F5F9', '#E2E8F0', '#F1F5F9'],
};

export const DARK_COLORS = {
  // Backgrounds
  bg:           '#0B131F',    // Deep stadium midnight
  bgSoft:       '#152238',    // Elevated card surface
  card:         '#131E2F',    // Modern dark navy card
  cardElevated: '#1A2940',

  // Typography
  text:         '#F8FAFC',    // Crisp white text
  subtext:      '#94A3B8',    // Soft gray text
  caption:      '#64748B',    // Dim gray text
  inverseText:  '#0F172A',

  // Borders & Dividers
  border:       '#223249',    // High-contrast slate border
  borderSubtle: '#18273D',
  borderFocus:  '#10B981',

  // Primary Sports Brand (Emerald Action)
  primary:      '#10B981',    // Vibrant Emerald for Dark Mode
  primaryDark:  '#059669',
  primaryLight: '#064E3B',    // Deep Mint glow
  primaryGradient: ['#10B981', '#059669'],

  // Secondary & Energy Accents
  accent:       '#34D399',
  secondary:    '#F8FAFC',
  orange:       '#FB923C',
  orangeBg:     '#431407',
  yellow:       '#FBBF24',
  yellowBg:     '#451A03',
  blue:         '#60A5FA',
  blueBg:       '#172554',

  // Semantic Status Colors
  success:      '#34D399',
  successBg:    '#064E3B',
  warning:      '#FBBF24',
  warningBg:    '#451A03',
  error:        '#F87171',
  errorBg:      '#450A0A',
  info:         '#60A5FA',
  infoBg:       '#172554',

  // UI States
  greenSoft:    '#064E3B',
  red:          '#F87171',
  redBg:        '#450A0A',
  overlay:      'rgba(0, 0, 0, 0.85)',
  shimmer:      ['#152238', '#1E3250', '#152238'],
};

// Default export (light) - screens use getColors(darkMode) / useTheme hook
export const COLORS = LIGHT_COLORS;

export const getColors = (darkMode = false) =>
  darkMode ? DARK_COLORS : LIGHT_COLORS;

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  round: 999,
};

export const FONT = {
  family: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  display:{ fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  h1:     { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  h2:     { fontSize: 20, fontWeight: '700', letterSpacing: -0.2 },
  h3:     { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 15, fontWeight: '600' },
  body:   { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodyBold: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption:{ fontSize: 12, lineHeight: 16, fontWeight: '500' },
  tiny:   { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  button: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
};

export const SHADOW = {
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#0CB053',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const FONTS = {
  xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 20, xxxl: 24, display: 32,
};

export const WEIGHT = {
  regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900',
};