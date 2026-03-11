const crypto = require('crypto');
const logger = require('../config/logger');

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
// Enabled by default; can be turned off explicitly (e.g. for legacy local setups)
const ENABLE_CSRF = process.env.ENABLE_CSRF !== 'false';

// Use JWT_SECRET or a fallback for signing CSRF tokens
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'matrix-delivery-csrf-fallback-secret';

/**
 * Generate a signed CSRF token.
 * Format: random_hex.timestamp.signature
 */
const generateToken = () => {
  const random = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const data = `${random}.${timestamp}`;
  const signature = crypto.createHmac('sha256', CSRF_SECRET).update(data).digest('hex');
  return `${data}.${signature}`;
};

/**
 * Verify a signed CSRF token.
 * Checks signature and expiration (e.g., 24 hours).
 */
const verifySignedToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  const [random, timestamp, signature] = parts;
  const data = `${random}.${timestamp}`;
  const expectedSignature = crypto.createHmac('sha256', CSRF_SECRET).update(data).digest('hex');
  
  if (signature !== expectedSignature) return false;
  
  // Expiration check (24 hours = 86400000 ms)
  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > 86400000) return false;
  
  return true;
};

/**
 * Issue a CSRF token and set it in a non-httpOnly cookie.
 * Frontend will mirror this value in the X-CSRF-Token header (double-submit cookie pattern).
 */
const csrfTokenRoute = (req, res) => {
  if (!ENABLE_CSRF || IS_TEST) {
    // In testing or when disabled, return a null token so frontend doesn't break
    return res.json({ csrfToken: null, disabled: true });
  }

  // CRITICAL: Ensure this endpoint is NEVER cached by browsers or CDNs.
  // If cached, the frontend gets a token from the cache but the cookie is not set.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const token = generateToken();
  const isHttps = req.secure || req.get('x-forwarded-proto') === 'https';
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';

  // Double-submit cookie pattern:
  // 1. Set a non-httpOnly cookie so frontend JS can read it (if same-site)
  // 2. OR rely on the browser sending it back automatically with credentials: include
  res.cookie('csrfToken', token, {
    httpOnly: false, // must be readable by frontend JS for true double-submit
    sameSite: isHttps ? 'none' : 'lax', // Use 'none' for cross-site (requires HTTPS), 'lax' for same-site/dev
    secure: isHttps || IS_PRODUCTION || (isHttps ? true : false), // Use secure if HTTPS or production
    path: '/', // Ensure it's available for all /api routes
  });
  
  // Ensure that if sameSite is 'none', secure MUST be true (browser requirement)
  // This is a safety check for the cookie options above
  if (isHttps) {
    // If we're on HTTPS, we should always use secure: true for CSRF
  }

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
  '/api/maps/proxy',
  '/v1/balance/telegram/webhook',  // Telegram webhook (external service, no CSRF needed)
  '/balance/telegram/webhook'       // Alternate path
];

/**
 * CSRF validation middleware for state-changing requests.
 * - Skips safe methods (GET/HEAD/OPTIONS)
 * - Skips exempt utility POST routes
 * - Validates that X-CSRF-Token header matches csrfToken cookie
 * - FALLBACK: If cookie is missing (Safari cross-domain), validates header signature
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

  // Primary Check: Standard Double-Submit (Cookie matches Header)
  if (cookieToken && headerToken && cookieToken === headerToken) {
    return next();
  }

  // Secondary Check / Fallback: Signed Token Validation
  // This handles browsers like Safari that block cross-domain cookies (ITP)
  if (!cookieToken && headerToken) {
    if (verifySignedToken(headerToken)) {
      logger.info('CSRF fallback: Validated signed header token (cookie missing)', {
        path: req.path,
        method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        category: 'security'
      });
      return next();
    }
  }

  // Mismatch or invalid token
  logger.security('CSRF token validation failed', {
    path: req.path,
    method,
    hasCookieToken: !!cookieToken,
    hasHeaderToken: !!headerToken,
    cookieTokenMatchesHeader: cookieToken === headerToken,
    isValidSignedHeader: verifySignedToken(headerToken),
    category: 'security',
  });
  
  return res.status(403).json({ 
    error: 'Invalid CSRF token',
    details: !headerToken ? 'Missing CSRF header' : (!cookieToken ? 'Cookie blocked by browser' : 'Token mismatch')
  });
};

module.exports = {
  csrfMiddleware,
  csrfTokenRoute,
};

