
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'matrix_delivery',
    password: '***REDACTED***',
    port: 5432,
});

async function debugOrder() {
    try {
        console.log(`Checking LATEST order in DB...`);

        // Fetch latest order
        const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length === 0) {
            console.log('❌ No orders found in DB!');
            return;
        }

        const order = res.rows[0];
        console.log(`✅ Latest Order Found:`);
        console.log(`   ID: ${order.id}`);
        console.log(`   Number: "${order.order_number}"`);
        console.log(`   Title: ${order.title}`);
        console.log(`   Customer ID: ${order.customer_id}`);
        console.log(`   Upfront Payment: ${order.upfront_payment} (Type: ${typeof order.upfront_payment})`);
        console.log(`   Require Upfront: ${order.require_upfront_payment}`);
        console.log(`   Price: ${order.price}`);

        // Check if customer matches test user
        const userRes = await pool.query('SELECT id, name, email, rating FROM users WHERE id = $1', [order.customer_id]);
        const user = userRes.rows[0];
        console.log(`   Customer: ${user?.name} (${user?.email})`);
        console.log(`   Customer Rating: ${user?.rating}`);

        // Check stats for THIS customer
        const completed = await pool.query(`
            SELECT COUNT(*)::int as count
            FROM orders 
            WHERE customer_id = $1 
            AND status IN ('delivered', 'DELIVERED', 'completed', 'COMPLETED')
    `, [order.customer_id]);
        console.log(`   Calculated Completed Orders: ${completed.rows[0].count}`);

        const reviews = await pool.query(`
            SELECT COUNT(*)::int as count 
            FROM reviews 
            WHERE reviewee_id = $1
    `, [order.customer_id]);
        console.log(`   Calculated Review Count: ${reviews.rows[0].count}`);

    } catch (err) {
        console.error('❌ DB Error:', err);
    } finally {
        await pool.end();
    }
}

debugOrder();
