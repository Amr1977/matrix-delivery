const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function checkOrder() {
  try {
    const result = await pool.query(`
      SELECT id, from_lat, from_lng, pickup_coordinates, delivery_coordinates,
             ST_Distance(
               ST_Point(from_lng, from_lat)::geography,
               ST_Point(33.04687500000001, 49.50380954152215)::geography,
               true
             ) / 1000 as distance_km_using_from_columns,
             ST_Distance(
               ST_Point(
                 (pickup_coordinates->>'lng')::float,
                 (pickup_coordinates->>'lat')::float
               )::geography,
               ST_Point(33.04687500000001, 49.50380954152215)::geography,
               true
             ) / 1000 as distance_km_using_json
      FROM orders
      WHERE id = '1764532111739lzmishigd'
    `);

    console.log('Order data:', JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkOrder();
