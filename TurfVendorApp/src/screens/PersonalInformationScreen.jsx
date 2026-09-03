// @theme-ready ✅
import React, { useState, useLayoutEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, Animated, Dimensions, PanResponder,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { updateVendorProfile } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { getImageUrl } from '../api/client';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const CropPreviewModal = ({
  visible,
  imageUri,
  onClose,
  onConfirm,
  onChangeImage,
  colors,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Track position offsets for continuous drag
  const currentPos = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        currentPos.current.x += gestureState.dx;
        currentPos.current.y += gestureState.dy;
        pan.flattenOffset();
      },
    })
  ).current;

  if (!visible || !imageUri) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.6));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    currentPos.current = { x: 0, y: 0 };
    pan.setValue({ x: 0, y: 0 });
    pan.setOffset({ x: 0, y: 0 });
  };

  const nudge = (dx, dy) => {
    currentPos.current.x += dx;
    currentPos.current.y += dy;
    pan.setValue({ x: currentPos.current.x, y: currentPos.current.y });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.cropModalOverlay}>
        {/* Top Header */}
        <View style={styles.cropTopBar}>
          <TouchableOpacity onPress={onClose} style={styles.cropCloseBtn} activeOpacity={0.7}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.cropTitle}>Crop & Position Photo</Text>
            <Text style={styles.cropSubHeader}>Drag to position • Zoom to fit</Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.cropResetBtn} activeOpacity={0.7}>
            <Text style={styles.cropResetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Viewport Area */}
        <View style={styles.cropArea}>
          <View style={styles.cropCircleMask} {...panResponder.panHandlers}>
            <Animated.Image
              source={{ uri: imageUri }}
              style={[
                styles.cropImage,
                {
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale },
                    { rotate: `${rotation}deg` },
                  ],
                },
              ]}
              resizeMode="cover"
            />
            {/* Centering Grid Overlay */}
            <View style={styles.crosshairH} pointerEvents="none" />
            <View style={styles.crosshairV} pointerEvents="none" />
          </View>

          {/* Guide Ring */}
          <View style={styles.cropBorderRing} pointerEvents="none" />

          <Text style={styles.cropGuideText}>
            👆 Drag with your finger to position within the circle
          </Text>
        </View>

        {/* Directional Nudge + Zoom Controls */}
        <View style={styles.controlsContainer}>
          {/* Zoom & Rotation Row */}
          <View style={styles.cropControlsBar}>
            <TouchableOpacity style={styles.controlBtn} onPress={handleZoomOut} activeOpacity={0.75}>
              <Feather name="minus" size={18} color="#FFFFFF" />
              <Text style={styles.controlBtnText}>Zoom -</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={handleRotate} activeOpacity={0.75}>
              <Feather name="rotate-cw" size={18} color="#FFFFFF" />
              <Text style={styles.controlBtnText}>Rotate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={handleZoomIn} activeOpacity={0.75}>
              <Feather name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.controlBtnText}>Zoom +</Text>
            </TouchableOpacity>
          </View>

          {/* Precision Pan Controls */}
          <View style={styles.nudgePad}>
            <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudge(0, -15)} activeOpacity={0.7}>
              <Feather name="arrow-up" size={16} color="#CBD5E1" />
            </TouchableOpacity>
            <View style={styles.nudgeMiddleRow}>
              <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudge(-15, 0)} activeOpacity={0.7}>
                <Feather name="arrow-left" size={16} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.nudgeCenterDot} />
              <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudge(15, 0)} activeOpacity={0.7}>
                <Feather name="arrow-right" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudge(0, 15)} activeOpacity={0.7}>
              <Feather name="arrow-down" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.cropBottomBar}>
          <TouchableOpacity style={styles.cropChangeBtn} onPress={onChangeImage} activeOpacity={0.8}>
            <Feather name="image" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.cropChangeText}>Choose Other</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cropConfirmBtn, { backgroundColor: colors.primary }]}
            onPress={() => onConfirm(imageUri)}
            activeOpacity={0.85}
          >
            <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.cropConfirmText}>Crop & Set Avatar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const PersonalInformationScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { vendor } = useSelector((s) => s.auth);
  const { colors, isDark } = useTheme();

  const [name, setName] = useState(vendor?.name || '');
  const [email, setEmail] = useState(vendor?.email || '');
  const [contact, setContact] = useState(vendor?.contact || vendor?.phone || '');
  const [avatarUri, setAvatarUri] = useState(vendor?.avatar || vendor?.photoURL || null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});

  // Crop & Preview Modal State
  const [tempImageUri, setTempImageUri] = useState(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const openPicker = async (sourceType = 'library') => {
    const options = {
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 1,
    };

    const handler = sourceType === 'camera' ? launchCamera : launchImageLibrary;

    handler(options, (response) => {
      if (response.didCancel || response.errorCode) return;
      if (response.assets?.length) {
        const uri = response.assets[0].uri;
        setTempImageUri(uri);
        setCropModalVisible(true);
      }
    });
  };

  const handleAvatarPress = () => {
    Alert.alert('Update Profile Photo', 'Choose an option to update your vendor avatar:', [
      { text: 'Take Photo', onPress: () => openPicker('camera') },
      { text: 'Choose from Gallery', onPress: () => openPicker('library') },
      ...(avatarUri ? [{ text: 'Adjust / Crop Photo', onPress: () => { setTempImageUri(avatarUri); setCropModalVisible(true); } }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleApplyCroppedImage = (finalUri) => {
    setAvatarUri(finalUri);
    setCropModalVisible(false);
    Alert.alert('Avatar Placed', 'Profile preview updated. Click "Save Profile Changes" below to save.');
  };

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Owner name is required';
    if (!email.trim()) next.email = 'Email address is required';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (!contact.trim()) next.contact = 'Contact number is required';
    else if (!/^\d{10}$/.test(contact.trim())) next.contact = 'Enter a valid 10-digit mobile number';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        contact: contact.trim(),
        phone: contact.trim(),
      };
      if (avatarUri) {
        payload.avatar = avatarUri;
        payload.photoURL = avatarUri;
      }
      await dispatch(updateVendorProfile(payload)).unwrap();
      Alert.alert('Profile Updated', 'Your details and cropped avatar have been saved successfully.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Update Failed', typeof err === 'string' ? err : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Custom Navigation Header */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Personal Information</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Hero Avatar Card */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} style={styles.avatarPressable}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.inputBg, borderColor: colors.primary }]}>
                {avatarUri ? (
                  <Image source={{ uri: getImageUrl(avatarUri) }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.avatarFallbackText, { color: colors.primary }]}>
                      {name?.[0]?.toUpperCase() || 'V'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7}>
              <Text style={[styles.avatarHint, { color: colors.primary }]}>Tap to Drag, Crop & Place Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Partner Details</Text>
            <Text style={[styles.cardHeaderSub, { color: colors.textSecondary }]}>This info will be displayed on invoices & communications</Text>

            {/* Full Name */}
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'name' ? colors.primary : colors.border },
                errors.name && styles.inputRowError,
              ]}
            >
              <Feather name="user" size={18} color={focusedField === 'name' ? colors.primary : colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => { setName(t); if (errors.name) setErrors((e) => ({ ...e, name: null })); }}
                placeholder="Owner / Manager name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            {/* Email Address */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Business Email Address</Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'email' ? colors.primary : colors.border },
                errors.email && styles.inputRowError,
              ]}
            >
              <Feather name="mail" size={18} color={focusedField === 'email' ? colors.primary : colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: null })); }}
                placeholder="vendor@turfbooking.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            {/* Contact Number */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Mobile Contact Number</Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'contact' ? colors.primary : colors.border },
                errors.contact && styles.inputRowError,
              ]}
            >
              <View style={styles.phonePrefix}>
                <Text style={[styles.phonePrefixText, { color: colors.text }]}>+91</Text>
              </View>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={contact}
                onFocus={() => setFocusedField('contact')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => { setContact(t.replace(/[^0-9]/g, '')); if (errors.contact) setErrors((e) => ({ ...e, contact: null })); }}
                placeholder="9876543210"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.contact && <Text style={styles.errorText}>{errors.contact}</Text>}
          </View>

          {/* Save CTA */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.75 }, SHADOWS.sm]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Profile Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Interactive Crop, Drag & Place Modal */}
      <CropPreviewModal
        visible={cropModalVisible}
        imageUri={tempImageUri}
        onClose={() => setCropModalVisible(false)}
        onConfirm={handleApplyCroppedImage}
        onChangeImage={() => openPicker('library')}
        colors={colors}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 40,
  },

  avatarSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  avatarPressable: {
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2.5,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 34,
    fontWeight: '800',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    marginTop: 8,
  },

  formCard: {
    borderRadius: SIZES.radiusLg,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardHeaderTitle: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardHeaderSub: {
    fontSize: SIZES.xs,
    marginBottom: 16,
    lineHeight: 16,
  },

  label: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  phonePrefix: {
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  phonePrefixText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: SIZES.sm,
    paddingVertical: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: SIZES.xs,
    marginTop: 4,
    fontWeight: '600',
  },

  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 15,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ---- Crop & Drag Modal Styles ----
  cropModalOverlay: {
    flex: 1,
    backgroundColor: '#0B0F17',
    justifyContent: 'space-between',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  cropTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  cropCloseBtn: {
    padding: 8,
  },
  cropTitle: {
    color: '#FFFFFF',
    fontSize: SIZES.base + 1,
    fontWeight: '800',
  },
  cropSubHeader: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  cropResetBtn: {
    padding: 8,
  },
  cropResetText: {
    color: '#38BDF8',
    fontSize: SIZES.sm,
    fontWeight: '700',
  },

  cropArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  cropCircleMask: {
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropImage: {
    width: 320,
    height: 320,
  },
  crosshairH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  crosshairV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cropBorderRing: {
    position: 'absolute',
    width: 264,
    height: 264,
    borderRadius: 132,
    borderWidth: 2.5,
    borderColor: '#00C566',
  },
  cropGuideText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },

  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  cropControlsBar: {
    flexDirection: 'column',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  controlBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  nudgePad: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 8,
  },
  nudgeMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  nudgeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C566',
  },

  cropBottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 6,
  },
  cropChangeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: SIZES.radius,
    paddingVertical: 14,
  },
  cropChangeText: {
    color: '#FFFFFF',
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
  cropConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 14,
  },
  cropConfirmText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
  },
});

export default PersonalInformationScreen;