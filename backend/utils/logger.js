/**
 * Simple Logger Utility
 * Provides basic logging functionality for services
 */

const logger = {
    info: (...args) => {
        if (process.env.NODE_ENV !== 'test') {
            console.log('[INFO]', ...args);
        }
    },

    error: (...args) => {
        if (process.env.NODE_ENV !== 'test') {
            console.error('[ERROR]', ...args);
        }
    },

    warn: (...args) => {
        if (process.env.NODE_ENV !== 'test') {
            console.warn('[WARN]', ...args);
        }
    },

    debug: (...args) => {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    },
};

module.exports = logger;
