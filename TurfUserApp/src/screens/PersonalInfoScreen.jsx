// import React, { useState } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, 
//   TextInput, Alert, ActivityIndicator, ScrollView, Image,
//   Platform,
// } from 'react-native';
// import { useSelector, useDispatch } from 'react-redux';
// import { launchImageLibrary } from 'react-native-image-picker';
// import { updateUser } from '../redux/authSlice';
// import { authApi } from '../api/auth';
// import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { SafeAreaView } from 'react-native-safe-area-context';
// // Allowed extensions for profile picture
// const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
// const ALLOWED_EXT   = ['.png', '.jpg', '.jpeg', '.svg'];

// export default function PersonalInfoScreen({ navigation }) {
//   const dispatch = useDispatch();
//   const user = useSelector((s) => s.auth.user);

//   const [name,    setName]    = useState(user?.name  || '');
//   const [email,   setEmail]   = useState(user?.email || '');
//   const [phone,   setPhone]   = useState(user?.phone || '');
//   const [avatar,  setAvatar]  = useState(user?.avatar || null); // local URI while editing
//   const [saving,  setSaving]  = useState(false);
//   const [editing, setEditing] = useState(false);   // tracks whether any field is focused

//   // ── Image picker ────────────────────────────────────────────────────────────
//   const pickImage = () => {
//     launchImageLibrary(
//       {
//         mediaType: 'photo',          // photos only (no videos)
//         includeBase64: true,         // we'll send base64 to the server
//         quality: 0.85,
//         selectionLimit: 1,
//       },
//       (response) => {
//         if (response.didCancel || response.errorCode) return;

//         const asset = response.assets?.[0];
//         if (!asset) return;

//         // ── Validate type: png / jpg / jpeg / svg only ──
//         const mimeOk = asset.type && ALLOWED_TYPES.includes(asset.type.toLowerCase());
//         const extOk  = asset.fileName
//           ? ALLOWED_EXT.some((e) => asset.fileName.toLowerCase().endsWith(e))
//           : true; // if no filename, trust the mime check

//         if (!mimeOk && !extOk) {
//           Alert.alert(
//             'Invalid file type',
//             'Please choose a PNG, JPG or SVG image.',
//           );
//           return;
//         }

//         // Store local URI for immediate preview; base64 goes to server on save
//         setAvatar({ uri: asset.uri, base64: asset.base64, type: asset.type });
//       },
//     );
//   };

//   // ── Save ────────────────────────────────────────────────────────────────────
//   const handleSave = async () => {
//     if (!name.trim()) {
//       Alert.alert('Name required', 'Please enter your full name');
//       return;
//     }
//     setSaving(true);
//     try {
//       // If a new avatar was picked, send as data URI so the backend can store it
//       // (backend can forward to Cloudinary/S3 or store the data URI directly).
//       const avatarPayload =
//         avatar && avatar.base64
//           ? `data:${avatar.type};base64,${avatar.base64}`
//           : avatar?.uri && !avatar.base64
//           ? avatar.uri        // unchanged remote URL
//           : undefined;

//       const payload = { name: name.trim(), phone: phone.trim() };
//       if (avatarPayload) payload.avatar = avatarPayload;

//       const res = await authApi.updateMe(payload);
//       dispatch(updateUser(res.user));
//       setEditing(false);
//       Alert.alert('Saved!', 'Profile updated successfully', [
//         { text: 'OK', onPress: () => navigation.goBack() },
//       ]);
//     } catch (e) {
//       Alert.alert('Error', e.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ── Avatar URI to display ────────────────────────────────────────────────
//   const displayUri = avatar?.uri || (typeof avatar === 'string' ? avatar : null);

//   return (
//     <SafeAreaView style={styles.safe}>
//       {/* ── Header ── */}
//       <View style={styles.topBar}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
//           <Icon name="arrow-back" size={22} color={COLORS.text} />
//         </TouchableOpacity>
//         <Text style={styles.topTitle}>Personal info</Text>
//         <View style={{ width: 40 }} />
//       </View>

//       <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
//         {/* ── Avatar + name ── */}
//         <View style={styles.avatarSection}>
//           <View style={styles.avatarWrap}>
//             {displayUri ? (
//               <Image source={{ uri: displayUri }} style={styles.avatarImg} />
//             ) : (
//               <View style={styles.avatarFallback}>
//                 <Text style={styles.avatarTxt}>{(user?.name || 'P')[0].toUpperCase()}</Text>
//               </View>
//             )}
//             <TouchableOpacity style={styles.pencilBadge} onPress={pickImage}>
//               <Icon name="pencil" size={11} color="#fff" />
//             </TouchableOpacity>
//           </View>
//           <Text style={styles.profileName}>{user?.name || 'Player'}</Text>
//         </View>

//         {/* ── Fields ── */}
//         <View style={styles.fieldsCard}>
//           {/* Name */}
//           <Field
//             label="Name"
//             value={name}
//             onChangeText={(v) => { setName(v); setEditing(true); }}
//             placeholder="Enter your name"
//             editable
//           />

//           {/* Email — read-only (can't change email without re-verify flow) */}
//           <Field
//             label="Email ID"
//             value={email}
//             placeholder="Email"
//             editable={false}
//           />

//           {/* Phone */}
//           <Field
//             label="Contact Number"
//             value={phone}
//             onChangeText={(v) => { setPhone(v); setEditing(true); }}
//             placeholder="Enter phone number"
//             keyboardType="phone-pad"
//             editable
//             last
//           />
//         </View>
//       </ScrollView>

//       {/* ── Save button — appears only when something changed ── */}
//       {(editing || (avatar && avatar.base64)) && (
//         <View style={styles.footer}>
//           <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
//             {saving
//               ? <ActivityIndicator color="#fff" />
//               : <Text style={styles.saveBtnTxt}>Save changes</Text>}
//           </TouchableOpacity>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }

// // ── Reusable field row ───────────────────────────────────────────────────────
// function Field({ label, value, onChangeText, placeholder, keyboardType, editable, last }) {
//   const [focused, setFocused] = useState(false);

//   return (
//     <View style={[styles.fieldRow, last && { borderBottomWidth: 0 }]}>
//       <Text style={styles.fieldLabel}>{label}</Text>
//       <TextInput
//         style={[
//           styles.fieldInput,
//           focused && styles.fieldInputFocused,
//           !editable && styles.fieldInputReadonly,
//         ]}
//         value={value}
//         onChangeText={onChangeText}
//         placeholder={placeholder}
//         placeholderTextColor={COLORS.subtext}
//         keyboardType={keyboardType || 'default'}
//         editable={editable}
//         onFocus={() => setFocused(true)}
//         onBlur={() => setFocused(false)}
//       />
//     </View>
//   );
// }

// // ── Styles ───────────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: COLORS.bg },

//   // header
//   topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
//   backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
//   topTitle: { ...FONT.h2, color: COLORS.text },

//   // avatar
//   avatarSection: { alignItems: 'center', paddingVertical: SPACING.xl },
//   avatarWrap: { position: 'relative', marginBottom: SPACING.md },
//   avatarImg: { width: 90, height: 90, borderRadius: 45 },
//   avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.greenSoft, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
//   avatarTxt: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
//   pencilBadge: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
//   profileName: { ...FONT.h2, color: COLORS.text },

//   // fields card
//   fieldsCard: { marginHorizontal: SPACING.lg, backgroundColor: '#fff', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
//   fieldRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
//   fieldLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
//   fieldInput: {
//     fontSize: 15, color: COLORS.text,
//     borderWidth: 1, borderColor: COLORS.border,
//     borderRadius: RADIUS.md,
//     paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
//     backgroundColor: COLORS.bg,
//   },
//   fieldInputFocused: { borderColor: COLORS.primary },
//   fieldInputReadonly: { backgroundColor: COLORS.bgSoft, color: COLORS.subtext },

//   // footer save
//   footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border },
//   saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.lg, alignItems: 'center' },
//   saveBtnTxt: { color: '#fff', ...FONT.button },
// });

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Image, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import { updateUser } from '../redux/authSlice';
import { authApi } from '../api/auth';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/Ionicons';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const ALLOWED_EXT   = ['.png', '.jpg', '.jpeg', '.svg'];

export default function PersonalInfoScreen({ navigation }) {
  const { C, dark } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [name,    setName]    = useState(user?.name  || '');
  const [email]               = useState(user?.email || '');
  const [phone,   setPhone]   = useState(user?.phone || '');
  const [avatar,  setAvatar]  = useState(user?.avatar || null);
  const [saving,  setSaving]  = useState(false);
  const [editing, setEditing] = useState(false);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo', includeBase64: true, quality: 0.85, selectionLimit: 1 }, (response) => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (!asset) return;
      const mimeOk = asset.type && ALLOWED_TYPES.includes(asset.type.toLowerCase());
      const extOk  = asset.fileName ? ALLOWED_EXT.some((e) => asset.fileName.toLowerCase().endsWith(e)) : true;
      if (!mimeOk && !extOk) { Alert.alert('Invalid file type', 'Please choose a PNG, JPG or SVG image.'); return; }
      setAvatar({ uri: asset.uri, base64: asset.base64, type: asset.type });
    });
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter your full name'); return; }
    setSaving(true);
    try {
      const avatarPayload = avatar?.base64 ? `data:${avatar.type};base64,${avatar.base64}` : avatar?.uri && !avatar.base64 ? avatar.uri : undefined;
      const payload = { name: name.trim(), phone: phone.trim() };
      if (avatarPayload) payload.avatar = avatarPayload;
      const res = await authApi.updateMe(payload);
      dispatch(updateUser(res.user));
      setEditing(false);
      Alert.alert('Saved!', 'Profile updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const displayUri = avatar?.uri || (typeof avatar === 'string' ? avatar : null);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.bgSoft }]}>
            <Icon name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: C.text }]}>Personal info</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {displayUri ? (
                <Image source={{ uri: displayUri }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: C.primaryLight, borderColor: C.primary }]}>
                  <Text style={[styles.avatarTxt, { color: C.primary }]}>{(user?.name || 'P')[0].toUpperCase()}</Text>
                </View>
              )}
              <TouchableOpacity style={[styles.pencilBadge, { backgroundColor: C.primary }]} onPress={pickImage}>
                <Icon name="pencil" size={11} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.profileName, { color: C.text }]}>{user?.name || 'Player'}</Text>
          </View>

          <View style={[styles.fieldsCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Field label="Name" value={name} onChangeText={(v) => { setName(v); setEditing(true); }} placeholder="Enter your name" editable C={C} />
            <Field label="Email ID" value={email} placeholder="Email" editable={false} C={C} />
            <Field label="Contact Number" value={phone} onChangeText={(v) => { setPhone(v); setEditing(true); }} placeholder="Enter phone number" keyboardType="phone-pad" editable last C={C} />
          </View>
        </ScrollView>

        {(editing || (avatar && avatar.base64)) && (
          <View style={[styles.footer, { backgroundColor: C.card, borderTopColor: C.border }]}>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.primary }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Save changes</Text>}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, editable, last, C }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldRow, { borderBottomColor: C.border }, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.fieldLabel, { color: C.text }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: C.text, borderColor: C.border, backgroundColor: C.bg }, focused && { borderColor: C.primary }, !editable && { backgroundColor: C.bgSoft, color: C.subtext }]}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={C.subtext}
        keyboardType={keyboardType || 'default'} editable={editable}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  backBtn:         { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  topTitle:        { ...FONT.h2 },
  avatarSection:   { alignItems: 'center', paddingVertical: SPACING.xl },
  avatarWrap:      { position: 'relative', marginBottom: SPACING.md },
  avatarImg:       { width: 90, height: 90, borderRadius: 45 },
  avatarFallback:  { width: 90, height: 90, borderRadius: 45, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:       { fontSize: 36, fontWeight: '800' },
  pencilBadge:     { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  profileName:     { ...FONT.h2 },
  fieldsCard:      { marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  fieldRow:        { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  fieldLabel:      { fontSize: 15, fontWeight: '600', marginBottom: SPACING.sm },
  fieldInput:      { fontSize: 15, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? 12 : 10 },
  footer:          { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, borderTopWidth: 1 },
  saveBtn:         { borderRadius: RADIUS.xl, paddingVertical: SPACING.lg, alignItems: 'center' },
  saveBtnTxt:      { color: '#fff', ...FONT.button },
});