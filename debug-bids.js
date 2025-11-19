const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function debugBids() {
  try {
    console.log('🔍 Debugging bids data...\n');

    // Check if there are any bids
    const bidsResult = await pool.query('SELECT COUNT(*) as bid_count FROM bids');
    console.log(`📊 Total bids in database: ${bidsResult.rows[0].bid_count}\n`);

    // Find actual customers with orders
    const customers = await pool.query('SELECT id, name, email FROM users WHERE role = $1 LIMIT 5', ['customer']);
    console.log('👤 Customers found:');
    customers.rows.forEach(customer => {
      console.log(`  - ${customer.name} (${customer.email}) - ID: ${customer.id}`);
    });
    console.log('');

    if (customers.rows.length > 0) {
      const customerId = customers.rows[0].id;

      console.log(`🔍 Checking orders for customer: ${customerId}\n`);

      // First, get all orders for this customer
      const allCustomerOrders = await pool.query(`
        SELECT o.id, o.title, o.status, o.customer_id, COUNT(b.id) as bid_count
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        WHERE o.customer_id = $1
        GROUP BY o.id, o.title, o.status, o.customer_id
        ORDER BY o.created_at DESC
      `, [customerId]);

      console.log(`🗂️ All orders for customer ${customers.rows[0].name}:`);
      allCustomerOrders.rows.forEach(order => {
        console.log(`  📦 ${order.title} (${order.status}) - Bids: ${order.bid_count}`);
      });
      console.log('');

      // Now check with the exact same query structure as the service
      const detailedOrders = await pool.query(`
        SELECT
          o.id, o.title, o.status, o.customer_id,
          json_agg(
            json_build_object(
              'userId', b.user_id,
              'driverName', u.name,
              'bidPrice', b.bid_price,
              'estimatedPickupTime', b.estimated_pickup_time,
              'estimatedDeliveryTime', b.estimated_delivery_time,
              'message', b.message
            )
          ) FILTER (WHERE b.id IS NOT NULL) as bids_raw
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE o.customer_id = $1
        GROUP BY o.id, o.title, o.status, o.customer_id
        ORDER BY o.created_at DESC
      `, [customerId]);

      console.log(`🏷️ Detailed orders query result:`);
      detailedOrders.rows.forEach(order => {
        console.log(`  📦 ${order.title} (${order.status})`);
        console.log(`     Bids raw: ${JSON.stringify(order.bids_raw)}`);
        console.log(`     Bids length: ${Array.isArray(order.bids_raw) ? order.bids_raw.length : 'not array'}`);
        console.log(`     Is null: ${order.bids_raw === null}`);
        console.log(`     Is empty array: ${JSON.stringify(order.bids_raw) === '[]'}`);
        console.log('');
      });
    }

    // Find orders that have bids and check their data structure
    console.log('📋 Orders with bids (first 3):');
    const ordersWithBids = await pool.query(`
      SELECT
        o.id, o.title, o.status, c.name as customer_name, c.email as customer_email,
        json_agg(
          json_build_object(
            'userId', b.user_id,
            'driverName', u.name,
            'bidPrice', b.bid_price,
            'estimatedPickupTime', b.estimated_pickup_time,
            'estimatedDeliveryTime', b.estimated_delivery_time,
            'message', b.message,
            'driverRating', u.rating,
            'driverCompletedDeliveries', u.completed_deliveries,
            'driverReviewCount', COALESCE(dr.review_count, 0),
            'driverIsVerified', u.is_verified
          )
        ) FILTER (WHERE b.id IS NOT NULL) as bids_simulated
      FROM orders o
      JOIN users c ON o.customer_id = c.id
      LEFT JOIN bids b ON o.id = b.order_id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN (
        SELECT reviewee_id, COUNT(*) as review_count
        FROM reviews
        GROUP BY reviewee_id
      ) dr ON dr.reviewee_id = u.id
      GROUP BY o.id, o.title, o.status, c.name, c.email
      HAVING COUNT(b.id) > 0
      ORDER BY o.created_at DESC
      LIMIT 3
    `);

    ordersWithBids.rows.forEach(order => {
      console.log(`\n🛍️ Order: "${order.title}" (${order.status})`);
      console.log(`   👤 Customer: ${order.customer_name} (${order.customer_email})`);
      console.log(`   💰 Bids: ${Array.isArray(order.bids_simulated) ? order.bids_simulated.length : 'not array'}`);
      if (Array.isArray(order.bids_simulated) && order.bids_simulated.length > 0) {
        order.bids_simulated.slice(0, 2).forEach((bid, i) => {
          console.log(`     ${i+1}. ${bid.driverName}: $${bid.bidPrice} (${bid.message || 'No message'})`);
        });
        if (order.bids_simulated.length > 2) {
          console.log(`     ... and ${order.bids_simulated.length - 2} more bids`);
        }
      }
    });

    // Test with the actual service query structure to see if there are differences
    if (ordersWithBids.rows.length > 0) {
      const sampleOrderId = ordersWithBids.rows[0].id;
      const sampleCustomerId = ordersWithBids.rows[0].customer_id || ordersWithBids.rows[0].customer_id;

      console.log(`\n🔬 Testing service query structure for order ID: ${sampleOrderId}`);

      // Get the customer_id for this order
      const orderCustomer = await pool.query('SELECT customer_id FROM orders WHERE id = $1', [sampleOrderId]);
      const customerId = orderCustomer.rows[0].customer_id;

      console.log(`   Customer ID for this order: ${customerId}`);

      // Run the exact service query for this customer
      const serviceQueryResult = await pool.query(`
        SELECT
          o.*,
          json_build_object(
            'userId', d.id,
            'name', d.name,
            'rating', d.rating,
            'completedDeliveries', d.completed_deliveries
          ) as assignedDriver,
          json_agg(
            json_build_object(
              'userId', b.user_id,
              'driverName', u.name,
              'bidPrice', b.bid_price,
              'estimatedPickupTime', b.estimated_pickup_time,
              'estimatedDeliveryTime', b.estimated_delivery_time,
              'message', b.message,
              'driverRating', u.rating,
              'driverCompletedDeliveries', u.completed_deliveries,
              'driverReviewCount', COALESCE(dr.review_count, 0),
              'driverIsVerified', u.is_verified
            )
          ) FILTER (WHERE b.id IS NOT NULL) as bids
        FROM orders o
        LEFT JOIN users d ON o.assigned_driver_id = d.id
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN (
          SELECT reviewee_id, COUNT(*) as review_count
          FROM reviews
          GROUP BY reviewee_id
        ) dr ON dr.reviewee_id = u.id
        WHERE o.customer_id = $1
        GROUP BY o.id, d.id, d.name, d.rating, d.completed_deliveries
        ORDER BY o.created_at DESC
      `, [customerId]);

      console.log(`   Service query returned ${serviceQueryResult.rows.length} orders`);

      // Find the specific order
      const specificOrder = serviceQueryResult.rows.find(o => o.id === sampleOrderId);
      if (specificOrder) {
        console.log(`   Bids for "${specificOrder.title}":`);
        console.log(`     Bids data: ${JSON.stringify(specificOrder.bids)}`);
        console.log(`     Is array: ${Array.isArray(specificOrder.bids)}`);
        console.log(`     Length: ${Array.isArray(specificOrder.bids) ? specificOrder.bids.length : 'N/A'}`);
        console.log(`     First bid: ${Array.isArray(specificOrder.bids) && specificOrder.bids.length > 0 ? JSON.stringify(specificOrder.bids[0]) : 'No bids'}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await pool.end();
  }
}

debugBids();
