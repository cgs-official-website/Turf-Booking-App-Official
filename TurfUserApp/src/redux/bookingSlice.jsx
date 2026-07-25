// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { bookingsApi } from '../api/bookings';

// export const fetchMyBookings = createAsyncThunk('booking/fetchMine', async (status, { rejectWithValue }) => {
//   try {
//     const res = await bookingsApi.getMyBookings(status);
//     return res.bookings;
//   } catch (e) {
//     return rejectWithValue(e.message);
//   }
// });

// const bookingSlice = createSlice({
//   name: 'booking',
//   initialState: {
//     bookings: [],
//     status: 'idle',
//     error: null,
//   },
//   reducers: {
//     setBookings: (state, action) => { state.bookings = action.payload; },
//     addBooking: (state, action) => { state.bookings.unshift(action.payload); },
//     updateBookingInList: (state, action) => {
//       const idx = state.bookings.findIndex((b) => b._id === action.payload._id);
//       if (idx !== -1) state.bookings[idx] = action.payload;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchMyBookings.pending, (state) => { state.status = 'loading'; })
//       .addCase(fetchMyBookings.fulfilled, (state, action) => { state.status = 'succeeded'; state.bookings = action.payload; })
//       .addCase(fetchMyBookings.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; });
//   },
// });

// export const { setBookings, addBooking, updateBookingInList } = bookingSlice.actions;
// export default bookingSlice.reducer;

// src/redux/bookingSlice.jsx
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bookingsApi } from '../api/bookings';

export const fetchMyBookings = createAsyncThunk('booking/fetchMine', async (status, { rejectWithValue }) => {
  try {
    const res = await bookingsApi.getMyBookings(status);
    return res.bookings;
  } catch (e) {
    return rejectWithValue(e.message);
  }
});

const bookingSlice = createSlice({
  name: 'booking',
  initialState: { bookings: [], status: 'idle', error: null },
  reducers: {
    setBookings: (state, a) => { state.bookings = a.payload; },
    addBooking:  (state, a) => { state.bookings.unshift(a.payload); },
    updateBookingInList: (state, a) => {
      const idx = state.bookings.findIndex((b) => b._id === a.payload._id);
      if (idx !== -1) state.bookings[idx] = a.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBookings.pending,   (s) => { s.status = 'loading'; })
      .addCase(fetchMyBookings.fulfilled, (s, a) => { s.status = 'succeeded'; s.bookings = a.payload; })
      .addCase(fetchMyBookings.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });
  },
});

export const { setBookings, addBooking, updateBookingInList } = bookingSlice.actions;
export default bookingSlice.reducer;