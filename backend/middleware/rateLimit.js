const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');
const logger = require('../config/logger');
const { ipKeyFromRequest } = require('./ipKey');

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
      return req.headers['x-device-fingerprint'] || ipKeyFromRequest(req);
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

// Top-Up Rate Limit (Egypt Payment Phase 1)
// 10 requests per minute per user
const topupRateLimit = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  message: 'Too many top-up requests. Please wait a moment before trying again.',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP/fingerprint
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    return req.headers['x-device-fingerprint'] || ipKeyFromRequest(req);
  }
}, 'rl:topup:');

// Dummy functions for backward compatibility if needed
const startCleanup = () => { };
const stopCleanup = () => { };

module.exports = {
  rateLimit: (opts) => createLimiter(opts, 'rl:custom:'), // Legacy wrapper support
  apiRateLimit,
  authRateLimit,
  orderCreationRateLimit,
  uploadRateLimit,
  topupRateLimit,
  startCleanup,
  stopCleanup
};

// Location Update Rate Limit (more lenient for real-time tracking)
// 5000 requests per 15 minutes (approx 5.5 req/sec per driver)
const locationRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5000,
  message: 'Location update limit exceeded',
  skip: (req) => req.url.includes('/maps/')
}, 'rl:location:');

module.exports.locationRateLimit = locationRateLimit;
