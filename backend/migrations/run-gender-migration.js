const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'matrix_delivery',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function runMigration() {
    try {
        console.log('Running migration: Add gender column to users table...');

        await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male';
    `);

        console.log('✓ Gender column added successfully');

        // Verify the column was added
        const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'gender';
    `);

        if (result.rows.length > 0) {
            console.log('✓ Verification successful:', result.rows[0]);
        } else {
            console.log('✗ Column not found after migration');
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
