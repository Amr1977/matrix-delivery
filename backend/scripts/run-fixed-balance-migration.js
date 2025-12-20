const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const migrationFile = path.join(__dirname, '../migrations/008_balance_system_fixed.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('🚀 Running corrected balance system migration...\n');

        await pool.query(sql);

        console.log('✅ Migration completed successfully!\n');
        console.log('📋 Created:');
        console.log('   - user_balances table (with VARCHAR user_id)');
        console.log('   - Balances for all existing users\n');

        // Verify
        const result = await pool.query('SELECT COUNT(*) FROM user_balances');
        console.log(`✅ Total user balances created: ${result.rows[0].count}\n`);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration();
