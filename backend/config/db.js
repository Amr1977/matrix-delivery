const { Pool } = require('pg');
const logger = require('./logger');

// Environment is loaded by server.js or jest.setup.js
// but we check anyway to be safe
if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
    const dotenv = require('dotenv');
    const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
    if (IS_TEST) {
        dotenv.config({ path: '.env.testing' });
    } else {
        dotenv.config();
    }
}

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    // Use test database if in test mode
    database: IS_TEST ? (process.env.DB_NAME_TEST || 'matrix_delivery_test') : (process.env.DB_NAME || 'matrix_delivery'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased from 2000ms to 10000ms
};

// Log which database we are connecting to
logger.info(`🔌 Connecting to database: ${dbConfig.database} (Test Mode: ${IS_TEST})`);

const pool = new Pool(dbConfig);

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool;
