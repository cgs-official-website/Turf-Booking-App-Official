const redis = require('../config/redisClient');
const { sendError } = require('../utils/response');

// In-memory fallback map if Redis is not reachable
const memoryStore = new Map();

/**
 * Clean expired keys in memory fallback every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of memoryStore.entries()) {
    if (val.expiresAt && val.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * OTP Rate Limiter & Resend Cooldown Middleware
 * - Cooldown: 30 seconds
 * - Hourly Rate Limit: max 5 requests per hour
 */
const otpRateLimiter = async (req, res, next) => {
  const identifier = req.body.phone || req.body.email || req.ip;

  if (!identifier) {
    return sendError(res, 'Identifier (phone/email) is required for OTP request', 400, 'BAD_REQUEST');
  }

  const cooldownKey = `otp:cooldown:${identifier}`;
  const rateLimitKey = `otp:rl:${identifier}`;

  try {
    if (redis && redis.status === 'ready') {
      // Check 30s Cooldown
      const inCooldown = await redis.get(cooldownKey);
      if (inCooldown) {
        const ttl = await redis.ttl(cooldownKey);
        return sendError(
          res,
          `Please wait ${ttl > 0 ? ttl : 30} seconds before requesting a new OTP`,
          429,
          'OTP_COOLDOWN_ACTIVE'
        );
      }

      // Check Hourly Limit (max 5)
      const count = await redis.incr(rateLimitKey);
      if (count === 1) {
        await redis.expire(rateLimitKey, 3600); // 1 hour window
      }

      if (count > 5) {
        const ttl = await redis.ttl(rateLimitKey);
        const minsLeft = Math.ceil(ttl / 60);
        return sendError(
          res,
          `Too many OTP requests. Please try again after ${minsLeft} minutes.`,
          429,
          'OTP_RATE_LIMIT_EXCEEDED'
        );
      }

      // Set 30s cooldown
      await redis.set(cooldownKey, '1', 'EX', 30);
    } else {
      // Memory Fallback
      const now = Date.now();
      const cooldownVal = memoryStore.get(cooldownKey);
      if (cooldownVal && cooldownVal.expiresAt > now) {
        const secondsLeft = Math.ceil((cooldownVal.expiresAt - now) / 1000);
        return sendError(
          res,
          `Please wait ${secondsLeft} seconds before requesting a new OTP`,
          429,
          'OTP_COOLDOWN_ACTIVE'
        );
      }

      const rlVal = memoryStore.get(rateLimitKey) || { count: 0, expiresAt: now + 3600 * 1000 };
      if (rlVal.expiresAt <= now) {
        rlVal.count = 0;
        rlVal.expiresAt = now + 3600 * 1000;
      }

      rlVal.count += 1;
      memoryStore.set(rateLimitKey, rlVal);

      if (rlVal.count > 5) {
        const minsLeft = Math.ceil((rlVal.expiresAt - now) / 60000);
        return sendError(
          res,
          `Too many OTP requests. Please try again after ${minsLeft} minutes.`,
          429,
          'OTP_RATE_LIMIT_EXCEEDED'
        );
      }

      memoryStore.set(cooldownKey, { expiresAt: now + 30 * 1000 });
    }

    next();
  } catch (err) {
    console.error('OTP rate limiter error:', err.message);
    // On unexpected rate-limiter failure, allow request to proceed
    next();
  }
};

module.exports = {
  otpRateLimiter,
};
