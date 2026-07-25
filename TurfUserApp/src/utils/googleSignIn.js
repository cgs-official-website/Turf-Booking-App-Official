// src/utils/googleSignIn.js
// Install first:  npm install @react-native-google-signin/google-signin
// Then rebuild android (npx react-native run-android) — JS-only reload won't pick up the native module.

import { GoogleSignin } from '@react-native-google-signin/google-signin';

// webClientId = the "client_id" with "client_type": 3 inside google-services.json
// (this is the OAuth "Web" client Firebase auto-creates — required even for Android-only login)
GoogleSignin.configure({
  webClientId: '12588437860-69hqge3neu6lpva6n6901m5hh2r5131r.apps.googleusercontent.com',
  offlineAccess: false,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo = await GoogleSignin.signIn();

  // Different versions of the library nest the payload differently — handle both.
  const data = userInfo?.data ?? userInfo;
  const { idToken, user } = data;

  if (!idToken || !user) {
    throw new Error('Google Sign-In did not return the expected profile');
  }

  return {
    idToken,
    googleId: user.id,
    email: user.email,
    name: user.name,
    photo: user.photo,
  };
}

export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    // ignore — user may not have been signed in with Google
  }
}