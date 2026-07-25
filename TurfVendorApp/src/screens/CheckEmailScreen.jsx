// @theme-ready ✅
import React, { useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const CheckEmailScreen = ({ navigation, route }) => {
  const { email } = route.params || {};
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Update Header Colors to fix the white space machii!
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border || 'transparent',
      },
      headerTintColor: colors.text,
      headerTitleStyle: {
        color: colors.text,
        fontWeight: '700',
      },
    });
  }, [navigation, colors]);

  const openMailApp = async () => {
    // Tries the Gmail app first, falls back to the default mail client.
    const gmailUrl = 'googlegmail://';
    const mailtoUrl = 'mailto:';
    const canOpenGmail = await Linking.canOpenURL(gmailUrl);
    Linking.openURL(canOpenGmail ? gmailUrl : mailtoUrl).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, SHADOWS.md]}>
        <View style={styles.iconContainer}>
          <Feather name="mail" size={48} color={colors.primary} />
        </View>
        
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          Verify your email{' '}
          <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>{' '}
          to reset your password.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={openMailApp}>
          <Feather name="external-link" size={20} color={colors.onAccent} style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>Open Mail App</Text>
        </TouchableOpacity>

        {/*
          Backend mail-sending / deep-link verification isn't wired up yet.
          Until then, this lets you continue to the New Password screen
          directly so the reset flow can be built & tested end-to-end.
          Remove once email deep-linking is implemented.
        */}
        <TouchableOpacity
          style={styles.devLink}
          onPress={() => navigation.navigate('ResetPassword', { email })}
        >
          <Text style={styles.devLinkText}>I have a reset code — Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backLink}>
          <Feather name="arrow-left" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, // Fixed background color
    justifyContent: 'center', 
    padding: SIZES.paddingLg 
  },
  card: { 
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radiusLg, 
    padding: SIZES.paddingLg, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  iconContainer: {
    backgroundColor: colors.primary + '15', // Light transparent background for the icon
    padding: 20,
    borderRadius: 50,
    marginBottom: 20,
  },
  title: { 
    fontSize: SIZES.xxl, 
    fontWeight: '800', 
    color: colors.text, 
    marginBottom: 12 
  },
  subtitle: { 
    fontSize: SIZES.base, 
    color: colors.textSecondary, 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 28 
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius,
    paddingVertical: 14, 
    paddingHorizontal: 32, 
    alignItems: 'center', 
    justifyContent: 'center',
    width: '100%',
  },
  btnText: { 
    color: colors.onAccent, // Fixed CTA text color 
    fontSize: SIZES.base, 
    fontWeight: '700' 
  },
  devLink: { 
    marginTop: 24,
    padding: 10,
    backgroundColor: colors.inputBg || colors.border,
    borderRadius: SIZES.radius,
    width: '100%',
    alignItems: 'center'
  },
  devLinkText: { 
    fontSize: SIZES.sm, 
    color: colors.primary, 
    fontWeight: '700' 
  },
  backLink: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24 
  },
  backText: { 
    fontSize: SIZES.sm, 
    color: colors.textSecondary,
    fontWeight: '600'
  },
});

export default CheckEmailScreen;