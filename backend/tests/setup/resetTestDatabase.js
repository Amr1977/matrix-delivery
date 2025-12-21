/**
 * Reset Test Database
 * Drops and recreates all tables to ensure test database matches production schema
 * Run this before integration tests to ensure clean state
 */

const pool = require('../../config/db');
const { initializeDatabase } = require('../../database/init.ts');

async function resetTestDatabase() {
    console.log('🔄 Resetting test database...');

    try {
        // Drop all tables in reverse dependency order
        const tablesToDrop = [
            'admin_logs',
            'system_settings',
            'backups',
            'logs',
            'coordinate_mappings',
            'location_cache',
            'locations',
            'vendor_items',
            'vendor_categories',
            'vendors',
            'driver_locations',
            'location_updates',
            'messages',
            'reviews',
            'notifications',
            'payments',
            'bids',
            'orders',
            'user_payment_methods',
            'user_favorites',
            'email_verification_tokens',
            'password_reset_tokens',
            'users'
        ];

        console.log('  Dropping existing tables...');
        for (const table of tablesToDrop) {
            try {
                await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            } catch (error) {
                // Ignore errors for tables that don't exist
            }
        }

        // Initialize fresh schema
        console.log('  Creating fresh schema...');
        const result = await initializeDatabase({
            pool,
            dropExisting: false, // Already dropped manually
            verbose: false
        });

        if (result.success) {
            console.log(`✅ Test database reset complete: ${result.tablesCreated.length} tables, ${result.indexesCreated} indexes`);
            return true;
        } else {
            console.error('❌ Schema initialization had errors:', result.errors.map(e => e.message));
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to reset test database:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    resetTestDatabase()
        .then(() => {
            console.log('✅ Done');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = { resetTestDatabase };
