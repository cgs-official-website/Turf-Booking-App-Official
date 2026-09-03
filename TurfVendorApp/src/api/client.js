import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://turf-booking-app-official-production.up.railway.app/api/v1';
export const FALLBACK_URL = 'http://localhost:5000/api/v1';

export const SERVER_ORIGIN = 'https://turf-booking-app-official-production.up.railway.app';

// Turf.images / Turf.logo / vendor & turf KYC doc paths are stored in the DB
// as paths relative to the server's 'uploads' folder (e.g.
// "uploads/kyc/xxx.jpg"), NOT full URLs — pass them through this before
// giving them to <Image source={{ uri }} />, otherwise RN can't load them.
// Already-absolute URLs (http/https) and local device URIs (file://,
// content://) are returned unchanged so it's safe to call this on both
// freshly-picked images and images that came back from the API.
export const getImageUrl = (path) => {
  if (!path) return null;
  if (/^(https?:|file:|content:|data:)/i.test(path)) return path;
  return `${SERVER_ORIGIN}/${String(path).replace(/^\/+/, '')}`;
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('vendorToken');

  // FormData (file uploads — Aadhaar/PAN/GST/EB Bill/turf images) must NOT
  // get a manual 'Content-Type: application/json' header — fetch needs to
  // set 'multipart/form-data; boundary=...' itself. Forcing JSON here would
  // silently break every onboarding upload (Vendor KYC, Turf draft, Turf KYC).
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  const config = {
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    signal: controller.signal,
    ...options,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch (err) {
    if (err.name !== 'AbortError' && FALLBACK_URL) {
      try {
        response = await fetch(`${FALLBACK_URL}${endpoint}`, config);
      } catch (fallbackErr) {
        clearTimeout(timeoutId);
        throw err;
      }
    } else {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please verify your backend server is reachable.');
      }
      throw err;
    }
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