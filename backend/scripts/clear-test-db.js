const { Pool } = require('pg');
require('dotenv').config({ path: '.env.testing' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_TEST
});

async function clearTestDatabase() {
    const client = await pool.connect();
    try {
        console.log('🧹 Clearing test users and wallets...');
        await client.query('BEGIN');

        // Clear user_wallets first due to FK constraint
        await client.query('DELETE FROM user_wallets');
        // Clear users with matching email pattern from tests or seed
        await client.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');

        await client.query('COMMIT');
        console.log('✅ Cleared test data successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error clearing test data:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

clearTestDatabase();
