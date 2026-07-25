// src/hooks/useTheme.js
// Usage: const { C, dark } = useTheme();
import { useSelector } from 'react-redux';
import { getColors } from '../utils/theme';

export default function useTheme() {
  const dark = useSelector((s) => s.auth.darkMode);
  return { C: getColors(dark), dark };
}