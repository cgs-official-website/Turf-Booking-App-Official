import { apiRequest } from './client';

/**
 * ONBOARDING API
 * Flow: Step 1: Turf Setup -> Step 2: Vendor KYC -> Step 3: Turf KYC -> Super Admin Review
 */

function to24h(timeStr) {
  if (!timeStr) return '06:00';
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) return timeStr;
  const parts = timeStr.trim().split(' ');
  const [time, meridiem] = parts;
  let [h, m] = (time || '06:00').split(':').map(Number);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

// ---------- STEP 1: TURF DRAFT / SETUP ----------
export const createTurfDraft = async (turfPayload) => {
  const form = new FormData();

  const openTime24 = to24h(turfPayload.openTime || '06:00 AM');
  const closeTime24 = to24h(turfPayload.closeTime || '11:00 PM');
  const durationMins = turfPayload.slotDuration === '30 min' ? 30 : 60;

  form.append('name', String(turfPayload.name || ''));
  form.append('city', String(turfPayload.city || ''));
  form.append('phone', String(turfPayload.phone || ''));
  form.append('pincode', String(turfPayload.pincode || ''));
  form.append('address', String(turfPayload.address || ''));
  form.append('description', String(turfPayload.description || ''));

  const sportTypes = turfPayload.sports || turfPayload.sportTypes || ['Football'];
  form.append('sportTypes', JSON.stringify(sportTypes));

  const amenities = turfPayload.facilities || turfPayload.amenities || [];
  form.append('amenities', JSON.stringify(amenities));

  const pricing = {
    baseRate: Number(turfPayload.price) || 0,
    weekendRate: Number(turfPayload.weekendPrice || turfPayload.price) || 0,
    peakHourRate: Number(turfPayload.eveningPrice || turfPayload.price) || 0,
  };
  form.append('pricing', JSON.stringify(pricing));

  const slotConfig = {
    openTime: openTime24,
    closeTime: closeTime24,
    slotDurationMins: durationMins,
  };
  form.append('slotConfig', JSON.stringify(slotConfig));

  // Add logo if selected
  if (turfPayload.logo?.uri) {
    form.append('images', {
      uri: turfPayload.logo.uri,
      name: turfPayload.logo.name || 'logo.jpg',
      type: turfPayload.logo.type || 'image/jpeg',
    });
  }

  // Add cover and product images
  if (Array.isArray(turfPayload.images)) {
    turfPayload.images
      .filter((img) => img && img.uri)
      .forEach((img, i) => {
        form.append('images', {
          uri: img.uri,
          name: img.name || `turf_image_${i}.jpg`,
          type: img.type || 'image/jpeg',
        });
      });
  }

  const data = await apiRequest('/vendor/onboarding/turf-setup', {
    method: 'POST',
    body: form,
  });
  return data;
};

// ---------- STEP 2: VENDOR KYC ----------
export const uploadVendorKyc = async ({ aadhaarFile, panFile, digilockerVerified, businessName, panNumber }) => {
  const form = new FormData();
  if (businessName) form.append('businessName', businessName);
  if (panNumber) form.append('panNumber', panNumber);

  if (digilockerVerified) {
    form.append('digilockerVerified', 'true');
  } else {
    if (aadhaarFile?.uri) {
      form.append('aadhaar', {
        uri: aadhaarFile.uri,
        name: aadhaarFile.name || 'aadhaar.jpg',
        type: aadhaarFile.type || 'image/jpeg',
      });
    }
    if (panFile?.uri) {
      form.append('pan', {
        uri: panFile.uri,
        name: panFile.name || 'pan.jpg',
        type: panFile.type || 'image/jpeg',
      });
    }
  }

  const data = await apiRequest('/vendor/onboarding/verification', {
    method: 'POST',
    body: form,
  });
  return data;
};

// ---------- STEP 3: TURF KYC ----------
export const uploadTurfKyc = async ({ turfId, gstFile, ebBillFile, digilockerVerified, gstNumber }) => {
  const form = new FormData();
  if (turfId) form.append('turfId', turfId);
  if (gstNumber) form.append('gstNumber', gstNumber);

  if (digilockerVerified) {
    form.append('digilockerVerified', 'true');
  } else {
    if (gstFile?.uri) {
      form.append('gst', {
        uri: gstFile.uri,
        name: gstFile.name || 'gst.jpg',
        type: gstFile.type || 'image/jpeg',
      });
    }
    if (ebBillFile?.uri) {
      form.append('ebBill', {
        uri: ebBillFile.uri,
        name: ebBillFile.name || 'eb_bill.jpg',
        type: ebBillFile.type || 'image/jpeg',
      });
    }
  }

  const data = await apiRequest('/vendor/onboarding/turf-verification', {
    method: 'POST',
    body: form,
  });
  return data;
};

export const getOnboardingStatus = async () => {
  const data = await apiRequest('/vendor/onboarding/status');
  return data;
};

export default {
  uploadVendorKyc,
  createTurfDraft,
  uploadTurfKyc,
  getOnboardingStatus,
};