const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables for development
dotenv.config({ path: '.env.development' });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:***REDACTED***@localhost:5432/matrix_delivery_develop';

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function promoteToAdmin() {
  try {
    // Get user identifier from command line arguments
    const userIdentifier = process.argv[2];

    if (!userIdentifier) {
      console.log('❌ Usage: node promote_to_admin.js <email_or_user_id>');
      console.log('');
      console.log('Examples:');
      console.log('  node promote_to_admin.js user@example.com');
      console.log('  node promote_to_admin.js 123');
      console.log('');
      console.log('💡 First run: node list_users_enhanced.js to see all users');
      process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    console.log(`📡 Database URL: ${DATABASE_URL.split('@')[1]}`);

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');

    // Try to find user by email first, then by ID
    let userQuery;
    let userParams;

    // Check if input looks like an email
    if (userIdentifier.includes('@')) {
      userQuery = 'SELECT id, email, name, phone, primary_role, granted_roles, is_verified FROM users WHERE email = $1';
      userParams = [userIdentifier];
    } else {
      // Assume it's a user ID
      userQuery = 'SELECT id, email, name, phone, primary_role, granted_roles, is_verified FROM users WHERE id = $1 OR id::text = $2';
      userParams = [userIdentifier, userIdentifier];
    }

    const userResult = await pool.query(userQuery, userParams);

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${userIdentifier}`);
      console.log('');
      console.log('💡 Run: node list_users_enhanced.js to see all users');
      process.exit(1);
    }

    const user = userResult.rows[0];
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'N/A';

    console.log('');
    console.log('👤 USER FOUND:');
    console.log('ID:'.padEnd(15), user.id);
    console.log('Email:'.padEnd(15), user.email);
    console.log('Name:'.padEnd(15), user.name || 'N/A');
    console.log('Current Role:'.padEnd(15), user.primary_role || 'N/A');
    console.log('Granted Roles:'.padEnd(15), Array.isArray(user.granted_roles) ? user.granted_roles.join(', ') : 'N/A');
    console.log('Verified:'.padEnd(15), user.is_verified ? 'Yes' : 'No');

    // Check if user is already admin
    if (user.primary_role === 'admin') {
      console.log('');
      console.log('✅ User is already an admin!');
      process.exit(0);
    }

    // Confirm promotion
    console.log('');
    console.log('⚠️  Are you sure you want to promote this user to admin? (y/N)');
    console.log('This will:');
    console.log('  - Set primary_role to "admin"');
    console.log('  - Add "admin" to granted_roles array');

    // For now, we'll assume yes since this is a script
    // In a real scenario, you'd want user confirmation
    console.log('');
    console.log('🔄 Promoting user to admin...');

    // Update primary_role to admin
    await pool.query(
      'UPDATE users SET primary_role = $1 WHERE id = $2',
      ['admin', user.id]
    );

    // Update granted_roles to include admin
    let currentRoles = Array.isArray(user.granted_roles) ? user.granted_roles : [];
    if (!currentRoles.includes('admin')) {
      currentRoles.push('admin');
    }
    // Also ensure customer and driver roles for flexibility
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

    console.log('✅ User promoted to admin successfully!');
    console.log('');
    console.log('📋 UPDATED USER INFO:');
    console.log('Primary Role:'.padEnd(15), 'admin');
    console.log('Granted Roles:'.padEnd(15), currentRoles.join(', '));

    // Verify the update
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
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Check if PostgreSQL is running on localhost:5432');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Create it first: CREATE DATABASE matrix_delivery_develop;');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Check username/password');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
promoteToAdmin();
