import { apiRequest } from './client';

export const getMyTurfsApi = () => apiRequest('/vendor/turfs');

export const getTurfByIdApi = (id) => apiRequest(`/vendor/turfs/${id}`);

export const addTurfApi = (data) =>
  apiRequest('/vendor/turfs', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateTurfApi = (id, data) =>
  apiRequest(`/vendor/turfs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// Local device picks (react-native-image-picker) come back as 'file://' or
// 'content://' URIs. Sending those as plain JSON strings just stores the
// path text — no bytes ever leave the device, so the image "disappears"
// the moment the device's cache clears. These variants only switch to
// multipart/form-data when there's actually a fresh local file to upload;
// otherwise they fall back to the plain JSON PUT so unrelated field edits
// (name/address/etc, or reordering existing images) stay cheap.
const isLocalFileUri = (uri) => /^(file:|content:)/i.test(uri || '');

export const updateTurfInfoApi = (id, { logo, ...fields }) => {
  if (!isLocalFileUri(logo)) {
    return apiRequest(`/vendor/turfs/${id}`, { method: 'PUT', body: JSON.stringify({ ...fields, logo }) });
  }
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v ?? ''));
  form.append('logo', { uri: logo, name: `logo-${Date.now()}.jpg`, type: 'image/jpeg' });
  return apiRequest(`/vendor/turfs/${id}`, { method: 'PUT', body: form });
};

export const updateTurfAmenitiesApi = (id, { images, ...fields }) => {
  const newLocalImages = (images || []).filter(isLocalFileUri);
  const existingImages = (images || []).filter((uri) => !isLocalFileUri(uri));
  if (newLocalImages.length === 0) {
    return apiRequest(`/vendor/turfs/${id}`, { method: 'PUT', body: JSON.stringify({ ...fields, images: existingImages }) });
  }
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, JSON.stringify(v)));
  form.append('existingImages', JSON.stringify(existingImages));
  newLocalImages.forEach((uri, i) => {
    form.append('images', { uri, name: `turf-${Date.now()}-${i}.jpg`, type: 'image/jpeg' });
  });
  return apiRequest(`/vendor/turfs/${id}`, { method: 'PUT', body: form });
};

export const deleteTurfApi = (id) =>
  apiRequest(`/vendor/turfs/${id}`, { method: 'DELETE' });

export const addSlotApi = (turfId, slot) =>
  apiRequest(`/vendor/turfs/${turfId}/slots`, {
    method: 'POST',
    body: JSON.stringify(slot),
  });

export const deleteSlotApi = (turfId, slotId) =>
  apiRequest(`/vendor/turfs/${turfId}/slots/${slotId}`, { method: 'DELETE' });

// GET /api/vendor/turfs/:id/slots/calendar?date=YYYY-MM-DD
// FIX: this was missing entirely — vendorSlice.jsx imports getSlotCalendarApi
// but it never existed here, so calling it threw "getSlotCalendarApi is not
// a function" inside the fetchSlotCalendar thunk. That error was silently
// swallowed by rejectWithValue, leaving slotCalendar/slotCounts stuck at
// their empty initial state (all zeros) — the request never even reached
// the network, so nothing showed up in the backend terminal logs either.
export const getSlotCalendarApi = (turfId, dateStr) =>
  apiRequest(`/vendor/turfs/${turfId}/slots/calendar?date=${dateStr}`);

// POST /api/vendor/turfs/:id/slots/freeze  { date, startTime, endTime, action }
// FIX: same issue as above — freezeSlotApi was also missing, so tapping
// "Freeze" in the slot modal would have thrown the same silent error.
export const freezeSlotApi = (turfId, body) =>
  apiRequest(`/vendor/turfs/${turfId}/slots/freeze`, {
    method: 'POST',
    body: JSON.stringify(body),
  });