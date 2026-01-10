// Debug script to trace upfront_payment through the exact query path
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'matrix_delivery',
    password: '***REDACTED***',
    port: 5432,
});

async function debugUpfrontPayment() {
    try {
        // Get the latest order with upfront payment
        const latestOrder = await pool.query(`
      SELECT id, order_number, upfront_payment, require_upfront_payment, customer_id
      FROM orders 
      WHERE upfront_payment IS NOT NULL AND upfront_payment > 0
      ORDER BY created_at DESC 
      LIMIT 1
    `);

        if (latestOrder.rows.length === 0) {
            console.log('❌ No orders with upfront_payment found in database!');
            console.log('   This means the frontend is NOT sending upfront_payment when creating orders.');
            return;
        }

        const order = latestOrder.rows[0];
        console.log('✅ Found order with upfront_payment in DB:');
        console.log('   Order ID:', order.id);
        console.log('   Order Number:', order.order_number);
        console.log('   upfront_payment value:', order.upfront_payment, '(type:', typeof order.upfront_payment + ')');
        console.log('   require_upfront_payment:', order.require_upfront_payment);

        // Now simulate the exact SELECT that getOrders uses (with o.*)
        console.log('\n📋 Simulating getOrders SELECT o.* query...');
        const fullSelect = await pool.query(`SELECT o.* FROM orders o WHERE o.id = $1`, [order.id]);
        const fullOrder = fullSelect.rows[0];

        console.log('   Raw o.* result keys:', Object.keys(fullOrder).sort().join(', '));
        console.log('   upfront_payment in o.*:', fullOrder.upfront_payment);
        console.log('   require_upfront_payment in o.*:', fullOrder.require_upfront_payment);

        // Check what the mapping produces
        console.log('\n🔄 Simulating JS mapping...');
        const mapped = {
            upfrontPayment: fullOrder.upfront_payment ? parseFloat(fullOrder.upfront_payment) : null,
            requireUpfrontPayment: fullOrder.require_upfront_payment
        };
        console.log('   Mapped upfrontPayment:', mapped.upfrontPayment);
        console.log('   Mapped requireUpfrontPayment:', mapped.requireUpfrontPayment);

        if (mapped.upfrontPayment && mapped.upfrontPayment > 0) {
            console.log('\n✅ BACKEND IS CORRECT! The issue is in the FRONTEND.');
            console.log('   Check DriverBiddingCard.jsx line 34:');
            console.log('   `const upfrontPayment = order.upfront_payment || order.upfrontPayment || 0;`');
            console.log('   Verify the API response in browser DevTools > Network > GET /api/orders');
        } else {
            console.log('\n❌ BACKEND IS BROKEN! The mapping produces null/0.');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

debugUpfrontPayment();
