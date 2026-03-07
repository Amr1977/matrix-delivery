'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { 'default': mod };
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateSecurityConfig = exports.sanitizeRequest = exports.additionalSecurityHeaders = exports.strictCorsConfig = exports.httpsRedirect = exports.cookieParserMiddleware = exports.helmetConfig = void 0;
const helmet_1 = __importDefault(require('helmet'));
const cookie_parser_1 = __importDefault(require('cookie-parser'));
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '';
/**
 * Helmet.js configuration for security headers
 */
exports.helmetConfig = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['\'self\''],
            scriptSrc: [
                '\'self\'',
                'https://cdn.jsdelivr.net',
                'https://www.google.com/recaptcha/',
                'https://www.gstatic.com/recaptcha/'
            ],
            styleSrc: [
                '\'self\'',
                '\'unsafe-inline\'', // Required for some UI frameworks
                'https://fonts.googleapis.com'
            ],
            imgSrc: ['\'self\'', 'data:', 'https:'],
            connectSrc: ['\'self\'', ...CORS_ORIGIN.split(',').map(o => o.trim())],
            frameSrc: ['https://www.google.com/recaptcha/'],
            objectSrc: ['\'none\''],
            upgradeInsecureRequests: IS_PRODUCTION ? [] : null
        }
    },
    // Allow cross-origin loading of images (for Firebase frontend loading from API)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    strictTransportSecurity: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    hidePoweredBy: true
});
/**
 * Cookie parser middleware (required for CSRF)
 */
exports.cookieParserMiddleware = (0, cookie_parser_1.default)();
/**
 * HTTPS redirect middleware for production
 */
const httpsRedirect = (req, res, next) => {
    if (IS_PRODUCTION && req.header('x-forwarded-proto') !== 'https') {
        return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
};
exports.httpsRedirect = httpsRedirect;
/**
 * Strict CORS configuration
 */
exports.strictCorsConfig = {
    origin: (origin, callback) => {
        const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // In development, allow localhost origins
        if (!IS_PRODUCTION && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            return callback(null, origin);
        }

        if (allowedOrigins.includes(origin)) {
            // Return specific origin for credential support
            callback(null, origin);
        }
        else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma',
        'X-CSRF-Token'
    ],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200
};
/**
 * Security headers middleware (additional to Helmet)
 */
const additionalSecurityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions policy (formerly Feature-Policy)
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
    next();
};
exports.additionalSecurityHeaders = additionalSecurityHeaders;
/**
 * Request sanitization middleware
 */
const sanitizeRequest = (req, res, next) => {
    // Remove null bytes from request
    if (req.body) {
        req.body = JSON.parse(JSON.stringify(req.body).replace(/\0/g, ''));
    }
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].replace(/\0/g, '');
            }
        });
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
/**
 * Validate environment variables on startup
 */
const validateSecurityConfig = () => {
    if (IS_TEST) {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
            process.env.JWT_SECRET = 'test_jwt_secret_'.padEnd(64, 'x');
        }
        if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 64) {
            process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_'.padEnd(64, 'y');
        }
        if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
            process.env.ENCRYPTION_KEY = 'e'.repeat(64);
        }
        if (!process.env.CORS_ORIGIN) {
            process.env.CORS_ORIGIN = 'http://localhost:3000';
        }
        console.log('✅ Security configuration set for test environment');
        return;
    }
    const required = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'ENCRYPTION_KEY',
        'CORS_ORIGIN'
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    if (process.env.JWT_SECRET.length < 64) {
        throw new Error('JWT_SECRET must be at least 64 characters');
    }
    if (process.env.JWT_REFRESH_SECRET.length < 64) {
        throw new Error('JWT_REFRESH_SECRET must be at least 64 characters');
    }
    if (process.env.ENCRYPTION_KEY.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters');
    }
    if (IS_PRODUCTION && CORS_ORIGIN.includes('localhost')) {
        console.warn('⚠️ WARNING: CORS_ORIGIN contains localhost in production configuration');
    }
    console.log('✅ Security configuration validated');
};
exports.validateSecurityConfig = validateSecurityConfig;
exports.default = {
    helmetConfig: exports.helmetConfig,
    cookieParserMiddleware: exports.cookieParserMiddleware,
    httpsRedirect: exports.httpsRedirect,
    strictCorsConfig: exports.strictCorsConfig,
    additionalSecurityHeaders: exports.additionalSecurityHeaders,
    sanitizeRequest: exports.sanitizeRequest,
    validateSecurityConfig: exports.validateSecurityConfig
};
