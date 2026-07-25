import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import onboardingApi from '../api/onboarding';

const initialState = {
  // step 1 - basic setup
  logo: null,
  name: '',
  city: '',
  phone: '',
  pincode: '',
  address: '',
  sports: [],
  facilities: [],

  // step 2 - configure
  openTime: '06:00 AM',
  closeTime: '11:00 PM',
  slotDuration: '1 hour',

  // step 3 - business setup
  price: '',
  eveningPrice: '',
  weekendPrice: '',
  weekendEveningPrice: '',
  images: [],

  // ids / status
  turfId: null,
  vendorKycStatus: 'not_started', // not_started | pending | approved | rejected
  turfKycStatus: 'not_started',
  loading: false,
  error: null,
};

export const submitVendorKyc = createAsyncThunk(
  'onboarding/submitVendorKyc',
  async (payload, { rejectWithValue }) => {
    try {
      return await onboardingApi.uploadVendorKyc(payload);
    } catch (err) {
      return rejectWithValue(err?.message || 'Vendor verification failed');
    }
  }
);

export const submitTurfDraft = createAsyncThunk(
  'onboarding/submitTurfDraft',
  async (_, { getState, rejectWithValue }) => {
    try {
      const s = getState().onboarding;
      const payload = {
        logo: s.logo,
        name: s.name,
        city: s.city,
        phone: s.phone,
        pincode: s.pincode,
        address: s.address,
        location: `${s.address}, ${s.city} - ${s.pincode}`, // backend requires a combined 'location' field
        sports: s.sports,
        facilities: s.facilities,
        openTime: s.openTime,
        closeTime: s.closeTime,
        slotDuration: s.slotDuration,
        price: s.price,
        eveningPrice: s.eveningPrice,
        weekendPrice: s.weekendPrice,
        weekendEveningPrice: s.weekendEveningPrice,
        images: s.images,
      };
      return await onboardingApi.createTurfDraft(payload);
    } catch (err) {
      // apiRequest (client.js) throws a plain Error whose message is either the
      // backend's data.message or a network-level message (e.g. "Network request failed").
      console.log('submitTurfDraft error >>>', err?.message);
      return rejectWithValue(err?.message || 'Turf creation failed');
    }
  }
);

export const submitTurfKyc = createAsyncThunk(
  'onboarding/submitTurfKyc',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const turfId = getState().onboarding.turfId;
      return await onboardingApi.uploadTurfKyc({ turfId, ...payload });
    } catch (err) {
      return rejectWithValue(err?.message || 'Turf verification failed');
    }
  }
);

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    setField: (state, action) => {
      const { key, value } = action.payload;
      state[key] = value;
    },
    toggleSport: (state, action) => {
      const sport = action.payload;
      state.sports = state.sports.includes(sport)
        ? state.sports.filter((s) => s !== sport)
        : [...state.sports, sport];
    },
    toggleFacility: (state, action) => {
      const facility = action.payload;
      state.facilities = state.facilities.includes(facility)
        ? state.facilities.filter((f) => f !== facility)
        : [...state.facilities, facility];
    },
    addCustomFacility: (state, action) => {
      if (action.payload && !state.facilities.includes(action.payload)) {
        state.facilities.push(action.payload);
      }
    },
    resetOnboarding: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitVendorKyc.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(submitVendorKyc.fulfilled, (state) => { state.loading = false; state.vendorKycStatus = 'pending'; })
      .addCase(submitVendorKyc.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(submitTurfDraft.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(submitTurfDraft.fulfilled, (state, action) => {
        state.loading = false;
        state.turfId = action.payload.turfId;
      })
      .addCase(submitTurfDraft.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(submitTurfKyc.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(submitTurfKyc.fulfilled, (state) => { state.loading = false; state.turfKycStatus = 'pending'; })
      .addCase(submitTurfKyc.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { setField, toggleSport, toggleFacility, addCustomFacility, resetOnboarding } = onboardingSlice.actions;
export default onboardingSlice.reducer;