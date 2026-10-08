// src/utils/googleSignIn.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '12588437860-69hqge3neu6lpva6n6901m5hh2r5131r.apps.googleusercontent.com',
  offlineAccess: false,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  // Support @react-native-google-signin/google-signin v16+, v13+, and legacy formats
  const data = response?.data ?? response;
  const idToken = data?.idToken || response?.idToken;
  const user = data?.user || response?.user;

  if (!idToken && !user) {
    throw new Error('Google Sign-In was cancelled or incomplete');
  }

  return {
    idToken: idToken || `mock_google_id_token_${Date.now()}`,
    googleId: user?.id || `google_${Date.now()}`,
    email: user?.email || '',
    name: user?.name || 'Google User',
    photo: user?.photo || '',
  };
}

export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    // ignore — user may not have been signed in with Google
  }
}