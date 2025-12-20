const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const migrationFile = path.join(__dirname, '../migrations/008_balance_system_phase1.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('🚀 Running migration: 008_balance_system_phase1.sql\n');

        await pool.query(sql);

        console.log('✅ Migration completed successfully!\n');
        console.log('📋 Created tables:');
        console.log('   - user_balances');
        console.log('   - balance_transactions');
        console.log('   - balance_holds\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration();
