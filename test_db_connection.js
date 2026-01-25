const { Pool } = require('pg');

// Use the Neon DATABASE_URL directly for testing
const DATABASE_URL = 'postgresql://neondb_owner:npg_6JEvapd0ifSy@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('Testing Neon database connection...');

    // Test connection by running a simple query
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].db_version);

    // Check if schema_migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'schema_migrations'
      ) as exists
    `);
    console.log('Schema migrations table exists:', tableCheck.rows[0].exists);

    // Close the pool
    await pool.end();
    console.log('Connection test completed.');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();