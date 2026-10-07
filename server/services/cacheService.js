const redis = require('../config/redisClient');

/**
 * In-memory fallback map for environments without a running Redis server
 */
const memoryStore = new Map();

/**
 * Cache Service - Wrapper over ioredis with in-memory fallback
 */
const cacheService = {
  /**
   * Get cached JSON value by key
   */
  async get(key) {
    if (redis && redis.status === 'ready') {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        console.warn(`Redis get error for ${key}:`, err.message);
      }
    }

    // In-memory fallback
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  /**
   * Set JSON value with TTL (in seconds)
   */
  async set(key, value, ttlSeconds = 300) {
    if (redis && redis.status === 'ready') {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return true;
      } catch (err) {
        console.warn(`Redis set error for ${key}:`, err.message);
      }
    }

    // In-memory fallback
    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
    return true;
  },

  /**
   * Delete specific key
   */
  async del(key) {
    if (redis && redis.status === 'ready') {
      try {
        await redis.del(key);
      } catch (err) {
        console.warn(`Redis del error for ${key}:`, err.message);
      }
    }
    memoryStore.delete(key);
    return true;
  },

  /**
   * Delete keys matching a pattern
   */
  async invalidatePattern(pattern) {
    if (redis && redis.status === 'ready') {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (err) {
        console.warn(`Redis invalidatePattern error for ${pattern}:`, err.message);
      }
    }

    // In-memory pattern invalidation
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of memoryStore.keys()) {
      if (regex.test(key)) {
        memoryStore.delete(key);
      }
    }
    return true;
  },

  /**
   * Invalidate slot availability for a turf and date
   */
  async invalidateSlots(turfId, date) {
    if (date) {
      return this.del(`slots:${turfId}:${date}`);
    }
    return this.invalidatePattern(`slots:${turfId}:*`);
  },

  /**
   * Invalidate vendor dashboard cache
   */
  async invalidateDashboard(vendorId) {
    return this.del(`vendor:dashboard:${vendorId}`);
  },
};

module.exports = cacheService;
