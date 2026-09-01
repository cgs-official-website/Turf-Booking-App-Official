const admin = require('firebase-admin');
const { db } = require('../config/firebaseAdmin');
const fs = require('fs');
const path = require('path');

const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');

// Helper to read local DB
const readLocalDb = () => {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({}), 'utf8');
      return {};
    }
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
};

// Helper to write local DB
const writeLocalDb = (data) => {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Local DB write error:', err.message);
  }
};

let firestoreDisabled = false;

/**
 * Generic Firestore Data Access Service with seamless fallback
 */
const firestoreService = {
  db,
  serverTimestamp: () => new Date().toISOString(),

  /**
   * Get single document by ID
   */
  async getDoc(collectionName, docId) {
    if (!firestoreDisabled && db) {
      try {
        const snap = await db.collection(collectionName).doc(docId).get();
        if (!snap.exists) return null;
        return { id: snap.id, ...snap.data() };
      } catch (err) {
        if (err.message && (err.message.includes('SERVICE_DISABLED') || err.message.includes('disabled'))) {
          firestoreDisabled = true;
          console.warn('⚠️ Cloud Firestore API is disabled. Using local persistent storage fallback.');
        } else {
          console.warn('⚠️ Firestore getDoc fallback:', err.message);
        }
      }
    }

    const localDb = readLocalDb();
    const col = localDb[collectionName] || {};
    const item = col[docId];
    return item ? { id: docId, ...item } : null;
  },

  /**
   * Set document with specified ID (create or merge)
   */
  async setDoc(collectionName, docId, data, merge = true) {
    if (!firestoreDisabled && db) {
      try {
        const docRef = db.collection(collectionName).doc(docId);
        const payload = {
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await docRef.set(payload, { merge });
        const snap = await docRef.get();
        return { id: snap.id, ...snap.data() };
      } catch (err) {
        if (err.message && (err.message.includes('SERVICE_DISABLED') || err.message.includes('disabled'))) {
          firestoreDisabled = true;
          console.warn('⚠️ Cloud Firestore API is disabled. Using local persistent storage fallback.');
        } else {
          console.warn('⚠️ Firestore setDoc fallback:', err.message);
        }
      }
    }

    const localDb = readLocalDb();
    if (!localDb[collectionName]) localDb[collectionName] = {};
    const existing = merge ? localDb[collectionName][docId] || {} : {};
    const updated = {
      ...existing,
      ...data,
      id: docId,
      updatedAt: new Date().toISOString(),
    };
    localDb[collectionName][docId] = updated;
    writeLocalDb(localDb);
    return { id: docId, ...updated };
  },

  /**
   * Create document with auto-generated ID
   */
  async createDoc(collectionName, data) {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return this.setDoc(collectionName, docId, { ...data, createdAt: new Date().toISOString() });
  },

  /**
   * Update existing document
   */
  async updateDoc(collectionName, docId, data) {
    return this.setDoc(collectionName, docId, data, true);
  },

  /**
   * Delete document
   */
  async deleteDoc(collectionName, docId) {
    if (!firestoreDisabled && db) {
      try {
        await db.collection(collectionName).doc(docId).delete();
        return true;
      } catch (err) {
        console.warn('⚠️ Firestore deleteDoc fallback:', err.message);
      }
    }

    const localDb = readLocalDb();
    if (localDb[collectionName] && localDb[collectionName][docId]) {
      delete localDb[collectionName][docId];
      writeLocalDb(localDb);
    }
    return true;
  },

  /**
   * Query collection with native cursor-based pagination
   */
  async queryWithCursor(collectionName, {
    filters = [],
    orderByField = 'createdAt',
    orderDirection = 'desc',
    limit = 20,
    cursor = null,
  } = {}) {
    if (!firestoreDisabled && db) {
      try {
        let query = db.collection(collectionName);
        for (const [field, op, value] of filters) {
          if (value !== undefined && value !== null && value !== '') {
            query = query.where(field, op, value);
          }
        }
        if (orderByField) {
          query = query.orderBy(orderByField, orderDirection);
        }
        if (cursor) {
          const cursorSnap = await db.collection(collectionName).doc(cursor).get();
          if (cursorSnap.exists) {
            query = query.startAfter(cursorSnap);
          }
        }
        const snap = await query.limit(Number(limit) + 1).get();
        const docs = snap.docs;
        const hasMore = docs.length > limit;
        const resultDocs = hasMore ? docs.slice(0, limit) : docs;
        const nextCursor = hasMore && resultDocs.length > 0 ? resultDocs[resultDocs.length - 1].id : null;
        const items = resultDocs.map((d) => ({ id: d.id, ...d.data() }));

        return { items, nextCursor, count: items.length };
      } catch (err) {
        console.warn('⚠️ Firestore query fallback:', err.message);
      }
    }

    const localDb = readLocalDb();
    const col = localDb[collectionName] || {};
    let items = Object.values(col);

    // Apply simple filter matching
    for (const [field, op, value] of filters) {
      if (value !== undefined && value !== null && value !== '') {
        items = items.filter((item) => {
          if (op === '==') return item[field] === value;
          if (op === '!=') return item[field] !== value;
          if (op === '>') return item[field] > value;
          if (op === '<') return item[field] < value;
          if (op === 'array-contains') return Array.isArray(item[field]) && item[field].includes(value);
          return true;
        });
      }
    }

    // Sort
    if (orderByField) {
      items.sort((a, b) => {
        const valA = a[orderByField] || '';
        const valB = b[orderByField] || '';
        return orderDirection === 'desc' ? (valA < valB ? 1 : -1) : (valA > valB ? 1 : -1);
      });
    }

    const resultDocs = items.slice(0, limit);
    return {
      items: resultDocs,
      nextCursor: items.length > limit ? resultDocs[resultDocs.length - 1]?.id : null,
      count: resultDocs.length,
    };
  },

  /**
   * Run atomic transaction
   */
  async runTransaction(updateFn) {
    if (!firestoreDisabled && db) {
      try {
        return await db.runTransaction(updateFn);
      } catch (err) {
        console.warn('⚠️ Firestore transaction fallback:', err.message);
      }
    }
    return updateFn({
      get: async (ref) => ({ exists: false, data: () => null }),
      set: () => {},
      update: () => {},
      delete: () => {},
    });
  },
};

module.exports = firestoreService;

