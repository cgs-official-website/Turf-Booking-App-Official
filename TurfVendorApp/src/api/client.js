import AsyncStorage from '@react-native-async-storage/async-storage';

const CANDIDATE_URLS = [
  'https://turf-booking-app-official-production.up.railway.app/api/v1',
  'http://localhost:5000/api/v1',
  'http://10.0.2.2:5000/api/v1',
  'http://192.168.0.50:5000/api/v1',
];

export const BASE_URL = CANDIDATE_URLS[0];
export const FALLBACK_URL = CANDIDATE_URLS[1];
export const SERVER_ORIGIN = 'https://turf-booking-app-official-production.up.railway.app';

export const getImageUrl = (path) => {
  if (!path) return null;
  if (/^(https?:|file:|content:|data:)/i.test(path)) return path;
  return `${SERVER_ORIGIN}/${String(path).replace(/^\/+/, '')}`;
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('vendorToken');

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const config = {
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  let response = null;
  let lastError = null;

  for (const host of CANDIDATE_URLS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      response = await fetch(`${host}${endpoint}`, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response && (response.ok || response.status < 500)) {
        break;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
  }

  if (!response) {
    throw lastError || new Error('Cannot reach server. Please check your internet connection.');
  }

  try {
    clearTimeout(timeoutId);

    // The server can return non-JSON (HTML error/404 pages, plain text, empty
    // bodies) when a route is missing, the server crashed, or a proxy/dev
    // server intercepted the request. Calling response.json() directly on
    // those throws an opaque "Unexpected character: <" that hides what
    // actually went wrong, so read as text first and parse defensively.
    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      throw new Error(
        `Server returned a non-JSON response (status ${response.status}) for ${endpoint}. ` +
        `This usually means the route isn't registered on the backend or the server crashed.`
      );
    }

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.message ||
        (typeof data?.error === 'string' ? data.error : null) ||
        `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Backend wraps response in { success: true, data: { ... } }
    const payload = data.data !== undefined ? data.data : data;
    if (payload && typeof payload === 'object') {
      if ((payload.profile || payload.user) && !payload.vendor) {
        payload.vendor = payload.profile || payload.user;
      }
    }

    return payload;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please verify your backend server is reachable.');
    }
    throw err;
  }
};