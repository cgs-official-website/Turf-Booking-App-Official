// @theme-ready ✅
import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { loginVendor, clearError } from '../redux/authSlice';
import { getVendorStatusApi } from '../api/auth';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const LoginScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const isFocused = useIsFocused();

  const { colors, isDark } = useTheme();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [statusData, setStatusData] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isInitialRegFlow, setIsInitialRegFlow] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return null;
    }
  };

  const handleAcknowledgeApproval = async () => {
    try {
      await AsyncStorage.removeItem('pendingApprovalFlowEmail');
      await AsyncStorage.removeItem('lastRegisteredVendorEmail');
    } catch (e) {}
    setIsInitialRegFlow(false);
    setStatusData(null);
  };

  const fetchStatus = useCallback(async (emailToCheck, showLoading = false) => {
    const clean = (emailToCheck || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;

    if (showLoading) setCheckingStatus(true);
    try {
      const res = await getVendorStatusApi(clean);
      if (res && res.kycStatus) {
        setStatusData({
          kycStatus: res.kycStatus,
          rejectionReason: res.rejectionReason || null,
          name: res.name || null,
          email: res.email || clean,
          reviewedAt: res.reviewedAt || null,
          createdAt: res.createdAt || null,
        });
      }
    } catch (err) {
      if (err?.status === 404 || err?.code === 'ACCOUNT_NOT_FOUND') {
        setStatusData(null);
      }
    } finally {
      if (showLoading) setCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const initEmail = route?.params?.email;
      const isNewlyRegistered = route?.params?.isNewlyRegistered;
      const isRegSubmitted = route?.params?.registrationSubmitted;

      // 1. Newly registered vendor navigated directly from registration completion
      if (isNewlyRegistered && initEmail) {
        const clean = String(initEmail).trim().toLowerCase();
        if (!isMounted) return;
        setForm((prev) => ({ ...prev, email: clean }));
        setIsInitialRegFlow(true);
        if (isRegSubmitted) {
          setStatusData({
            kycStatus: 'pending',
            rejectionReason: null,
            name: null,
            email: clean,
            reviewedAt: null,
            createdAt: new Date().toISOString(),
          });
        }
        await AsyncStorage.setItem('pendingApprovalFlowEmail', clean).catch(() => {});
        fetchStatus(clean, true);
        return;
      }

      // 2. Initial registration flow temporarily persisted in AsyncStorage
      try {
        const pendingEmail = await AsyncStorage.getItem('pendingApprovalFlowEmail');
        if (pendingEmail && isMounted) {
          const clean = String(pendingEmail).trim().toLowerCase();
          setIsInitialRegFlow(true);
          setForm((prev) => (prev.email ? prev : { ...prev, email: clean }));
          fetchStatus(clean, false);
          return;
        }
      } catch (e) {}

      // 3. Normal existing vendor or clean login - do not show approval card
      if (isMounted) {
        setIsInitialRegFlow(false);
        setStatusData(null);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [route?.params?.email, route?.params?.isNewlyRegistered, route?.params?.registrationSubmitted, fetchStatus]);

  useEffect(() => {
    if (isFocused && isInitialRegFlow && form.email) {
      AsyncStorage.getItem('pendingApprovalFlowEmail').then((pending) => {
        if (pending && pending.toLowerCase().trim() === form.email.toLowerCase().trim()) {
          fetchStatus(form.email, false);
        }
      }).catch(() => {});
    }
  }, [isFocused, isInitialRegFlow, form.email, fetchStatus]);

  useEffect(() => {
    if (error && isFocused) {
      const errStr = typeof error === 'string' ? error : (error?.message || String(error));
      const lower = errStr.toLowerCase();
      const isNotFound = lower.includes('not found') || lower.includes('create new account');
      const isPending =
        error?.code === 'ACCOUNT_PENDING' ||
        error?.kycStatus === 'pending' ||
        lower.includes('pending') ||
        lower.includes('awaiting approval');
      const isRejected =
        error?.code === 'KYC_REJECTED' ||
        error?.kycStatus === 'rejected' ||
        lower.includes('rejected') ||
        lower.includes('not approved');

      if (isPending) {
        if (isInitialRegFlow) {
          setStatusData((prev) => ({
            ...prev,
            kycStatus: 'pending',
            rejectionReason: null,
          }));
        }
        Alert.alert(
          'Registration Submitted Successfully',
          'Your profile has been submitted to Super Admin and is awaiting approval. You can log in once your profile is approved.'
        );
      } else if (isRejected) {
        if (isInitialRegFlow) {
          setStatusData((prev) => ({
            ...prev,
            kycStatus: 'rejected',
            rejectionReason: error?.rejectionReason || prev?.rejectionReason || null,
          }));
        }
        const reasonText = error?.rejectionReason ? `\n\nReason: ${error.rejectionReason}` : '';
        Alert.alert(
          'Application Rejected',
          `Your profile was rejected by Super Admin.${reasonText}\nPlease review the rejection reason and contact support or update your details if the existing workflow permits it.`
        );
      } else {
        const title = isNotFound ? 'Account Not Found' : 'Login Failed';
        Alert.alert(title, errStr);
      }
      dispatch(clearError());
    }
  }, [error, isFocused, isInitialRegFlow, dispatch]);

  const handleLogin = () => {
    if (!form.email.trim() || !form.password) {
      Alert.alert('Required Fields', 'Please enter both email address and password.');
      return;
    }
    dispatch(loginVendor({ email: form.email.trim(), password: form.password }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative Top Glow */}
        <View style={[styles.topGlow, { backgroundColor: colors.primaryLight }]} />

        {/* Hero Header */}
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <View style={[styles.logoInner, { backgroundColor: colors.primaryLight }]}>
              <Image source={require('../assets/logo.png')} style={{ width: 42, height: 42 }} resizeMode="contain" />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to manage your turf, slots & player bookings
          </Text>
        </View>

        {/* Status Card (Shown ONLY during initial registration-to-approval flow for newly registered vendors) */}
        {isInitialRegFlow && statusData && (
          <View
            style={[
              styles.statusCard,
              statusData.kycStatus === 'approved'
                ? [
                    styles.statusCardApproved,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0',
                    },
                  ]
                : statusData.kycStatus === 'rejected'
                ? [
                    styles.statusCardRejected,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
                    },
                  ]
                : [
                    styles.statusCardPending,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
                    },
                  ],
              SHADOWS.sm,
            ]}
          >
            <View style={styles.statusHeaderRow}>
              <View style={styles.statusTitleLeft}>
                <View
                  style={[
                    styles.statusIconWrap,
                    {
                      backgroundColor:
                        statusData.kycStatus === 'approved'
                          ? (isDark ? 'rgba(16, 185, 129, 0.25)' : '#D1FAE5')
                          : statusData.kycStatus === 'rejected'
                          ? (isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2')
                          : (isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7'),
                    },
                  ]}
                >
                  <Feather
                    name={
                      statusData.kycStatus === 'approved'
                        ? 'check-circle'
                        : statusData.kycStatus === 'rejected'
                        ? 'x-circle'
                        : 'clock'
                    }
                    size={18}
                    color={
                      statusData.kycStatus === 'approved'
                        ? '#10B981'
                        : statusData.kycStatus === 'rejected'
                        ? '#EF4444'
                        : '#F59E0B'
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.statusTitle,
                    {
                      color:
                        statusData.kycStatus === 'approved'
                          ? (isDark ? '#34D399' : '#065F46')
                          : statusData.kycStatus === 'rejected'
                          ? (isDark ? '#F87171' : '#991B1B')
                          : (isDark ? '#FBBF24' : '#92400E'),
                    },
                  ]}
                >
                  {statusData.kycStatus === 'approved'
                    ? 'Profile Approved!'
                    : statusData.kycStatus === 'rejected'
                    ? 'Application Rejected'
                    : 'Registration Submitted Successfully'}
                </Text>
              </View>

              {statusData.kycStatus === 'approved' ? (
                <TouchableOpacity
                  onPress={handleAcknowledgeApproval}
                  style={[
                    styles.statusDismissBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => fetchStatus(form.email, true)}
                  disabled={checkingStatus}
                  style={[
                    styles.statusRefreshBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  {checkingStatus ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather name="refresh-cw" size={13} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Text
              style={[
                styles.statusDesc,
                {
                  color:
                    statusData.kycStatus === 'approved'
                      ? (isDark ? '#A7F3D0' : '#047857')
                      : statusData.kycStatus === 'rejected'
                      ? (isDark ? '#FECACA' : '#7F1D1D')
                      : (isDark ? '#FDE68A' : '#78350F'),
                },
              ]}
            >
              {statusData.kycStatus === 'approved'
                ? 'Your profile has been approved by Super Admin. You can now log in to your dashboard.'
                : statusData.kycStatus === 'rejected'
                ? 'Your profile was rejected by Super Admin. Please review the rejection reason and contact support or update your details if the existing workflow permits it.'
                : 'Your profile has been submitted to Super Admin and is awaiting approval. You can log in once your profile is approved.'}
            </Text>

            {/* Approved Details Box */}
            {statusData.kycStatus === 'approved' && (
              <View
                style={[
                  styles.detailsBox,
                  {
                    backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                  },
                ]}
              >
                {!!statusData.name && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Partner Name</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                      {statusData.name}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Email</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                    {statusData.email || form.email}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Super Admin Review</Text>
                  <View style={[styles.verifiedBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                    <Feather name="check" size={11} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={styles.verifiedBadgeText}>Verified & Approved</Text>
                  </View>
                </View>

                {!!statusData.reviewedAt && (
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approval Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(statusData.reviewedAt)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Approved Action Button */}
            {statusData.kycStatus === 'approved' && (
              <TouchableOpacity
                onPress={handleAcknowledgeApproval}
                style={[styles.acknowledgeBtn, { backgroundColor: '#10B981' }]}
                activeOpacity={0.8}
              >
                <Text style={styles.acknowledgeBtnText}>Got it, Continue to Login</Text>
                <Feather name="arrow-right" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}

            {/* Pending Details Box */}
            {statusData.kycStatus === 'pending' && (
              <View
                style={[
                  styles.detailsBox,
                  {
                    backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                  },
                ]}
              >
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Email</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                    {statusData.email || form.email}
                  </Text>
                </View>

                <View style={[styles.detailRow, !statusData.createdAt && { borderBottomWidth: 0 }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Review Status</Text>
                  <View style={[styles.verifiedBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
                    <Feather name="clock" size={11} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={[styles.verifiedBadgeText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                      Pending Review
                    </Text>
                  </View>
                </View>

                {!!statusData.createdAt && (
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Submitted Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(statusData.createdAt)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Rejected Details Box */}
            {statusData.kycStatus === 'rejected' && (
              <View
                style={[
                  styles.detailsBox,
                  {
                    backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                  },
                ]}
              >
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Email</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                    {statusData.email || form.email}
                  </Text>
                </View>

                <View style={[styles.detailRow, !statusData.reviewedAt && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, paddingVertical: 2 }}>
                    <Text style={[styles.detailLabel, { color: isDark ? '#F87171' : '#991B1B', marginBottom: 4 }]}>
                      Rejection Reason:
                    </Text>
                    <Text style={[styles.rejectionReasonText, { color: colors.text }]}>
                      {statusData.rejectionReason || 'No specific reason provided by Super Admin.'}
                    </Text>
                  </View>
                </View>

                {!!statusData.reviewedAt && (
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reviewed On</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(statusData.reviewedAt)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.md]}>
          {/* Email Input */}
          <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'email' ? colors.primary : colors.border },
              focusedField === 'email' && styles.inputContainerFocused,
            ]}
          >
            <Feather
              name="mail"
              size={18}
              color={focusedField === 'email' ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. partner@turfbooking.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(v) => {
                setForm((prev) => ({ ...prev, email: v }));
                if (isInitialRegFlow && statusData?.email) {
                  if (v.trim().toLowerCase() !== statusData.email.toLowerCase()) {
                    setIsInitialRegFlow(false);
                    setStatusData(null);
                  }
                }
              }}
            />
            {form.email.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setForm((prev) => ({ ...prev, email: '' }));
                  if (isInitialRegFlow) {
                    setIsInitialRegFlow(false);
                    setStatusData(null);
                  }
                }}
                style={styles.clearBtn}
              >
                <Feather name="x-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Password Input */}
          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Password</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'password' ? colors.primary : colors.border },
              focusedField === 'password' && styles.inputContainerFocused,
            ]}
          >
            <Feather
              name="lock"
              size={18}
              color={focusedField === 'password' ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              value={form.password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowPass(!showPass)}>
              <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In CTA Button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }, loading && { opacity: 0.75 }, SHADOWS.sm]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>Sign In to Dashboard</Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer: Register New Turf & Vendor Enquiry */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>New partner with a sports facility?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={[styles.registerBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.75}
          >
            <Feather name="plus-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.registerBtnText, { color: colors.primary }]}>Create New Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('VendorEnquiry')}
            style={[
              styles.registerBtn,
              { borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 },
            ]}
            activeOpacity={0.75}
          >
            <Feather name="message-square" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.registerBtnText, { color: colors.primary }]}>Vendor Enquiry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SIZES.paddingLg,
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  topGlow: {
    position: 'absolute',
    top: -100,
    left: '25%',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.35,
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  logoInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.xxxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.sm,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  card: {
    borderRadius: SIZES.radiusLg,
    padding: 22,
    borderWidth: 1,
  },

  label: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
  },
  inputContainerFocused: {
    borderWidth: 1.5,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: SIZES.sm,
  },
  eye: {
    padding: 12,
  },
  clearBtn: {
    padding: 12,
  },

  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 20,
  },
  forgotText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  btn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 15,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: SIZES.xs,
    fontWeight: '500',
    marginBottom: 10,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  registerBtnText: {
    fontSize: SIZES.xs,
    fontWeight: '800',
  },

  /* Compact Status Card Styles */
  statusCard: {
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  statusCardApproved: {},
  statusCardRejected: {},
  statusCardPending: {},

  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusTitle: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.2,
  },
  statusRefreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDesc: {
    fontSize: SIZES.xs,
    lineHeight: 18,
    marginTop: 8,
    fontWeight: '500',
  },
  detailsBox: {
    marginTop: 12,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  acknowledgeBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: SIZES.radiusSm,
  },
  acknowledgeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  rejectionReasonBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  rejectionReasonText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default LoginScreen;