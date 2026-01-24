const { Pool } = require('pg');
const { BalanceService } = require('./backend/services/balanceService');
const { TransactionType } = require('./backend/types/balance');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'matrix_delivery_test',
    password: '***REDACTED***',
    port: 5432,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Setup...');
        // Clean up
        await client.query('DELETE FROM takaful_contributions');
        await client.query('DELETE FROM balance_transactions');
        await client.query('DELETE FROM user_balances');
        await client.query('DELETE FROM orders');
        await client.query('DELETE FROM email_verification_tokens');
        await client.query('DELETE FROM users');

        // Create users
        const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const customerId = generateId();
        const driverId = generateId(); // Ensure unique IDs
        
        const customer = await client.query(
            'INSERT INTO users (id, name, email, password_hash, primary_role) VALUES ($1, \'Alice\', \'alice@test.com\', \'pass\', \'customer\') RETURNING id',
            [customerId]
        );
        const driver = await client.query(
            'INSERT INTO users (id, name, email, password_hash, primary_role) VALUES ($1, \'Bob\', \'bob@test.com\', \'pass\', \'driver\') RETURNING id',
            [driverId]
        );

        // Create balances
        await client.query('INSERT INTO user_balances (user_id, available_balance, held_balance) VALUES ($1, 1000, 50)', [customerId]);
        await client.query('INSERT INTO user_balances (user_id, available_balance) VALUES ($1, 0)', [driverId]);

        const balanceService = new BalanceService(pool);

        // Create order with hold
        const orderId = generateId();
        await client.query(
            'INSERT INTO orders (id, customer_id, assigned_driver_user_id, price, status, escrow_status, payment_method) VALUES ($1, $2, $3, $4, \'delivered_pending\', \'held\', \'crypto\')',
            [orderId, customerId, driverId, 50.00]
        );
        
        await balanceService.holdFunds(customerId, orderId, 50.00);

        // Run releaseHold 5 times concurrently
        console.log('Running releaseHold 5 times concurrently...');
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(balanceService.releaseHold(customerId, orderId, 50, {
                destinationUserId: driverId,
                platformCommission: 5,
                takafulContribution: 2.5
            }).then(res => console.log(`Run ${i} result:`, res)).catch(err => console.error(`Run ${i} error:`, err.message)));
        }

        await Promise.all(promises);

        // Check results
        const driverBalance = await client.query('SELECT available_balance FROM user_balances WHERE user_id = $1', [driverId]);
        console.log('Driver Balance:', driverBalance.rows[0].available_balance);

        const txCount = await client.query('SELECT count(*) FROM balance_transactions WHERE order_id = $1::text', [orderId]);
        console.log('Transaction Count:', txCount.rows[0].count);
        
        const txs = await client.query('SELECT id, type, amount, order_id FROM balance_transactions WHERE order_id = $1::text', [orderId]);
        console.log('Transactions:', txs.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
