const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matrix_delivery',
    password: process.env.DB_PASSWORD || '***REDACTED***',
    port: process.env.DB_PORT || 5432,
});

async function checkSchema() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reviews';
    `);
        console.log('Reviews table columns:', res.rows);
        await pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
