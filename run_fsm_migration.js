const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_6JEvapd0ifSy@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=verify-full&channel_binding=require'
});

async function runMigration() {
  try {
    console.log('🚀 Running FSM schema migration...');

    const migrationPath = path.join(__dirname, 'migrations', '012_add_fsm_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('✅ FSM schema migration completed successfully!');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('domain_events', 'dead_letter_queue', 'fsm_timeouts', 'fsm_action_log', 'fsm_state_snapshots')
      ORDER BY table_name
    `);

    console.log('✅ Created tables:', result.rows.map(r => r.table_name));

    if (result.rows.length === 5) {
      console.log('🎉 All FSM tables created successfully!');
    } else {
      console.warn('⚠️  Expected 5 tables, but found:', result.rows.length);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
