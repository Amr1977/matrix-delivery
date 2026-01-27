const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env.testing' });

const poolConfig = { connectionString: process.env.DATABASE_URL };
const pool = new Pool(poolConfig);

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
