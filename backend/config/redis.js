const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;
const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
const isProduction = process.env.NODE_ENV === 'production';

// Only attempt to connect to Redis if REDIS_URL is provided or in production
// In production, we strongly prefer Redis, but will fall back to memory if connection fails to avoid crash
if (process.env.REDIS_URL) {
    logger.info('🔌 Attempting to connect to Redis...', {
        url: process.env.REDIS_URL.replace(/\/\/.*@/, '//***@') // Mask auth
    });

    redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,  // Limit retries per request to prevent indefinite queueing
        enableReadyCheck: false,
        // Limit command queue to prevent memory buildup during outages
        maxLoadingRetryTime: 10000,
        retryStrategy(times) {
            // Stop retrying after 20 attempts (~40 seconds)
            if (times > 20) {
                logger.error('Redis: max reconnection attempts reached, giving up');
                return null; // Stop retrying
            }
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        reconnectOnError(err) {
            const targetError = 'READONLY';
            if (err.message.slice(0, targetError.length) === targetError) {
                // Only reconnect when the error starts with "READONLY"
                return true;
            }
            return false;
        }
    });

    redisClient.on('connect', () => {
        logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
        logger.error('❌ Redis connection error', { error: err.message });
        // If specific error handling needed, add here
    });

    redisClient.on('ready', () => {
        logger.info('🚀 Redis client ready');
    });

} else {
    if (isProduction) {
        logger.warn('⚠️ REDIS_URL not set in production! Falling back to in-memory storage. This is NOT recommended for scaling.');
    } else if (!isTest) {
        logger.info('ℹ️ Running without Redis (Development mode). Using in-memory storage.');
    }
}

module.exports = redisClient;
