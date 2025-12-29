const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'matrix_delivery',
  user: 'postgres',
  password: 'be_the_one'
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'orders'
      AND column_name LIKE '%coordinate%'
      ORDER BY ordinal_position
    `);

    console.log('📊 Coordinate columns in orders table:');
    console.log(JSON.stringify(result.rows, null, 2));

    // Also check a sample order to see the actual data format
    const sampleOrder = await pool.query(`
      SELECT id, order_number, pickup_coordinates, delivery_coordinates
      FROM orders
      WHERE pickup_coordinates IS NOT NULL
      LIMIT 1
    `);

    console.log('\n📦 Sample order data:');
    if (sampleOrder.rows.length > 0) {
      const order = sampleOrder.rows[0];
      console.log('Order ID:', order.id);
      console.log('Order Number:', order.order_number);
      console.log('Pickup Coordinates Type:', typeof order.pickup_coordinates);
      console.log('Pickup Coordinates Value:', order.pickup_coordinates);
      console.log('Delivery Coordinates Type:', typeof order.delivery_coordinates);
      console.log('Delivery Coordinates Value:', order.delivery_coordinates);
    } else {
      console.log('No orders with coordinates found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
