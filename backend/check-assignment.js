const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function checkAssignment() {
  try {
    const result = await pool.query(`
      SELECT id, assigned_driver_user_id, status
      FROM orders
      WHERE id = '1764532111739lzmishigd'
    `);

    console.log('Order assignment status:', result.rows[0]);

    // Check what user ID is making the request (from the JWT in the original request)
    // The JWT shows userId: "17644890952300o361ywjw" which is different from the order's assigned_driver_user_id
    console.log('Driver making request should have userId from JWT');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkAssignment();
