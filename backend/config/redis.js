const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;
const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
const isProduction = process.env.NODE_ENV === 'production';

// Redis is optional - use in-memory fallback if Redis is not available
// This prevents crashes during development without Redis installed
if (process.env.REDIS_URL && process.env.ENABLE_REDIS === 'true') {
    logger.info('🔌 Redis enabled via ENABLE_REDIS=true, attempting connection...');
    
    redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        connectTimeout: 3000,
        commandTimeout: 2000,
        retryStrategy(times) {
            if (times > 1) {
                logger.warn('⚠️ Redis: stopping reconnection attempts');
                return null;
            }
            return 500;
        },
        lazyConnect: true
    });

    redisClient.on('error', (err) => {
        // Gracefully ignore connection errors
        if (err.message && (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED') || err.message.includes('timed out'))) {
            logger.warn('⚠️ Redis unavailable - using in-memory fallback');
            return;
        }
        logger.warn('⚠️ Redis error:', err.message);
    });
} else {
    if (isProduction && !process.env.REDIS_URL) {
        logger.warn('⚠️ REDIS_URL not set in production! Using in-memory storage.');
    } else if (!isTest && process.env.REDIS_URL && process.env.ENABLE_REDIS !== 'true') {
        logger.info('ℹ️ Redis available but not enabled (set ENABLE_REDIS=true to use). Using in-memory storage.');
    } else if (!isTest) {
        logger.info('ℹ️ Running without Redis. Using in-memory storage.');
    }
}

module.exports = redisClient;
