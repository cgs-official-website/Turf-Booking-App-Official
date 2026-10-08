// src/api/client.js
// Central resilient fetch wrapper with automatic multi-host fallback
// (Railway Cloud Production -> ADB Reverse -> LAN Wi-Fi -> Android Emulator).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const RAILWAY_PROD_URL = 'https://turf-booking-app-official-production.up.railway.app/api/v1';
export const LOCAL_URL        = 'http://127.0.0.1:5000/api/v1';
export const LAN_URL_CURRENT  = 'http://10.48.78.39:5000/api/v1';
export const EMULATOR_URL     = 'http://10.0.2.2:5000/api/v1';
export const LOCAL_HOST_URL   = 'http://localhost:5000/api/v1';

export const BASE_URL = LAN_URL_CURRENT;

const CANDIDATE_URLS = [
  LAN_URL_CURRENT,
  LOCAL_URL,
  Platform.OS === 'android' ? EMULATOR_URL : null,
  LOCAL_HOST_URL,
  RAILWAY_PROD_URL,
].filter(Boolean);

export const getOrigin = () => {
  if (client && client.activeBaseUrl) {
    return client.activeBaseUrl.replace(/\/api\/v1\/?$/, '');
  }
  return LAN_URL_CURRENT.replace(/\/api\/v1\/?$/, '');
};

export const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';
  if (/^(https?:|file:|content:|data:)/i.test(path)) return path;
  const cleanPath = String(path).replace(/^\/+/, '');
  return `${getOrigin()}/${cleanPath}`;
};

class ApiClient {
  constructor() {
    this.activeBaseUrl = typeof __DEV__ !== 'undefined' && __DEV__ ? LAN_URL_CURRENT : LAN_URL_CURRENT;
    this.initSavedBaseUrl();
  }

  async initSavedBaseUrl() {
    try {
      const saved = await AsyncStorage.getItem('activeBaseUrl');
      if (saved) {
        if (typeof __DEV__ !== 'undefined' && __DEV__ && saved === RAILWAY_PROD_URL) {
          // Ignore saved Railway production URL during local development
          return;
        }
        this.activeBaseUrl = saved;
      }
    } catch {
      // ignore
    }
  }

  async getToken() {
    try {
      return await AsyncStorage.getItem('token');
    } catch {
      return null;
    }
  }

  async fetchWithFallback(path, options = {}) {
    const urlsToTry = [
      this.activeBaseUrl,
      ...CANDIDATE_URLS.filter((u) => u !== this.activeBaseUrl),
    ];

    const { signal: _inheritedSignal, ...cleanOptions } = options;

    let lastError = null;
    for (let i = 0; i < urlsToTry.length; i++) {
      const baseUrl = urlsToTry[i];
      try {
        const controller = new AbortController();
        const isLocal = baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost') || baseUrl.includes('10.0.2.2') || baseUrl.includes('10.') || baseUrl.includes('192.168.') || baseUrl.includes('172.');
        const timeoutMs = isLocal ? 7000 : 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(`${baseUrl}${path}`, {
          ...cleanOptions,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Server responded! Lock in this working base URL and persist it
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log(`📡 [ApiClient] Active base URL: ${baseUrl}`);
        }
        if (this.activeBaseUrl !== baseUrl) {
          this.activeBaseUrl = baseUrl;
          AsyncStorage.setItem('activeBaseUrl', baseUrl).catch(() => {});
        }
        return res;
      } catch (err) {
        lastError = err;
      }
    }

    const msg = lastError?.message || '';
    throw new Error(
      msg && !msg.toLowerCase().includes('abort')
        ? msg
        : 'Cannot reach backend server. Please check your internet connection or verify Railway production server status.'
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