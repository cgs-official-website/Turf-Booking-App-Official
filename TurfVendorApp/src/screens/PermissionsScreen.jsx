// @theme-ready ✅
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import PermissionFlowModal from '../components/PermissionFlowModal';
import { completePermissionsFlow } from '../redux/authSlice';

const PermissionsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const vendor = useSelector((s) => s.auth.vendor);
  const vendorId = vendor?._id || vendor?.uid || vendor?.id;

  const [modalVisible, setModalVisible] = useState(true);

  const handleFlowComplete = () => {
    setModalVisible(false);
    dispatch(completePermissionsFlow());
    // In case navigation is controlled imperatively:
    if (navigation?.replace) {
      navigation.replace('Main');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Branded Placeholder */}
      <View style={styles.centerContent}>
        <View
          style={[
            styles.logoBadge,
            { backgroundColor: colors.card, borderColor: colors.border },
            SHADOWS.md,
          ]}
        >
          <View style={[styles.logoInner, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="football" size={36} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome Partner</Text>
        <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
          Preparing your turf management dashboard...
        </Text>
      </View>

      {/* Permission Flow Modal */}
      <PermissionFlowModal
        visible={modalVisible}
        vendorId={vendorId}
        onComplete={handleFlowComplete}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  logoInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: SIZES.sm,
    textAlign: 'center',
  },
});

export default PermissionsScreen;
