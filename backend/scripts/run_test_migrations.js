require('ts-node/register');
const { Pool } = require('pg');
const dotenv = require('dotenv');

if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
    dotenv.config({ path: '.env.testing' });
    console.log('✅ Loaded .env.testing for test migrations');
} else {
    dotenv.config();
}
// Import resetDatabase directly from init.ts to force clean slate
const { resetDatabase } = require('../database/init') /* P0 FIX: removed .ts extension for safer resolution */;

const poolConfig = { connectionString: process.env.DATABASE_URL };
const pool = new Pool(poolConfig);

async function run() {
    console.log('🚀 Resetting and initializing TEST DB...');
    try {
        // Use resetDatabase instead of initDatabase
        await resetDatabase(pool);
        console.log('✅ Test database initialized successfully.');
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Test initialization failed:', err);
        await pool.end();
        process.exit(1);
    }
}

run();
