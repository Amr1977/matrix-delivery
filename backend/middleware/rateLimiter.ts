/**
 * Rate Limiting Middleware for Balance API
 * 
 * Protects against abuse and ensures fair usage
 */

import rateLimit from 'express-rate-limit';

/**
 * General rate limiter for balance API endpoints
 * 100 requests per 15 minutes per IP
 */
export const balanceRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Store in memory (consider Redis for production with multiple servers)
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

/**
 * Strict rate limiter for withdrawal operations
 * 10 withdrawals per hour per user
 */
export const withdrawalRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit to 10 withdrawals per hour
    message: {
        success: false,
        error: 'Withdrawal limit exceeded. Maximum 10 withdrawals per hour allowed',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Key by user ID instead of IP for authenticated requests
    keyGenerator: (req) => {
        return req.user?.id?.toString() || req.ip;
    },
});

/**
 * Admin operations rate limiter
 * 50 requests per 15 minutes
 */
export const adminRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit admin operations
    message: {
        success: false,
        error: 'Too many admin operations, please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id?.toString() || req.ip;
    },
});

/**
 * Deposit rate limiter
 * 20 deposits per hour per user
 */
export const depositRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit to 20 deposits per hour
    message: {
        success: false,
        error: 'Deposit limit exceeded. Maximum 20 deposits per hour allowed',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id?.toString() || req.ip;
    },
});
