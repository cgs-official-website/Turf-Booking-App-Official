import { apiRequest } from './client';

export const submitVendorEnquiryApi = (data) =>
  apiRequest('/enquiries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
