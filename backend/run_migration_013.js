const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_LOCAL_URL
});

async function runMigration() {
  try {
    console.log('Running migration: Adding in_transit_at column...');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP;');
    console.log('✅ Migration complete: in_transit_at column added');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
