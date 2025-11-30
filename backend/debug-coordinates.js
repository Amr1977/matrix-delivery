const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '***REDACTED***'
});

async function debugCoordinates() {
  try {
    console.log('🔍 DEBUGGING COORDINATES AND DISTANCE CALCULATION\n');

    // Get the order data
    const orderResult = await pool.query(
      'SELECT id, pickup_coordinates, status, assigned_driver_user_id FROM orders WHERE id = $1',
      ['1764532111739lzmishigd']
    );

    console.log('📦 Order data:');
    console.log(JSON.stringify(orderResult.rows[0], null, 2));
    console.log('');

    const order = orderResult.rows[0];

    // Test the distance calculation used in the query
    const driverLat = 49.50380954152215;
    const driverLng = 33.04687500000001;

    console.log('🚗 Driver location:', { lat: driverLat, lng: driverLng });
    console.log('📍 Order pickup coordinates from DB:', order.pickup_coordinates);

    const distanceResult = await pool.query(`
      SELECT
        ST_Distance(
          ST_Point(CAST(pickup_coordinates->>'lng' AS FLOAT), CAST(pickup_coordinates->>'lat' AS FLOAT))::geography,
          ST_Point($1, $2)::geography,
          true
        ) / 1000 as distance_km
      FROM orders WHERE id = $3
    `, [driverLng, driverLat, order.id]);

    const distance = distanceResult.rows[0].distance_km;
    console.log('📏 Calculated distance:', distance, 'km');
    console.log('🎯 Should be filtered out?', distance > 7 ? 'YES' : 'NO');
    console.log('');

    // Test the actual query logic
    console.log('🔍 TESTING ACTUAL QUERY LOGIC\n');

    const locationConditions = ` AND ST_Distance(
      ST_Point(CAST(o.pickup_coordinates->>'lng' AS FLOAT), CAST(o.pickup_coordinates->>'lat' AS FLOAT))::geography,
      ST_Point(${driverLng}, ${driverLat})::geography,
      true
    ) <= 7000`;

    const query = `
      SELECT o.id, o.order_number, o.status, o.assigned_driver_user_id
      FROM orders o
      WHERE (o.status = 'pending_bids' AND o.assigned_driver_user_id IS NULL${locationConditions})
         OR o.assigned_driver_user_id = $1
    `;

    console.log('📝 Query:', query.replace(/\s+/g, ' ').trim());
    console.log('📝 Params:', ['1764482943834n3xu0uc2g']);

    const result = await pool.query(query, ['1764482943834n3xu0uc2g']);
    console.log('📊 Query result - orders returned:', result.rows.length);
    result.rows.forEach(row => {
      console.log('  -', row.order_number, '(status:', row.status, ', assigned:', row.assigned_driver_user_id ? 'YES' : 'NO', ')');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugCoordinates();
