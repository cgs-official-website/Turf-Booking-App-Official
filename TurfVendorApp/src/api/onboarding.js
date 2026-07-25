import { apiRequest } from './client';

/**
 * ONBOARDING API
 * Flow: Vendor KYC -> Create Turf (3 steps) -> Turf KYC -> submitted to super admin for approval
 */

// ---------- VENDOR KYC ----------
// Uploads vendor identity docs (Aadhaar + PAN). Sent as multipart/form-data.
export const uploadVendorKyc = async ({ aadhaarFile, panFile, digilockerVerified }) => {
  const form = new FormData();
  if (digilockerVerified) {
    form.append('digilockerVerified', 'true');
  } else {
    if (aadhaarFile) {
      form.append('aadhaar', {
        uri: aadhaarFile.uri,
        name: aadhaarFile.name || 'aadhaar.jpg',
        type: aadhaarFile.type || 'image/jpeg',
      });
    }
    if (panFile) {
      form.append('pan', {
        uri: panFile.uri,
        name: panFile.name || 'pan.jpg',
        type: panFile.type || 'image/jpeg',
      });
    }
  }
  const data = await apiRequest('/vendor/turfs/kyc/identity', {
    method: 'POST',
    body: form,
  });
  return data; // { status: 'pending_review', vendorId }
};

// ---------- TURF DRAFT (steps 1-3 saved together on final submit) ----------
export const createTurfDraft = async (turfPayload) => {
  // turfPayload: { logo, name, city, phone, pincode, address, sports, facilities,
  //                openTime, closeTime, slotDuration,
  //                price, eveningPrice, weekendPrice, weekendEveningPrice, images }
  const form = new FormData();

  Object.entries(turfPayload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'logo' && value?.uri) {
      form.append('logo', { uri: value.uri, name: value.name || 'logo.jpg', type: value.type || 'image/jpeg' });
    } else if (key === 'images' && Array.isArray(value)) {
      value
        .filter((img) => img && img.uri)
        .forEach((img, i) => {
          form.append('images', { uri: img.uri, name: img.name || `turf_${i}.jpg`, type: img.type || 'image/jpeg' });
        });
    } else if (Array.isArray(value) || typeof value === 'object') {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  });

  const data = await apiRequest('/vendor/turfs', {
    method: 'POST',
    body: form,
  });
  return data; // { turfId, status: 'draft' }
};

// ---------- TURF KYC (business documents) ----------
export const uploadTurfKyc = async ({ turfId, gstFile, ebBillFile, digilockerVerified }) => {
  const form = new FormData();
  form.append('turfId', turfId);
  if (digilockerVerified) {
    form.append('digilockerVerified', 'true');
  } else {
    if (gstFile) {
      form.append('gstCertificate', {
        uri: gstFile.uri,
        name: gstFile.name || 'gst.jpg',
        type: gstFile.type || 'image/jpeg',
      });
    }
    if (ebBillFile) {
      form.append('ebBill', {
        uri: ebBillFile.uri,
        name: ebBillFile.name || 'eb_bill.jpg',
        type: ebBillFile.type || 'image/jpeg',
      });
    }
  }
  const data = await apiRequest('/vendor/turfs/kyc', {
    method: 'POST',
    body: form,
  });
  return data; // { status: 'submitted_for_review' }
};

export const getOnboardingStatus = async () => {
  const data = await apiRequest('/vendor/onboarding/status');
  return data; // { vendorKyc: 'pending'|'approved'|'rejected', turf: {...} }
};

export default {
  uploadVendorKyc,
  createTurfDraft,
  uploadTurfKyc,
  getOnboardingStatus,
};