const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:***REDACTED***@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=verify-full&channel_binding=require'
});

async function checkAndAddColumn() {
  try {
    console.log('Connecting to Neon database...');
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
