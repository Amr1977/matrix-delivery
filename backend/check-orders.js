const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'be_the_one'
});

async function checkOrders() {
  try {
    console.log('=== CHECKING EXISTING ORDERS ===');
    const result = await pool.query('SELECT id, order_number, pickup_coordinates, delivery_coordinates, pickup_address, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5');

    if (result.rows.length === 0) {
      console.log('❌ No orders found in database');
    } else {
      result.rows.forEach(order => {
        console.log(`Order ${order.order_number}:`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Pickup Coordinates: ${JSON.stringify(order.pickup_coordinates) || 'null'}`);
        console.log(`  Delivery Coordinates: ${JSON.stringify(order.delivery_coordinates) || 'null'}`);
        console.log(`  Address: ${order.pickup_address || 'null'}`);
        console.log(`  Created: ${order.created_at}`);
        console.log('---');
      });
    }

    console.log('\n=== TESTING DISTANCE CALCULATION ===');
    // Test with Cairo coordinates (where most orders likely are)
    const cairoLat = 30.0444;
    const cairoLng = 31.2357;

    console.log(`Test location: Cairo (${cairoLat}, ${cairoLng})`);

    const testQuery = `
      SELECT
        o.id,
        o.order_number,
        o.pickup_coordinates,
        CASE
          WHEN o.pickup_coordinates IS NOT NULL THEN
            ST_Distance(
              ST_Point(
                (o.pickup_coordinates->>'lng')::float,
                (o.pickup_coordinates->>'lat')::float
              )::geography,
              ST_Point(${cairoLng}, ${cairoLat})::geography,
              true
            ) / 1000
          ELSE NULL
        END as distance_km
      FROM orders o
      WHERE o.status = 'pending_bids' AND o.assigned_driver_id IS NULL
      ORDER BY distance_km ASC
    `;

    const testResult = await pool.query(testQuery);
    console.log(`Found ${testResult.rows.length} pending orders`);

    testResult.rows.forEach(row => {
      const distance = row.distance_km ? parseFloat(row.distance_km).toFixed(2) : 'N/A';
      console.log(`Order ${row.order_number}: ${distance} km away`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkOrders();
