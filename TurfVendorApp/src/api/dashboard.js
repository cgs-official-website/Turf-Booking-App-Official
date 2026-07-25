import { apiRequest } from './client';

export const getDashboardStatsApi = () => apiRequest('/vendor/dashboard/stats');
export const getRevenueApi = (period = 'monthly') =>
  apiRequest(`/vendor/dashboard/revenue?period=${period}`);