// import { configureStore } from '@reduxjs/toolkit';
// import authReducer from './authSlice';
// import bookingReducer from './bookingSlice';

// export const store = configureStore({
//   reducer: {
//     auth: authReducer,
//     booking: bookingReducer,
//   },
// });

// src/redux/store.jsx
import { configureStore } from '@reduxjs/toolkit';
import authReducer    from './authSlice';
import bookingReducer from './bookingSlice';
import wishlistReducer from './wishlistSlice';

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    booking:  bookingReducer,
    wishlist: wishlistReducer,
  },
});