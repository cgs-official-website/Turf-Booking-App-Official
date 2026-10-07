import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { submitVendorKyc } from '../redux/onboardingSlice';
import { apiRequest } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';
import {
  ensureCameraPermission,
  ensurePhotoPermission,
} from '../utils/permissionHelper';

export default function VendorVerificationScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const dispatch = useDispatch();
  const loading = useSelector((s) => s.onboarding.loading);

  const isRegistrationFlow = route?.params?.isRegistrationFlow || false;
  const registrationData = route?.params?.registrationData || null;

  const [aadhaarFrontFile, setAadhaarFrontFile] = useState(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState(null);
  const [panFile, setPanFile] = useState(null);

  const [fetchingExisting, setFetchingExisting] = useState(!isRegistrationFlow);
  const [kycStatusText, setKycStatusText] = useState('pending');

  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeDocType, setActiveDocType] = useState(null); // 'aadhaarFront' | 'aadhaarBack' | 'pan'

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (!isRegistrationFlow) {
      loadExistingKycDocs();
    }
  }, [isRegistrationFlow]);

  const loadExistingKycDocs = async () => {
    try {
      setFetchingExisting(true);
      const res = await apiRequest('/vendor/onboarding/status');
      const docs = res?.kycDocs || {};
      const status = res?.kycStatus || res?.vendor?.kycStatus || 'pending';
      setKycStatusText(status);

      if (docs.aadhaarFront) {
        setAadhaarFrontFile({ uri: docs.aadhaarFront, remote: true });
      }
      if (docs.aadhaarBack) {
        setAadhaarBackFile({ uri: docs.aadhaarBack, remote: true });
      }
      if (docs.pan) {
        setPanFile({ uri: docs.pan, remote: true });
      }
    } catch (err) {
      console.warn('Error fetching existing vendor KYC docs:', err?.message);
    } finally {
      setFetchingExisting(false);
    }
  };

  /**
   * Validate image asset (file size & valid image format)
   */
  const validateImage = (asset) => {
    if (!asset || !asset.uri) {
      Alert.alert('Invalid Selection', 'Selected file does not have a valid location.');
      return false;
    }
    // Max 10MB limit
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Please select an image file smaller than 10MB.');
      return false;
    }
    return true;
  };

  /**
   * Trigger image picking via Camera or Gallery with permissions check
   */
  const pickImage = async (docType, sourceMode) => {
    try {
      setPickerModalVisible(false);
      let granted = false;

      if (sourceMode === 'camera') {
        granted = await ensureCameraPermission();
        if (!granted) return;

        const result = await launchCamera({
          mediaType: 'photo',
          quality: 0.8,
          saveToPhotos: false,
        });

        if (result.didCancel) return;
        if (result.errorCode) {
          Alert.alert('Camera Error', result.errorMessage || 'Failed to capture photo.');
          return;
        }
        if (result.assets?.length) {
          const asset = result.assets[0];
          if (!validateImage(asset)) return;
          const fileObj = {
            uri: asset.uri,
            name: asset.fileName || `${docType}_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          };
          saveDocFile(docType, fileObj);
        }
      } else {
        granted = await ensurePhotoPermission();
        if (!granted) return;

        const result = await launchImageLibrary({
          mediaType: 'photo',
          quality: 0.8,
        });

        if (result.didCancel) return;
        if (result.errorCode) {
          Alert.alert('Gallery Error', result.errorMessage || 'Failed to pick image.');
          return;
        }
        if (result.assets?.length) {
          const asset = result.assets[0];
          if (!validateImage(asset)) return;
          const fileObj = {
            uri: asset.uri,
            name: asset.fileName || `${docType}_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          };
          saveDocFile(docType, fileObj);
        }
      }
    } catch (err) {
      console.warn('Image picker error:', err?.message);
      Alert.alert('Error', 'Unable to pick image. Please try again.');
    }
  };

  const saveDocFile = (docType, fileObj) => {
    if (docType === 'aadhaarFront') setAadhaarFrontFile(fileObj);
    else if (docType === 'aadhaarBack') setAadhaarBackFile(fileObj);
    else if (docType === 'pan') setPanFile(fileObj);
  };

  const handleOpenPicker = (docType) => {
    setActiveDocType(docType);
    setPickerModalVisible(true);
  };

  const handleRemoveDoc = (docType) => {
    if (docType === 'aadhaarFront') setAadhaarFrontFile(null);
    else if (docType === 'aadhaarBack') setAadhaarBackFile(null);
    else if (docType === 'pan') setPanFile(null);
  };

  const handleContinue = async () => {
    if (!aadhaarFrontFile || !aadhaarBackFile || !panFile) {
      const missing = [];
      if (!aadhaarFrontFile) missing.push('Aadhaar Card (Front)');
      if (!aadhaarBackFile) missing.push('Aadhaar Card (Back)');
      if (!panFile) missing.push('PAN Card (Front)');

      Alert.alert(
        'Incomplete Documents',
        `Please upload all required KYC document photos to proceed:\n\n• ${missing.join('\n• ')}`
      );
      return;
    }

    if (isRegistrationFlow) {
      navigation.navigate('Terms', {
        formData: registrationData,
        kycData: {
          aadhaarFrontFile,
          aadhaarBackFile,
          panFile,
        },
      });
      return;
    }

    const res = await dispatch(
      submitVendorKyc({
        aadhaarFrontFile,
        aadhaarBackFile,
        panFile,
      })
    );

    if (submitVendorKyc.fulfilled.match(res)) {
      Alert.alert(
        'KYC Documents Submitted',
        'Your identity documents have been submitted to Super Admin and saved successfully.',
        [{ text: 'OK', onPress: () => loadExistingKycDocs() }]
      );
    } else {
      Alert.alert('Upload Error', res.payload || 'Something went wrong. Please try again.');
    }
  };

  const DocCard = ({ docType, title, subtitle, iconName, file }) => {
    return (
      <View style={[styles.docCard, { borderColor: file ? colors.primary : colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardHeaderLeft]}>
            <View style={[styles.docIconCircle, { backgroundColor: isDark ? '#064E3B' : '#E9F9EF' }]}>
              <Feather name={iconName} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.docTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.docSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            </View>
          </View>
          {file ? (
            <View style={[styles.badgeSuccess]}>
              <Feather name="check-circle" size={13} color="#059669" />
              <Text style={styles.badgeSuccessText}>{file.remote ? 'Saved & Verified' : 'Uploaded'}</Text>
            </View>
          ) : (
            <View style={[styles.badgePending, { backgroundColor: colors.inputBg || colors.border }]}>
              <Text style={styles.badgePendingText}>Pending</Text>
            </View>
          )}
        </View>

        {file ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: file.uri }} style={styles.previewImage} resizeMode="cover" />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.replaceBtn, { borderColor: colors.border }]}
                onPress={() => handleOpenPicker(docType)}
                activeOpacity={0.7}
              >
                <Feather name="refresh-cw" size={14} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Replace</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleRemoveDoc(docType)}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={14} color="#EF4444" />
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.uploadOptionsRow}>
            <TouchableOpacity
              style={[styles.optionBtn, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}
              onPress={() => pickImage(docType, 'camera')}
              activeOpacity={0.7}
            >
              <Feather name="camera" size={18} color={colors.primary} />
              <Text style={[styles.optionBtnText, { color: colors.text }]}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionBtn, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}
              onPress={() => pickImage(docType, 'gallery')}
              activeOpacity={0.7}
            >
              <Feather name="image" size={18} color={colors.primary} />
              <Text style={[styles.optionBtnText, { color: colors.text }]}>Choose Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Identity KYC</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepLabel}>
          {isRegistrationFlow
            ? 'Step 2 of 3'
            : `KYC Status: ${kycStatusText.toUpperCase()}`}
        </Text>

        <View style={styles.shieldWrap}>
          <View style={[styles.shield, SHADOWS.sm, { backgroundColor: colors.card || colors.background }]}>
            <Feather name="shield" size={26} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Identity Verification</Text>
        <Text style={styles.subtitle}>
          Upload clear photos of your Aadhaar card (front & back) and PAN card to verify your identity.
        </Text>

        {fetchingExisting ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 13 }}>Loading saved documents...</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upload Identity Documents</Text>

            {/* Aadhaar Card Front */}
            <DocCard
              docType="aadhaarFront"
              title="Aadhaar Card (Front)"
              subtitle="Front side showing name, DOB, and photo"
              iconName="file-text"
              file={aadhaarFrontFile}
            />

            {/* Aadhaar Card Back */}
            <DocCard
              docType="aadhaarBack"
              title="Aadhaar Card (Back)"
              subtitle="Back side showing address and barcode"
              iconName="file-text"
              file={aadhaarBackFile}
            />

            {/* PAN Card */}
            <DocCard
              docType="pan"
              title="PAN Card (Front)"
              subtitle="Front side showing PAN number and photo"
              iconName="credit-card"
              file={panFile}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.continueBtn, loading && { opacity: 0.6 }, { backgroundColor: colors.primary }]}
              onPress={handleContinue}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.onAccent || '#fff'} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.continueText, { color: colors.onAccent || '#fff' }]}>
                    {isRegistrationFlow
                      ? 'Continue to Terms of Service'
                      : 'Submit KYC Verification'}
                  </Text>
                  <Feather name="arrow-right" size={18} color={colors.onAccent || '#fff'} style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Choice Modal for Replacing an Image */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.card || colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Image Source</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Choose how you want to upload your document
            </Text>

            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={() => pickImage(activeDocType, 'camera')}
            >
              <Feather name="camera" size={20} color={colors.primary} />
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Take Photo with Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={() => pickImage(activeDocType, 'gallery')}
            >
              <Feather name="image" size={20} color={colors.primary} />
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Select from Photo Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    customHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SIZES.padding,
      paddingVertical: 12,
      backgroundColor: colors.card || colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.inputBg || colors.border,
    },
    headerTitle: {
      fontSize: SIZES.lg,
      fontWeight: '700',
      color: colors.text,
    },
    container: { padding: 20, paddingBottom: 40 },
    stepLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
    shieldWrap: { alignItems: 'center', marginBottom: 16 },
    shield: {
      width: 60,
      height: 60,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 18,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
    docCard: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      backgroundColor: colors.card || colors.background,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    docIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    docTitle: { fontSize: 14, fontWeight: '700' },
    docSubtitle: { fontSize: 11, marginTop: 2 },
    badgeSuccess: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#D1FAE5',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgeSuccessText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#065F46',
      marginLeft: 4,
    },
    badgePending: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgePendingText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    uploadOptionsRow: {
      flexDirection: 'row',
      marginTop: 14,
      gap: 10,
    },
    optionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    optionBtnText: {
      fontSize: 12,
      fontWeight: '600',
    },
    previewContainer: {
      marginTop: 14,
      borderRadius: 12,
      overflow: 'hidden',
    },
    previewImage: {
      width: '100%',
      height: 150,
      borderRadius: 12,
    },
    previewActions: {
      flexDirection: 'row',
      marginTop: 10,
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      gap: 6,
    },
    replaceBtn: {
      backgroundColor: colors.card || colors.background,
    },
    deleteBtn: {
      backgroundColor: isDark ? '#3F1F1F' : '#FEF2F2',
      borderColor: '#FCA5A5',
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '600',
    },
    continueBtn: {
      marginTop: 16,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueText: { fontWeight: '700', fontSize: 15 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalBox: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    modalSub: { fontSize: 13, marginBottom: 20 },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderRadius: 14,
      marginBottom: 12,
      gap: 12,
    },
    modalOptionText: { fontSize: 14, fontWeight: '600' },
    modalCancelBtn: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 6,
    },
    modalCancelText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  });