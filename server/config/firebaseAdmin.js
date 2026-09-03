const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let isInitialized = false;

function initFirebase() {
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    let credential;
    const fs = require('fs');
    const path = require('path');

    const serviceAccountFile =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      './turf-booking-app-d341c-firebase-adminsdk-fbsvc-6574724adc.json';

    const resolvedPath = path.resolve(__dirname, '..', serviceAccountFile);

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(sa);
      } catch (e) {
        console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
      }
    } else if (fs.existsSync(resolvedPath)) {
      const serviceAccount = require(resolvedPath);
      credential = admin.credential.cert(serviceAccount);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
    }

    if (credential) {
      admin.initializeApp({
        credential,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      isInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.warn('⚠️ Firebase Admin credentials not provided in .env. Initializing in default/offline mode.');
      // Initialize with project ID if available to prevent null pointer
      if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      }
    }
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err.message);
  }

  return admin;
}

initFirebase();

const db = admin.apps.length ? admin.firestore() : null;
const auth = admin.apps.length ? admin.auth() : null;
const storage = admin.apps.length ? admin.storage() : null;
const messaging = admin.apps.length ? admin.messaging() : null;

module.exports = {
  admin,
  db,
  auth,
  storage,
  messaging,
};
