"use strict";
/**
 * Rate Limiting Middleware for Balance API
 *
 * Protects against abuse and ensures fair usage
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.depositRateLimiter = exports.adminRateLimiter = exports.withdrawalRateLimiter = exports.balanceRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
n; // Shared IP resolver implemented in JS; TS can import via allowJs\n// eslint-disable-next-line @typescript-eslint/no-var-requires\nconst { ipKeyFromRequest } = require('./ipKey');
/**
 * General rate limiter for balance API endpoints
 * 100 requests per 15 minutes per IP
 */
exports.balanceRateLimiter = (0, express_rate_limit_1.default)({
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
    // Skip rate limiting in test environment
    skip: (req) => {
        return process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'test';
    }
});
/**
 * Strict rate limiter for withdrawal operations
 * 10 withdrawals per hour per user
 */
exports.withdrawalRateLimiter = (0, express_rate_limit_1.default)({
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
        const fp = req.headers?.['x-device-fingerprint'];
        n;
        return req.user?.id?.toString() || req.user?.userId?.toString() || fp || ipKeyFromRequest(req);
    },
    // Skip rate limiting in test environment
    skip: (req) => {
        return process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'test';
    }
});
/**
 * Admin operations rate limiter
 * 50 requests per 15 minutes
 */
exports.adminRateLimiter = (0, express_rate_limit_1.default)({
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
        const fp = req.headers?.['x-device-fingerprint'];
        n;
        return req.user?.id?.toString() || req.user?.userId?.toString() || fp || ipKeyFromRequest(req);
    },
    // Skip rate limiting in test environment
    skip: (req) => {
        return process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'test';
    }
});
/**
 * Deposit rate limiter
 * 20 deposits per hour per user
 */
exports.depositRateLimiter = (0, express_rate_limit_1.default)({
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
        const fp = req.headers?.['x-device-fingerprint'];
        n;
        return req.user?.id?.toString() || req.user?.userId?.toString() || fp || ipKeyFromRequest(req);
    },
    // Skip rate limiting in test environment
    skip: (req) => {
        return process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'test';
    }
});
