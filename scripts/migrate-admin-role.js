#!/usr/bin/env node

/**
 * Database Migration Script
 * Updates the users table role constraint to include 'admin'
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrateAdminRole() {
  const client = await pool.connect();

  try {
    console.log('🔄 Migrating users table to support admin role...');

    // Drop the existing constraint
    console.log('📝 Dropping old role constraint...');
    await client.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check;
    `);

    // Add the new constraint with admin role
    console.log('📝 Adding new role constraint with admin support...');
    await client.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('customer', 'driver', 'admin'));
    `);

    console.log('✅ Migration completed successfully!');
    console.log('   Users table now supports admin role.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAdminRole()
  .then(() => {
    console.log('🎉 Admin role migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
