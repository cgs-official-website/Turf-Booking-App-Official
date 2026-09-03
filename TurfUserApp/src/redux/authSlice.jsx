import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';

// ── Email + Password flow (Login2Screen) ────────────────────────────────────
export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await authApi.login(email, password);
    const payload = res?.data || res;
    if (payload?.token) {
      await AsyncStorage.setItem('token', payload.token);
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
    return payload;
  } catch (e) { return rejectWithValue(e.message); }
});

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { getState, rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const savedLocation = await AsyncStorage.getItem('userLocation');
    if (!token) return { token: null, user: null, location: savedLocation };
    const { auth } = getState();
    if (auth.user) return { token, user: auth.user, location: savedLocation };
    const res = await authApi.getMe();
    const payload = res?.data || res;
    return { token, user: payload?.user || payload?.profile || payload, location: savedLocation };
  } catch (e) {
    await AsyncStorage.removeItem('token');
    const savedLocation = await AsyncStorage.getItem('userLocation');
    return { token: null, user: null, location: savedLocation };
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
    locationPermissionGranted: false,
    darkMode:                  false,
  },
  reducers: {
    setAuth: (state, action) => {
      state.token = action.payload.token;
      state.user  = action.payload.user || action.payload.profile;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
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
      })
      .addCase(verifyOtp.rejected,    (s, a) => { s.status = 'failed'; s.error = a.payload; })
      // Google
      .addCase(googleLogin.pending,    (s)    => { s.status = 'loading'; s.error = null; })
      .addCase(googleLogin.fulfilled,  (s, a) => {
        s.status = 'succeeded';
        s.token = a.payload?.token;
        s.user = a.payload?.user || a.payload?.profile;
      })
      .addCase(googleLogin.rejected,   (s, a) => { s.status = 'failed'; s.error = a.payload; })
      // Register
      .addCase(registerUser.pending,   (s)    => { s.status = 'loading'; s.error = null; })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.status = 'succeeded';
        if (a.payload?.token) {
          s.token = a.payload.token;
          s.user  = a.payload.user || a.payload.profile;
        }
      })
      .addCase(registerUser.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; })
      // Bootstrap
      .addCase(bootstrapAuth.fulfilled, (s, a) => {
        s.token        = a.payload?.token;
        s.user         = a.payload?.user;
        s.bootstrapped = true;
        if (a.payload?.location) {
          s.location    = a.payload.location;
          s.locationSet = true;
          s.locationPermissionGranted = true;
        }
      })
      .addCase(bootstrapAuth.rejected,  (s)    => { s.bootstrapped = true; });
  },
});

export const {
  setAuth, updateUser, setLocation,
  setLocationPermission, logout, toggleTheme, setSplashDone,
} = authSlice.actions;

export default authSlice.reducer;