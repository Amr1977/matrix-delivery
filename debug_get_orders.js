
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'matrix_delivery',
    password: 'be_the_one',
    port: 5432,
});

async function debugGetOrders() {
    try {
        const userId = '1766668811902o51owyndm'; // The customer's ID (from previous debug)
        // Wait, getOrders is usually termed by the DRIVER (to see the list).
        // So I need a DRIVER ID to simulate the driver's view.
        // I can just pick a random user or simulate typical driver query.
        // Actually, I just want to run the SQL.

        // The Query from OrderService.js (reconstructed from file view)
        const sql = `
SELECT
o.*,
  c.rating as "customerRating",
  c.created_at as "customerJoinedAt",
  (SELECT COUNT(*)::int FROM orders o2 WHERE o2.customer_id = o.customer_id AND o2.status IN ('delivered', 'DELIVERED', 'completed', 'COMPLETED')) as "customerCompletedOrders",
  (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewee_id = o.customer_id) as "customerReviewCount"
FROM orders o
LEFT JOIN users c ON o.customer_id = c.id
WHERE o.order_number LIKE '%1767898681396%' -- Target the specific new order
GROUP BY o.id, c.id
    `;

        // Note: The actual service query has complex joins and GROUP BYs. 
        // If I simplify it here, I might miss the bug (e.g. bad GROUP BY).
        // But this tests the basic subquery logic match.

        const res = await pool.query(sql);

        if (res.rows.length === 0) {
            console.log('❌ Order not found in custom query');
        } else {
            const row = res.rows[0];
            console.log('✅ Query Result:');
            console.log(`Title: ${row.title}`);
            console.log(`Customer Rating: ${row.customerRating}`);
            console.log(`Cust Completed: ${row.customerCompletedOrders}`); // Expect 12
            console.log(`Cust Reviews: ${row.customerReviewCount}`); // Expect 7
        }

    } catch (err) {
        console.error('❌ DB Error:', err);
    } finally {
        await pool.end();
    }
}

debugGetOrders();
