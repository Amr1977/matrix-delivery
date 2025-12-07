/**
 * Seed Test Database with Sample Data
 * Run this before running integration tests
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.testing' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_TEST
});

async function seedTestDatabase() {
    const client = await pool.connect();

    try {
        console.log('🌱 Starting test database seeding...');

        await client.query('BEGIN');

        // Clean existing test data
        console.log('🧹 Cleaning existing test data...');
        await client.query('DELETE FROM crypto_transactions');
        await client.query('DELETE FROM user_wallets');
        await client.query('DELETE FROM orders');
        await client.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');

        // Create test users
        console.log('👥 Creating test users...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        const customerResult = await client.query(
            `INSERT INTO users (id, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
            ['test-customer-1', 'customer@test.com', hashedPassword, 'customer']
        );
        const customerId = customerResult.rows[0].id;

        const driverResult = await client.query(
            `INSERT INTO users (id, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
            ['test-driver-1', 'driver@test.com', hashedPassword, 'driver']
        );
        const driverId = driverResult.rows[0].id;

        const adminResult = await client.query(
            `INSERT INTO users (id, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
            ['test-admin-1', 'admin@test.com', hashedPassword, 'admin']
        );
        const adminId = adminResult.rows[0].id;

        console.log(`✅ Created users: customer=${customerId}, driver=${driverId}, admin=${adminId}`);

        // Create crypto wallets
        console.log('💰 Creating crypto wallets...');
        await client.query(
            `INSERT INTO user_wallets (user_id, wallet_address, created_at)
       VALUES ($1, $2, NOW())`,
            [customerId, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb']
        );

        await client.query(
            `INSERT INTO user_wallets (user_id, wallet_address, created_at)
       VALUES ($1, $2, NOW())`,
            [driverId, '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199']
        );

        console.log('✅ Created crypto wallets');

        await client.query('COMMIT');

        console.log('\n✅ Test database seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Users: 3 (customer, driver, admin)`);
        console.log(`   - Wallets: 2`);
        console.log('\n🧪 Ready for integration tests!');
        console.log('\n💡 Note: Orders and transactions skipped due to minimal test schema');
        console.log('   Tests will use mocked blockchain service for these');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding test database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run seeding
seedTestDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
