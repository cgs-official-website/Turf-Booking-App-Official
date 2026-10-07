import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginVendorApi, registerVendorApi, getMeApi, updateProfileApi } from '../api/auth';
import { getOnboardingStatus, uploadVendorKyc } from '../api/onboarding';

// ─── Persisted "Turf Approved" acknowledgment ─────────────────────────────────
// FIX: `turfApprovalAcknowledged` used to live in Redux memory only, so it
// reset to `false` on every cold start (splash screen resets the whole
// store). That made RootNavigator's `needsApprovalAck` check true again for
// vendors who had already acknowledged approval and subscribed ages ago,
// showing TurfApprovedScreen on every app open instead of going straight to
// Home. We now persist this flag in AsyncStorage (keyed per-vendor id so a
// different vendor logging in on the same device doesn't inherit it), hydrate
// it during bootstrapAuth, and clear it automatically whenever a fresh
// review cycle starts (turf goes back to 'pending', e.g. after adding a new
// turf) so that the *next* real approval still shows the screen once.
const turfAckKey = (vendorId) => `turfApprovalAcknowledged:${vendorId}`;

const getPersistedTurfAck = async (vendorId) => {
  if (!vendorId) return false;
  try {
    return (await AsyncStorage.getItem(turfAckKey(vendorId))) === 'true';
  } catch {
    return false;
  }
};

const setPersistedTurfAck = async (vendorId, value) => {
  if (!vendorId) return;
  try {
    if (value) {
      await AsyncStorage.setItem(turfAckKey(vendorId), 'true');
    } else {
      await AsyncStorage.removeItem(turfAckKey(vendorId));
    }
  } catch {
    // Non-fatal — worst case the flag doesn't persist and the screen may
    // show once more than ideal, but never blocks the vendor from Home.
  }
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const loginVendor = createAsyncThunk(
  'auth/loginVendor',
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await loginVendorApi(credentials);
      const vendor = data.vendor || data.profile;
      const kycStatus = vendor?.kycStatus || 'pending';

      if (kycStatus === 'pending') {
        return rejectWithValue(
          'Your account is pending Superadmin approval. You will be able to log in once your account has been approved.'
        );
      }

      if (kycStatus === 'rejected') {
        const reason = vendor?.rejectionReason ? `\nReason: ${vendor.rejectionReason}` : '';
        return rejectWithValue(
          `Your account registration was not approved.${reason}\nPlease contact support.`
        );
      }

      await AsyncStorage.setItem('vendorToken', data.token);
      await AsyncStorage.setItem('vendorData', JSON.stringify(data));
      const turfApprovalAcknowledged = await getPersistedTurfAck(vendor?._id || vendor?.uid);
      return { ...data, turfApprovalAcknowledged };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const registerVendor = createAsyncThunk(
  'auth/registerVendor',
  async (formDataWithKyc, { rejectWithValue }) => {
    try {
      const { kycData, ...regData } = formDataWithKyc || {};
      const data = await registerVendorApi(regData || formDataWithKyc);

      if (kycData && data?.token) {
        try {
          await uploadVendorKyc({
            ...kycData,
            token: data.token,
          });
        } catch (uploadErr) {
          console.warn('⚠️ KYC document upload during registration failed:', uploadErr.message);
        }
      }

      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrapAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('vendorToken');
      if (!token) return null;

      const cachedDataStr = await AsyncStorage.getItem('vendorData');
      let cachedData = null;
      if (cachedDataStr) {
        try { cachedData = JSON.parse(cachedDataStr); } catch (e) {}
      }

      if (cachedData && cachedData.vendor) {
        const turfApprovalAcknowledged = await getPersistedTurfAck(cachedData.vendor?._id || cachedData.vendor?.uid);
        getMeApi().then((data) => {
          if (data?.vendor) {
            AsyncStorage.setItem('vendorData', JSON.stringify(data)).catch(() => {});
          }
        }).catch(() => {});
        return { ...cachedData, token, turfApprovalAcknowledged };
      }

      const data = await Promise.race([
        getMeApi(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);

      const vendor = data.vendor || data.profile;
      if (vendor) {
        await AsyncStorage.setItem('vendorData', JSON.stringify(data));
      }
      const turfApprovalAcknowledged = await getPersistedTurfAck(vendor?._id || vendor?.uid);
      return { ...data, token, turfApprovalAcknowledged };
    } catch (err) {
      if (err?.response?.status === 401 || err?.status === 401) {
        await AsyncStorage.removeItem('vendorToken');
        await AsyncStorage.removeItem('vendorData');
        return rejectWithValue('Session expired. Please log in again.');
      }
      const cachedDataStr = await AsyncStorage.getItem('vendorData');
      if (cachedDataStr) {
        try {
          const cachedData = JSON.parse(cachedDataStr);
          if (cachedData && cachedData.vendor) {
            const turfApprovalAcknowledged = await getPersistedTurfAck(cachedData.vendor?._id || cachedData.vendor?.uid);
            return { ...cachedData, token, turfApprovalAcknowledged };
          }
        } catch (e) {}
      }
      return rejectWithValue(err.message);
    }
  }
);

export const updateVendorProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const data = await updateProfileApi(profileData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

import { fcmHelper } from '../utils/fcmHelper';

export const logoutVendor = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const vendorId = getState().auth?.vendor?._id;
  try {
    await fcmHelper.unregisterDeviceToken();
  } catch (err) {
    console.warn('⚠️ Error unregistering vendor FCM token on logout:', err.message);
  }
  await AsyncStorage.removeItem('vendorToken');
  await AsyncStorage.removeItem('vendorData');
  await setPersistedTurfAck(vendorId, false);
});

// FIX: this thunk was imported by RootNavigator.jsx and TurfUnderReviewScreen.jsx
// but was never actually defined/exported here. Since it was `undefined`,
// dispatch(fetchTurfStatus()) silently did nothing, so `turfStatus` in state
// never left its (missing) initial value. RootNavigator's `needsReview` check
// (turfStatus === null || 'pending' || 'rejected') was therefore always false,
// and vendors fell straight through to the Main/Home stack even when their
// turf hadn't been reviewed yet. This thunk hits the same endpoint the
// onboarding screens already know about (GET /api/vendor/onboarding/status)
// and reports back the turf's real review status so RootNavigator can show
// Under Review / Approved / Home correctly.
export const fetchTurfStatus = createAsyncThunk(
  'auth/fetchTurfStatus',
  async (_, { rejectWithValue, getState }) => {
    try {
      const data = await getOnboardingStatus();
      const status = data?.turf?.status || 'pending';
      if (status === 'pending') {
        // A fresh review cycle is underway (e.g. the vendor just added
        // another turf) — clear any previously-persisted acknowledgment so
        // the Approved screen shows once more when THIS review completes,
        // instead of being permanently silenced by an old approval.
        const vendorId = getState().auth?.vendor?._id;
        await setPersistedTurfAck(vendorId, false);
      }
      return data; // { hasCompletedTurfOnboarding, vendorKycStatus, turf: {...} | null }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

// Called locally right after the last onboarding step (Turf Verification)
// succeeds, so RootNavigator switches to the Main stack immediately without
// needing a fresh /getMe round-trip. The backend should still persist this
// flag server-side (see TurfVerificationScreen submit).
// Converted to a thunk (was a plain reducer) so it can also clear this
// vendor's persisted approval-ack — a brand new onboarding cycle should
// always earn a fresh "Turf Approved" screen later, same as adding another
// turf does via fetchTurfStatus above.
export const markTurfOnboardingComplete = createAsyncThunk(
  'auth/markTurfOnboardingComplete',
  async (_, { getState }) => {
    const vendorId = getState().auth?.vendor?._id;
    await setPersistedTurfAck(vendorId, false);
    return null;
  }
);

// Called from TurfApprovedScreen's "Continue" button. Converted to a thunk
// (was a plain reducer) so the acknowledgment survives app restarts —
// without this, the flag lived in Redux memory only and reset to false on
// every cold start, making the Approved screen reappear for vendors who'd
// already acknowledged it and subscribed.
export const acknowledgeTurfApproval = createAsyncThunk(
  'auth/acknowledgeTurfApproval',
  async (_, { getState }) => {
    const vendorId = getState().auth?.vendor?._id;
    await setPersistedTurfAck(vendorId, true);
    return null;
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    vendor: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    bootstrapping: true,
    error: null,
    registrationSuccess: false,
    // turfStatus: null (not fetched yet) | 'pending' | 'active' | 'rejected'
    turfStatus: null,
    // Snapshot of the vendor's turf (name, reviewedAt, rejectionReason, ...)
    // used by TurfUnderReviewScreen / TurfApprovedScreen.
    turfInfo: null,
    // Flips true once the vendor taps "Continue" on TurfApprovedScreen, so
    // RootNavigator only shows that screen once per approval. Persisted to
    // AsyncStorage (see acknowledgeTurfApproval/bootstrapAuth/loginVendor
    // above) so it survives app restarts instead of resetting every splash.
    turfApprovalAcknowledged: false,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearRegistrationSuccess: (state) => { state.registrationSuccess = false; },
  },
  extraReducers: (builder) => {
    // markTurfOnboardingComplete
    builder.addCase(markTurfOnboardingComplete.fulfilled, (state) => {
      if (state.vendor) {
        state.vendor.hasCompletedTurfOnboarding = true;
      }
      // Reset so RootNavigator's `turfStatus === null` effect re-fetches the
      // fresh (pending) status instead of reusing stale data from before.
      state.turfStatus = null;
      state.turfApprovalAcknowledged = false;
    });

    // acknowledgeTurfApproval
    builder.addCase(acknowledgeTurfApproval.fulfilled, (state) => {
      state.turfApprovalAcknowledged = true;
    });

    // Login
    builder
      .addCase(loginVendor.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginVendor.fulfilled, (state, action) => {
        state.loading = false;
        state.vendor = action.payload.vendor;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        // Reset any stale review status from a previous vendor's session so
        // RootNavigator re-fetches fresh data for whoever just logged in.
        state.turfStatus = null;
        state.turfInfo = null;
        // Hydrated from AsyncStorage (per-vendor key) in the loginVendor
        // thunk above, instead of always forcing false — a returning
        // vendor who already acknowledged approval on this device shouldn't
        // see the Approved screen again just by logging back in.
        state.turfApprovalAcknowledged = !!action.payload.turfApprovalAcknowledged;
      })
      .addCase(loginVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Register
    builder
      .addCase(registerVendor.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerVendor.fulfilled, (state) => {
        state.loading = false;
        state.registrationSuccess = true;
      })
      .addCase(registerVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Bootstrap
    builder
      .addCase(bootstrapAuth.pending, (state) => { state.bootstrapping = true; })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.bootstrapping = false;
        if (action.payload && (action.payload.vendor || action.payload.token)) {
          if (action.payload.vendor) state.vendor = action.payload.vendor;
          if (action.payload.token) state.token = action.payload.token;
          state.isAuthenticated = true;
          state.turfApprovalAcknowledged = !!action.payload.turfApprovalAcknowledged;
        }
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.bootstrapping = false;
        state.isAuthenticated = false;
      });

    // Update profile
    builder
      .addCase(updateVendorProfile.pending, (state) => { state.loading = true; })
      .addCase(updateVendorProfile.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload?.vendor || action.payload?.profile || action.payload || {};
        state.vendor = { ...state.vendor, ...updated };
      })
      .addCase(updateVendorProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Turf review status (drives Under Review / Approved / Home routing)
    builder
      .addCase(fetchTurfStatus.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const turf = payload.turf || null;
        const vendor = payload.vendor || state.vendor || {};

        const isApproved =
          payload.status === 'active' ||
          payload.turfStatus === 'active' ||
          turf?.status === 'active' ||
          payload.kycStatus === 'approved' ||
          vendor.kycStatus === 'approved';

        const isPending =
          !isApproved &&
          (payload.status === 'pending' ||
            payload.turfStatus === 'pending' ||
            turf?.status === 'pending' ||
            payload.kycStatus === 'pending' ||
            vendor.kycStatus === 'pending');

        if (isApproved) {
          state.turfStatus = 'active';
        } else if (isPending) {
          state.turfStatus = 'pending';
        } else {
          state.turfStatus = payload.turfStatus || turf?.status || 'pending';
        }

        state.turfInfo = turf || { name: vendor.turfName || vendor.businessName || vendor.name };

        if (state.vendor) {
          state.vendor.hasCompletedTurfOnboarding = true;
          state.vendor.turfOnboardingComplete = true;
          if (isApproved) {
            state.vendor.kycStatus = 'approved';
          }
        }

        if (state.turfStatus === 'pending') {
          state.turfApprovalAcknowledged = false;
        }
      })
      .addCase(fetchTurfStatus.rejected, (state) => {
        // Leave turfStatus as-is
      });

    // Logout
    builder.addCase(logoutVendor.fulfilled, (state) => {
      state.vendor = null;
      state.token = null;
      state.isAuthenticated = false;
      state.turfStatus = null;
      state.turfInfo = null;
      state.turfApprovalAcknowledged = false;
    });
  },
});

export const { clearError, clearRegistrationSuccess } = authSlice.actions;
export default authSlice.reducer;