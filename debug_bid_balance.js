// Debug script to check driver cash balance and order upfront requirements
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'matrix_delivery',
    password: 'be_the_one',
    port: 5432,
});

async function debugBidIssue() {
    try {
        const orderId = '17679032134056zjrr7chr';
        const driverId = '1766665624092zw3jqpt3u';

        console.log('🔍 Checking order upfront requirements...');
        const orderRes = await pool.query(`
      SELECT id, order_number, upfront_payment, require_upfront_payment 
      FROM orders WHERE id = $1
    `, [orderId]);

        if (orderRes.rows.length === 0) {
            console.log('❌ Order not found!');
            return;
        }
        const order = orderRes.rows[0];
        console.log('   Order:', order.order_number);
        console.log('   upfront_payment:', order.upfront_payment, '(type:', typeof order.upfront_payment + ')');
        console.log('   require_upfront_payment:', order.require_upfront_payment);

        console.log('\n🔍 Checking driver cash balance...');
        const driverRes = await pool.query(`
      SELECT id, name, cash_balance FROM users WHERE id = $1
    `, [driverId]);

        if (driverRes.rows.length === 0) {
            console.log('❌ Driver not found!');
            return;
        }
        const driver = driverRes.rows[0];
        console.log('   Driver:', driver.name);
        console.log('   cash_balance:', driver.cash_balance, '(type:', typeof driver.cash_balance + ')');

        // Simulate the comparison
        const upfront = parseFloat(order.upfront_payment) || 0;
        const balance = parseFloat(driver.cash_balance) || 0;
        console.log('\n📊 Comparison:');
        console.log('   upfront (parsed):', upfront);
        console.log('   balance (parsed):', balance);
        console.log('   balance >= upfront:', balance >= upfront);

        if (balance >= upfront) {
            console.log('\n✅ Driver SHOULD be able to bid! Bug is in frontend or backend validation logic.');
        } else {
            console.log('\n❌ Driver does NOT have enough balance (unexpected if they claim to have $500).');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

debugBidIssue();
