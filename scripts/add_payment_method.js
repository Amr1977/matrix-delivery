const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:***REDACTED***@localhost:5433/matrix_delivery_test'
});

async function migrate() {
  try {
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash'");
    console.log('✅ payment_method column added to orders table');
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await pool.end();
  }
}

migrate();
