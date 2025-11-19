const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'be_the_one'
});

async function createTestBiddingOrder() {
  try {
    console.log('Creating test order for driver bidding...');

    const now = new Date();
    const customerId = '1761021947133jnunmcbox'; // Using existing customer ID

    // Insert test order with pending_bids status
    const orderResult = await pool.query(`
      INSERT INTO orders (
        id, order_number, customer_id, title, description, status, price,
        pickup_address, delivery_address, from_coordinates, to_coordinates,
        package_description, package_weight, estimated_value,
        pickup_location_link, delivery_location_link,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING id
    `, [
      'test_bidding_' + Date.now(),
      'TEST-BID-' + Date.now(),
      customerId,
      'Test Order for Driver Bidding',
      'This is a test order with map locations to test the driver bidding map feature',
      'pending_bids',
      25.50,
      '123 Test Street, Cairo, Egypt',
      '456 Destination Ave, Cairo, Egypt',
      '30.0444,31.2357',
      '30.0448,31.2359',
      'Test package - electronics',
      2.5,
      150.00,
      'https://maps.google.com/?q=30.0444,31.2357',
      'https://maps.google.com/?q=30.0448,31.2359',
      now,
      now
    ]);

    console.log('✅ Test order created:', orderResult.rows[0].id);

    console.log('\n📍 To see the driver bidding map:');
    console.log('1. Login as a driver (role: driver)');
    console.log('2. Go to the "Available Bids" tab');
    console.log('3. You should see this test order with the yellow debug info showing the map component');
    console.log('\n🗺️ The map will show:');
    console.log('- Your current location (blue driver marker)');
    console.log('- Pickup location (green package marker)');
    console.log('- Dropoff location (red finish flag marker)');
    console.log('- Route path connecting all points');
    console.log('- Distance and time estimates based on vehicle type');

    console.log('\n⚠️ Debug notes:');
    console.log('- If you still don\'t see the map, check browser console for coordinate data');
    console.log('- The yellow debug box shows what location data the order contains');
    console.log('- Make sure location permissions are granted for accurate driver position');

  } catch (err) {
    console.error('Error creating test order:', err);
  } finally {
    await pool.end();
  }
}

createTestBiddingOrder();
