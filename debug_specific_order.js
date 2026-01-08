
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'matrix_delivery',
    password: 'be_the_one',
    port: 5432,
});

async function debugOrder() {
    try {
        const targetNum = '1767898681396';
        console.log(`Checking order with trace: ${targetNum}`);

        // Fetch raw order
        const res = await pool.query('SELECT * FROM orders WHERE order_number LIKE $1', [`%${targetNum}%`]);
        if (res.rows.length === 0) {
            console.log('❌ Order not found!');
            return;
        }

        const order = res.rows[0];
        console.log(`✅ Order Found:`);
        console.log(`   ID: ${order.id}`);
        console.log(`   Number: '${order.order_number}'`);
        console.log(`   Title: '${order.title}'`);
        console.log(`   Upfront Payment (DB Value):`, order.upfront_payment);
        console.log(`   Require Upfront (DB Value):`, order.require_upfront_payment);

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
