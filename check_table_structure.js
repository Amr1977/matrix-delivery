const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:***REDACTED***@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=require&channel_binding=require'
});

async function checkTableStructure() {
  try {
    // Check columns in schema_migrations
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'schema_migrations' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('schema_migrations table columns:');
    columns.rows.forEach(col => {
      console.log(` - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default || ''}`);
    });

    // Check if checksum and execution_time_ms columns exist
    const hasChecksum = columns.rows.some(col => col.column_name === 'checksum');
    const hasExecutionTime = columns.rows.some(col => col.column_name === 'execution_time_ms');

    console.log(`\nHas checksum column: ${hasChecksum}`);
    console.log(`Has execution_time_ms column: ${hasExecutionTime}`);

    if (!hasChecksum || !hasExecutionTime) {
      console.log('Adding missing columns...');
      await pool.query(`
        ALTER TABLE public.schema_migrations
        ADD COLUMN IF NOT EXISTS checksum VARCHAR(64),
        ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER
      `);
      console.log('Columns added successfully');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTableStructure();