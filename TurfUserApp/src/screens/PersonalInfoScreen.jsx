import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, Image,
  Platform, Modal, Animated, Dimensions, PanResponder, KeyboardAvoidingView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { updateUser } from '../redux/authSlice';
import { authApi } from '../api/auth';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import { getImageUrl } from '../api/client';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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

        {/* Interactive Viewport */}
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

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
            <Feather name="move" size={14} color="rgba(255, 255, 255, 0.75)" style={{ marginRight: 6 }} />
            <Text style={styles.cropGuideText}>
              Drag with your finger to center your face or avatar
            </Text>
          </View>
        </View>

        {/* Directional Nudge + Zoom Controls */}
        <View style={styles.controlsContainer}>
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

export default function PersonalInfoScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth?.user || s.auth?.profile);
  const { C, dark } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || user?.contact || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar || user?.photoURL || null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});

  // Crop & Preview Modal State
  const [tempImageUri, setTempImageUri] = useState(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);

  const openPicker = (sourceType = 'library') => {
    const options = {
      mediaType: 'photo',
      quality: 0.85,
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
    Alert.alert('Profile Photo', 'Choose an option to update your photo:', [
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
    if (!name.trim()) next.name = 'Full name is required';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address';
    const cleanPhone = phone.replace(/\D/g, '');
    if (phone.trim() && cleanPhone.length < 10) next.phone = 'Enter a valid mobile number';
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
        phone: phone.trim(),
      };
      if (avatarUri) {
        payload.avatar = avatarUri;
        payload.photoURL = avatarUri;
      }

      const res = await authApi.updateMe(payload);
      const updatedUser = res.user || res.profile || { ...user, ...payload };
      dispatch(updateUser(updatedUser));

      Alert.alert('Saved!', 'Your profile details and photo have been updated successfully.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save Failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Navigation Header */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: C.text }]}>Personal Information</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} style={styles.avatarPressable}>
              <View style={[styles.avatarCircle, { backgroundColor: C.bgSoft, borderColor: C.primary }]}>
                {avatarUri ? (
                  <Image source={{ uri: getImageUrl(avatarUri) }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.avatarFallbackText, { color: C.primary }]}>
                      {name?.[0]?.toUpperCase() || 'P'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.avatarEditBadge, { backgroundColor: C.primary }]}>
                <Feather name="camera" size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7}>
              <Text style={[styles.avatarHint, { color: C.primary }]}>Tap to Drag, Crop & Place Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: C.text }]}>Player Profile Details</Text>
            <Text style={[styles.cardHeaderSub, { color: C.subtext }]}>Used for match scheduling & turf reservations</Text>

            {/* Full Name */}
            <Text style={[styles.label, { color: C.text }]}>Full Name</Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: C.bgSoft || '#F8FAFC', borderColor: focusedField === 'name' ? C.primary : C.border },
                errors.name && styles.inputRowError,
              ]}
            >
              <Feather name="user" size={18} color={focusedField === 'name' ? C.primary : C.subtext} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                value={name}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => { setName(t); if (errors.name) setErrors((e) => ({ ...e, name: null })); }}
                placeholder="Your full name"
                placeholderTextColor={C.subtext}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            {/* Email Address */}
            <Text style={[styles.label, { color: C.text, marginTop: 14 }]}>Email Address</Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: C.bgSoft || '#F8FAFC', borderColor: focusedField === 'email' ? C.primary : C.border },
                errors.email && styles.inputRowError,
              ]}
            >
              <Feather name="mail" size={18} color={focusedField === 'email' ? C.primary : C.subtext} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: null })); }}
                placeholder="player@turfbooking.com"
                placeholderTextColor={C.subtext}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            {/* Phone Number */}
            <Text style={[styles.label, { color: C.text, marginTop: 14 }]}>Mobile Contact Number</Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: C.bgSoft || '#F8FAFC', borderColor: focusedField === 'phone' ? C.primary : C.border },
                errors.phone && styles.inputRowError,
              ]}
            >
              <View style={styles.phonePrefix}>
                <Text style={[styles.phonePrefixText, { color: C.text }]}>+91</Text>
              </View>
              <TextInput
                style={[styles.input, { color: C.text }]}
                value={phone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => { setPhone(t.replace(/[^0-9]/g, '')); if (errors.phone) setErrors((e) => ({ ...e, phone: null })); }}
                placeholder="9876543210"
                placeholderTextColor={C.subtext}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Save CTA */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: C.primary }, saving && { opacity: 0.75 }]}
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

        {/* Interactive Crop & Place Modal */}
        <CropPreviewModal
          visible={cropModalVisible}
          imageUri={tempImageUri}
          onClose={() => setCropModalVisible(false)}
          onConfirm={handleApplyCroppedImage}
          onChangeImage={() => openPicker('library')}
          colors={C}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 20,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },

  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardHeaderSub: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
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
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },

  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Crop Modal
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
    fontSize: 17,
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
    fontSize: 13,
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
    borderColor: '#0CB053',
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
    backgroundColor: '#0CB053',
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
    borderRadius: 14,
    paddingVertical: 14,
  },
  cropChangeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cropConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
  },
  cropConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});