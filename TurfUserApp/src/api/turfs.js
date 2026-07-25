// src/api/turfs.js
import { client } from './client';

const buildQuery = (params = {}) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `?${qs}` : '';
};

export const turfsApi = {
  // GET /api/turfs?search=&sport=&city=&location=&minPrice=&maxPrice=&sort=&minRating=&timeOfDay=
  // `location` = free text from LocationScreen (Google Places pick or a top-location tap).
  // Backend regex-matches it against address/city/state/pincode — so "Chennai" or
  // "Anna Nagar" both work regardless of which field the turf actually stored it in.
  getTurfs:        (filters = {})    => client.get(`/turfs${buildQuery(filters)}`),
  // GET /api/turfs/meta/filters  → { sports: [], cities: [] }
  getFilterMeta:   ()                => client.get('/turfs/meta/filters'),
  // GET /api/turfs/:id
  getTurf:         (id)              => client.get(`/turfs/${id}`),
  // GET /api/turfs/:id/availability?date=YYYY-MM-DD
  getAvailability: (id, date)        => client.get(`/turfs/${id}/availability?date=${date}`),
  // GET /api/turfs/:id/reviews
  getReviews:      (id)              => client.get(`/turfs/${id}/reviews`),
};