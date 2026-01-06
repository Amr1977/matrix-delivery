const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Cleanup function to prepare for tests
async function cleanup() {
  console.log('🧹 Cleaning up test environment...');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    // Check if database exists, create if needed
    try {
      const dbCheck = await pool.query('SELECT 1');
    } catch (dbError) {
      console.log('   ⚠️  Test database does not exist, it will be created when server starts');
      // Don't end pool here, wait for finally block
      return;
    }

    // Clear all test database tables
    const tables = [
      'reviews', 'location_updates', 'notifications', 'bids', 'orders', 'users'
    ];

    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table}`);
        console.log(`   ✅ Cleared table: ${table}`);
      } catch (err) {
        console.warn(`   ⚠️  Failed to clear table ${table}: ${err.message}`);
      }
    }

    // Reset sequences
    // Reset sequences
    const sequences = [
      { table: 'bids', column: 'id' },
      { table: 'notifications', column: 'id' },
      { table: 'location_updates', column: 'id' },
      { table: 'reviews', column: 'id' }
    ];

    for (const { table, column } of sequences) {
      try {
        await pool.query(`
          DO $$
          DECLARE
            seq_name text;
          BEGIN
            SELECT pg_get_serial_sequence('${table}', '${column}') INTO seq_name;
            IF seq_name IS NOT NULL THEN
              EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
            END IF;
          END $$;
        `);
      } catch (err) {
        console.warn(`   ⚠️  Could not reset sequence for ${table}.${column}: ${err.message}`);
      }
    }

    console.log('   ✅ Reset sequences');

  } catch (error) {
    console.error('   ❌ Error clearing database:', error.message);
    // Don't throw error here as this might be called when DB doesn't exist yet
  } finally {
    await pool.end();
  }

  // Clean up reports directory
  const reportsDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Clean up screenshots directory
  const screenshotsDir = path.join(reportsDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('✅ Cleanup complete\n');
}

// Run cleanup and exit
cleanup().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
