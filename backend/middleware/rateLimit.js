const logger = require('../config/logger');

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map();

/**
 * Rate limiting middleware
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    maxRequests = 100, // 100 requests per window
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Skip rate limiting in test/development environment
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'development') {
      return next();
    }

    // Initialize or get existing requests for this key
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);

    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      logger.security('Rate limit exceeded', {
        key,
        requestCount: validRequests.length,
        maxRequests,
        windowMs,
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        category: 'security'
      });

      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request timestamp
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);

    // Track response to potentially remove from count
    const originalSend = res.send;
    res.send = function (data) {
      // If configured to skip successful/failed requests
      if ((skipSuccessfulRequests && res.statusCode < 400) ||
        (skipFailedRequests && res.statusCode >= 400)) {
        // Remove this request from the count
        const currentRequests = rateLimitStore.get(key) || [];
        const index = currentRequests.indexOf(now);
        if (index > -1) {
          currentRequests.splice(index, 1);
          rateLimitStore.set(key, currentRequests);
        }
      }

      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Stricter rate limiting for authentication endpoints
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful logins against limit
  skipFailedRequests: false
});

/**
 * Rate limiting for API endpoints
 */
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'API rate limit exceeded, please try again later'
});

/**
 * Stricter rate limiting for order creation
 */
const orderCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 orders per hour
  message: 'Order creation limit exceeded, please try again later'
});

/**
 * Rate limiting for file uploads
 */
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 uploads per hour
  message: 'Upload limit exceeded, please try again later'
});

/**
 * Clean up old entries from rate limit store (call periodically)
 */
const cleanupRateLimitStore = () => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [key, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter(time => now - time < maxAge);
    if (validRequests.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validRequests);
    }
  }
};

// Clean up every 30 minutes
setInterval(cleanupRateLimitStore, 30 * 60 * 1000);

module.exports = {
  rateLimit,
  authRateLimit,
  apiRateLimit,
  orderCreationRateLimit,
  uploadRateLimit,
  cleanupRateLimitStore
};
