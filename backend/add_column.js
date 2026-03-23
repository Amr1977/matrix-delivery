const { Pool } = require('pg');
// Clear any existing env vars and load only production
delete process.env.DATABASE_URL;
require('dotenv').config({ path: __dirname + '/.env.production', override: true });

console.log('Starting...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkAndAddColumn() {
  try {
    console.log('Connecting to database...');
    // Check if column exists
    const check = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'in_transit_at'"
    );

    if (check.rows.length === 0) {
      console.log('Adding in_transit_at column...');
      await pool.query('ALTER TABLE orders ADD COLUMN in_transit_at TIMESTAMP');
      console.log('✅ Column added successfully');
    } else {
      console.log('✅ Column already exists');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndAddColumn();
