/**
 * Check Egypt Payment Phase 1 Migration Status
 */
const pool = require('../config/db');

async function checkMigration() {
  try {
    console.log('Checking Egypt Payment Phase 1 migration status...\n');

    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('topups', 'topup_audit_logs', 'platform_wallets')
    `);
    
    console.log('Tables found:', tablesResult.rows.map(r => r.table_name));

    // Check topups table columns
    const topupsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'topups'
      ORDER BY ordinal_position
    `);
    
    console.log('\nTopups table columns:');
    topupsColumns.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    // Check platform_wallets new columns
    const walletColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'platform_wallets' 
      AND column_name IN ('instapay_alias', 'holder_name', 'daily_used', 'monthly_used', 'last_reset_daily', 'last_reset_monthly')
    `);
    
    console.log('\nPlatform wallets new columns:');
    walletColumns.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    // Check topup_audit_logs columns
    const auditColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'topup_audit_logs'
      ORDER BY ordinal_position
    `);
    
    console.log('\nTopup audit logs columns:');
    auditColumns.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    // Check constraints on topups
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'topups'
    `);
    
    console.log('\nTopups constraints:');
    constraints.rows.forEach(r => console.log(`  - ${r.constraint_name} (${r.constraint_type})`));

    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('topups', 'topup_audit_logs', 'platform_wallets')
      AND indexname LIKE 'idx_%'
    `);
    
    console.log('\nIndexes created:');
    indexes.rows.forEach(r => console.log(`  - ${r.indexname}`));

    console.log('\n✅ Migration check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking migration:', error.message);
    process.exit(1);
  }
}

checkMigration();
