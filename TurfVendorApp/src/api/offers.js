import { apiRequest } from './client';

const isLocalFileUri = (uri) => /^(file:|content:)/i.test(uri || '');

export const getTurfOffersApi = (turfId) =>
  apiRequest(`/vendor/turfs/${turfId}/offers`);

export const createTurfOfferApi = (turfId, { bannerUri, ...fields }) => {
  if (isLocalFileUri(bannerUri)) {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v) || typeof v === 'object') {
          form.append(k, JSON.stringify(v));
        } else {
          form.append(k, String(v));
        }
      }
    });
    form.append('banner', {
      uri: bannerUri,
      name: `offer-banner-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
    return apiRequest(`/vendor/turfs/${turfId}/offers`, {
      method: 'POST',
      body: form,
    });
  }

  return apiRequest(`/vendor/turfs/${turfId}/offers`, {
    method: 'POST',
    body: JSON.stringify({ ...fields, bannerUrl: bannerUri }),
  });
};

export const updateTurfOfferApi = (turfId, offerId, { bannerUri, ...fields }) => {
  if (isLocalFileUri(bannerUri)) {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v) || typeof v === 'object') {
          form.append(k, JSON.stringify(v));
        } else {
          form.append(k, String(v));
        }
      }
    });
    form.append('banner', {
      uri: bannerUri,
      name: `offer-banner-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
    return apiRequest(`/vendor/turfs/${turfId}/offers/${offerId}`, {
      method: 'PUT',
      body: form,
    });
  }

  return apiRequest(`/vendor/turfs/${turfId}/offers/${offerId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...fields, ...(bannerUri ? { bannerUrl: bannerUri } : {}) }),
  });
};

export const toggleTurfOfferStatusApi = (turfId, offerId, status) =>
  apiRequest(`/vendor/turfs/${turfId}/offers/${offerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteTurfOfferApi = (turfId, offerId) =>
  apiRequest(`/vendor/turfs/${turfId}/offers/${offerId}`, {
    method: 'DELETE',
  });
