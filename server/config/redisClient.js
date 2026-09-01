const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

let redis = null;
let isRedisConnected = false;

const isPlaceholderUrl = (url) => !url || url.includes('your_railway_redis') || url.includes('placeholder');

if (process.env.REDIS_URL && !isPlaceholderUrl(process.env.REDIS_URL)) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 300, 1000);
      },
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      lazyConnect: true,
    });
    redis.connect().catch((err) => {
      console.warn('⚠️ Redis connection failed, running in in-memory mode:', err.message);
    });

    redis.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ Redis connected successfully');
    });

    redis.on('error', (err) => {
      isRedisConnected = false;
      console.warn('⚠️ Redis connection error:', err.message);
    });
  } catch (err) {
    console.warn('⚠️ Could not initialize Redis client:', err.message);
  }
} else {
  console.warn('⚠️ REDIS_URL not set in .env. Redis caching & rate-limiting will run in in-memory fallback mode.');
}

module.exports = redis;
