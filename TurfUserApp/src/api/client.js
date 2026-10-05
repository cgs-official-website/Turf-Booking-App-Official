// src/api/client.js
// Central resilient fetch wrapper with automatic multi-host fallback
// (ADB Reverse -> LAN Wi-Fi -> Android Emulator).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const PRODUCTION_URL = 'https://turf-booking-app-official-production.up.railway.app/api/v1';
export const LOCAL_URL      = 'http://localhost:5000/api/v1';
export const LAN_URL_CURRENT= 'http://192.168.0.23:5000/api/v1';
export const LAN_URL        = 'http://192.168.0.14:5000/api/v1';
export const LAN_URL_OLD    = 'http://192.168.0.12:5000/api/v1';
export const EMULATOR_URL   = 'http://10.0.2.2:5000/api/v1';

export const BASE_URL = LOCAL_URL;
export const SERVER_ORIGIN = 'http://localhost:5000';

const CANDIDATE_URLS = [
  LOCAL_URL,
  LAN_URL_CURRENT,
  LAN_URL,
  LAN_URL_OLD,
  Platform.OS === 'android' ? EMULATOR_URL : null,
  PRODUCTION_URL,
].filter(Boolean);

export const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';
  if (/^(https?:|file:|content:|data:)/i.test(path)) return path;
  const cleanPath = String(path).replace(/^\/+/, '');
  return `${SERVER_ORIGIN}/${cleanPath}`;
};

class ApiClient {
  constructor() {
    this.activeBaseUrl = LOCAL_URL;
  }

  async getToken() {
    try {
      return await AsyncStorage.getItem('token');
    } catch {
      return null;
    }
  }

  async fetchWithFallback(path, options) {
    // Try current active base URL first
    const urlsToTry = [
      this.activeBaseUrl,
      ...CANDIDATE_URLS.filter((u) => u !== this.activeBaseUrl),
    ];

    let lastError = null;
    for (const baseUrl of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${baseUrl}${path}`, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Server responded! Lock in this working base URL
        this.activeBaseUrl = baseUrl;
        return res;
      } catch (err) {
        lastError = err;
        // Try next candidate URL
      }
    }

    throw new Error(
      'Cannot reach backend server. Please verify "npm run dev" is running in server terminal and USB adb reverse is active.'
    );
  }

  async request(method, path, body) {
    const token = await this.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await this.fetchWithFallback(path, options);
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { message: 'Invalid server response format' };
    }

    if (!res.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.message ||
        (typeof data?.error === 'string' ? data.error : null) ||
        `Request failed with status ${res.status}`;
      throw new Error(errorMsg);
    }

    // Unpack standard REST envelope { success: true, data: { ... } }
    if (data && typeof data === 'object' && data.success !== undefined && data.data !== undefined) {
      return data.data;
    }

    return data;
  }

  get(path)          { return this.request('GET', path); }
  post(path, body)   { return this.request('POST', path, body); }
  put(path, body)    { return this.request('PUT', path, body); }
  patch(path, body)  { return this.request('PATCH', path, body); }
  delete(path)       { return this.request('DELETE', path); }
}

export const client = new ApiClient();