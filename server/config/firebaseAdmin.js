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

    const DEFAULT_CREDENTIALS = {
      type: "service_account",
      project_id: "turf-booking-app-d341c",
      private_key_id: "6574724adc3faaf1f4185f7f2a2758a210a9fa9d",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBFqEJ6bViECZU\nCmE7/OSfhyj6V+PDrAcRh0GfXs0CQlUfeBaG5G/ar1pf6HHyLtY9PHsCQCHVG3FG\n1yiuM9i6SRGwrd6iSvpIDF74sPvQ1soIRbQb4Nu65Cf7C7IWQ+oL2FrHJOsFhV65\n0zb+2JeZubBis76vD4PeV/7kp0l75SL2pdV88eWQNrZD3y2DYpEo1ZplIcEjwHo4\nMtaJkbtbjpMPtYrlkSmoPEd2BxejCaqNfUm52zN9a/Nf3SJP0omE82YHI5bipMg6\nJ4XsMsRr65NH6PpsBrDZjJCUu7DYlRKCMk9kNLdgstqt9aUkbIaZ7Z3gkgl7ypVE\n696rEq3FAgMBAAECggEACEIigx0Gz/nm2cNT40/uq1AJlaN6r1zFNJ+3U8ynMgiK\nQX1OYViV3CGR2PZFIVmVeisDC9aYW9f/oUsEh2baRyVm50qYchKI39n/md1f98+n\n9nCcwnB8lWK6vwcCB+fBs93+C/RtROAua/43pPC4ky+Y9q+/YRdlyXW0Bi2NfAn+\nxsUCuPwOutepYqlIRdyHau2pXdiI1Wjrsw9Pv4vxRqCSFCo91tsJ1NNt4JSfk3j2\nLqwch+hI2NVSY4LtWHBcev49wqThiKdmH182qesChhWV8duane7fyAYYh3NKMcsG\niaOOS9jXMZm+6Z05zTVAvyfZLe9zNyzekkV7lXTUAQKBgQDrwutd/smFVolNAlu8\nn91JcdrR42sRGXspd4egU5wKUsTldjmsGM9E5RHPWwpQNgjIqHvWlS2ef7tClKQn\nr+eDqIOkP39qoaqGGgEzF4yi1ZUQGbq2nxYeV6QXk9VvEM9Z6tXfPr9LPxEgOAKP\nnccRIi8eP8PADZmdOlRpqC8nAQKBgQDRqe4GD3wm+FcVM8C62n86EJFcUyTcnVXt\nelfYJzFBYEvxTLyflxDsWu8KO9Ic/nG1Fah5oEPvTmk/7J7qyoFE8DB8vop+IO03\n6t+J+36LblM4y/M4yrP0bF2CFjIvalIoUcIvuKvaDaLHCBDpSEMw7rGXHrGA/mUM\n8XiCWeOqxQKBgAO4PZJsFK3f4aavZNcjBpDEFRm+ps/MQR80XZVv/ERFbgnYxawr\ncAm8O320CAOf9p+D2QBXtjKL/V5djgF6SwLOw9Txk4cRKemXu3Ec7AEdsY5heYqs\nE+NCqrocgP+RmlPm2pz9FnOPeSuy9odhi+R/T5MAmowLKuNKKk7IcoYBAoGBAJpM\ni96r8LuhUj1JTBJ3kOBDpyaiDePKap2Nxy5NkaNCYkFgLwToIU1AkuEeK0CpRTd2\ni/mOp9BrDWw9EKtMgxwgBB8Z/0RZqRrY4NBkZLnqZJbNCd+G1i8QvTRqb16TyYjg\nup9yMg8Ur/H4DrIQO1q8n7fOn+WF0wpWf1C3JKTdAoGBAK8NidaWwydy9Ov27rXJ\n/MYAJkwr+JSP/vI2BKqRYp0X2dTuXNNyh/C3GlHMTu2nKs7o44vOY28yz5NPmx7E\n7Xsg2cBNjY0Xi2FT5wDjPFVe5tbQBRQ0n0pWdDHCSwAO3cMhYn0oJxXwDHudBpHI\nFc5ODFSHqPvpKb1LJ2ro/QUR\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@turf-booking-app-d341c.iam.gserviceaccount.com",
      client_id: "115787115996251936572",
    };

    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(sa);
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
      } else {
        credential = admin.credential.cert(DEFAULT_CREDENTIALS);
      }
    } catch (e) {
      console.warn('⚠️ Falling back to default service account:', e.message);
      credential = admin.credential.cert(DEFAULT_CREDENTIALS);
    }

    if (credential) {
      admin.initializeApp({
        credential,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'turf-booking-app-d341c.firebasestorage.app',
      });
      isInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.warn('⚠️ Firebase Admin credentials not provided. Initializing default app.');
      admin.initializeApp({
        projectId: 'turf-booking-app-d341c',
      });
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
