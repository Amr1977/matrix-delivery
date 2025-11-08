const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'be_the_one',
});

async function addVerificationColumn() {
  const client = await pool.connect();

  try {
    console.log('Adding is_verified column to users table...');

    // Add the is_verified column
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false
    `);

    console.log('Column added successfully!');

    // Verify the column exists
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_verified'
    `);

    if (result.rows.length > 0) {
      console.log('Verification: Column exists with properties:');
      console.log(result.rows[0]);
    } else {
      console.log('Warning: Column was not found after creation');
    }

  } catch (error) {
    console.error('Error adding column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addVerificationColumn()
  .then(() => {
    console.log('Database column addition complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database column addition failed:', error);
    process.exit(1);
  });
