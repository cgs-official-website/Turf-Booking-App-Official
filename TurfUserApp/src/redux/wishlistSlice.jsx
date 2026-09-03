// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { wishlistApi } from '../mockApi/wishlist';
// import { turfs, wishlist } from '../mockApi/data';

// export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
//   try {
//     const res = await wishlistApi.getWishlist();
//     return res.wishlist;
//   } catch (e) {
//     return rejectWithValue(e.message);
//   }
// });

// export const toggleWishlist = createAsyncThunk('wishlist/toggle', async (turf, { getState, rejectWithValue }) => {
//   try {
//     const { wishlist } = getState().wishlist;
//     const exists = wishlist.some((t) => t._id === turf._id);
//     if (exists) {
//       await wishlistApi.remove(turf._id);
//       return { turf, added: false };
//     } else {
//       await wishlistApi.add(turf._id);
//       return { turf, added: true };
//     }
//   } catch (e) {
//     return rejectWithValue(e.message);
//   }
// });

// const wishlistSlice = createSlice({
//   name: 'wishlist',
//   initialState: { wishlist: [], status: 'idle' },
//   reducers: {},
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchWishlist.fulfilled, (state, action) => { state.wishlist = action.payload; state.status = 'succeeded'; })
//       .addCase(toggleWishlist.fulfilled, (state, action) => {
//         if (action.payload.added) state.wishlist.push(action.payload.turf);
//         else state.wishlist = state.wishlist.filter((t) => t._id !== action.payload.turf._id);
//       });
//   },
// });

// export default wishlistSlice.reducer;
// EOF

// cat > store.jsx << 'EOF'
// import { configureStore } from '@reduxjs/toolkit';
// import authReducer from './authSlice';
// import bookingReducer from './bookingSlice';
// import wishlistReducer from './wishlistSlice';

// export const store = configureStore({
//   reducer: {
//     auth: authReducer,
//     booking: bookingReducer,
//     wishlist: wishlistReducer,
//   },
// });

// src/redux/wishlistSlice.jsx
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { wishlistApi } from '../api/wishlist';

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await wishlistApi.getWishlist();
    return res.wishlist;
  } catch (e) {
    return rejectWithValue(e.message);
  }
});

export const toggleWishlist = createAsyncThunk('wishlist/toggle', async (target, { getState, rejectWithValue }) => {
  try {
    const turfId = typeof target === 'string' ? target : (target._id || target.id);
    const turfObj = typeof target === 'object' ? target : { _id: turfId, id: turfId };
    const { wishlist } = getState().wishlist;
    const exists = wishlist.some((t) => (t._id || t.id) === turfId);
    if (exists) {
      await wishlistApi.remove(turfId);
      return { turf: turfObj, turfId, added: false };
    } else {
      await wishlistApi.add(turfId);
      return { turf: turfObj, turfId, added: true };
    }
  } catch (e) {
    return rejectWithValue(e.message);
  }
});

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { wishlist: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.fulfilled, (state, a) => {
        state.wishlist = a.payload || [];
        state.status = 'succeeded';
      })
      .addCase(toggleWishlist.fulfilled, (state, a) => {
        const id = a.payload.turfId || a.payload.turf?._id || a.payload.turf?.id;
        if (a.payload.added) {
          if (!state.wishlist.some((t) => (t._id || t.id) === id)) {
            state.wishlist.push(a.payload.turf);
          }
        } else {
          state.wishlist = state.wishlist.filter((t) => (t._id || t.id) !== id);
        }
      });
  },
});

export default wishlistSlice.reducer;