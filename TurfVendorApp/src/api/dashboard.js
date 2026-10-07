import { apiRequest } from './client';

export const getDashboardStatsApi = (turfId) =>
  apiRequest(turfId ? `/vendor/dashboard?turfId=${turfId}` : '/vendor/dashboard');
export const getRevenueApi = (period = 'monthly', turfId) =>
  apiRequest(turfId ? `/vendor/dashboard/revenue?period=${period}&turfId=${turfId}` : `/vendor/dashboard/revenue?period=${period}`);