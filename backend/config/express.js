const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const logger = require('./logger');
const {
    helmetConfig,
    additionalSecurityHeaders,
    sanitizeRequest,
    validateSecurityConfig
} = require('../middleware/security');
const { apiRateLimit } = require('../middleware/rateLimit');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

const configureExpress = (app) => {

    // ============================================================================
    // SECURITY VALIDATION
    // ============================================================================
    try {
        validateSecurityConfig();
    } catch (error) {
        logger.error('❌ Security configuration validation failed:', error.message);
        process.exit(1);
    }

    // ============================================================================
    // CORS CONFIGURATION
    // ============================================================================
    const corsOptions = {
        origin: function (origin, callback) {
            // Allow all origins in test mode
            if (IS_TEST) {
                return callback(null, true);
            }

            // Allow requests with no origin (like mobile apps or curl requests)
            // If origin is missing (e.g. stripped by proxy), default to the main frontend to ensure CORS headers are present
            if (!origin) {
                // Allow all for production - the frontend domain might be different
                if (IS_PRODUCTION) {
                    return callback(null, true);
                }
                return callback(null, 'https://matrix-delivery.web.app');
            }

            // In production, allow all origins to fix CORS issues
            if (IS_PRODUCTION) {
                return callback(null, origin);
            }

            // Parse allowed origins from environment variable for development
            const allowedOrigins = process.env.CORS_ORIGIN
                ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
                : [
                    'http://localhost:3000',
                    'https://' + process.env.REPLIT_DEV_DOMAIN
                ];

            if (allowedOrigins.indexOf(origin) !== -1) {
                // Return the specific origin, not true - required for credentials
                callback(null, origin);
            } else {
                console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true, // CRITICAL: Allow credentials (cookies)
        optionsSuccessStatus: 200
    };

    // ============================================================================
    // MIDDLEWARE SETUP
    // ============================================================================
    // Helmet.js security headers
    app.use(helmetConfig);

    // Additional security headers
    app.use(additionalSecurityHeaders);

    // Cookie parser
    app.use(cookieParser());

    // Body parser
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request sanitization
    app.use(sanitizeRequest);

    // CORS
    app.use(cors(corsOptions));

    // Handle preflight requests
    app.options(/.*/, cors(corsOptions));

    // ============================================================================
    // LOGGING
    // ============================================================================
    // HTTP request logging with Morgan
    app.use(morgan('combined', {
        stream: {
            write: (message) => {
                // Parse Morgan log and convert to structured log
                const parts = message.trim().split(' ');
                if (parts.length >= 9) {
                    logger.http('HTTP_REQUEST', {
                        method: parts[0],
                        url: parts[1],
                        status: parseInt(parts[2]),
                        responseTime: parts[3],
                        ip: parts[6],
                        userAgent: parts[8],
                        category: 'http'
                    });
                }
            }
        }
    }));

    // Custom Request logging middleware
    app.use(logger.requestLogger);

    // ============================================================================
    // RATE LIMITING
    // ============================================================================

    // Trust proxy (Critical for secure cookies behind Nginx/Cloudflare)
    app.set('trust proxy', 1);

    app.use('/api', apiRateLimit);

    return corsOptions; // Return options in case needed elsewhere
};

module.exports = configureExpress;

