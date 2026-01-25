const { Pool } = require('pg');
const { neon } = require("@neondatabase/serverless");
const logger = require('./logger');

// Environment is loaded by server.js or jest.setup.js
// but we check anyway to be safe
if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
    const dotenv = require('dotenv');
    const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
    const IS_PROD = process.env.NODE_ENV === 'production';
    const envFile = IS_TEST ? '.env.testing' : IS_PROD ? '.env.production' : '.env';

    logger.info(`📄 Loading environment from: ${envFile}`);
    dotenv.config({ path: envFile });
}

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// Log environment details
logger.info(`🔧 Environment Configuration:`);
logger.info(`   NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`   IS_TEST: ${IS_TEST}`);
logger.info(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
logger.info(`   DB_PORT: ${process.env.DB_PORT || 5432}`);
logger.info(`   DB_USER: ${process.env.DB_USER || 'postgres'}`);
logger.info(`   DB_NAME: ${process.env.DB_NAME || 'matrix_delivery'}`);
logger.info(`   DB_NAME_TEST: ${process.env.DB_NAME_TEST || 'matrix_delivery_test'}`);

let poolConfig;

if (process.env.DATABASE_URL) {
    // Use DATABASE_URL if provided (e.g., for Neon, Heroku, etc.)
    poolConfig = { connectionString: process.env.DATABASE_URL };
    logger.info(`🔌 Connecting to database via DATABASE_URL (Test Mode: ${IS_TEST})`);
} else {
    // Use individual config variables
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        // Use test database if in test mode
        database: IS_TEST ? (process.env.DB_NAME_TEST || 'matrix_delivery_test') : (process.env.DB_NAME || 'matrix_delivery'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: 10, // Reduced from 20 to safe guard 1GB VPS in cluster mode
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000, // Increased to 30s to handle high load/swap spikes
    };
    // Log which database we are connecting to
    logger.info(`🔌 Connecting to database: ${poolConfig.database} (Test Mode: ${IS_TEST})`);
}

const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool;
