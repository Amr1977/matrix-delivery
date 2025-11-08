const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'be_the_one'
});

async function checkOrders() {
  try {
    console.log('Checking orders in database...');
    const result = await pool.query('SELECT id, order_number, customer_id, customer_name, status FROM orders LIMIT 5');
    console.log('Orders:', result.rows);

    if (result.rows.length > 0) {
      console.log('\nChecking customer data for first order...');
      const customerResult = await pool.query(
        'SELECT id, name, email, role, rating, completed_deliveries, is_verified FROM users WHERE id = $1',
        [result.rows[0].customer_id]
      );
      console.log('Customer data:', customerResult.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkOrders();
