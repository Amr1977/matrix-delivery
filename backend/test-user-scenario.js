const { Pool } = require('pg');
const orderService = require('./services/orderService');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'matrix_delivery',
    user: 'postgres',
    password: '***REDACTED***'
});

async function testUserScenario() {
    try {
        // User's fake driver location (Russia)
        const driverLat = 53.59366927545413;
        const driverLng = 38.9724454351626;

        console.log('🧪 Testing with user\'s fake driver location');
        console.log(`📍 Driver location: ${driverLat}, ${driverLng} (Russia)`);
        console.log('');

        // First, check all pending orders and their distances
        console.log('📊 All pending orders and their distances:');
        const allOrders = await pool.query(`
      SELECT
        id,
        order_number,
        pickup_address,
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
    `, [driverLng, driverLat]);

        console.log(`Found ${allOrders.rows.length} pending orders:`);
        allOrders.rows.forEach(row => {
            const distanceKm = Number(row.distance_km).toFixed(2);
            const withinRange = Number(row.distance_km) <= 7 ? '✅ WITHIN 7km' : '❌ OUTSIDE 7km';
            console.log(`  - ${row.order_number}: ${distanceKm} km ${withinRange}`);
            console.log(`    Pickup: ${row.pickup_address}`);
            console.log(`    Coords: ${JSON.stringify(row.pickup_coordinates)}`);
        });
        console.log('');

        // Now test what the orderService.getOrders returns
        console.log('📊 Testing orderService.getOrders (what the API returns):');
        const orders = await orderService.getOrders('test-driver', 'driver', {
            driverLat: driverLat,
            driverLng: driverLng
        });

        console.log(`orderService returned ${orders.length} orders`);

        // Calculate distances for returned orders
        for (const order of orders) {
            if (order.from) {
                const result = await pool.query(`
          SELECT ST_Distance(
            ST_Point($1, $2)::geography,
            ST_Point($3, $4)::geography
          ) / 1000 as distance_km
        `, [order.from.lng, order.from.lat, driverLng, driverLat]);

                const distanceKm = Number(result.rows[0].distance_km).toFixed(2);
                const withinRange = Number(result.rows[0].distance_km) <= 7 ? '✅ WITHIN 7km' : '❌ OUTSIDE 7km';
                console.log(`  - ${order.orderNumber || order._id}: ${distanceKm} km ${withinRange}`);
                console.log(`    Pickup: ${order.pickupAddress}`);
            }
        }
        console.log('');

        // Summary
        const ordersOutsideRange = allOrders.rows.filter(row => Number(row.distance_km) > 7);
        const ordersWithinRange = allOrders.rows.filter(row => Number(row.distance_km) <= 7);

        console.log('📋 SUMMARY:');
        console.log(`  Total pending orders: ${allOrders.rows.length}`);
        console.log(`  Orders within 7km: ${ordersWithinRange.length}`);
        console.log(`  Orders outside 7km: ${ordersOutsideRange.length}`);
        console.log(`  Orders returned by API: ${orders.length}`);
        console.log('');

        if (orders.length > ordersWithinRange.length) {
            console.log('❌ BUG CONFIRMED: API is returning more orders than should be within 7km!');
            console.log('   This means the distance filter is NOT working correctly.');
        } else if (orders.length === ordersWithinRange.length) {
            console.log('✅ Filter appears to be working correctly.');
            console.log('   API returned the expected number of orders.');
        } else {
            console.log('⚠️  API returned fewer orders than expected.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testUserScenario();
