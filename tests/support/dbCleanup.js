/**
 * Database Cleanup Utility
 * Handles cleanup of test data with proper foreign key dependency ordering
 */

const pool = require('../../backend/config/db');

/**
 * Clean up all test users and their related data
 * Handles foreign key dependencies in correct order
 */
async function cleanTestUsers() {
    try {
        // Delete in order of foreign key dependencies (most dependent first)

        // 1. Clean notification-related tables
        await pool.query('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');

        // 2. Clean email/auth tokens
        await pool.query('DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
        await pool.query('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');

        // 3. Clean wallet/balance data
        await pool.query('DELETE FROM balance_holds WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
        await pool.query('DELETE FROM balance_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
        await pool.query('DELETE FROM user_balances WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
        await pool.query('DELETE FROM user_wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
        await pool.query('DELETE FROM crypto_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');

        // 4. Clean reviews
        try {
            await pool.query(`
                DELETE FROM reviews 
                WHERE reviewer_id IN (SELECT id FROM users WHERE email LIKE '%@test.com') 
                   OR reviewee_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')
            `);
        } catch (e) {
            // Table or columns may not exist
        }

        // 5. Clean bids (depends on orders and users)
        await pool.query(`
            DELETE FROM bids 
            WHERE driver_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')
               OR order_id IN (SELECT id FROM orders WHERE customer_id IN (SELECT id FROM users WHERE email LIKE '%@test.com'))
        `);

        // 6. Clean payments
        await pool.query('DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE customer_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\'))');

        // 7. Clean order location history if exists
        try {
            await pool.query('DELETE FROM order_location_history WHERE order_id IN (SELECT id FROM orders WHERE customer_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\'))');
        } catch (e) {
            // Table may not exist
        }

        // 8. Clean orders
        await pool.query('DELETE FROM orders WHERE customer_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
        await pool.query('DELETE FROM orders WHERE driver_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');

        // 9. Finally, delete the test users
        const result = await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\' RETURNING id');

        if (result.rowCount > 0) {
            console.log(`   🧹 Cleaned up ${result.rowCount} test users and related data`);
        }

        return result.rowCount;
    } catch (error) {
        console.error('   ⚠️  Error during test cleanup:', error.message);
        // Don't throw - cleanup errors shouldn't fail tests
        return 0;
    }
}

/**
 * Clean up test orders only (preserves users)
 */
async function cleanTestOrders() {
    try {
        // Clean bids first
        await pool.query(`
            DELETE FROM bids 
            WHERE order_id IN (SELECT id FROM orders WHERE customer_id IN (SELECT id FROM users WHERE email LIKE '%@test.com'))
        `);

        // Clean payments
        await pool.query('DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE customer_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\'))');

        // Clean orders
        const result = await pool.query('DELETE FROM orders WHERE customer_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') RETURNING id');

        return result.rowCount;
    } catch (error) {
        console.error('   ⚠️  Error cleaning test orders:', error.message);
        return 0;
    }
}

/**
 * Clean all test data (complete reset)
 */
async function cleanAllTestData() {
    await cleanTestUsers();
}

module.exports = {
    cleanTestUsers,
    cleanTestOrders,
    cleanAllTestData
};
