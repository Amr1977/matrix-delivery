import helmet from 'helmet';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '';

/**
 * Helmet.js configuration for security headers
 */
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://www.google.com/recaptcha/",
                "https://www.gstatic.com/recaptcha/"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Required for some UI frameworks
                "https://fonts.googleapis.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", ...CORS_ORIGIN.split(',').map(o => o.trim())],
            frameSrc: ["https://www.google.com/recaptcha/"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: IS_PRODUCTION ? [] : null
        }
    },
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
 * CSRF protection middleware
 */
export const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'strict'
    }
});

/**
 * Cookie parser middleware (required for CSRF)
 */
export const cookieParserMiddleware = cookieParser();

/**
 * HTTPS redirect middleware for production
 */
export const httpsRedirect: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    if (IS_PRODUCTION && req.header('x-forwarded-proto') !== 'https') {
        return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
};

/**
 * Strict CORS configuration
 */
export const strictCorsConfig = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
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
export const additionalSecurityHeaders: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
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

/**
 * Request sanitization middleware
 */
export const sanitizeRequest: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    // Remove null bytes from request
    if (req.body) {
        req.body = JSON.parse(JSON.stringify(req.body).replace(/\0/g, ''));
    }

    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = (req.query[key] as string).replace(/\0/g, '');
            }
        });
    }

    next();
};

/**
 * Validate environment variables on startup
 */
export const validateSecurityConfig = (): void => {
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

    // Validate JWT secret length
    if (process.env.JWT_SECRET!.length < 64) {
        throw new Error('JWT_SECRET must be at least 64 characters');
    }

    if (process.env.JWT_REFRESH_SECRET!.length < 64) {
        throw new Error('JWT_REFRESH_SECRET must be at least 64 characters');
    }

    if (process.env.ENCRYPTION_KEY!.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters');
    }

    // Validate CORS origins don't contain localhost in production
    if (IS_PRODUCTION && CORS_ORIGIN.includes('localhost')) {
        throw new Error('CORS_ORIGIN must not contain localhost in production');
    }

    console.log('✅ Security configuration validated');
};

export default {
    helmetConfig,
    csrfProtection,
    cookieParserMiddleware,
    httpsRedirect,
    strictCorsConfig,
    additionalSecurityHeaders,
    sanitizeRequest,
    validateSecurityConfig
};
