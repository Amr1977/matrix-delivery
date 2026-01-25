const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:***REDACTED***@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=require&channel_binding=require'
});

async function checkMigrations() {
  try {
    const result = await pool.query('SELECT migration_name FROM public.schema_migrations ORDER BY migration_name');
    console.log('Applied migrations:');
    result.rows.forEach(row => console.log(' -', row.migration_name));
    console.log(`Total applied: ${result.rows.length}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMigrations();