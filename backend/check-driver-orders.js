const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'be_the_one'
});

async function checkDriverOrders() {
  try {
    const driverId = '1764482943834n3xu0uc2g';

    // Check what orders are assigned to this driver
    const driverOrders = await pool.query(
      'SELECT id, order_number, status, assigned_driver_user_id FROM orders WHERE assigned_driver_user_id = $1',
      [driverId]
    );

    console.log(`Orders assigned to driver ${driverId}:`);
    driverOrders.rows.forEach(order => {
      console.log(`  - ${order.order_number} (status: ${order.status}, id: ${order.id})`);
    });

    // Check the specific Alexandria order
    const alexOrder = await pool.query(
      'SELECT id, order_number, status, assigned_driver_user_id FROM orders WHERE id = $1',
      ['1764532111739lzmishigd']
    );

    console.log(`\nAlexandria order (${alexOrder.rows[0].id}) status:`);
    console.log(`  - ${alexOrder.rows[0].order_number} (status: ${alexOrder.rows[0].status}, assigned: ${alexOrder.rows[0].assigned_driver_user_id})`);

    // Check all pending_bids orders
    const pendingOrders = await pool.query(
      'SELECT id, order_number, status, assigned_driver_user_id FROM orders WHERE status = $1',
      ['pending_bids']
    );

    console.log(`\nAll pending_bids orders:`);
    pendingOrders.rows.forEach(order => {
      console.log(`  - ${order.order_number} (id: ${order.id}, assigned: ${order.assigned_driver_user_id || 'none'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkDriverOrders();
