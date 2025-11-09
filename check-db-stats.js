const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function updateStats() {
  try {
    console.log('🔄 Updating user statistics...');

    // Update driver completed deliveries
    const driverResult = await pool.query(`
      UPDATE users SET completed_deliveries = (
        SELECT COUNT(*) FROM orders WHERE assigned_driver_user_id = users.id AND status = 'delivered'
      ) WHERE role = 'driver'
    `);
    console.log(`✅ Updated ${driverResult.rowCount} drivers`);

    // Update customer completed deliveries
    const customerResult = await pool.query(`
      UPDATE users SET completed_deliveries = (
        SELECT COUNT(*) FROM orders WHERE customer_id = users.id AND status = 'delivered'
      ) WHERE role = 'customer'
    `);
    console.log(`✅ Updated ${customerResult.rowCount} customers`);

    // Update ratings
    const ratingResult = await pool.query(`
      UPDATE users SET rating = COALESCE((
        SELECT AVG(rating) FROM reviews WHERE reviewee_id = users.id
      ), 5.0)
    `);
    console.log(`✅ Updated ratings for ${ratingResult.rowCount} users`);

    // Check review counts
    const reviewStats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COUNT(*) FROM users WHERE role = 'driver') as total_drivers,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
        (SELECT COUNT(*) FROM orders WHERE status = 'delivered') as delivered_orders
    `);

    console.log('📊 Database Statistics:');
    console.log(`   Total Reviews: ${reviewStats.rows[0].total_reviews}`);
    console.log(`   Total Drivers: ${reviewStats.rows[0].total_drivers}`);
    console.log(`   Total Customers: ${reviewStats.rows[0].total_customers}`);
    console.log(`   Delivered Orders: ${reviewStats.rows[0].delivered_orders}`);

    // Show sample driver data
    const drivers = await pool.query(`
      SELECT id, name, completed_deliveries, rating,
             (SELECT COUNT(*) FROM reviews WHERE reviewee_id = users.id) as review_count
      FROM users WHERE role = 'driver' LIMIT 5
    `);

    console.log('\n👨‍🚗 Sample Driver Data:');
    drivers.rows.forEach(driver => {
      console.log(`   ${driver.name}: ${driver.completed_deliveries} deliveries, ${driver.rating} rating, ${driver.review_count} reviews`);
    });

  } catch (error) {
    console.error('Error updating stats:', error);
  } finally {
    await pool.end();
  }
}

updateStats();
