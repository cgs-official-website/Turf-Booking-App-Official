// src/api/client.js
// Central resilient fetch wrapper.
// - Release build (APK): Railway production URL ONLY.
// - Dev build: Local -> LAN -> localhost -> Emulator -> Railway fallback.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const RAILWAY_PROD_URL = 'https://turf-booking-app-official-production.up.railway.app/api/v1';
export const LOCAL_URL = 'http://127.0.0.1:5000/api/v1';
export const LAN_URL_CURRENT = 'http://10.37.161.39:5000/api/v1';
export const EMULATOR_URL = 'http://10.0.2.2:5000/api/v1';
export const LOCAL_HOST_URL = 'http://localhost:5000/api/v1';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

// RELEASE (APK): talk to Railway ONLY. Previously every request first tried
// 127.0.0.1 -> 10.37.161.39 (LAN, hangs ~15s on a real phone) -> localhost ->
// 10.0.2.2 (hangs ~15s) and only then reached Railway. That was the main cause
// of the very slow login / tournament loading.
// DEV: try local endpoints first, but with a short timeout so a dead LAN IP
// can never block the app for 15s.
export const BASE_URL = IS_DEV ? LOCAL_URL : RAILWAY_PROD_URL;

const CANDIDATE_URLS = (IS_DEV
  ? [LOCAL_URL, LAN_URL_CURRENT, LOCAL_HOST_URL, EMULATOR_URL, RAILWAY_PROD_URL]
  : [RAILWAY_PROD_URL]
).filter(Boolean);

export const getOrigin = () => {
  if (client && client.activeBaseUrl) {
    return client.activeBaseUrl.replace(/\/api\/v1\/?$/, '');
  }
  return BASE_URL.replace(/\/api\/v1\/?$/, '');
};

export const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';
  if (/^(https?:|file:|content:|data:)/i.test(path)) return path;
  const cleanPath = String(path).replace(/^\/+/, '');
  return `${getOrigin()}/${cleanPath}`;
};

class ApiClient {
  constructor() {
    this.activeBaseUrl = BASE_URL;
    this.initSavedBaseUrl();
  }

  async initSavedBaseUrl() {
    try {
      if (!IS_DEV) {
        // Release: always Railway. Drop any local URL saved by old test builds.
        this.activeBaseUrl = RAILWAY_PROD_URL;
        AsyncStorage.removeItem('activeBaseUrl').catch(() => { });
        return;
      }
      const saved = await AsyncStorage.getItem('activeBaseUrl');
      if (saved && CANDIDATE_URLS.includes(saved)) {
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
    const urlsToTry = (IS_DEV
      ? [LOCAL_URL, this.activeBaseUrl, ...CANDIDATE_URLS]
      : [this.activeBaseUrl, ...CANDIDATE_URLS]
    ).filter((v, i, a) => v && a.indexOf(v) === i);

    const { signal: _inheritedSignal, ...cleanOptions } = options;

    let lastError = null;
    let lastResponse = null;

    for (let i = 0; i < urlsToTry.length; i++) {
      const baseUrl = urlsToTry[i];
      const controller = new AbortController();
      const isLocal = /^https?:\/\/(127\.|localhost|10\.|192\.168\.|172\.)/.test(baseUrl);
      // Local/LAN hosts must fail fast (3s) in dev; Railway gets 30s (cold start safe)
      const timeoutMs = isLocal ? 3000 : 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(`${baseUrl}${path}`, {
          ...cleanOptions,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        lastResponse = res;

        // If 404 on this host, another candidate server might have the route (e.g. local vs un-deployed remote)
        if (IS_DEV && res && res.status === 404 && i < urlsToTry.length - 1) {
          lastError = new Error(`Route not found on ${baseUrl}`);
          continue;
        }

        // Server responded!
        if (this.activeBaseUrl !== baseUrl && res.ok) {
          this.activeBaseUrl = baseUrl;
          AsyncStorage.setItem('activeBaseUrl', baseUrl).catch(() => { });
        }
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
      }
    }

    if (lastResponse) {
      return lastResponse;
    }

    const msg = lastError?.message || '';
    throw new Error(
      msg && !msg.toLowerCase().includes('abort')
        ? msg
        : 'Cannot reach backend server. Please check your network connection or verify server status.'
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

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  delete(path) { return this.request('DELETE', path); }
}

export const client = new ApiClient();