const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'matrix_delivery',
    user: 'postgres',
    password: '***REDACTED***'
});

async function testDistanceQuery() {
    try {
        // Test driver location (Alexandria)
        const driverLat = 31.2001;
        const driverLng = 29.9187;

        console.log('🧪 Testing PostGIS distance query');
        console.log(`Driver location: ${driverLat}, ${driverLng}`);
        console.log('');

        // Test with the CURRENT query (with 3 parameters - potentially incorrect)
        console.log('📊 Test 1: Current query (with 3rd parameter = true)');
        try {
            const result1 = await pool.query(`
        SELECT
          id,
          order_number,
          pickup_coordinates,
          ST_Distance(
            ST_Point(
              (pickup_coordinates->>'lng')::float,
              (pickup_coordinates->>'lat')::float
            )::geography,
            ST_Point($1, $2)::geography,
            true
          ) / 1000 as distance_km
        FROM orders
        WHERE status = 'pending_bids'
        AND pickup_coordinates IS NOT NULL
        ORDER BY distance_km ASC
        LIMIT 5
      `, [driverLng, driverLat]);

            console.log(`✅ Query succeeded, returned ${result1.rows.length} orders`);
            result1.rows.forEach(row => {
                console.log(`  - ${row.order_number}: ${Number(row.distance_km).toFixed(2)} km`);
            });
        } catch (error) {
            console.log(`❌ Query failed: ${error.message}`);
        }
        console.log('');

        // Test with the CORRECT query (with 2 parameters)
        console.log('📊 Test 2: Corrected query (without 3rd parameter)');
        try {
            const result2 = await pool.query(`
        SELECT
          id,
          order_number,
          pickup_coordinates,
          ST_Distance(
            ST_Point(
              (pickup_coordinates->>'lng')::float,
              (pickup_coordinates->>'lat')::float
            )::geography,
            ST_Point($1, $2)::geography
          ) / 1000 as distance_km
        FROM orders
        WHERE status = 'pending_bids'
        AND pickup_coordinates IS NOT NULL
        ORDER BY distance_km ASC
        LIMIT 5
      `, [driverLng, driverLat]);

            console.log(`✅ Query succeeded, returned ${result2.rows.length} orders`);
            result2.rows.forEach(row => {
                console.log(`  - ${row.order_number}: ${Number(row.distance_km).toFixed(2)} km`);
            });
        } catch (error) {
            console.log(`❌ Query failed: ${error.message}`);
        }
        console.log('');

        // Test the filter with 7km threshold
        console.log('📊 Test 3: Filter with 7km threshold (corrected query)');
        try {
            const result3 = await pool.query(`
        SELECT
          id,
          order_number,
          pickup_coordinates,
          ST_Distance(
            ST_Point(
              (pickup_coordinates->>'lng')::float,
              (pickup_coordinates->>'lat')::float
            )::geography,
            ST_Point($1, $2)::geography
          ) / 1000 as distance_km
        FROM orders
        WHERE status = 'pending_bids'
        AND pickup_coordinates IS NOT NULL
        AND ST_Distance(
          ST_Point(
            (pickup_coordinates->>'lng')::float,
            (pickup_coordinates->>'lat')::float
          )::geography,
          ST_Point($1, $2)::geography
        ) <= 7000
        ORDER BY distance_km ASC
      `, [driverLng, driverLat]);

            console.log(`✅ Query succeeded, returned ${result3.rows.length} orders within 7km`);
            result3.rows.forEach(row => {
                console.log(`  - ${row.order_number}: ${Number(row.distance_km).toFixed(2)} km`);
            });
        } catch (error) {
            console.log(`❌ Query failed: ${error.message}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testDistanceQuery();
