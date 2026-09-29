const { query, getClient } = require('../config/db');
const fs = require('fs');
const path = require('path');

const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');

// Helper to read local fallback DB
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

let dbConnectionError = false;

/**
 * Universal PostgreSQL Database Access Service
 * Fully replaces Firestore with 100% backward-compatible API
 */
const dbService = {
  serverTimestamp: () => new Date().toISOString(),

  /**
   * Get single document by collection and ID
   */
  async getDoc(collectionName, docId) {
    if (!dbConnectionError) {
      try {
        const res = await query(
          'SELECT data FROM documents WHERE collection = $1 AND id = $2 LIMIT 1',
          [collectionName, String(docId)]
        );
        if (res.rows.length === 0) return null;
        return { id: String(docId), ...res.rows[0].data };
      } catch (err) {
        console.warn(`⚠️ PostgreSQL getDoc error (${collectionName}/${docId}):`, err.message);
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
    const id = String(docId);
    if (!dbConnectionError) {
      try {
        let finalData = { ...data, id };
        if (merge) {
          const existing = await this.getDoc(collectionName, id);
          if (existing) {
            finalData = { ...existing, ...data, id };
          }
        }

        const now = new Date().toISOString();
        if (!finalData.createdAt) {
          finalData.createdAt = now;
        }
        finalData.updatedAt = now;

        await query(
          `INSERT INTO documents (collection, id, data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (collection, id)
           DO UPDATE SET data = $3, updated_at = $5`,
          [collectionName, id, JSON.stringify(finalData), finalData.createdAt, now]
        );

        return { id, ...finalData };
      } catch (err) {
        console.warn(`⚠️ PostgreSQL setDoc error (${collectionName}/${id}):`, err.message);
      }
    }

    const localDb = readLocalDb();
    if (!localDb[collectionName]) localDb[collectionName] = {};
    const existing = merge ? localDb[collectionName][id] || {} : {};
    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    localDb[collectionName][id] = updated;
    writeLocalDb(localDb);
    return { id, ...updated };
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
    const id = String(docId);
    if (!dbConnectionError) {
      try {
        await query('DELETE FROM documents WHERE collection = $1 AND id = $2', [collectionName, id]);
        return true;
      } catch (err) {
        console.warn(`⚠️ PostgreSQL deleteDoc error (${collectionName}/${id}):`, err.message);
      }
    }

    const localDb = readLocalDb();
    if (localDb[collectionName] && localDb[collectionName][id]) {
      delete localDb[collectionName][id];
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
    if (!dbConnectionError) {
      try {
        const queryParams = [collectionName];
        let whereClauses = ['collection = $1'];
        let paramIndex = 2;

        for (const [field, op, val] of filters) {
          if (val !== undefined && val !== null && val !== '') {
            if (op === '==') {
              whereClauses.push(`data->>'${field}' = $${paramIndex}`);
              queryParams.push(String(val));
              paramIndex++;
            } else if (op === '!=') {
              whereClauses.push(`data->>'${field}' != $${paramIndex}`);
              queryParams.push(String(val));
              paramIndex++;
            } else if (op === '>') {
              whereClauses.push(`(data->>'${field}')::numeric > $${paramIndex}`);
              queryParams.push(Number(val));
              paramIndex++;
            } else if (op === '<') {
              whereClauses.push(`(data->>'${field}')::numeric < $${paramIndex}`);
              queryParams.push(Number(val));
              paramIndex++;
            } else if (op === 'array-contains') {
              whereClauses.push(`data->'${field}' @> $${paramIndex}::jsonb`);
              queryParams.push(JSON.stringify([val]));
              paramIndex++;
            }
          }
        }

        const fetchLimit = Number(limit) + 1;
        let sql = `SELECT id, data FROM documents WHERE ${whereClauses.join(' AND ')}`;

        if (orderByField) {
          const dir = orderDirection?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
          sql += ` ORDER BY data->>'${orderByField}' ${dir} NULLS LAST`;
        }

        sql += ` LIMIT ${fetchLimit}`;

        const res = await query(sql, queryParams);
        let docs = res.rows.map((r) => ({ id: r.id, ...r.data }));

        // If cursor was provided, find slice after cursor
        if (cursor) {
          const cursorIdx = docs.findIndex((d) => d.id === cursor);
          if (cursorIdx !== -1) {
            docs = docs.slice(cursorIdx + 1);
          }
        }

        const hasMore = docs.length > limit;
        const resultDocs = hasMore ? docs.slice(0, limit) : docs;
        const nextCursor = hasMore && resultDocs.length > 0 ? resultDocs[resultDocs.length - 1].id : null;

        return { items: resultDocs, nextCursor, count: resultDocs.length };
      } catch (err) {
        console.warn(`⚠️ PostgreSQL query error (${collectionName}):`, err.message);
      }
    }

    // Local fallback matching
    const localDb = readLocalDb();
    const col = localDb[collectionName] || {};
    let items = Object.values(col);

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
   * Slot Overrides: get overrides for turf and date
   */
  async getSlotOverrides(turfId, date) {
    try {
      const res = await query(
        'SELECT blocked_slots, price_overrides FROM slot_overrides WHERE turf_id = $1 AND date = $2 LIMIT 1',
        [turfId, date]
      );
      if (res.rows.length === 0) return { blockedSlots: [], priceOverrides: {} };
      return {
        blockedSlots: res.rows[0].blocked_slots || [],
        priceOverrides: res.rows[0].price_overrides || {},
      };
    } catch (err) {
      console.warn('⚠️ Error getting slot overrides from Postgres:', err.message);
      return { blockedSlots: [], priceOverrides: {} };
    }
  },

  /**
   * Slot Overrides: save overrides for turf and date
   */
  async setSlotOverrides(turfId, date, { blockedSlots = [], priceOverrides = {} }) {
    try {
      await query(
        `INSERT INTO slot_overrides (turf_id, date, blocked_slots, price_overrides, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (turf_id, date)
         DO UPDATE SET blocked_slots = $3, price_overrides = $4, updated_at = NOW()`,
        [turfId, date, JSON.stringify(blockedSlots), JSON.stringify(priceOverrides)]
      );
      return true;
    } catch (err) {
      console.warn('⚠️ Error setting slot overrides in Postgres:', err.message);
      return false;
    }
  },

  /**
   * Execute an atomic transaction via a pooled client
   */
  async runTransaction(transactionCallback) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const result = await transactionCallback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = dbService;
