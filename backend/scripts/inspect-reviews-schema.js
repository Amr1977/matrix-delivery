const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const poolConfig = { connectionString: process.env.DATABASE_URL };

const pool = new Pool(poolConfig);

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
