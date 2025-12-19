/**
 * Migration Runner for COD Commission System
 * 
 * This script runs the migration to remove the positive_available_balance constraint
 * from the user_balances table, allowing drivers to have negative balances (debt).
 * 
 * Usage:
 *   node backend/migrations/run_cod_commission_migration.js
 * 
 * Environment Variables Required:
 *   - DB_HOST (default: localhost)
 *   - DB_PORT (default: 5432)
 *   - DB_NAME (default: matrix_delivery)
 *   - DB_USER (default: postgres)
 *   - DB_PASSWORD
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'matrix_delivery',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting COD Commission Migration...');
        console.log(`📊 Database: ${process.env.DB_NAME || 'matrix_delivery'}`);
        console.log(`🔗 Host: ${process.env.DB_HOST || 'localhost'}`);

        // Read the migration file
        const migrationPath = path.join(__dirname, '20251219_remove_positive_balance_constraint.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('\n📝 Migration SQL:');
        console.log(migrationSQL);

        // Start transaction
        await client.query('BEGIN');

        // Check if constraint exists
        const constraintCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'user_balances' 
            AND constraint_name = 'positive_available_balance'
        `);

        if (constraintCheck.rows.length > 0) {
            console.log('\n✅ Found positive_available_balance constraint - removing...');
        } else {
            console.log('\n⚠️  Constraint positive_available_balance not found - may already be removed');
        }

        // Run the migration
        await client.query(migrationSQL);

        // Verify the constraint is removed
        const verifyCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'user_balances' 
            AND constraint_name = 'positive_available_balance'
        `);

        if (verifyCheck.rows.length === 0) {
            console.log('✅ Constraint successfully removed!');
        } else {
            throw new Error('❌ Constraint still exists after migration');
        }

        // Check current balances
        const balanceStats = await client.query(`
            SELECT 
                COUNT(*) as total_drivers,
                COUNT(CASE WHEN available_balance < 0 THEN 1 END) as drivers_with_debt,
                MIN(available_balance) as min_balance,
                MAX(available_balance) as max_balance,
                AVG(available_balance) as avg_balance
            FROM user_balances
        `);

        console.log('\n📊 Current Balance Statistics:');
        console.log(`   Total Drivers: ${balanceStats.rows[0].total_drivers}`);
        console.log(`   Drivers with Debt: ${balanceStats.rows[0].drivers_with_debt}`);
        console.log(`   Min Balance: ${balanceStats.rows[0].min_balance} EGP`);
        console.log(`   Max Balance: ${balanceStats.rows[0].max_balance} EGP`);
        console.log(`   Avg Balance: ${parseFloat(balanceStats.rows[0].avg_balance).toFixed(2)} EGP`);

        // Commit transaction
        await client.query('COMMIT');

        console.log('\n✅ Migration completed successfully!');
        console.log('🎉 Drivers can now have negative balances (debt)');
        console.log('📌 Debt threshold: -200 EGP');
        console.log('⚠️  Warning threshold: -150 EGP');

    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', error.message);
        console.error('🔄 Transaction rolled back');
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('\n✅ Migration script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration script failed:', error);
        process.exit(1);
    });
