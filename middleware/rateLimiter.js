// Simple in-memory rate limiter
const rateLimitStore = new Map();

/**
 * Rate limiter middleware
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 */
const rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(identifier)) {
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const userData = rateLimitStore.get(identifier);
    
    // Reset if window expired
    if (now > userData.resetTime) {
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    // Check if limit exceeded
    if (userData.count >= maxRequests) {
      const retryAfter = Math.ceil((userData.resetTime - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: retryAfter
      });
    }
    
    // Increment count
    userData.count++;
    rateLimitStore.set(identifier, userData);
    next();
  };
};

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Clear rate limit for specific IP (useful for development)
 */
const clearRateLimit = (identifier) => {
  rateLimitStore.delete(identifier);
};

/**
 * Clear all rate limits (useful for development)
 */
const clearAllRateLimits = () => {
  rateLimitStore.clear();
};

module.exports = { rateLimiter, clearRateLimit, clearAllRateLimits };
