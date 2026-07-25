// src/api/wishlist.js
import { client } from './client';

export const wishlistApi = {
  getWishlist:       ()      => client.get('/wishlist'),
  add:               (id)    => client.post(`/wishlist/${id}`),
  remove:            (id)    => client.delete(`/wishlist/${id}`),
};