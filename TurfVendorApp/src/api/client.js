import AsyncStorage from '@react-native-async-storage/async-storage';

export const RAILWAY_PROD_URL = 'https://turf-booking-app-official-production.up.railway.app/api/v1';
export const LOCAL_URL = 'http://127.0.0.1:5000/api/v1';
export const LAN_URL_CURRENT = 'http://192.168.0.158:5000/api/v1';
export const EMULATOR_URL = 'http://10.0.2.2:5000/api/v1';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

// RELEASE (APK): Railway ONLY. The old code tried 127.0.0.1 -> LAN IP (hangs
// ~15s on a real phone) -> localhost -> ... -> Railway for EVERY request, which
// made login and every other screen extremely slow.
export const CANDIDATE_URLS = IS_DEV
  ? [LOCAL_URL, LAN_URL_CURRENT, 'http://localhost:5000/api/v1', EMULATOR_URL, RAILWAY_PROD_URL]
  : [RAILWAY_PROD_URL];

export const BASE_URL = IS_DEV ? LOCAL_URL : RAILWAY_PROD_URL;
export const FALLBACK_URL = CANDIDATE_URLS[0];

let activeBaseUrl = BASE_URL;

if (IS_DEV) {
  // Dev only: hydrate saved active URL asynchronously if not outdated
  AsyncStorage.getItem('activeVendorBaseUrl')
    .then((saved) => {
      if (
        saved &&
        !saved.includes('10.48.78.39') &&
        !saved.includes('192.168.0.36') &&
        CANDIDATE_URLS.includes(saved)
      ) {
        activeBaseUrl = saved;
      }
    })
    .catch(() => { });
} else {
  // Release: clear any old local URL saved by previous test builds
  AsyncStorage.removeItem('activeVendorBaseUrl').catch(() => { });
}

export const getServerOrigin = () => {
  if (activeBaseUrl) {
    return activeBaseUrl.replace(/\/api\/v1\/?$/, '');
  }
  return BASE_URL.replace(/\/api\/v1\/?$/, '');
};

export const SERVER_ORIGIN = getServerOrigin();

export const getImageUrl = (path) => {
  if (!path) return null;
  if (/^(https?:|file:|content:|data:)/i.test(path)) return path;
  return `${getServerOrigin()}/${String(path).replace(/^\/+/, '')}`;
};

const isLocalHost = (host) =>
  host.includes('127.0.0.1') ||
  host.includes('localhost') ||
  host.includes('10.0.2.2') ||
  host.includes('192.168.') ||
  host.includes('172.');

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
  let lastResponse = null;
  let lastError = null;

  // Release: Railway only. Dev: activeBaseUrl first if already verified, then LOCAL_URL, then candidate hosts.
  const hostsToTry = (IS_DEV
    ? [activeBaseUrl, LOCAL_URL, ...CANDIDATE_URLS]
    : [RAILWAY_PROD_URL]
  ).filter((v, i, a) => v && a.indexOf(v) === i);

  for (const host of hostsToTry) {
    const controller = new AbortController();
    // Confirmed active host gets 25s for heavy queries; untried local hosts fail fast (5s); Railway gets 30s
    const isConfirmedActive = Boolean(activeBaseUrl && host === activeBaseUrl);
    const timeoutMs = isFormData ? 45000 : isConfirmedActive ? 25000 : isLocalHost(host) ? 5000 : 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${host}${endpoint}`, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      lastResponse = res;
      // If 404 on this host, another candidate server might have the route (e.g. local vs un-deployed remote)
      if (IS_DEV && res && res.status === 404 && hostsToTry.indexOf(host) < hostsToTry.length - 1) {
        continue;
      }
      if (res && (res.ok || res.status < 500)) {
        response = res;
        if (res.ok && activeBaseUrl !== host) {
          activeBaseUrl = host;
          if (IS_DEV) {
            AsyncStorage.setItem('activeVendorBaseUrl', host).catch(() => { });
          }
        }
        break;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
  }

  if (!response) {
    if (lastResponse) {
      response = lastResponse;
    } else if (lastError?.name === 'AbortError') {
      throw new Error('Server is taking too long to respond. Please try again in a moment.');
    } else {
      throw new Error('Cannot reach backend server. Please check your internet connection or verify Railway production server status.');
    }
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
      const err = new Error(errorMessage);
      err.status = response.status;
      err.data = data;
      err.code = data?.error?.code || data?.code;
      throw err;
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