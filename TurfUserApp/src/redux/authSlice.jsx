import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import { matchStorage } from '../utils/matchStorage';

// ── Email + Password flow (Login2Screen) ────────────────────────────────────
export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await authApi.login(email, password);
    const payload = res?.data || res;
    if (payload?.token) {
      await AsyncStorage.setItem('token', payload.token);
    }
    const userObj = payload?.user || payload?.profile;
    if (userObj) {
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
    }
    return payload;
  } catch (e) { return rejectWithValue(e.message); }
});

// ── Phone OTP flow ──────────────────────────────────────────────────────────
export const sendOtp = createAsyncThunk('auth/sendOtp', async ({ phone }, { rejectWithValue }) => {
  try {
    const res = await authApi.sendOtp(phone);
    return res?.data || res;
  } catch (e) { return rejectWithValue(e.message); }
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async ({ phone, otp }, { rejectWithValue }) => {
  try {
    const res = await authApi.verifyOtp(phone, otp);
    const payload = res?.data || res;
    if (payload?.token) {
      await AsyncStorage.setItem('token', payload.token);
    }
    const userObj = payload?.user || payload?.profile;
    if (userObj) {
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
    }
    return payload;
  } catch (e) { return rejectWithValue(e.message); }
});

// ── Mobile Number Login flow ─────────────────────────────────────
export const mobileLoginUser = createAsyncThunk('auth/mobileLogin', async ({ phone }, { rejectWithValue }) => {
  try {
    const res = await authApi.mobileLogin(phone);
    const payload = res?.data || res;
    if (payload?.token) {
      await AsyncStorage.setItem('token', payload.token);
    }
    const userObj = payload?.user || payload?.profile;
    if (userObj) {
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
    }
    return payload;
  } catch (e) { return rejectWithValue(e.message); }
});

// ── Google flow ─────────────────────────────────────────────────────────────
// profile = { idToken, googleId, email, name, photo } from src/utils/googleSignIn.js
export const googleLogin = createAsyncThunk('auth/googleLogin', async (profile, { rejectWithValue }) => {
  try {
    const res = await authApi.googleAuth(profile);
    const payload = res?.data || res;
    if (payload?.token) {
      await AsyncStorage.setItem('token', payload.token);
    }
    const userObj = payload?.user || payload?.profile;
    if (userObj) {
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
    }
    return payload;
  } catch (e) { return rejectWithValue(e.message); }
});

// ── Register (profile + token login) ─────
export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await authApi.register(data);
    const payload = res?.data || res;
    if (payload?.token) {
      await AsyncStorage.setItem('token', payload.token);
    }
    const userObj = payload?.user || payload?.profile;
    if (userObj) {
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
    }
    return payload;
  } catch (e) { return rejectWithValue(e.message); }
});

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { getState, rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const savedLocation = await AsyncStorage.getItem('userLocation');
    const savedUserStr = await AsyncStorage.getItem('user');
    let savedUser = null;
    if (savedUserStr) {
      try { savedUser = JSON.parse(savedUserStr); } catch (e) {}
    }
    const notifSaved = await AsyncStorage.getItem('notificationsOn');
    const notificationsOn = notifSaved !== null ? JSON.parse(notifSaved) : true;
    if (!token) return { token: null, user: null, location: savedLocation, notificationsOn };
    
    const { auth } = getState();
    const currentUser = auth.user || savedUser;

    if (token) {
      try {
        const res = await Promise.race([
          authApi.getMe(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);
        const payload = res?.data || res;
        const freshUser = payload?.user || payload?.profile || (payload?.id ? payload : null);
        if (freshUser) {
          await AsyncStorage.setItem('user', JSON.stringify(freshUser));
          return { token, user: freshUser, location: savedLocation, notificationsOn };
        }
      } catch (apiErr) {
        // Fallback to cached user if offline or timeout
      }
      return { token, user: currentUser, location: savedLocation, notificationsOn };
    }
  } catch (e) {
    const savedLocation = await AsyncStorage.getItem('userLocation');
    const notifSaved = await AsyncStorage.getItem('notificationsOn');
    const notificationsOn = notifSaved !== null ? JSON.parse(notifSaved) : true;
    return { token: null, user: null, location: savedLocation, notificationsOn };
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token:                     null,
    user:                      null,
    status:                    'idle',
    error:                     null,
    bootstrapped:              false,
    splashDone:                false,
    locationSet:               false,
    location:                  null,   // string: city name or address
    userCoords:                null,   // { lat, lng }
    locationPermissionGranted: false,
    darkMode:                  false,
    notificationsOn:           true,
  },
  reducers: {
    setUserCoords: (state, action) => {
      state.userCoords = action.payload;
    },
    toggleNotifications: (state) => {
      state.notificationsOn = !state.notificationsOn;
      AsyncStorage.setItem('notificationsOn', JSON.stringify(state.notificationsOn));
    },
    setNotificationsOn: (state, action) => {
      state.notificationsOn = Boolean(action.payload);
      AsyncStorage.setItem('notificationsOn', JSON.stringify(state.notificationsOn));
    },
    setAuth: (state, action) => {
      state.token = action.payload.token;
      state.user  = action.payload.user || action.payload.profile;
      if (action.payload.token) {
        AsyncStorage.setItem('token', action.payload.token);
      }
      if (action.payload.user || action.payload.profile) {
        AsyncStorage.setItem('user', JSON.stringify(action.payload.user || action.payload.profile));
      }
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      AsyncStorage.setItem('user', JSON.stringify(state.user)).catch(() => {});
    },
    // Pass city name string (e.g. "Perundurai") or null to reset
    setLocation: (state, action) => {
      if (action.payload === null) {
        state.locationSet = false;
        state.location    = null;
        AsyncStorage.removeItem('userLocation');
      } else {
        state.locationSet = true;
        state.location    = action.payload;
        state.locationPermissionGranted = true;
        AsyncStorage.setItem('userLocation', action.payload);
      }
    },
    setLocationPermission: (state, action) => {
      state.locationPermissionGranted = true;
      if (action.payload) {
        state.location    = action.payload;
        state.locationSet = true;
        AsyncStorage.setItem('userLocation', action.payload);
      }
    },
    toggleTheme: (state) => {
      state.darkMode = !state.darkMode;
    },
    setSplashDone: (state) => {
      state.splashDone = true;
    },
    logout: (state) => {
      state.token                     = null;
      state.user                      = null;
      state.locationSet               = false;
      state.location                  = null;
      state.locationPermissionGranted = false;
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('user');
      matchStorage.clearCache();
    },
  },
  extraReducers: (builder) => {
    builder
      // Email + Password (Login2Screen)
      .addCase(loginUser.pending,      (s)    => { s.status = 'loading'; s.error = null; })
      .addCase(loginUser.fulfilled,    (s, a) => {
        s.status = 'succeeded';
        s.token = a.payload?.token;
        s.user = a.payload?.user || a.payload?.profile;
        s.locationSet = true;
      })
      .addCase(loginUser.rejected,     (s, a) => { s.status = 'failed'; s.error = a.payload; })
      // OTP
      .addCase(sendOtp.pending,       (s)    => { s.status = 'loading'; s.error = null; })
      .addCase(sendOtp.fulfilled,     (s)    => { s.status = 'idle'; })
      .addCase(sendOtp.rejected,      (s, a) => { s.status = 'failed'; s.error = a.payload; })
      .addCase(verifyOtp.pending,     (s)    => { s.status = 'loading'; s.error = null; })
      .addCase(verifyOtp.fulfilled,   (s, a) => {
        s.status = 'succeeded';
        s.token = a.payload?.token;
        s.user = a.payload?.user || a.payload?.profile;
        s.locationSet = true;
      })
      .addCase(verifyOtp.rejected,    (s, a) => { s.status = 'failed'; s.error = a.payload; })
      // Mobile Password Login
      .addCase(mobileLoginUser.pending,    (s)    => { s.status = 'loading'; s.error = null; })
      .addCase(mobileLoginUser.fulfilled,  (s, a) => {
        s.status = 'succeeded';
        s.token = a.payload?.token;
        s.user = a.payload?.user || a.payload?.profile;
        s.locationSet = true;
      })
      .addCase(mobileLoginUser.rejected,   (s, a) => { s.status = 'failed'; s.error = a.payload; })
      // Google
      .addCase(googleLogin.pending,    (s)    => { s.status = 'loading'; s.error = null; })
      .addCase(googleLogin.fulfilled,  (s, a) => {
        s.status = 'succeeded';
        s.token = a.payload?.token;
        s.user = a.payload?.user || a.payload?.profile;
        s.locationSet = true;
      })
      .addCase(googleLogin.rejected,   (s, a) => { s.status = 'failed'; s.error = a.payload; })
      // Register
      .addCase(registerUser.pending,   (s)    => { s.status = 'loading'; s.error = null; })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.status = 'succeeded';
        if (a.payload?.token) {
          s.token = a.payload.token;
          s.user  = a.payload.user || a.payload.profile;
          s.locationSet = true;
        }
      })
      .addCase(registerUser.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; })
      // Bootstrap
      .addCase(bootstrapAuth.fulfilled, (s, a) => {
        s.token        = a.payload?.token;
        s.user         = a.payload?.user;
        s.bootstrapped = true;
        if (a.payload?.notificationsOn !== undefined) {
          s.notificationsOn = a.payload.notificationsOn;
        }
        if (a.payload?.token) {
          s.locationSet = true;
          s.locationPermissionGranted = true;
        }
        if (a.payload?.location) {
          s.location = a.payload.location;
        }
      })
      .addCase(bootstrapAuth.rejected,  (s)    => { s.bootstrapped = true; });
  },
});

export const {
  setAuth, updateUser, setLocation, setUserCoords,
  setLocationPermission, logout, toggleTheme, setSplashDone,
  toggleNotifications, setNotificationsOn,
} = authSlice.actions;

export default authSlice.reducer;