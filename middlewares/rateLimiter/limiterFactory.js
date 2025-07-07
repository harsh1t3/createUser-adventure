const { RateLimiterRedis } = require('rate-limiter-flexible');
const redisClient = require('./redisClient');

/**
 * Create a sliding window limiter instance
 */
function createRateLimiter({
  keyPrefix,
  points = 5,
  duration = 600,
  blockDuration = 900,
}) {
  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix,
    points,
    duration,
    blockDuration,
  });
}

module.exports = createRateLimiter;
