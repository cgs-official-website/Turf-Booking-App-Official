const fs = require('fs');
const path = require('path');

const REMOTE_BASE_URL = 'https://turf-booking-app-official-production.up.railway.app/api/v1';
const OUTPUT_FILE = path.join(__dirname, '../data/exported_remote_turfs.json');

async function exportRemoteData() {
  console.log(`📡 Querying deployed backend: ${REMOTE_BASE_URL}`);

  // 1. Fetch public turfs list
  const listRes = await fetch(`${REMOTE_BASE_URL}/turfs`);
  if (!listRes.ok) throw new Error(`HTTP ${listRes.status} fetching turfs`);
  const listJson = await listRes.json();
  const turfItems = listJson.data?.turfs || listJson.data?.items || listJson.turfs || [];

  // 2. Fetch meta locations
  let metaLocations = null;
  try {
    const metaRes = await fetch(`${REMOTE_BASE_URL}/turfs/meta/locations`);
    if (metaRes.ok) {
      const metaJson = await metaRes.json();
      metaLocations = metaJson.data || null;
    }
  } catch (e) {
    metaLocations = null;
  }

  const exportedTurfs = [];
  const exportedVendors = new Map();

  for (const item of turfItems) {
    const id = item.id || item._id;
    if (!id) continue;

    // Fetch full turf details
    let turfDetail = item;
    try {
      const detailRes = await fetch(`${REMOTE_BASE_URL}/turfs/${id}`);
      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        turfDetail = detailJson.data?.turf || detailJson.turf || item;
      }
    } catch (e) {
      console.warn(`Detail fetch error for ${id}:`, e.message);
    }

    // Fetch public reviews
    let reviewsData = [];
    try {
      const revRes = await fetch(`${REMOTE_BASE_URL}/turfs/${id}/reviews`);
      if (revRes.ok) {
        const revJson = await revRes.json();
        reviewsData = revJson.data?.items || revJson.data || [];
      }
    } catch (e) {
      reviewsData = [];
    }

    // Fetch slot configuration / availability for today
    let slotsData = null;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const slotRes = await fetch(`${REMOTE_BASE_URL}/turfs/${id}/slots?date=${todayStr}`);
      if (slotRes.ok) {
        const slotJson = await slotRes.json();
        slotsData = slotJson.data || null;
      }
    } catch (e) {
      slotsData = null;
    }

    const turfRecord = {
      source: 'api',
      id: turfDetail.id || turfDetail._id,
      name: turfDetail.name,
      vendorId: turfDetail.vendorId || null,
      description: turfDetail.description || null,
      sports: turfDetail.sports || turfDetail.sportTypes || [],
      pricePerHour: turfDetail.pricePerHour ?? turfDetail.pricing?.baseRate ?? turfDetail.price ?? null,
      pricing: turfDetail.pricing || null,
      location: turfDetail.location || null,
      city: turfDetail.city || turfDetail.location?.city || null,
      address: turfDetail.address || turfDetail.location?.address || null,
      amenities: turfDetail.amenities || [],
      images: turfDetail.images || [],
      logo: turfDetail.logo || null,
      slotConfig: turfDetail.slotConfig || null,
      operatingHours: turfDetail.operatingHours || null,
      status: turfDetail.status || 'active',
      rating: turfDetail.rating || null,
      reviewsCount: turfDetail.reviewsCount ?? (typeof turfDetail.rating === 'object' ? turfDetail.rating?.count : 0),
      createdAt: turfDetail.createdAt || null,
      updatedAt: turfDetail.updatedAt || null,
      publicExposedData: {
        reviews: reviewsData,
        sampleSlotSchedule: slotsData,
      },
    };

    exportedTurfs.push(turfRecord);

    // Vendor record: strictly what the API returned (vendorId and associated turf)
    // No derived emails, no assumed KYC status, no assumed onboarding flags
    const vId = turfDetail.vendorId;
    if (vId && !exportedVendors.has(vId)) {
      exportedVendors.set(vId, {
        source: 'api (turf.vendorId)',
        id: vId,
        associatedTurfId: turfRecord.id,
        associatedTurfName: turfRecord.name,
        name: null,
        email: null,
        phone: null,
        kycStatus: null,
        turfOnboardingComplete: null,
        turfApprovalAcknowledged: null,
        subscription: null,
      });
    }
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    sourceUrl: REMOTE_BASE_URL,
    metaLocations,
    counts: {
      turfs: exportedTurfs.length,
      vendors: exportedVendors.size,
    },
    turfs: exportedTurfs,
    vendors: Array.from(exportedVendors.values()),
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exportPayload, null, 2), 'utf8');
  console.log(`✅ Saved ${exportedTurfs.length} turfs and ${exportedVendors.size} vendors to ${OUTPUT_FILE}`);
}

exportRemoteData().catch((err) => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
