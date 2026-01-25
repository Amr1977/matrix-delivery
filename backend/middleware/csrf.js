const crypto = require('crypto');
const logger = require('../config/logger');

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
// Enabled by default; can be turned off explicitly (e.g. for legacy local setups)
const ENABLE_CSRF = process.env.ENABLE_CSRF !== 'false';

const generateToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Issue a CSRF token and set it in a non-httpOnly cookie.
 * Frontend will mirror this value in the X-CSRF-Token header (double-submit cookie pattern).
 */
const csrfTokenRoute = (req, res) => {
  if (!ENABLE_CSRF || IS_TEST) {
    // In testing or when disabled, return a null token so frontend doesn't break
    return res.json({ csrfToken: null, disabled: true });
  }

  const token = generateToken();

  res.cookie('csrfToken', token, {
    httpOnly: false, // must be readable by frontend JS
    sameSite: 'none',
    secure: true, // Required for sameSite: 'none'
  });

  // Also expose via header for clients that prefer it
  res.setHeader('X-CSRF-Token', token);

  return res.json({ csrfToken: token });
};

// Routes that are POST but don't change state (read-only utilities)
// Note: Paths are relative to where the middleware is mounted (/api)
const EXEMPT_POST_ROUTES = [
  '/locations/calculate-route',
  '/api/locations/calculate-route',
  '/locations/parse-maps-url',
  '/api/locations/parse-maps-url',
  '/maps/proxy',
  '/api/maps/proxy'
];

/**
 * CSRF validation middleware for state-changing requests.
 * - Skips safe methods (GET/HEAD/OPTIONS)
 * - Skips exempt utility POST routes
 * - Validates that X-CSRF-Token header matches csrfToken cookie
 */
const csrfMiddleware = (req, res, next) => {
  if (!ENABLE_CSRF || IS_TEST) {
    return next();
  }

  const method = (req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Exempt specific read-only POST routes
  const currentPath = req.path;
  const originalPath = req.originalUrl.split('?')[0];

  if (method === 'POST' && EXEMPT_POST_ROUTES.some(route => currentPath === route || originalPath === route)) {
    return next();
  }

  const cookieToken = req.cookies && req.cookies.csrfToken;
  const headerToken = req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.security('CSRF token validation failed', {
      path: req.path,
      method,
      hasCookieToken: !!cookieToken,
      hasHeaderToken: !!headerToken,
      category: 'security',
    });
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  return next();
};

module.exports = {
  csrfMiddleware,
  csrfTokenRoute,
};

