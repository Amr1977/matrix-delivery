const logger = require('../config/logger');
const pool = require('../config/db');

// Register ts-node to load TypeScript modules
require('ts-node/register');

// Import TypeScript database initialization
const { initDatabase } = require('../database/startup');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

const validateDatabaseEnvironment = () => {
    if (!IS_TEST) {
        // If DATABASE_URL is provided, use it (e.g., for Neon, Heroku)
        if (process.env.DATABASE_URL) {
            logger.info('✅ Using DATABASE_URL for database connection');
            return;
        }

        // Otherwise, check for individual database variables
        const requiredDbVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
        const missingVars = requiredDbVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            logger.error(`❌ Missing required database environment variables: ${missingVars.join(', ')}`);
            process.exit(1);
        }

        if (IS_PRODUCTION && process.env.DB_PASSWORD.length < 12) {
            logger.error('❌ DB_PASSWORD must be at least 12 characters in production');
            process.exit(1);
        }
    }
};

const initializeDatabaseConnection = async () => {
    if (!IS_TEST) {
        try {
            if (IS_PRODUCTION) {
                // In production, run migrations instead of schema initialization
                const { runMigrationsOnStartup } = require('../migrationRunner');
                await runMigrationsOnStartup(pool);
                logger.info('✅ Database migrations completed successfully');
            } else {
                // In development, initialize schema
                await initDatabase(pool);
                logger.info('✅ Database initialized successfully');
            }
        } catch (err) {
            logger.error('Failed to initialize database:', err);
            process.exit(1);
        }
    }
};

module.exports = {
    validateDatabaseEnvironment,
    initializeDatabaseConnection
};
