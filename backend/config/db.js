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

// Configure pool for Neon's pooler (PgBouncer)
// Use conservative settings to avoid connection pool exhaustion
const poolConfig = { 
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Wait up to 5s for a connection
  maxUses: 7500,              // Recycle connection after 7500 queries (Neon recommendation)
  allowExitOnIdle: true,      // Allow process to exit if only idle connections remain
};

const pool = new Pool(poolConfig);
logger.info(`🔌 Connecting to database (pool: max=${poolConfig.max}, idleTimeout=${poolConfig.idleTimeoutMillis}ms)`);
pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Log pool status periodically in development
if (!IS_TEST && process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    logger.debug(`📊 Pool status: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount}`);
  }, 60000);
}

module.exports = pool;
