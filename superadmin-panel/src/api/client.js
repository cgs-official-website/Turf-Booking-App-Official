// src/api/client.js
export const PRODUCTION_API_URL = 'https://turf-booking-app-official-production.up.railway.app/api/v1';
export const LOCAL_API_URL = 'http://localhost:5000/api/v1';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  LOCAL_API_URL;

class AdminApiClient {
  getToken() {
    return localStorage.getItem('turf_admin_token') || null;
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('turf_admin_token', token);
    } else {
      localStorage.removeItem('turf_admin_token');
    }
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid
        if (!endpoint.includes('/admin/login')) {
          this.setToken(null);
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
      throw new Error(
        data.error?.message ||
        data.message ||
        (response.status === 405 ? 'Endpoint method not allowed' : `Request failed with status ${response.status}`)
      );
    }

    return data;
  }

  // Admin APIs
  login(email, password) {
    return this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  getStats() {
    return this.request('/admin/stats');
  }

  getPendingVendors(cursor) {
    return this.request(`/admin/vendors/pending${cursor ? `?cursor=${cursor}` : ''}`);
  }

  getAllVendors(status, cursor, limit) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return this.request(`/admin/vendors${qs ? `?${qs}` : ''}`);
  }

  approveVendor(uid) {
    return this.request(`/admin/vendors/${uid}/approve`, { method: 'POST' });
  }

  rejectVendor(uid, reason) {
    return this.request(`/admin/vendors/${uid}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  getTurfs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/turfs${qs ? `?${qs}` : ''}`);
  }

  getAllTurfs(status, cursor) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    return this.request(`/admin/turfs${qs ? `?${qs}` : ''}`);
  }

  toggleTurfStatus(turfId) {
    return this.request(`/admin/turfs/${turfId}/toggle-status`, { method: 'POST' });
  }

  getAllBookings(status, date, cursor, limit) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (date) params.set('date', date);
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return this.request(`/admin/bookings${qs ? `?${qs}` : ''}`);
  }

  getAllUsers(cursor) {
    return this.request(`/admin/users${cursor ? `?cursor=${cursor}` : ''}`);
  }

  updateUser(uid, data) {
    return this.request(`/admin/users/${uid}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteUser(uid) {
    return this.request(`/admin/users/${uid}`, {
      method: 'DELETE',
    });
  }

  getAllMatches(status, cursor) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    return this.request(`/admin/matches${qs ? `?${qs}` : ''}`);
  }

  createAdminMatch(data) {
    return this.request('/admin/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateAdminMatch(id, data) {
    return this.request(`/admin/matches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteAdminMatch(id) {
    return this.request(`/admin/matches/${id}`, {
      method: 'DELETE',
    });
  }

  getAllReports(status, cursor) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    return this.request(`/admin/reports${qs ? `?${qs}` : ''}`);
  }

  resolveReport(reportId, resolutionNote) {
    return this.request(`/admin/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved', resolutionNote }),
    });
  }

  // Subscription Plans Management
  getSubscriptionPlans() {
    return this.request('/subscription/plans');
  }

  createSubscriptionPlan(data) {
    return this.request('/subscription/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSubscriptionPlan(id, data) {
    return this.request(`/subscription/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteSubscriptionPlan(id) {
    return this.request(`/subscription/plans/${id}`, {
      method: 'DELETE',
    });
  }

  getAllReviews(rating, turfId, cursor) {
    const params = new URLSearchParams();
    if (rating) params.set('rating', rating);
    if (turfId) params.set('turfId', turfId);
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    return this.request(`/admin/reviews${qs ? `?${qs}` : ''}`);
  }

  // Ecosystem Inquiries & Leads Management
  submitInquiry(data) {
    return this.request('/enquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getAllEnquiries(status, search) {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    const qs = params.toString();
    return this.request(`/enquiries${qs ? `?${qs}` : ''}`);
  }

  updateEnquiryStatus(id, status) {
    return this.request(`/enquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  deleteEnquiry(id) {
    return this.request(`/enquiries/${id}`, {
      method: 'DELETE',
    });
  }
  // Tournaments Management
  getAllTournaments(optionsOrStatus, sport, search, turfId, cursor, limit) {
    const params = new URLSearchParams();
    if (typeof optionsOrStatus === 'object' && optionsOrStatus !== null) {
      const { status, sport: sp, search: sc, turfId: tid, cursor: cur, limit: lim } = optionsOrStatus;
      if (status && status !== 'all') params.set('status', status);
      if (sp && sp !== 'all') params.set('sport', sp);
      if (sc) params.set('search', sc);
      if (tid) params.set('turfId', tid);
      if (cur) params.set('cursor', cur);
      if (lim) params.set('limit', String(lim));
    } else {
      if (optionsOrStatus && optionsOrStatus !== 'all') params.set('status', optionsOrStatus);
      if (sport && sport !== 'all') params.set('sport', sport);
      if (search) params.set('search', search);
      if (turfId) params.set('turfId', turfId);
      if (cursor) params.set('cursor', cursor);
      if (limit) params.set('limit', String(limit));
    }
    const qs = params.toString();
    return this.request(`/admin/tournaments${qs ? `?${qs}` : ''}`);
  }

  getTournamentHistory(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);
    const qs = query.toString();
    return this.request(`/admin/tournaments/history${qs ? `?${qs}` : ''}`);
  }

  getTournamentLiveScore(id) {
    return this.request(`/admin/tournaments/${id}/live`);
  }

  getTournamentById(id) {
    return this.request(`/admin/tournaments/${id}`);
  }

  createTournament(data) {
    return this.request('/admin/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateTournament(id, data) {
    return this.request(`/admin/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  updateTournamentStatus(id, status) {
    return this.request(`/admin/tournaments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  deleteTournament(id, force = false) {
    return this.request(`/admin/tournaments/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    });
  }

  // Centralized API Integrations & Usage Monitoring
  getIntegrations() {
    return this.request('/admin/integrations');
  }

  updateIntegration(provider, data) {
    return this.request(`/admin/integrations/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  testIntegration(provider, credentials = null) {
    return this.request(`/admin/integrations/${provider}/test`, {
      method: 'POST',
      body: JSON.stringify({ credentials }),
    });
  }

  getIntegrationUsage(provider) {
    return this.request(`/admin/integrations/${provider}/usage`);
  }

  refreshIntegrationUsage(provider) {
    return this.request(`/admin/integrations/${provider}/refresh-usage`, {
      method: 'POST',
    });
  }
}

export const api = new AdminApiClient();
