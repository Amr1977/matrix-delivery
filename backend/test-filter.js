const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = { connectionString: process.env.DATABASE_URL };

const pool = new Pool(poolConfig);

async function testFilter() {
  try {
    // Test the exact query logic used in the service (simplified)
    const query = `
      SELECT
        o.id,
        o.order_number,
        o.from_lat,
        o.from_lng,
        ST_Distance(
          ST_Point(o.from_lng, o.from_lat)::geography,
          ST_Point($1, $2)::geography,
          true
        ) / 1000 as distance_km
      FROM orders o
      WHERE o.status = 'pending_bids'
        AND o.assigned_driver_user_id IS NULL
        AND ST_Distance(
          ST_Point(o.from_lng, o.from_lat)::geography,
          ST_Point($1, $2)::geography,
          true
        ) <= 7
    `;

    const params = [33.04687500000001, 49.50380954152215]; // lng, lat

    console.log('Testing filter query:');
    console.log('Query:', query);
    console.log('Params (lng, lat):', params);

    const result = await pool.query(query, params);
    console.log('Orders within 7km:', result.rows.length);
    console.log('Order details:', result.rows);

    // Also test without the distance filter to see all orders
    const allQuery = `
      SELECT
        o.id,
        o.order_number,
        o.from_lat,
        o.from_lng,
        ST_Distance(
          ST_Point(o.from_lng, o.from_lat)::geography,
          ST_Point($1, $2)::geography,
          true
        ) / 1000 as distance_km
      FROM orders o
      WHERE o.status = 'pending_bids' AND o.assigned_driver_user_id IS NULL
    `;

    const allResult = await pool.query(allQuery, [33.04687500000001, 49.50380954152215]);
    console.log('All pending orders:', allResult.rows.length);
    console.log('All order distances:', allResult.rows.map(row => ({
      id: row.id,
      distance: Number(row.distance_km).toFixed(2) + 'km'
    })));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

testFilter();
