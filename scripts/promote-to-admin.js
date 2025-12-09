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
      'SELECT id, name, email, primary_role, granted_roles FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const user = userResult.rows[0];

    console.log('\n📋 Current user data:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Primary Role: ${user.primary_role}`);
    console.log(`   Granted Roles: ${JSON.stringify(user.granted_roles || [])}`);

    if (user.primary_role === 'admin') {
      console.log('\nℹ️  User is already an admin');
      process.exit(0);
    }

    // Update user to admin - add admin to granted_roles if not present
    const currentRoles = user.granted_roles || [];
    const newRoles = Array.from(new Set([...currentRoles, 'admin'])); // Add admin if not already present

    await pool.query(
      'UPDATE users SET primary_role = $1, granted_roles = $2 WHERE id = $3',
      ['admin', newRoles, user.id]
    );

    console.log('\n✅ User promoted to admin successfully!');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   New Primary Role: admin`);
    console.log(`   New Granted Roles: ${JSON.stringify(newRoles)}`);

  } catch (error) {
    console.error('❌ Error promoting user:', error.message);
    console.error(error);
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
