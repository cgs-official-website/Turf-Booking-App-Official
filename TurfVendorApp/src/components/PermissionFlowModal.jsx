// @theme-ready ✅
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import {
  requestNotificationPermission,
  requestLocationPermission,
  requestPhotosPermission,
  openAppSettings,
  markPermissionsAsAsked,
} from '../utils/permissionHelper';

const { width } = Dimensions.get('window');

const PERMISSION_STEPS = [
  {
    key: 'notifications',
    title: 'Booking Notifications',
    explanation: 'Allow notifications to get booking updates',
    icon: 'bell',
    requestFn: requestNotificationPermission,
    deniedMessage:
      'Notification permission was permanently denied. Please enable notifications in App Settings to get instant booking updates.',
  },
  {
    key: 'location',
    title: 'Turf Location',
    explanation: 'We need location to show turfs near you',
    icon: 'map-pin',
    requestFn: requestLocationPermission,
    deniedMessage:
      'Location permission was permanently denied. Please enable location in App Settings so we can show turfs near you.',
  },
  {
    key: 'photos',
    title: 'Photos & Media',
    explanation: 'We need photo access to upload images',
    icon: 'image',
    requestFn: requestPhotosPermission,
    deniedMessage:
      'Photo access was permanently denied. Please enable photos/storage in App Settings to upload turf facility photos.',
  },
];

export const PermissionFlowModal = ({ visible, vendorId, onComplete }) => {
  const { colors, isDark } = useTheme();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);
  const [requesting, setRequesting] = useState(false);

  if (!visible) return null;

  const currentStep = PERMISSION_STEPS[currentStepIndex] || PERMISSION_STEPS[0];
  const isLastStep = currentStepIndex >= PERMISSION_STEPS.length - 1;

  const finishFlow = async () => {
    await markPermissionsAsAsked(vendorId);
    if (typeof onComplete === 'function') {
      onComplete();
    }
  };

  const advanceStep = () => {
    setIsPermanentlyDenied(false);
    if (isLastStep) {
      finishFlow();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleAllowPress = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const res = await currentStep.requestFn();
      if (res?.status === 'never_ask_again') {
        setIsPermanentlyDenied(true);
      } else {
        // Granted or standard denied (graceful continue)
        advanceStep();
      }
    } catch (err) {
      console.warn('⚠️ Permission request error:', err?.message);
      advanceStep();
    } finally {
      setRequesting(false);
    }
  };

  const handleSkip = () => {
    advanceStep();
  };

  const handleOpenSettings = () => {
    openAppSettings();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            SHADOWS.md,
          ]}
        >
          {/* Step Indicator Dots */}
          <View style={styles.stepIndicatorRow}>
            {PERMISSION_STEPS.map((step, idx) => (
              <View
                key={step.key}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      idx === currentStepIndex
                        ? colors.primary
                        : idx < currentStepIndex
                        ? colors.primaryDark || colors.primary
                        : colors.border,
                    width: idx === currentStepIndex ? 22 : 7,
                  },
                ]}
              />
            ))}
          </View>

          {/* Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isPermanentlyDenied
                  ? 'rgba(239, 68, 68, 0.12)'
                  : colors.primaryLight,
              },
            ]}
          >
            <Feather
              name={isPermanentlyDenied ? 'alert-triangle' : currentStep.icon}
              size={30}
              color={isPermanentlyDenied ? colors.error : colors.primary}
            />
          </View>

          {/* Title & Short Explanation */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isPermanentlyDenied ? 'Permission Required' : currentStep.title}
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {isPermanentlyDenied ? currentStep.deniedMessage : currentStep.explanation}
          </Text>

          {/* Action Buttons */}
          {isPermanentlyDenied ? (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpenSettings}
                activeOpacity={0.85}
              >
                <Feather name="settings" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Open Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={advanceStep}
                activeOpacity={0.75}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                  {isLastStep ? 'Done' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary },
                  requesting && { opacity: 0.75 },
                ]}
                onPress={handleAllowPress}
                disabled={requesting}
                activeOpacity={0.85}
              >
                <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={handleSkip}
                activeOpacity={0.75}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                  Not Now
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: width * 0.88,
    borderRadius: SIZES.radiusLg,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 6,
  },
  stepDot: {
    height: 7,
    borderRadius: 4,
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: SIZES.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: SIZES.radius,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: SIZES.radius,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
});

export default PermissionFlowModal;
