import React, {
  createContext, useContext, useState, useEffect, useMemo,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../utils/theme';

const THEME_STORAGE_KEY = '@app_theme_preference'; // stores 'light' | 'dark'

const ThemeContext = createContext({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false); // default: always light mode
  const [ready, setReady] = useState(false);

  // Load saved preference on app start
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark') setIsDark(true);
        if (saved === 'light') setIsDark(false);
        // if nothing saved, isDark stays false (light) — device scheme ignored
      } catch (e) {
        // ignore read errors, fall back to device scheme
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const setTheme = (value /* 'light' | 'dark' */) => {
    setIsDark(value === 'dark');
    AsyncStorage.setItem(THEME_STORAGE_KEY, value).catch(() => {});
  };

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({ colors, isDark, toggleTheme, setTheme, ready }),
    [colors, isDark, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);