// src/api/client.js
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid
        if (!endpoint.includes('/admin/login')) {
          this.setToken(null);
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
      throw new Error(data.error?.message || data.message || `Request failed with status ${response.status}`);
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

  getAllVendors(status, cursor) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
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

  getAllBookings(status, date, cursor) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (date) params.set('date', date);
    if (cursor) params.set('cursor', cursor);
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
}

export const api = new AdminApiClient();
