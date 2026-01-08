
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matrix_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function debugStats() {
    try {
        console.log('--- Order Status Distribution ---');
        const statusResult = await pool.query(`
      SELECT status, COUNT(*) 
      FROM orders 
      GROUP BY status
    `);
        console.table(statusResult.rows);

        console.log('\n--- Customer Stats Check ---');
        // Get a customer with at least one order
        const customer = await pool.query(`
      SELECT customer_id, COUNT(*) as count 
      FROM orders 
      WHERE customer_id IS NOT NULL 
      GROUP BY customer_id 
      ORDER BY count DESC 
      LIMIT 1
    `);

        if (customer.rows.length > 0) {
            const customerId = customer.rows[0].customer_id;
            console.log(`Checking Customer ID: ${customerId}`);

            const orders = await pool.query(`
        SELECT id, status 
        FROM orders 
        WHERE customer_id = $1
      `, [customerId]);
            console.table(orders.rows);

            const stats = await pool.query(`
         SELECT 
          (SELECT COUNT(*)::int FROM orders WHERE customer_id = $1 AND status IN ('delivered', 'DELIVERED', 'completed', 'COMPLETED')) as completed_orders,
          (SELECT COUNT(*)::int FROM reviews WHERE target_user_id = $1) as review_count
      `, [customerId]);
            console.log('Calculated Stats:', stats.rows[0]);
        } else {
            console.log('No customers found with orders.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugStats();
