const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env.testing' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function listColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders'
        `);
        console.log('Columns in orders table:', res.rows);
    } catch (err) {
        console.error('Error listing columns:', err);
    } finally {
        await pool.end();
    }
}

listColumns();
