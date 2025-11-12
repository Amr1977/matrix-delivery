#!/usr/bin/env node

/**
 * Admin User Promotion Script
 * Promotes an existing user to admin role
 *
 * Usage: node scripts/promote-to-admin.js <email>
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

async function promoteToAdmin(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const user = userResult.rows[0];

    if (user.role === 'admin') {
      console.log('ℹ️  User is already an admin');
      process.exit(0);
    }

    // Promote user to admin
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['admin', user.id]
    );

    console.log('✅ User promoted to admin successfully!');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: admin`);

  } catch (error) {
    console.error('❌ Error promoting user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node scripts/promote-to-admin.js <email>');
  console.error('   Example: node scripts/promote-to-admin.js admin@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

promoteToAdmin(email);
