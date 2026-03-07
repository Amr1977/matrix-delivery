const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_6JEvapd0ifSy@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=verify-full&channel_binding=require'
});

async function markMigrationsApplied() {
  try {
    console.log('Checking schema_migrations table...');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = 'schema_migrations'
    `);
    console.log('Schema migrations table info:', tableCheck.rows);

    // Table exists, proceed

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'backend', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));

    console.log(`Found ${files.length} migration files`);

    // Insert each migration as applied
    for (const file of files) {
      const migrationName = file;
      console.log(`Marking ${migrationName} as applied...`);

      await pool.query(`
        INSERT INTO public.schema_migrations (migration_name, applied_at)
        VALUES ($1, NOW())
        ON CONFLICT (migration_name) DO NOTHING
      `, [migrationName]);
    }

    console.log('✅ All migrations marked as applied');
  } catch (error) {
    console.error('❌ Error marking migrations:', error);
  } finally {
    await pool.end();
  }
}

markMigrationsApplied();