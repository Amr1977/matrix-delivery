const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'matrix_delivery',
    password: 'be_the_one',
    port: 5432,
});

async function findColumn() {
    try {
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND (
        column_name LIKE '%cash%' 
        OR column_name LIKE '%balance%' 
        OR column_name LIKE '%wallet%'
      )
    `);

        console.log('Found columns:', res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

findColumn();
