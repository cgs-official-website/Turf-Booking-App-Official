import AsyncStorage from '@react-native-async-storage/async-storage';

export const RAILWAY_PROD_URL = 'https://turf-booking-app-official-production.up.railway.app/api/v1';
export const LOCAL_URL        = 'http://127.0.0.1:5000/api/v1';
export const LAN_URL_CURRENT  = 'http://192.168.0.36:5000/api/v1';
export const EMULATOR_URL     = 'http://10.0.2.2:5000/api/v1';

const CANDIDATE_URLS = [
  LOCAL_URL,
  LAN_URL_CURRENT,
  'http://localhost:5000/api/v1',
  EMULATOR_URL,
  RAILWAY_PROD_URL,
];

export const BASE_URL = CANDIDATE_URLS[0];
export const FALLBACK_URL = CANDIDATE_URLS[0];

let activeBaseUrl = LOCAL_URL;

// Hydrate saved active URL asynchronously
AsyncStorage.getItem('activeVendorBaseUrl')
  .then((saved) => {
    if (saved && !saved.includes('10.48.78.39')) activeBaseUrl = saved;
  })
  .catch(() => {});

export const getServerOrigin = () => {
  if (activeBaseUrl) {
    return activeBaseUrl.replace(/\/api\/v1\/?$/, '');
  }
  return LOCAL_URL.replace(/\/api\/v1\/?$/, '');
};

export const SERVER_ORIGIN = getServerOrigin();

export const getImageUrl = (path) => {
  if (!path) return null;
  if (/^(https?:|file:|content:|data:)/i.test(path)) return path;
  return `${getServerOrigin()}/${String(path).replace(/^\/+/, '')}`;
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

  const hostsToTry = [
    activeBaseUrl,
    ...CANDIDATE_URLS.filter((h) => h !== activeBaseUrl),
  ];

  for (const host of hostsToTry) {
    const controller = new AbortController();
    const timeoutMs = isFormData ? 45000 : 3500;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch(`${host}${endpoint}`, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response && (response.ok || response.status < 500)) {
        if (activeBaseUrl !== host) {
          activeBaseUrl = host;
          AsyncStorage.setItem('activeVendorBaseUrl', host).catch(() => {});
        }
        break;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
  }

  if (!response) {
    throw new Error('Cannot reach backend server. Please check your internet connection or verify Railway production server status.');
  }

  try {
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
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please verify your backend server is reachable.');
    }
    throw err;
  }
};