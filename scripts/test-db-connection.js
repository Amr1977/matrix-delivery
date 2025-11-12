#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests database connectivity and shows current configuration
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🔧 Database Connection Test');
console.log('==========================');

console.log('Environment Configuration:');
console.log(`DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || 5432}`);
console.log(`DB_NAME: ${process.env.DB_NAME || 'matrix_delivery'}`);
console.log(`DB_USER: ${process.env.DB_USER || 'postgres'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
console.log('');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');

    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Test if users table exists and check schema
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    if (tableResult.rows[0].exists) {
      console.log('✅ Users table exists');

      // Check if role column exists
      const columnResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'role'
        );
      `);

      if (columnResult.rows[0].exists) {
        console.log('✅ Role column exists in users table');

        // Show current admin users
        const adminResult = await client.query(
          "SELECT id, name, email, role FROM users WHERE role = 'admin'"
        );

        console.log(`👑 Current admin users: ${adminResult.rows.length}`);
        adminResult.rows.forEach(user => {
          console.log(`   - ${user.name} (${user.email})`);
        });

      } else {
        console.log('❌ Role column does NOT exist in users table');
        console.log('   Run database migrations first!');
      }

    } else {
      console.log('❌ Users table does NOT exist');
    }

    client.release();

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   Error: ${error.message}`);

    if (error.message.includes('password authentication failed')) {
      console.log('');
      console.log('💡 Possible solutions:');
      console.log('   1. Check if PostgreSQL is running: sudo systemctl status postgresql');
      console.log('   2. Verify database password in .env file');
      console.log('   3. Try connecting directly: psql -h localhost -U postgres -d matrix_delivery');
      console.log('   4. Reset PostgreSQL password if needed');
    }

  } finally {
    await pool.end();
  }
}

testConnection();
