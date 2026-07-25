// src/api/client.js
// Central Axios-like fetch wrapper that attaches the JWT token from Redux
// and points to your Node backend.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Change this to your machine's IP when testing on a real device ─────────
// Android emulator   → http://10.0.2.2:5000/api
// iOS simulator      → http://localhost:5000/api
// Real device        → http://<YOUR_LAN_IP>:5000/api
export const BASE_URL = 'http://10.153.201.246:5000/api';

class ApiClient {
  async getToken() {
    try {
      return await AsyncStorage.getItem('token');
    } catch {
      return null;
    }
  }

  async request(method, path, body) {
    const token = await this.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Request failed');
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