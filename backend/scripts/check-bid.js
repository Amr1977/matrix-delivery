const pool = require('../config/db');

async function checkBid() {
    const orderId = process.argv[2] || '1766228061376tar7yvqr4';
    const driverId = process.argv[3] || '1764483060514qyidb03b0';

    console.log(`\n🔍 Checking bid for:`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Driver ID: ${driverId}\n`);

    try {
        // Check all bids for this order
        const allBids = await pool.query(
            'SELECT * FROM bids WHERE order_id = $1',
            [orderId]
        );

        console.log(`📋 All bids for order ${orderId}:`);
        console.log(JSON.stringify(allBids.rows, null, 2));
        console.log(`\nTotal bids: ${allBids.rows.length}\n`);

        // Check specific bid
        const specificBid = await pool.query(
            'SELECT * FROM bids WHERE order_id = $1 AND user_id = $2',
            [orderId, driverId]
        );

        console.log(`🎯 Specific bid (user_id = ${driverId}):`);
        console.log(JSON.stringify(specificBid.rows, null, 2));
        console.log(`\nFound: ${specificBid.rows.length > 0 ? 'YES ✅' : 'NO ❌'}\n`);

        // Check table schema
        const schema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bids'
      ORDER BY ordinal_position
    `);

        console.log(`📊 Bids table schema:`);
        schema.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkBid();
