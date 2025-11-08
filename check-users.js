const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function checkUsers() {
  try {
    console.log('Checking for user amr@customer.com...');
    const userResult = await pool.query(
      'SELECT id, name, email, role, rating, completed_deliveries, is_verified, created_at FROM users WHERE email = $1',
      ['amr@customer.com']
    );
    console.log('User amr@customer.com:', userResult.rows);

    console.log('\nChecking sample customers...');
    const customersResult = await pool.query(
      'SELECT id, name, email, role, rating, completed_deliveries, is_verified, created_at FROM users WHERE role = $1 LIMIT 5',
      ['customer']
    );
    console.log('Sample customers:', customersResult.rows);

    console.log('\nChecking all users...');
    const allUsersResult = await pool.query(
      'SELECT id, name, email, role, rating, completed_deliveries, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );
    console.log('All users:', allUsersResult.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkUsers();
