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
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // Parse allowed origins from environment variable
            const allowedOrigins = process.env.CORS_ORIGIN
                ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
                : [
                    'http://localhost:3000',
                    'http://192.168.1.2:3000',
                    'https://matrix.oldantique50.com'
                ];

            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
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
    app.options('*', cors(corsOptions));

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
    app.use('/api', apiRateLimit);

    return corsOptions; // Return options in case needed elsewhere
};

module.exports = configureExpress;
