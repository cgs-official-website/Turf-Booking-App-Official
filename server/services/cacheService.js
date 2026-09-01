const redis = require('../config/redisClient');

/**
 * Cache Service - Wrapper over ioredis for caching hot reads
 */
const cacheService = {
  /**
   * Get cached JSON value by key
   */
  async get(key) {
    if (!redis || redis.status !== 'ready') return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn(`Cache get error for ${key}:`, err.message);
      return null;
    }
  },

  /**
   * Set JSON value with TTL (in seconds)
   */
  async set(key, value, ttlSeconds = 300) {
    if (!redis || redis.status !== 'ready') return false;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return true;
    } catch (err) {
      console.warn(`Cache set error for ${key}:`, err.message);
      return false;
    }
  },

  /**
   * Delete specific key
   */
  async del(key) {
    if (!redis || redis.status !== 'ready') return false;
    try {
      await redis.del(key);
      return true;
    } catch (err) {
      console.warn(`Cache del error for ${key}:`, err.message);
      return false;
    }
  },

  /**
   * Delete keys matching a pattern (e.g. "slots:turf123:*")
   */
  async invalidatePattern(pattern) {
    if (!redis || redis.status !== 'ready') return false;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (err) {
      console.warn(`Cache invalidatePattern error for ${pattern}:`, err.message);
      return false;
    }
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
