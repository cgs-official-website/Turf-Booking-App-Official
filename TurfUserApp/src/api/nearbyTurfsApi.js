// src/api/nearbyTurfsApi.js
import { client } from './client';

export const nearbyTurfsApi = {
  /**
   * GET /api/turfs/nearby?lat=..&lng=..&radius=5
   * Fetches turfs within radius (default 5 km), sorted nearest first
   */
  getNearbyTurfs: async ({ lat, lng, radius = 5 }) => {
    return client.get(
      `/turfs/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radius)}`
    );
  },
};
