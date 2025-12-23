const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matrix_delivery',
    password: process.env.DB_PASSWORD || 'be_the_one',
    port: process.env.DB_PORT || 5432,
});

async function fixSchema() {
    try {
        console.log('Dropping incompatible reviews table...');
        await pool.query('DROP TABLE IF EXISTS reviews CASCADE');
        console.log('✅ Dropped reviews table');

        // Also drop related tables if they exist with old schema
        await pool.query('DROP TABLE IF EXISTS review_votes CASCADE');
        await pool.query('DROP TABLE IF EXISTS review_flags CASCADE');
        console.log('✅ Dropped related tables');

        await pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixSchema();
