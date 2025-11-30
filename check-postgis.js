const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '***REDACTED***'
});

async function checkPostGIS() {
  try {
    const result = await pool.query('SELECT PostGIS_version()');
    console.log('PostGIS version:', result.rows[0]);
  } catch (error) {
    console.log('PostGIS error:', error.message);
  } finally {
    pool.end();
  }
}

checkPostGIS();
