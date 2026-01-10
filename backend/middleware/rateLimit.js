const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');
const logger = require('../config/logger');

const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

/**
 * Create a rate limiter middleware
 * @param {Object} options Options for express-rate-limit
 * @param {string} prefix Key prefix for Redis
 */
const createLimiter = (options, prefix = 'rl:') => {
  // If in test environment, bypass rate limiting
  if (isTest) {
    return (req, res, next) => next();
  }

  const limitOptions = {
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
      // Support FingerprintJS or similar device fingerprinting
      // Fallback to IP address if header is missing
      return req.headers['x-device-fingerprint'] || req.ip;
    },
    handler: (req, res, next, options) => {
      logger.security('Rate limit exceeded', {
        ip: req.ip,
        fingerprint: req.headers['x-device-fingerprint'] || 'none',
        path: req.path,
        limit: options.limit,
        windowMs: options.windowMs,
        category: 'security'
      });
      res.status(options.statusCode).json({
        error: options.message
      });
    },
    ...options
  };

  // Use Redis store if client is available
  if (redisClient) {
    limitOptions.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: prefix
    });
  }

  return rateLimit(limitOptions);
};

// General API Rate Limit
// General API Rate Limit
// 1000 requests per 15 minutes (approx 1 req every second)
const apiRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 1000, // Increased for dev/testing stability
  message: 'Too many requests, please try again later',
  skip: (req) => req.url.includes('/maps/') // Skip map tiles which are heavy on requests
}, 'rl:api:');

// Auth Rate Limit (Stricter)
// 100 attempts per 15 minutes
const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100, // Increased for dev usage
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
}, 'rl:auth:');

// Order Creation Rate Limit
// 100 orders per hour
const orderCreationRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 100, // Increased for testing
  message: 'Order creation limit exceeded, please try again later'
}, 'rl:order:');

// File Upload Rate Limit
// 100 uploads per hour
const uploadRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 100, // Increased for testing
  message: 'Upload limit exceeded, please try again later'
}, 'rl:upload:');


// Dummy functions for backward compatibility if needed, 
// though cleanup is handled by Redis or express-rate-limit automatically
const startCleanup = () => { };
const stopCleanup = () => { };

module.exports = {
  rateLimit: (opts) => createLimiter(opts, 'rl:custom:'), // Legacy wrapper support
  apiRateLimit,
  authRateLimit,
  orderCreationRateLimit,
  uploadRateLimit,
  startCleanup,
  stopCleanup
};

