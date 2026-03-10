/**
 * Tests for backend/middleware/rateLimit.js
 * - verifies fingerprint → IP fallback keying
 * - verifies bypass in NODE_ENV=test
 */

const path = require('path');

// Helper to reload module with a specific NODE_ENV and optional mocks
function loadWithEnv(env, mockFactory) {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  jest.resetModules();
  if (mockFactory) mockFactory();
  const mod = require('../../middleware/rateLimit');
  const rateLimitLib = require('express-rate-limit');
  process.env.NODE_ENV = prevEnv;
  return { mod, rateLimitLib };
}

describe('rateLimit middleware: key generation and test bypass', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('uses device fingerprint when provided', () => {
    let capturedOpts;
    const { mod } = loadWithEnv('development', () => {
      jest.doMock('express-rate-limit', () => {
        return jest.fn((opts) => {
          capturedOpts = opts;
          return (req, res, next) => next();
        });
      });
      // Avoid any Redis store side-effects (not used but safe)
      jest.doMock('rate-limit-redis', () => ({ RedisStore: class {} }));
      jest.doMock(require('path').resolve(__dirname, '../../config/redis'), () => null, { virtual: true });
      const path = require('path');
      const loggerPath = path.resolve(__dirname, '../../config/logger');
      jest.doMock(loggerPath, () => ({
        info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
        security: jest.fn(), requestLogger: (req,res,next)=>next(), http: jest.fn(),
        performance: jest.fn(), auth: jest.fn()
      }), { virtual: true });
      jest.doMock(require('path').resolve(__dirname, '../../config/redis'), () => null, { virtual: true });
    });

    // Create a limiter to build default options
    mod.rateLimit({ windowMs: 60_000, limit: 5, message: 'x' });
    expect(typeof capturedOpts.keyGenerator).toBe('function');

    const key = capturedOpts.keyGenerator({ headers: { 'x-device-fingerprint': 'FP123' } });
    expect(key).toBe('FP123');
  });

  test('falls back to x-forwarded-for then req.ip', () => {
    let capturedOpts;
    const { mod } = loadWithEnv('development', () => {
      jest.doMock('express-rate-limit', () => {
        return jest.fn((opts) => {
          capturedOpts = opts;
          return (req, res, next) => next();
        });
      });
      jest.doMock('rate-limit-redis', () => ({ RedisStore: class {} }));
      jest.doMock(require('path').resolve(__dirname, '../../config/redis'), () => null, { virtual: true });
      const path = require('path');
      const loggerPath = path.resolve(__dirname, '../../config/logger');
      jest.doMock(loggerPath, () => ({
        info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
        security: jest.fn(), requestLogger: (req,res,next)=>next(), http: jest.fn(),
        performance: jest.fn(), auth: jest.fn()
      }), { virtual: true });
      jest.doMock(require('path').resolve(__dirname, '../../config/redis'), () => null, { virtual: true });
    });

    mod.rateLimit({ windowMs: 60_000, limit: 5, message: 'x' });

    const k1 = capturedOpts.keyGenerator({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
    expect(k1).toBe('1.2.3.4');

    const k2 = capturedOpts.keyGenerator({ headers: {}, ip: '9.9.9.9' });
    expect(k2).toBe('9.9.9.9');
  });

  test('bypasses limiter entirely in NODE_ENV=test', () => {
    const { mod, rateLimitLib } = loadWithEnv('test', () => {
      jest.doMock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));
      jest.doMock('rate-limit-redis', () => ({ RedisStore: class {} }));
      jest.doMock(require('path').resolve(__dirname, '../../config/redis'), () => null, { virtual: true });
      const path = require('path');
      const loggerPath = path.resolve(__dirname, '../../config/logger');
      jest.doMock(loggerPath, () => ({
        info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
        security: jest.fn(), requestLogger: (req,res,next)=>next(), http: jest.fn(),
        performance: jest.fn(), auth: jest.fn()
      }), { virtual: true });
      jest.doMock(require('path').resolve(__dirname, '../../config/redis'), () => null, { virtual: true });
    });

    const mw = mod.rateLimit({ windowMs: 60_000, limit: 1, message: 'x' });
    const next = jest.fn();
    mw({}, {}, next);
    expect(next).toHaveBeenCalled();

    // Should not instantiate express-rate-limit in test mode
    expect(rateLimitLib).toHaveBeenCalledTimes(0);
  });
});

