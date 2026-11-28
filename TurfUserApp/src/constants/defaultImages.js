import { Image } from 'react-native';

// Default turf photo, BUNDLED inside the app (works offline, no internet URL).
// Shown when a vendor has not uploaded a card photo / gallery photos,
// or when an uploaded image fails to load.
export const DEFAULT_TURF_IMAGE = require('../assets/default-turf.jpg');

// Same image as a { uri } string, for places that build <Image source={{ uri }} />.
export const getDefaultTurfImageUri = () => Image.resolveAssetSource(DEFAULT_TURF_IMAGE)?.uri;
