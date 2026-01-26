const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Force load .env (Production)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    require('dotenv').config();
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function diagnose() {
    try {
        console.log('🔌 Connecting to:', process.env.DATABASE_URL.split('@')[1]); // Hide credentials

        // 1. List Tables
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        console.log('\n📊 Tables in DB:', tablesRes.rows.map(r => r.table_name).join(', '));

        // 2. Check schema_migrations
        try {
            const migrationsRes = await pool.query(`
                SELECT migration_name, applied_at 
                FROM schema_migrations 
                ORDER BY applied_at DESC;
            `);
            console.log('\n📜 Applied Migrations:');
            migrationsRes.rows.forEach(m => console.log(` - ${m.migration_name} (${m.applied_at})`));
        } catch (e) {
            console.log('\n⚠️ Could not query schema_migrations:', e.message);
        }

        // Check migrations table
    try {
        const migrations = await pool.query('SELECT * FROM migrations ORDER BY id');
        console.log('\n=== Applied Migrations ===');
        migrations.rows.forEach(m => {
            console.log(` - ${m.name} (Batch: ${m.batch}, Date: ${m.migration_time})`);
        });
    } catch (err) {
        console.log('\n❌ Could not query migrations table:', err.message);
    }

    // Check specific tables
    const tablesToInspect = ['orders', 'users', 'location_updates', 'wallet_payments', 'balance_transactions', 'balance_holds', 'platform_wallets', 'takaful_contributions', 'bids', 'notifications', 'reviews'];

        for (const table of tablesToInspect) {
            console.log(`\nChecking table: ${table}`);
            const tableExists = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);

            if (tableExists.rows[0].exists) {
                console.log(`✅ Table '${table}' exists.`);
                
                // Get columns
                const columnsResult = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = $1;
                `, [table]);
                
                const columns = columnsResult.rows.map(row => row.column_name);
                console.log(`   Columns: ${columns.join(', ')}`);
                
                // Check for specific columns based on table
                if (table === 'orders') {
                    const checkCols = [
                        'sms_forwarded', 
                        'escrow_amount', 
                        'escrow_status', 
                        'upfront_payment', 
                        'driver_distance_traveled_km',
                        'cancellation_fee',
                        'cancelled_by',
                        'picked_up_at',
                        'delivered_at',
                        'completed_at',
                        'cancelled_at'
                    ];
                    checkCols.forEach(col => {
                        console.log(`   - Has ${col}:`, columns.includes(col) ? '✅' : '❌ MISSING');
                    });
                }
                if (table === 'wallet_payments') {
                    console.log('   - Has sms_forwarded:', columns.includes('sms_forwarded') ? '✅' : '❌ MISSING');
                }
            } else {
                console.log(`❌ Table '${table}' DOES NOT EXIST.`);
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

diagnose();
