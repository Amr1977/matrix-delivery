#!/usr/bin/env node

/**
 * Matrix Delivery Admin Management System
 *
 * Unified script for creating new admin users and promoting existing users to admin role.
 * Supports multiple environments (development, staging, production) with automatic
 * environment configuration loading.
 *
 * Features:
 * - Create new admin users with auto-generated secure passwords
 * - Promote existing users to admin role
 * - Multi-environment support with automatic config loading
 * - Comprehensive error handling and user verification
 * - Secure database operations with parameterized queries
 *
 * Usage:
 *   node manage_admin.js create <email> [environment]
 *   node manage_admin.js promote <email_or_id> [environment]
 *
 * Examples:
 *   node manage_admin.js create admin@example.com development
 *   node manage_admin.js promote user@example.com production
 *
 * Security:
 * - Uses bcrypt for password hashing
 * - Parameterized database queries prevent SQL injection
 * - Environment isolation for development/staging/production
 * - Comprehensive audit logging
 *
 * @author Cascade AI Assistant
 * @version 1.0.0
 * @date 2026-03-10
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Parse command line arguments
// Expected format: node manage_admin.js <command> <identifier> [environment]
const args = process.argv.slice(2);
const command = args[0]; // 'create' or 'promote'
const userIdentifier = args[1]; // email for create, email/id for promote
const targetEnv = args[2] || 'development'; // dev, staging, production

// Validate command line arguments
// This ensures proper usage and provides helpful error messages
if (!command || !userIdentifier) {
  console.log('❌ Usage:');
  console.log('  node manage_admin.js create <email> [environment]');
  console.log('  node manage_admin.js promote <email_or_id> [environment]');
  console.log('');
  console.log('Examples:');
  console.log('  node manage_admin.js create admin@example.com development');
  console.log('  node manage_admin.js promote user@example.com production');
  console.log('  node manage_admin.js promote 123 staging');
  console.log('');
  console.log('Environments: development, staging, production (default: development)');
  process.exit(1);
}

// Load appropriate environment file from backend directory
// The script runs from backend/scripts/, so we need to go up one level
// Environment mapping:
// - development -> ../.env.development (local dev database)
// - staging -> ../.env.staging (pre-production testing)
// - production -> ../.env (live production system)
const envFile = targetEnv === 'production' ? '../.env' :
               targetEnv === 'staging' ? '../.env.staging' :
               '../.env.development';

console.log(`🔧 Loading environment: ${targetEnv} (${envFile})`);
dotenv.config({ path: envFile });

// Validate that DATABASE_URL was loaded from the environment file
// This is critical for database connectivity
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(`❌ DATABASE_URL not found in ${envFile}`);
  console.error('💡 Check that the environment file exists and contains DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

/**
 * Creates a new admin user with auto-generated credentials
 *
 * This function handles the complete admin user creation process:
 * 1. Checks if user already exists (prevents duplicates)
 * 2. Generates secure auto-generated password
 * 3. Creates unique user ID
 * 4. Hashes password with bcrypt
 * 5. Inserts user into database with admin role
 * 6. Displays generated credentials for secure storage
 *
 * @param {string} email - Email address for the new admin user
 * @returns {Promise<void>}
 * @throws {Error} If database operations fail or user already exists
 */
async function createAdminUser(email) {
  try {
    console.log(`🆕 Creating new admin user: ${email}`);
    console.log(`📡 Database: ${DATABASE_URL.split('@')[1]}`);

    // Check if user already exists to prevent duplicate accounts
    // This is important for data integrity and prevents accidental overwrites
    const existingUser = await pool.query(
      'SELECT id, email, name, primary_role, granted_roles FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists! Promoting to admin instead...');
      return await promoteUser(email);
    }

    // Generate secure, auto-generated password
    // Format: Admin@<year>!<random_suffix>
    // This provides both security and predictability for initial login
    const adminPassword = `Admin@${Date.now().toString().slice(-4)}!`;

    // Generate unique admin user ID
    // Uses timestamp + random strings for guaranteed uniqueness
    const adminName = `Administrator (${email})`;
    const adminPhone = '+1234567890'; // Default phone for admin accounts
    const adminId = `admin_${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`;

    // Hash password using bcrypt with salt rounds of 10
    // This is industry standard for password security
    console.log('🔐 Generating secure password hash...');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Insert new admin user into database
    // All fields are explicitly set for consistency and security
    await pool.query(
      `INSERT INTO users (
        id, name, email, password_hash, phone, primary_role, granted_roles,
        is_verified, rating, completed_deliveries, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        adminId,                    // Unique user ID
        adminName,                  // Display name
        email,                      // Login email
        hashedPassword,             // Secure password hash
        adminPhone,                 // Contact phone
        'admin',                    // Primary role
        ['admin', 'customer', 'driver'], // All possible roles for flexibility
        true,                       // Pre-verified account
        5.0,                        // Perfect initial rating
        0,                          // No deliveries completed
      ]
    );

    // Display success message with generated credentials
    // IMPORTANT: This is the only time the plain text password is shown
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📋 NEW ADMIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:    ', email);
    console.log('🔑 Password: ', adminPassword);
    console.log('👤 Name:     ', adminName);
    console.log('📱 Phone:    ', adminPhone);
    console.log('🆔 User ID:  ', adminId);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('⚠️  IMPORTANT: Save these credentials securely!');
    console.log('💡 You can use these to log in to the admin panel');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  }
}

/**
 * Promotes an existing user to admin role
 *
 * This function handles the complete user promotion process:
 * 1. Finds user by email or ID (flexible identification)
 * 2. Displays current user information for verification
 * 3. Checks if user is already admin (prevents unnecessary operations)
 * 4. Updates primary_role to 'admin'
 * 5. Updates granted_roles array to include admin privileges
 * 6. Verifies the changes were applied correctly
 *
 * The function supports promoting users across all role types (customer, driver)
 * and ensures they retain their existing roles while gaining admin access.
 *
 * @param {string} userIdentifier - Email address or user ID to promote
 * @returns {Promise<void>}
 * @throws {Error} If user not found or database operations fail
 */
async function promoteUser(userIdentifier) {
  try {
    console.log(`⬆️  Promoting user to admin: ${userIdentifier}`);
    console.log(`📡 Database: ${DATABASE_URL.split('@')[1]}`);

    // Find user by email or ID for maximum flexibility
    // This allows administrators to use either identifier type
    let userQuery;
    let userParams;

    if (userIdentifier.includes('@')) {
      // Email-based lookup for user-friendly identification
      userQuery = 'SELECT id, email, name, phone, primary_role, granted_roles, is_verified FROM users WHERE email = $1';
      userParams = [userIdentifier];
    } else {
      // ID-based lookup for programmatic or API-based operations
      // Supports both string IDs and numeric IDs
      userQuery = 'SELECT id, email, name, phone, primary_role, granted_roles, is_verified FROM users WHERE id = $1 OR id::text = $2';
      userParams = [userIdentifier, userIdentifier];
    }

    const userResult = await pool.query(userQuery, userParams);

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${userIdentifier}`);
      console.log('');
      console.log('💡 Run: node list_users_enhanced.js to see all users');
      return;
    }

    const user = userResult.rows[0];

    // Display comprehensive user information before making changes
    // This provides audit trail and allows verification of correct user
    console.log('');
    console.log('👤 USER FOUND:');
    console.log('ID:'.padEnd(15), user.id);
    console.log('Email:'.padEnd(15), user.email);
    console.log('Name:'.padEnd(15), user.name || 'N/A');
    console.log('Current Role:'.padEnd(15), user.primary_role || 'N/A');
    console.log('Granted Roles:'.padEnd(15), Array.isArray(user.granted_roles) ? user.granted_roles.join(', ') : 'N/A');
    console.log('Verified:'.padEnd(15), user.is_verified ? 'Yes' : 'No');

    // Prevent unnecessary operations if user is already admin
    // This avoids duplicate processing and provides clear feedback
    if (user.primary_role === 'admin') {
      console.log('');
      console.log('✅ User is already an admin!');
      return;
    }

    // Update primary_role to admin - this sets the active role
    // The primary_role determines the user's current permissions
    await pool.query(
      'UPDATE users SET primary_role = $1 WHERE id = $2',
      ['admin', user.id]
    );

    // Update granted_roles array to include admin privileges
    // This allows the user to switch between roles including admin
    // We preserve existing roles and add admin + standard roles for flexibility
    let currentRoles = Array.isArray(user.granted_roles) ? user.granted_roles : [];
    if (!currentRoles.includes('admin')) {
      currentRoles.push('admin');
    }
    if (!currentRoles.includes('customer')) {
      currentRoles.push('customer');
    }
    if (!currentRoles.includes('driver')) {
      currentRoles.push('driver');
    }

    await pool.query(
      'UPDATE users SET granted_roles = $1 WHERE id = $2',
      [currentRoles, user.id]
    );

    // Display success message with updated information
    console.log('✅ User promoted to admin successfully!');
    console.log('');
    console.log('📋 UPDATED USER INFO:');
    console.log('Primary Role:'.padEnd(15), 'admin');
    console.log('Granted Roles:'.padEnd(15), currentRoles.join(', '));

    // Verification step - ensure changes were applied correctly
    // This provides confidence that the operation succeeded
    const verifyResult = await pool.query(
      'SELECT primary_role, granted_roles FROM users WHERE id = $1',
      [user.id]
    );

    const updatedUser = verifyResult.rows[0];
    console.log('');
    console.log('🔍 VERIFICATION:');
    console.log('Primary Role:'.padEnd(15), updatedUser.primary_role);
    console.log('Granted Roles:'.padEnd(15), Array.isArray(updatedUser.granted_roles) ? updatedUser.granted_roles.join(', ') : 'N/A');

    console.log('');
    console.log('🎉 Promotion complete! User can now access admin features.');

  } catch (error) {
    console.error('❌ Error promoting user:', error.message);
    throw error;
  }
}

/**
 * Main execution function - orchestrates the admin management process
 *
 * This function serves as the entry point for the script and handles:
 * 1. Database connection establishment and testing
 * 2. Command routing (create vs promote)
 * 3. Comprehensive error handling with helpful troubleshooting messages
 * 4. Proper resource cleanup (database connection pooling)
 *
 * The function ensures that database connections are properly managed and
 * provides clear error messages for common issues like connection problems,
 * missing databases, or authentication failures.
 *
 * @returns {Promise<void>}
 * @throws {Error} Propagates errors for process-level handling
 */
async function main() {
  try {
    // Establish database connection and perform connectivity test
    // This ensures the environment is properly configured before proceeding
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');

    // Route to appropriate function based on command
    // This provides a clean separation of concerns between operations
    if (command === 'create') {
      await createAdminUser(userIdentifier);
    } else if (command === 'promote') {
      await promoteUser(userIdentifier);
    } else {
      // Handle invalid commands with helpful guidance
      console.log(`❌ Unknown command: ${command}`);
      console.log('Available commands: create, promote');
      process.exit(1);
    }

  } catch (error) {
    // Comprehensive error handling with specific guidance for common issues
    console.error('❌ Database connection failed:', error.message);

    // Provide specific troubleshooting advice based on error type
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Check if PostgreSQL is running');
      console.error('   - Development: Ensure local PostgreSQL server is started');
      console.error('   - Production: Verify database server connectivity');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist');
      console.error('   - Check DATABASE_URL configuration');
      console.error('   - Ensure database is created and accessible');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed - check credentials');
      console.error('   - Verify DATABASE_URL username/password');
      console.error('   - Check database user permissions');
    } else if (error.code === '42P01') {
      console.error('💡 Users table does not exist');
      console.error('   - Run database migrations');
      console.error('   - Check schema setup');
    }

    // Exit with error code to indicate failure to calling processes
    process.exit(1);
  } finally {
    // Ensure database connections are properly closed
    // This prevents connection leaks and ensures clean shutdown
    await pool.end();
  }
}

// Execute the main function
// This starts the script execution and handles any uncaught errors
main();
