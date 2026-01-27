const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = { connectionString: process.env.DATABASE_URL };

const pool = new Pool(poolConfig);

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
