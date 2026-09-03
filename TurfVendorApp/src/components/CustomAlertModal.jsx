import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { registerAlertListener } from '../utils/customAlert';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const getAlertMeta = (title = '', message = '', buttons = []) => {
  const text = `${title} ${message}`.toLowerCase();

  const hasDestructive = buttons.some((b) => b.style === 'destructive') ||
    /delete|remove|reject|cancel booking|logout|sign out|permanent/i.test(text);

  const isSuccess = /success|updated|saved|activated|subscribed|confirmed|approved/i.test(text);
  const isWarning = /error|failed|missing|invalid|mismatch|required|weak|warning/i.test(text);

  if (hasDestructive) {
    return {
      type: 'danger',
      icon: 'alert-triangle',
      iconColor: '#EF4444',
      iconBg: 'rgba(239, 68, 68, 0.12)',
    };
  }

  if (isSuccess) {
    return {
      type: 'success',
      icon: 'check-circle',
      iconColor: '#00C566',
      iconBg: 'rgba(0, 197, 102, 0.12)',
    };
  }

  if (isWarning) {
    return {
      type: 'warning',
      icon: 'alert-circle',
      iconColor: '#F59E0B',
      iconBg: 'rgba(245, 158, 11, 0.12)',
    };
  }

  return {
    type: 'info',
    icon: 'info',
    iconColor: '#3B82F6',
    iconBg: 'rgba(59, 130, 246, 0.12)',
  };
};

export const CustomAlertModal = () => {
  const { colors, isDark } = useTheme();
  const [alertConfig, setAlertConfig] = useState(null);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unregister = registerAlertListener((config) => {
      setAlertConfig(config);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return unregister;
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAlertConfig(null);
    });
  };

  const handlePressButton = (button) => {
    handleDismiss();
    if (button?.onPress) {
      setTimeout(() => {
        button.onPress();
      }, 100);
    }
  };

  if (!alertConfig) return null;

  const { title, message, buttons = [] } = alertConfig;
  const meta = getAlertMeta(title, message, buttons);
  const isMultiVertical = buttons.length > 2;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleDismiss}>
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [{ scale: scaleAnim }],
                },
                SHADOWS.md,
              ]}
            >
              {/* Contextual Icon Header */}
              <View style={[styles.iconCircle, { backgroundColor: meta.iconBg }]}>
                <Feather name={meta.icon} size={26} color={meta.iconColor} />
              </View>

              {/* Title & Message */}
              {!!title && (
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              )}
              {!!message && (
                <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
              )}

              {/* Action Buttons */}
              <View
                style={[
                  styles.buttonContainer,
                  isMultiVertical ? styles.buttonContainerVertical : styles.buttonContainerHorizontal,
                ]}
              >
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const isPrimary = !isCancel && !isDestructive;

                  let btnBg = colors.inputBg;
                  let textColor = colors.text;

                  if (isPrimary) {
                    btnBg = colors.primary;
                    textColor = '#FFFFFF';
                  } else if (isDestructive) {
                    btnBg = '#EF4444';
                    textColor = '#FFFFFF';
                  } else if (isCancel) {
                    btnBg = isDark ? '#1E293B' : '#F1F5F9';
                    textColor = colors.textSecondary;
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.actionBtn,
                        isMultiVertical ? styles.actionBtnVertical : styles.actionBtnHorizontal,
                        { backgroundColor: btnBg },
                      ]}
                      onPress={() => handlePressButton(btn)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: textColor },
                          isPrimary && styles.actionBtnTextBold,
                        ]}
                      >
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: SIZES.xs + 1,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonContainerVertical: {
    flexDirection: 'column',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnHorizontal: {
    flex: 1,
  },
  actionBtnVertical: {
    width: '100%',
  },
  actionBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  actionBtnTextBold: {
    fontWeight: '800',
  },
});
