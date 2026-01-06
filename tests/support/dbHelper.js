const pool = require('../../backend/config/db');

/**
 * Add balance to a test user by email
 * @param {string} email 
 * @param {number} amount 
 */
async function addTestUserBalance(email, amount) {
    try {
        // 1. Get user ID
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            throw new Error(`User ${email} not found for balance addition`);
        }
        const userId = userRes.rows[0].id;

        // 2. Insert or Update balance
        await pool.query(`
            INSERT INTO user_balances (user_id, currency, available_balance, pending_balance, held_balance, total_transactions)
            VALUES ($1, 'EGP', $2, 0, 0, 1)
            ON CONFLICT (user_id)
            DO UPDATE SET available_balance = user_balances.available_balance + $2
        `, [userId, amount]);

        console.log(`Added ${amount} EGP to ${email}`);
    } catch (e) {
        console.error('Error adding balance:', e);
    }
}

module.exports = { addTestUserBalance };
