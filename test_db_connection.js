const { Pool } = require('pg');

// Use the Neon DATABASE_URL directly for testing
const DATABASE_URL = 'postgresql://neondb_owner:***REDACTED***@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('Testing database connection...');

    // Test connection by running a simple query
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].db_version);

    // Close the pool
    await pool.end();
    console.log('Database connection pool closed.');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();