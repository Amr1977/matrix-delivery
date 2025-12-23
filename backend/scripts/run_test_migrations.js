require('ts-node/register');
const { Pool } = require('pg');
const dotenv = require('dotenv');
// Import resetDatabase directly from init.ts to force clean slate
const { resetDatabase } = require('../database/init.ts');

// I need valid pool config on port 5432 (default)
console.log('DB Connection:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    passwordType: typeof process.env.DB_PASSWORD,
    passwordLen: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0
});
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

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
