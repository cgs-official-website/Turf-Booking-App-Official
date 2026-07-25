// ⚠️ CHECK THIS: adjust the import below to match however your other
// api files (e.g. api/bookings.js, api/turfs.js) import the axios instance.
// Common patterns are `import api from './client'` or `import axiosInstance from './axios'`.
import api from './client';

export const reviewsApi = {
  submitReview: (bookingId, rating, comment) =>
    api.post('/reviews', { bookingId, rating, comment }).then((res) => res.data),

  getMyReviewedBookings: () =>
    api.get('/reviews/mine').then((res) => res.data.bookingIds),
};