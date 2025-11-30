const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '***REDACTED***'
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);

    console.log('Orders table columns:');
    result.rows.forEach(row => {
      console.log('  -', row.column_name);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkSchema();
