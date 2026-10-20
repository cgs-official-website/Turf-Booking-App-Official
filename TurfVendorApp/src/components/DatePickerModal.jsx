import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { SHADOWS, RADIUS } from '../utils/theme';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  minDate,
  title = 'Select Date',
}) {
  const { colors, isDark } = useTheme();

  // Helper to parse 'YYYY-MM-DD' or fallback to today
  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    const parts = String(dStr).split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    const fallback = new Date(dStr);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  };

  const initialDate = useMemo(() => parseDate(selectedDate), [selectedDate]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [selectedDayStr, setSelectedDayStr] = useState(
    selectedDate || new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (visible) {
      const d = parseDate(selectedDate);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setSelectedDayStr(selectedDate || d.toISOString().slice(0, 10));
    }
  }, [visible, selectedDate]);

  const minDateObj = useMemo(() => {
    if (!minDate) return null;
    const d = parseDate(minDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [minDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days = [];
    // Padding before 1st day of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: null, isCurrentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mStr}-${dStr}`;

      const checkDate = new Date(currentYear, currentMonth, d, 0, 0, 0, 0);
      const isDisabled = minDateObj ? checkDate < minDateObj : false;

      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isDisabled,
      });
    }

    return days;
  }, [currentYear, currentMonth, minDateObj]);

  const handleSelectDay = (dayObj) => {
    if (!dayObj || !dayObj.dateStr || dayObj.isDisabled) return;
    setSelectedDayStr(dayObj.dateStr);
  };

  const handleConfirm = () => {
    if (selectedDayStr && onSelectDate) {
      onSelectDate(selectedDayStr);
    }
    if (onClose) onClose();
  };

  const formattedSelected = useMemo(() => {
    if (!selectedDayStr) return '';
    try {
      const [y, m, d] = selectedDayStr.split('-');
      const mIdx = parseInt(m, 10) - 1;
      return `${MONTHS[mIdx]} ${parseInt(d, 10)}, ${y}`;
    } catch (_) {
      return selectedDayStr;
    }
  }, [selectedDayStr]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            SHADOWS.md,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.subTitle, { color: colors.primary }]}>
                {formattedSelected || 'Select a date'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Month & Year Navigation */}
          <View style={[styles.monthNavRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[styles.navBtn, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-left" size={18} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.monthYearText, { color: colors.text }]}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navBtn, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-right" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Days of week header */}
          <View style={styles.daysHeaderRow}>
            {DAYS_OF_WEEK.map((dw) => (
              <View key={dw} style={styles.dayCol}>
                <Text style={[styles.dayHeaderText, { color: colors.textSecondary }]}>{dw}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, idx) => {
              if (!item.day) {
                return <View key={`pad_${idx}`} style={styles.dayCell} />;
              }

              const isSelected = item.dateStr === selectedDayStr;
              const isDisabled = item.isDisabled;

              return (
                <TouchableOpacity
                  key={`day_${item.dateStr}`}
                  style={[
                    styles.dayCell,
                    isSelected && [styles.selectedDayCell, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => handleSelectDay(item)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : isDisabled ? (isDark ? '#475569' : '#CBD5E1') : colors.text },
                      isSelected && { fontWeight: '800' },
                      isDisabled && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom Action Buttons */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>Confirm Date</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '800',
  },
  daysHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 8,
  },
  selectedDayCell: {
    borderRadius: 19,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
