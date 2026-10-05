const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;
let messaging = null;

const createCert = (serviceAccount) => {
  if (typeof admin.cert === 'function') {
    return admin.cert(serviceAccount);
  }
  if (admin.credential && typeof admin.credential.cert === 'function') {
    return admin.credential.cert(serviceAccount);
  }
  return null;
};

try {
  let credential = null;

  // 1. JSON string in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = createCert(parsed);
    } catch (e) {
      console.warn('⚠️ Invalid FIREBASE_SERVICE_ACCOUNT_JSON in .env');
    }
  }
  // 2. Base64-encoded service account in environment variable
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      credential = createCert(parsed);
    } catch (e) {
      console.warn('⚠️ Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 in .env');
    }
  }
  // 3. Individual parameters in environment variable
  else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credential = createCert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'turf-booking-app-d341c',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  // 4. File path to service account key file
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const resolvedPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        credential = createCert(fileContent);
      } catch (err) {
        console.warn('⚠️ Could not parse Firebase service account file:', err.message);
      }
    }
  }

  if (credential) {
    firebaseApp = admin.initializeApp({ credential });
    messaging = getMessaging(firebaseApp);
    console.log('🔥 Firebase Admin SDK initialized for FCM HTTP v1 (project: ' + (firebaseApp.options?.credential?.projectId || 'turf-booking-app-d341c') + ')');
  } else {
    console.log('ℹ️ Firebase Admin SDK: Waiting for service account credentials in .env to activate HTTP v1 push.');
  }
} catch (err) {
  console.warn('⚠️ Firebase Admin initialization error:', err.message);
}

module.exports = { admin, firebaseApp, messaging };
