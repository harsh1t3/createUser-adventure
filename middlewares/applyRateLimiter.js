/**
 * Rate Limiter Middleware
 * - Adds X-RateLimit-* headers
 * - Logs usage
 * - Blocks on Redis threshold
 */

function rateLimiterMiddleware(limiter, keyResolver = (req) => {
  return req.body?.email?.toLowerCase() || req.ip;
}) {
  return async (req, res, next) => {
    const key = keyResolver(req);

    try {
      await limiter.consume(key);
      const rateInfo = await limiter.get(key);

      // Add rate limit headers
      res.setHeader("X-RateLimit-Limit", limiter.points);
      res.setHeader("X-RateLimit-Remaining", rateInfo.remainingPoints);
      res.setHeader("X-RateLimit-Reset", Math.ceil(rateInfo.msBeforeNext / 1000));

      console.log(`[RateLimiter] ${key} - remaining: ${rateInfo.remainingPoints}`);
      next();
    } catch (err) {
      let retryAfter = 60;
      try {
        const rateInfo = await limiter.get(key);
        retryAfter = Math.ceil(rateInfo?.msBeforeNext / 1000 || 60);
      } catch (innerErr) {
        // If limiter.get fails, use default retryAfter
        console.error(`[RateLimiter] Failed to get rate info for ${key}:`, innerErr);
      }

      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({
        error: "Rate limit exceeded",
        message: `Try again in ${retryAfter} seconds.`,
      });

      console.warn(`[RateLimiter] ${key} - BLOCKED`, err);
    }
  };
}

module.exports = rateLimiterMiddleware;
