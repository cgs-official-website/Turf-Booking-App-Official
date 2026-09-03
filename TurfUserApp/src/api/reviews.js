// Client wrapper for reviews API endpoints
import { client as api } from './client';

export const reviewsApi = {
  submitReview: (bookingId, rating, comment) =>
    api.post('/reviews', { bookingId, rating, comment }).then((res) => res.data),

  getMyReviewedBookings: () =>
    api.get('/reviews/mine').then((res) => res.data.bookingIds),
};