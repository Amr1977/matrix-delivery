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
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // Also expose via header for clients that prefer it
  res.setHeader('X-CSRF-Token', token);

  return res.json({ csrfToken: token });
};

/**
 * CSRF validation middleware for state-changing requests.
 * - Skips safe methods (GET/HEAD/OPTIONS)
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

