const pool = require('../config/db');
const orderService = require('../services/orderService');

async function testAcceptBid() {
    const orderId = '1766228061376tar7yvqr4';
    const customerId = '17644890952300o361ywjw';
    const driverId = '1764483060514qyidb03b0';

    console.log(`\n🧪 Testing acceptBid function:`);
    console.log(`   Order: ${orderId}`);
    console.log(`   Customer: ${customerId}`);
    console.log(`   Driver: ${driverId}\n`);

    try {
        const result = await orderService.acceptBid(orderId, customerId, driverId);
        console.log('✅ SUCCESS:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

testAcceptBid();
