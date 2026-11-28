import { getImageUrl } from '../api/client';

// Ignore empty values and device-local paths (file:// / content://) that
// other phones can never load.
const isUsable = (v) =>
    typeof v === 'string' && v.trim() !== '' && !/^(file:|content:)/i.test(v.trim());

/**
 * Explore / list card photo = the single "Turf card photo" the vendor sets
 * from the camera badge in Turf Profile & Facilities (turf.logo).
 * Gallery photos are NOT used here.
 * Returns a URL, or null -> <SafeImage> shows the bundled default image.
 */
export const getTurfCardImage = (turf) =>
    isUsable(turf?.logo) ? getImageUrl(turf.logo.trim()) : null;

/**
 * Turf detail slider = the vendor's "Gallery Photos" (turf.images).
 * If the vendor added none, a single entry (null) is returned so the
 * slider shows ONE bundled default image (1 / 1).
 */
export const getTurfGalleryImages = (turf) => {
    const list = (Array.isArray(turf?.images) ? turf.images : [])
        .filter(isUsable)
        .map((p) => getImageUrl(p.trim()));
    return list.length > 0 ? list : [null];
};
