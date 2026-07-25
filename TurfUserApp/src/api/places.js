// src/api/places.js
import { client } from './client';

export const placesApi = {
  // GET /api/places/autocomplete?input=anna+nagar
  // Proxies Google Places Autocomplete through OUR backend so the Google
  // API key never ships inside the mobile app bundle.
  autocomplete: (input) => client.get(`/places/autocomplete?input=${encodeURIComponent(input)}`),
};