const { Pool } = require('pg');
const { neon } = require("@neondatabase/serverless");
const logger = require('./logger');

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// Environment is loaded by server.js or jest.setup.js
// but we check anyway to be safe
if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
    const dotenv = require('dotenv');
    // Check ENV_FILE first (set by PM2), then fall back to NODE_ENV-based detection
    const envFile = process.env.ENV_FILE || 
      (process.env.NODE_ENV === 'production' ? '.env.production' : 
       process.env.NODE_ENV === 'staging' ? '.env.staging' : 
       process.env.NODE_ENV === 'development' ? '.env.development' : 
       process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing' ? '.env.testing' : '.env');

    logger.info(`📄 Loading environment from: ${envFile}`);
    dotenv.config({ path: envFile });
}

// Log environment details
logger.info(`🔧 Environment Configuration:`);
logger.info(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}`);

const poolConfig  = { connectionString: process.env.DATABASE_URL };

const pool = new Pool(poolConfig);
logger.info(`🔌 Connecting to database: ${poolConfig.database} (Test Mode: ${IS_TEST})`);
pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool;
