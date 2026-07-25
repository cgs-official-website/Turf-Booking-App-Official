import { apiRequest } from './client';

export const getSubscriptionPlansApi = () => apiRequest('/vendor/subscriptions/plans');

// Step 1: ask the backend to create a real Razorpay order for this plan.
// Returns { order, keyId, plan } — order.id is what RazorpayCheckout needs.
export const createSubscriptionOrderApi = (planId) =>
  apiRequest('/vendor/subscriptions/create-order', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });

// Step 2: after RazorpayCheckout succeeds on-device, send the payment
// response back so the backend can verify the signature and activate the
// subscription. Nothing is marked "paid" until this succeeds.
export const verifySubscriptionPaymentApi = ({
  planId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) =>
  apiRequest('/vendor/subscriptions/verify', {
    method: 'POST',
    body: JSON.stringify({ planId, razorpay_order_id, razorpay_payment_id, razorpay_signature }),
  });

export const getMySubscriptionApi = () => apiRequest('/vendor/subscriptions/me');

export const getSubscriptionHistoryApi = () =>
  apiRequest('/vendor/subscriptions/history');