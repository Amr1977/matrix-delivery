/**
 * Reset Test Database
 * Drops and recreates all tables using the test schema SQL file
 */

const fs = require('fs');
const path = require('path');

// Set test environment
process.env.NODE_ENV = 'testing';

// Now require the pool (it will use test database)
const pool = require('../../config/db');

async function resetTestDatabase() {
    console.log('🔄 Resetting test database...');

    try {
        // Read the test schema SQL file
        const schemaPath = path.join(__dirname, '../../migrations/test_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('  Executing test schema SQL...');
        await pool.query(schemaSql);

        console.log('✅ Test database reset complete!');
        return true;
    } catch (error) {
        console.error('❌ Failed to reset test database:', error.message);
        throw error;
    } finally {
        await pool.end();
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
