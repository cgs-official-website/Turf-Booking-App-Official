import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getMyTurfsApi, getTurfByIdApi, addTurfApi, updateTurfApi, deleteTurfApi,
  updateTurfInfoApi, updateTurfAmenitiesApi,
  addSlotApi, deleteSlotApi, getSlotCalendarApi, freezeSlotApi,
} from '../api/turfs';
import {
  getBookingsApi, getBookingDetailApi, acceptBookingApi, rejectBookingApi,
} from '../api/bookings';
import { getDashboardStatsApi, getRevenueApi } from '../api/dashboard';
import {
  getSubscriptionPlansApi, createSubscriptionOrderApi, verifySubscriptionPaymentApi,
  getMySubscriptionApi, getSubscriptionHistoryApi,
} from '../api/subscriptions';
import { getMyReviewsApi, toggleReviewVisibilityApi, deleteReviewApi } from '../api/reviews';
import { loginVendor, logoutVendor } from './authSlice';
import { getIssueTypesApi, submitReportApi } from '../api/reports';
 
// ─── Turf Thunks ─────────────────────────────────────────────────────────────
 
export const fetchIssueTypes = createAsyncThunk(
  'vendor/fetchIssueTypes',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getIssueTypesApi();
      return res.issueTypes;
    } catch (err) {
      return rejectWithValue(err.message || 'Could not load issue types');
    }
  }
);
 
export const submitReport = createAsyncThunk(
  'vendor/submitReport',
  async ({ issueType, description }, { rejectWithValue }) => {
    try {
      const res = await submitReportApi({ issueType, description });
      return res.report; // { reportId, issueType, description, status, ... }
    } catch (err) {
      return rejectWithValue(err.message || 'Could not submit report');
    }
  }
);

 
export const fetchMyTurfs = createAsyncThunk('vendor/fetchMyTurfs', async (_, { rejectWithValue }) => {
  try { return await getMyTurfsApi(); } catch (e) { return rejectWithValue(e.message); }
});
 
export const fetchTurfById = createAsyncThunk('vendor/fetchTurfById', async (id, { rejectWithValue }) => {
  try { return await getTurfByIdApi(id); } catch (e) { return rejectWithValue(e.message); }
});
 
export const addTurf = createAsyncThunk('vendor/addTurf', async (data, { rejectWithValue }) => {
  try { return await addTurfApi(data); } catch (e) { return rejectWithValue(e.message); }
});
 
export const updateTurf = createAsyncThunk('vendor/updateTurf', async ({ id, data }, { rejectWithValue }) => {
  try { return await updateTurfApi(id, data); } catch (e) { return rejectWithValue(e.message); }
});
 
export const deleteTurf = createAsyncThunk('vendor/deleteTurf', async (id, { rejectWithValue }) => {
  try { await deleteTurfApi(id); return id; } catch (e) { return rejectWithValue(e.message); }
});
 
export const addSlot = createAsyncThunk('vendor/addSlot', async ({ turfId, slot }, { rejectWithValue }) => {
  try { return await addSlotApi(turfId, slot); } catch (e) { return rejectWithValue(e.message); }
});
 
export const deleteSlot = createAsyncThunk('vendor/deleteSlot', async ({ turfId, slotId }, { rejectWithValue }) => {
  // FIX: deleteSlotApi's response already contains { success, turf } (the
  // updated turf with the slot removed) — previously this was thrown away
  // and only { turfId, slotId } was returned, so the fulfilled reducer had
  // nothing to update state.turfs with.
  try { return await deleteSlotApi(turfId, slotId); } catch (e) { return rejectWithValue(e.message); }
});
 
// dateStr: "YYYY-MM-DD"
export const fetchSlotCalendar = createAsyncThunk(
  'vendor/fetchSlotCalendar',
  async ({ turfId, dateStr }, { rejectWithValue }) => {
    try {
      const res = await getSlotCalendarApi(turfId, dateStr);
      console.log('slotCalendar API response:', JSON.stringify(res));
      return res;
    } catch (e) { return rejectWithValue(e.message); }
  }
);
 
// payload: { turfId, date, startTime, endTime, action: 'freeze' | 'unfreeze' }
export const toggleFreezeSlot = createAsyncThunk(
  'vendor/toggleFreezeSlot',
  async ({ turfId, ...body }, { rejectWithValue }) => {
    try {
      const res = await freezeSlotApi(turfId, body);
      return { startTime: body.startTime, status: res.status };
    } catch (e) { return rejectWithValue(e.message); }
  }
);
 
// TurfProfileScreen reads/writes a single "current" turf (state.vendor.turf)
// rather than the turfs list, so it needs its own thunks. There's no
// dedicated backend route per section (info/timing/pricing/amenities) yet —
// they all reuse the generic updateTurfApi(id, payload) against whichever
// turf is currently active/selected.
const resolveActiveTurfId = (state) =>
  state.vendor.turf?._id ||
  state.vendor.selectedTurf?._id ||
  state.vendor.activeTurfId ||
  state.vendor.turfs[0]?._id;

export const fetchMyTurf = createAsyncThunk('vendor/fetchMyTurf', async (_, { getState, rejectWithValue }) => {
  try {
    const id = resolveActiveTurfId(getState());
    if (id) return await getTurfByIdApi(id);
    const res = await getMyTurfsApi();
    return { turf: res.turfs?.[0] || null };
  } catch (e) { return rejectWithValue(e.message); }
});

export const updateTurfInfo = createAsyncThunk('vendor/updateTurfInfo', async (payload, { getState, rejectWithValue }) => {
  try { return await updateTurfInfoApi(resolveActiveTurfId(getState()), payload); } catch (e) { return rejectWithValue(e.message); }
});

export const updateTurfTiming = createAsyncThunk('vendor/updateTurfTiming', async (payload, { getState, rejectWithValue }) => {
  try { return await updateTurfApi(resolveActiveTurfId(getState()), payload); } catch (e) { return rejectWithValue(e.message); }
});

export const updateTurfPricing = createAsyncThunk('vendor/updateTurfPricing', async (payload, { getState, rejectWithValue }) => {
  try { return await updateTurfApi(resolveActiveTurfId(getState()), payload); } catch (e) { return rejectWithValue(e.message); }
});

export const updateTurfAmenities = createAsyncThunk('vendor/updateTurfAmenities', async (payload, { getState, rejectWithValue }) => {
  try { return await updateTurfAmenitiesApi(resolveActiveTurfId(getState()), payload); } catch (e) { return rejectWithValue(e.message); }
});

// ─── Booking Thunks ───────────────────────────────────────────────────────────
 
export const fetchBookings = createAsyncThunk('vendor/fetchBookings', async (turfId, { rejectWithValue }) => {
  try { return await getBookingsApi(turfId); } catch (e) { return rejectWithValue(e.message); }
});
 
export const fetchBookingDetail = createAsyncThunk('vendor/fetchBookingDetail', async (id, { rejectWithValue }) => {
  try { return await getBookingDetailApi(id); } catch (e) { return rejectWithValue(e.message); }
});
 
export const acceptBooking = createAsyncThunk('vendor/acceptBooking', async (id, { rejectWithValue }) => {
  try { return await acceptBookingApi(id); } catch (e) { return rejectWithValue(e.message); }
});
 
export const rejectBooking = createAsyncThunk('vendor/rejectBooking', async ({ id, reason }, { rejectWithValue }) => {
  try { return await rejectBookingApi(id, reason); } catch (e) { return rejectWithValue(e.message); }
});
 
// ─── Review Thunks ────────────────────────────────────────────────────────────

export const fetchMyReviews = createAsyncThunk('vendor/fetchMyReviews', async (_, { rejectWithValue }) => {
  try { return await getMyReviewsApi(); } catch (e) { return rejectWithValue(e.message); }
});

export const toggleReviewVisibility = createAsyncThunk('vendor/toggleReviewVisibility', async (id, { rejectWithValue }) => {
  try { return await toggleReviewVisibilityApi(id); } catch (e) { return rejectWithValue(e.message); }
});

export const deleteReview = createAsyncThunk('vendor/deleteReview', async (id, { rejectWithValue }) => {
  try { await deleteReviewApi(id); return id; } catch (e) { return rejectWithValue(e.message); }
});

// ─── Dashboard Thunks ────────────────────────────────────────────────────────
 
export const fetchDashboard = createAsyncThunk('vendor/fetchDashboard', async (_, { rejectWithValue }) => {
  try { return await getDashboardStatsApi(); } catch (e) { return rejectWithValue(e.message); }
});
 
export const fetchRevenue = createAsyncThunk('vendor/fetchRevenue', async (period, { rejectWithValue }) => {
  try { return await getRevenueApi(period); } catch (e) { return rejectWithValue(e.message); }
});
 
// ─── Subscription Thunks ─────────────────────────────────────────────────────
 
export const fetchPlans = createAsyncThunk('vendor/fetchPlans', async (_, { rejectWithValue }) => {
  try { return await getSubscriptionPlansApi(); } catch (e) { return rejectWithValue(e.message); }
});
 
// Step 1 of real Razorpay flow — ask backend for a real order to hand to
// RazorpayCheckout.open(). Does NOT activate the subscription.
export const createSubscriptionOrder = createAsyncThunk(
  'vendor/createSubscriptionOrder',
  async (planId, { rejectWithValue }) => {
    try { return await createSubscriptionOrderApi(planId); } catch (e) { return rejectWithValue(e.message); }
  }
);
 
// Step 2 — after RazorpayCheckout resolves with a payment response on the
// device, verify the signature server-side and activate the subscription.
export const verifySubscriptionPayment = createAsyncThunk(
  'vendor/verifySubscriptionPayment',
  async (payload, { rejectWithValue }) => {
    try { return await verifySubscriptionPaymentApi(payload); } catch (e) { return rejectWithValue(e.message); }
  }
);
 
export const fetchMySubscription = createAsyncThunk('vendor/fetchMySubscription', async (_, { rejectWithValue }) => {
  try { return await getMySubscriptionApi(); } catch (e) { return rejectWithValue(e.message); }
});
 
export const fetchSubscriptionHistory = createAsyncThunk('vendor/fetchSubscriptionHistory', async (_, { rejectWithValue }) => {
  try { return await getSubscriptionHistoryApi(); } catch (e) { return rejectWithValue(e.message); }
});
 
// ─── Notification Thunks ─────────────────────────────────────────────────────
// TEMP STUB: point these at your real notifications API once you confirm the
// file path (e.g. '../api/notifications'). Left as inline no-ops for now so
// the app doesn't crash on an unresolved import — swap the try blocks below.

export const fetchNotifications = createAsyncThunk('vendor/fetchNotifications', async (_, { rejectWithValue }) => {
  try {
    // return await getNotificationsApi();
    return { notifications: [] };
  } catch (e) { return rejectWithValue(e.message); }
});

export const markAllNotificationsRead = createAsyncThunk('vendor/markAllNotificationsRead', async (_, { rejectWithValue }) => {
  try {
    // await markAllNotificationsReadApi();
    return true;
  } catch (e) { return rejectWithValue(e.message); }
});

// ─── Slice ────────────────────────────────────────────────────────────────────
 
const vendorSlice = createSlice({
  name: 'vendor',
  initialState: {
    // Turfs
    turfs: [],
    selectedTurf: null,
    // Single "current" turf used by TurfProfileScreen (edit-my-turf flow),
    // separate from the turfs list / switcher's selectedTurf.
    turf: null,
    // Which turf is showing in the Home header/switcher. Defaults to the
    // vendor's first turf once fetchMyTurfs resolves (see extraReducers
    // below) and is updated when the vendor picks a different one from the
    // switcher dropdown.
    activeTurfId: null,
    // Slot Calendar (Slot Calendar screen — date-specific slot grid)
    slotCalendarDate: null,
    slotCalendar: [],       // [{ startTime, endTime, status, bookingId }]
    slotCounts: { available: 0, requested: 0, booked: 0, frozen: 0, total: 0 },
    slotCalendarLoading: false,
    slotActionLoading: false,
    // Reviews
    reviews: [],
    ratingSummary: null,
    // Bookings
    bookings: [],
    selectedBooking: null,
    // Dashboard
    dashboardStats: null,
    revenueData: null,
    // Subscriptions
    plans: [],
    mySubscription: null,
    subscriptionHistory: [],
    // True once fetchMySubscription has resolved (success or failure) at
    // least once this session. RootNavigator uses this — rather than just
    // `mySubscription` — to tell "haven't checked yet" apart from
    // "checked, and there genuinely isn't one" (mySubscription is null in
    // both cases, but only the latter should force the paywall screen).
    subscriptionChecked: false,
    // Holds the in-flight Razorpay order while SubscribeScreen has the
    // checkout sheet open (order id, amount, keyId, plan).
    pendingOrder: null,
    // Report an Issue
    issueTypes: [],
    reportSubmitting: false,
    reportSubmitted: null,
    reportError: null,
    // Notifications
    notifications: [],
    unreadNotificationCount: 0,
    // UI
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearVendorError: (state) => { state.error = null; },
    clearSuccessMessage: (state) => { state.successMessage = null; },
    clearSelectedTurf: (state) => { state.selectedTurf = null; },
    clearSelectedBooking: (state) => { state.selectedBooking = null; },
    clearPendingOrder: (state) => { state.pendingOrder = null; },
    setActiveTurf: (state, action) => { state.activeTurfId = action.payload; },
    clearReportSubmitted: (state) => {
      state.reportSubmitted = null;
      state.reportError = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    // Report an Issue
    builder
      .addCase(fetchIssueTypes.fulfilled, (state, { payload }) => {
        state.issueTypes = payload || [];
      })
      .addCase(fetchIssueTypes.rejected, () => {
        // Silent failure is fine here — ReportIssuesScreen falls back to
        // FALLBACK_ISSUE_TYPES when issueTypes is empty.
      })

      .addCase(submitReport.pending, (state) => {
        state.reportSubmitting = true;
        state.reportError = null;
      })
      .addCase(submitReport.fulfilled, (state, { payload }) => {
        state.reportSubmitting = false;
        state.reportSubmitted = payload;
      })
      .addCase(submitReport.rejected, (state, action) => {
        state.reportSubmitting = false;
        state.reportError = action.payload;
      });

    // Turfs
    builder
      .addCase(fetchMyTurfs.pending, pending)
      .addCase(fetchMyTurfs.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.turfs = payload.turfs;
        // Default the switcher to the first turf the first time we load the
        // list, and recover gracefully if the previously-active turf got
        // deleted elsewhere.
        const stillExists = state.turfs.some((t) => t._id === state.activeTurfId);
        if (!stillExists) {
          state.activeTurfId = state.turfs[0]?._id || null;
        }
      })
      .addCase(fetchMyTurfs.rejected, rejected)
 
      .addCase(fetchTurfById.pending, pending)
      .addCase(fetchTurfById.fulfilled, (state, { payload }) => { state.loading = false; state.selectedTurf = payload.turf; })
      .addCase(fetchTurfById.rejected, rejected)
 
      .addCase(addTurf.pending, pending)
      .addCase(addTurf.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.turfs.unshift(payload.turf);
        state.activeTurfId = payload.turf._id; // switch to the newly added turf
        state.successMessage = 'Turf added successfully';
      })
      .addCase(addTurf.rejected, rejected)
 
      .addCase(updateTurf.pending, pending)
      .addCase(updateTurf.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.turfs.findIndex(t => t._id === payload.turf._id);
        if (idx !== -1) state.turfs[idx] = payload.turf;
        state.selectedTurf = payload.turf;
        state.successMessage = 'Turf updated successfully';
      })
      .addCase(updateTurf.rejected, rejected)
 
      .addCase(deleteTurf.pending, pending)
      .addCase(deleteTurf.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.turfs = state.turfs.filter(t => t._id !== payload);
        if (state.activeTurfId === payload) {
          state.activeTurfId = state.turfs[0]?._id || null;
        }
        state.successMessage = 'Turf deleted';
      })
      .addCase(deleteTurf.rejected, rejected);

    // Turf profile (TurfProfileScreen's single-turf edit flow)
    builder
      .addCase(fetchMyTurf.pending, pending)
      .addCase(fetchMyTurf.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.turf = payload.turf;
      })
      .addCase(fetchMyTurf.rejected, rejected)

      .addCase(updateTurfInfo.pending, pending)
      .addCase(updateTurfInfo.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.turf = payload.turf;
        state.successMessage = 'Turf info updated';
      })
      .addCase(updateTurfInfo.rejected, rejected)

      .addCase(updateTurfTiming.pending, pending)
      .addCase(updateTurfTiming.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.turf = payload.turf;
        state.successMessage = 'Turf timing updated';
      })
      .addCase(updateTurfTiming.rejected, rejected)

      .addCase(updateTurfPricing.pending, pending)
      .addCase(updateTurfPricing.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.turf = payload.turf;
        state.successMessage = 'Turf pricing updated';
      })
      .addCase(updateTurfPricing.rejected, rejected)

      .addCase(updateTurfAmenities.pending, pending)
      .addCase(updateTurfAmenities.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.turf = payload.turf;
        state.successMessage = 'Turf amenities updated';
      })
      .addCase(updateTurfAmenities.rejected, rejected);
 
    // Slot Calendar
    builder
      .addCase(fetchSlotCalendar.pending, (state) => { state.slotCalendarLoading = true; state.error = null; })
      .addCase(fetchSlotCalendar.fulfilled, (state, { payload }) => {
        state.slotCalendarLoading = false;
        state.slotCalendarDate = payload.date;
        state.slotCalendar = payload.slots;
        state.slotCounts = payload.counts;
      })
      .addCase(fetchSlotCalendar.rejected, (state, action) => {
        state.slotCalendarLoading = false;
        state.error = action.payload;
      })
 
      .addCase(toggleFreezeSlot.pending, (state) => { state.slotActionLoading = true; state.error = null; })
      .addCase(toggleFreezeSlot.fulfilled, (state, { payload }) => {
        state.slotActionLoading = false;
        const slot = state.slotCalendar.find((s) => s.startTime === payload.startTime);
        if (slot) {
          // Move the old status's count down and the new one up so the
          // stat cards stay correct without an extra round-trip.
          const dec = { available: 'available', frozen: 'frozen' }[slot.status] || slot.status;
          if (state.slotCounts[dec] !== undefined) state.slotCounts[dec] = Math.max(0, state.slotCounts[dec] - 1);
          const inc = { available: 'available', frozen: 'frozen' }[payload.status] || payload.status;
          if (state.slotCounts[inc] !== undefined) state.slotCounts[inc] += 1;
          slot.status = payload.status;
        }
      })
      .addCase(toggleFreezeSlot.rejected, (state, action) => {
        state.slotActionLoading = false;
        state.error = action.payload;
      })

      // FIX: addSlot/deleteSlot call addSlotApi/deleteSlotApi and the
      // backend returns the *updated* turf (with the new/removed entry in
      // turf.slots), but there was no reducer case putting that turf back
      // into state.turfs. SlotTemplateModal reads `activeTurf?.slots`
      // straight from state.turfs, so the template list looked "stuck"
      // even though the save succeeded on the server.
      .addCase(addSlot.pending, (state) => { state.slotActionLoading = true; state.error = null; })
      .addCase(addSlot.fulfilled, (state, { payload }) => {
        state.slotActionLoading = false;
        const idx = state.turfs.findIndex((t) => t._id === payload.turf._id);
        if (idx !== -1) state.turfs[idx] = payload.turf;
        if (state.selectedTurf?._id === payload.turf._id) state.selectedTurf = payload.turf;
      })
      .addCase(addSlot.rejected, (state, action) => {
        state.slotActionLoading = false;
        state.error = action.payload;
      })

      .addCase(deleteSlot.pending, (state) => { state.slotActionLoading = true; state.error = null; })
      .addCase(deleteSlot.fulfilled, (state, { payload }) => {
        state.slotActionLoading = false;
        const idx = state.turfs.findIndex((t) => t._id === payload.turf._id);
        if (idx !== -1) state.turfs[idx] = payload.turf;
        if (state.selectedTurf?._id === payload.turf._id) state.selectedTurf = payload.turf;
      })
      .addCase(deleteSlot.rejected, (state, action) => {
        state.slotActionLoading = false;
        state.error = action.payload;
      });
 
    // Bookings
    builder
      .addCase(fetchBookings.pending, pending)
      .addCase(fetchBookings.fulfilled, (state, { payload }) => { state.loading = false; state.bookings = payload.bookings; })
      .addCase(fetchBookings.rejected, rejected)
 
      .addCase(fetchBookingDetail.pending, pending)
      .addCase(fetchBookingDetail.fulfilled, (state, { payload }) => { state.loading = false; state.selectedBooking = payload.booking; })
      .addCase(fetchBookingDetail.rejected, rejected)
 
      .addCase(acceptBooking.pending, pending)
      .addCase(acceptBooking.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.bookings.findIndex(b => b._id === payload.booking._id);
        if (idx !== -1) state.bookings[idx] = payload.booking;
        if (state.selectedBooking?._id === payload.booking._id) state.selectedBooking = payload.booking;
        state.successMessage = 'Booking accepted';
      })
      .addCase(acceptBooking.rejected, rejected)
 
      .addCase(rejectBooking.pending, pending)
      .addCase(rejectBooking.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.bookings.findIndex(b => b._id === payload.booking._id);
        if (idx !== -1) state.bookings[idx] = payload.booking;
        if (state.selectedBooking?._id === payload.booking._id) state.selectedBooking = payload.booking;
        state.successMessage = 'Booking rejected';
      })
      .addCase(rejectBooking.rejected, rejected);

    // Reviews
    builder
      .addCase(fetchMyReviews.pending, pending)
      .addCase(fetchMyReviews.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.reviews = payload.reviews;
        state.ratingSummary = payload.ratingSummary;
      })
      .addCase(fetchMyReviews.rejected, rejected)

      .addCase(toggleReviewVisibility.fulfilled, (state, { payload }) => {
        const idx = state.reviews.findIndex((r) => r._id === payload.review._id);
        if (idx !== -1) state.reviews[idx] = payload.review;
      })
      .addCase(toggleReviewVisibility.rejected, (state, action) => { state.error = action.payload; })

      .addCase(deleteReview.fulfilled, (state, { payload }) => {
        state.reviews = state.reviews.filter((r) => r._id !== payload);
        state.successMessage = 'Review deleted';
      })
      .addCase(deleteReview.rejected, (state, action) => { state.error = action.payload; });
 
    // Dashboard
    builder
      .addCase(fetchDashboard.pending, pending)
      .addCase(fetchDashboard.fulfilled, (state, { payload }) => { state.loading = false; state.dashboardStats = payload.stats; })
      .addCase(fetchDashboard.rejected, rejected)
 
      .addCase(fetchRevenue.fulfilled, (state, { payload }) => { state.revenueData = payload.revenue; });
 
    // Subscriptions
    builder
      .addCase(fetchPlans.fulfilled, (state, { payload }) => { state.plans = payload.plans; })
      .addCase(fetchMySubscription.fulfilled, (state, { payload }) => {
        state.mySubscription = payload.subscription;
        state.subscriptionChecked = true;
      })
      .addCase(fetchMySubscription.rejected, (state) => {
        // Still mark "checked" on failure — RootNavigator would otherwise
        // spin on the splash screen forever on a network hiccup. The user
        // can retry from the paywall screen (it re-fetches on mount too).
        state.subscriptionChecked = true;
      })
      .addCase(fetchSubscriptionHistory.fulfilled, (state, { payload }) => { state.subscriptionHistory = payload.history; })

      // Notifications — unreadNotificationCount drives the bell dot in
      // TurfSwitcher. Recompute it from the payload every fetch, and zero
      // it out immediately (optimistic) when the vendor marks all as read
      // so the dot disappears without waiting for a refetch.
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.notifications = payload.notifications || [];
        state.unreadNotificationCount = state.notifications.filter((n) => !n.isRead).length;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({ ...n, isRead: true }));
        state.unreadNotificationCount = 0;
      })
 
      .addCase(createSubscriptionOrder.pending, pending)
      .addCase(createSubscriptionOrder.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.pendingOrder = payload; // { order, keyId, plan }
      })
      .addCase(createSubscriptionOrder.rejected, rejected)
 
      .addCase(verifySubscriptionPayment.pending, pending)
      .addCase(verifySubscriptionPayment.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.mySubscription = payload.subscription;
        state.subscriptionChecked = true;
        state.pendingOrder = null;
        state.successMessage = payload.message || 'Subscription activated!';
      })
      .addCase(verifySubscriptionPayment.rejected, rejected);
 
    // Reset subscription-check state around auth transitions so a freshly
    // logged-in vendor doesn't briefly see the previous vendor's plan data,
    // and so RootNavigator re-checks subscription status for them.
    builder
      .addCase(loginVendor.fulfilled, (state) => {
        state.mySubscription = null;
        state.subscriptionChecked = false;
        state.pendingOrder = null;
      })
      .addCase(logoutVendor.fulfilled, (state) => {
        state.mySubscription = null;
        state.subscriptionChecked = false;
        state.pendingOrder = null;
        state.plans = [];
        state.subscriptionHistory = [];
        state.turfs = [];
        state.turf = null;
        state.reviews = [];
        state.ratingSummary = null;
        state.activeTurfId = null;
      });
  },
});
 
export const { clearVendorError, clearSuccessMessage, clearSelectedTurf, clearSelectedBooking, clearPendingOrder, setActiveTurf, clearReportSubmitted } = vendorSlice.actions;
export default vendorSlice.reducer;