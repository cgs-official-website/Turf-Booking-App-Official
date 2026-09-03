import { apiRequest } from './client';

export const getSubscriptionPlansApi = () => apiRequest('/vendor/subscriptions/plans');

// Free plan instant activation
export const activateFreeSubscriptionApi = (planId = 'plan_free_starter') =>
  apiRequest('/vendor/subscriptions/activate-free', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });

// Step 1: ask the backend to create a real Razorpay order for this plan.
export const createSubscriptionOrderApi = (planId) =>
  apiRequest('/vendor/subscriptions/create-order', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });

// Step 2: after RazorpayCheckout succeeds on-device, send the payment
// response back so the backend can verify the signature and activate the
// subscription.
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