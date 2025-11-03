const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '***REDACTED***'
});

async function addLocationFields() {
  try {
    console.log('Adding location fields to users table...');

    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP');

    console.log('✅ Location fields added to users table successfully');

    // Add city fields to orders table
    console.log('Adding city fields to orders table...');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_city VARCHAR(100)');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100)');

    console.log('✅ City fields added to orders table successfully');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

addLocationFields();
