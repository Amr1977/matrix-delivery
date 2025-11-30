const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '***REDACTED***'
});

async function debugDistance() {
  try {
    // Test distance calculation
    const result = await pool.query(`
      SELECT ST_Distance(
        ST_Point(29.9207985, 31.2125615)::geography,
        ST_Point(33.04687500000001, 49.50380954152215)::geography,
        true
      ) / 1000 as distance_km
    `);

    console.log('Distance calculation result:', result.rows[0]);

    // Check order coordinates
    const orderResult = await pool.query(`
      SELECT id, pickup_coordinates,
        (pickup_coordinates->>'lng')::float as lng,
        (pickup_coordinates->>'lat')::float as lat
      FROM orders
      WHERE status = 'pending_bids'
      LIMIT 1
    `);

    console.log('Order coordinates:', orderResult.rows[0]);

  } catch (error) {
    console.log('Error:', error);
  } finally {
    pool.end();
  }
}

debugDistance();
