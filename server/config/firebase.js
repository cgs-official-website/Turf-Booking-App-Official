const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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

/**
 * Hosting dashboards (Railway, Heroku, .env files) mangle multi-line private keys in many ways:
 *  - wrapped in "quotes"
 *  - newlines stored as the two characters \n (or double-escaped \\n)
 *  - newlines turned into spaces
 *  - Windows \r\n line endings
 * Any of these gives "Failed to parse private key". Rebuild a clean PEM from whatever we got.
 */
const normalizePrivateKey = (raw) => {
  let key = String(raw || '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r/g, '');

  const m = key.match(/-----BEGIN ([A-Z ]*PRIVATE KEY)-----([\s\S]*?)-----END \1-----/);
  if (m) {
    const body = m[2].replace(/\s+/g, '');
    const lines = body.match(/.{1,64}/g) || [];
    key = `-----BEGIN ${m[1]}-----\n${lines.join('\n')}\n-----END ${m[1]}-----\n`;
  }
  return key;
};

const withCleanKey = (serviceAccount) => ({
  ...serviceAccount,
  private_key: serviceAccount.private_key ? normalizePrivateKey(serviceAccount.private_key) : serviceAccount.private_key,
  privateKey: serviceAccount.privateKey ? normalizePrivateKey(serviceAccount.privateKey) : serviceAccount.privateKey,
});

/** Throws a clear message if the key is not a usable RSA private key. */
const assertKeyIsValid = (serviceAccount) => {
  const pem = serviceAccount.private_key || serviceAccount.privateKey;
  if (!pem) throw new Error('private key is missing');
  try {
    crypto.createPrivateKey(pem);
  } catch (e) {
    throw new Error(
      'private key is not a valid PEM (it must start with -----BEGIN PRIVATE KEY----- and be the FULL key from the downloaded JSON file)'
    );
  }
};

/**
 * Try every configured source in order and use the first one that works, so a broken
 * variable no longer silently disables push notifications.
 */
const sources = [
  {
    label: 'FIREBASE_SERVICE_ACCOUNT_BASE64',
    enabled: () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64),
    load: () => JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')),
  },
  {
    label: 'FIREBASE_SERVICE_ACCOUNT_JSON',
    enabled: () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
    load: () => JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
  },
  {
    label: 'FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY',
    enabled: () => Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
    load: () => ({
      projectId: process.env.FIREBASE_PROJECT_ID || 'turf-booking-app-d341c',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
  },
  {
    label: 'FIREBASE_SERVICE_ACCOUNT_PATH',
    enabled: () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
    load: () => {
      const candidatePaths = [
        path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
        path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
        path.resolve(__dirname, path.basename(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)),
      ];
      const found = candidatePaths.find((p) => fs.existsSync(p));
      if (!found) throw new Error('file not found');
      return JSON.parse(fs.readFileSync(found, 'utf8'));
    },
  },
  {
    label: 'config/serviceAccountKey.json',
    enabled: () => fs.existsSync(path.resolve(__dirname, 'serviceAccountKey.json')),
    load: () => JSON.parse(fs.readFileSync(path.resolve(__dirname, 'serviceAccountKey.json'), 'utf8')),
  },
];

try {
  let credential = null;
  let usedLabel = null;
  let projectId = null;

  for (const src of sources) {
    if (!src.enabled()) continue;
    try {
      const account = withCleanKey(src.load());
      assertKeyIsValid(account);
      credential = createCert(account);
      if (credential) {
        usedLabel = src.label;
        projectId = account.project_id || account.projectId || null;
        break;
      }
    } catch (e) {
      console.warn(`⚠️ Firebase credentials from ${src.label} could not be used: ${e.message}`);
    }
  }

  if (credential) {
    firebaseApp = admin.initializeApp({ credential });
    messaging = getMessaging(firebaseApp);
    console.log(
      `🔥 Firebase Admin SDK initialized for FCM HTTP v1 (project: ${projectId || firebaseApp.options?.projectId || 'unknown'}, source: ${usedLabel})`
    );
  } else {
    console.log(
      'ℹ️ Firebase Admin SDK: no valid service account found. Push notifications are DISABLED. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_BASE64 (recommended) on the server.'
    );
  }
} catch (err) {
  console.warn('⚠️ Firebase Admin initialization error:', err.message);
}

module.exports = { admin, firebaseApp, messaging };
