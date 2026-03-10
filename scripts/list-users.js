#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' });

// Use DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:be_the_one@localhost:5432/matrix_delivery_develop';

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function listUsers() {
  try {
    console.log('🔌 Connecting to database...');
    console.log(`📡 Database URL: ${DATABASE_URL.split('@')[1]}`); // Hide credentials

    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');

    // Check if users table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      ) as exists
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Users table does not exist');
      return;
    }

    // Get user count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
    const totalUsers = countResult.rows[0].total;
    console.log(`\n👥 Total users: ${totalUsers}`);

    if (totalUsers > 0) {
      // Get all users with key fields
      const usersResult = await pool.query(`
        SELECT 
          id, 
          email, 
          first_name, 
          last_name, 
          phone, 
          primary_role, 
          is_verified,
          is_active,
          balance,
          created_at
        FROM users
        ORDER BY created_at DESC
      `);

      console.log(`\n📋 ALL USERS (${totalUsers} total):`);
      console.log('ID'.padStart(3), 'Email'.padEnd(30), 'Name'.padEnd(20), 'Phone'.padEnd(15), 'Role'.padEnd(10), 'Verified'.padEnd(9), 'Balance'.padEnd(10), 'Created');
      console.log('-'.repeat(120));

      usersResult.rows.forEach(user => {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A';
        const created = new Date(user.created_at).toLocaleDateString();
        const balance = user.balance ? parseFloat(user.balance).toFixed(2) : '0.00';
        
        console.log(
          String(user.id).padStart(3),
          (user.email || 'N/A').padEnd(30),
          name.padEnd(20),
          (user.phone || 'N/A').padEnd(15),
          (user.primary_role || 'N/A').padEnd(10),
          (user.is_verified ? 'Yes' : 'No').padEnd(9),
          `${balance} EGP`.padEnd(10),
          created
        );
      });

      // Summary statistics
      const statsResult = await pool.query(`
        SELECT 
          primary_role,
          COUNT(*) as count,
          COUNT(CASE WHEN is_verified = true THEN 1 END) as verified,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COALESCE(AVG(balance), 0) as avg_balance
        FROM users
        GROUP BY primary_role
        ORDER BY count DESC
      `);

      console.log('\n📈 USER STATISTICS BY ROLE:');
      console.log('Role'.padEnd(15), 'Total'.padEnd(8), 'Verified'.padEnd(10), 'Active'.padEnd(8), 'Avg Balance');
      console.log('-'.repeat(60));
      
      statsResult.rows.forEach(stat => {
        const avgBalance = parseFloat(stat.avg_balance).toFixed(2);
        console.log(
          (stat.primary_role || 'N/A').padEnd(15),
          String(stat.count).padEnd(8),
          String(stat.verified).padEnd(10),
          String(stat.active).padEnd(8),
          `${avgBalance} EGP`
        );
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Check if PostgreSQL is running on localhost:5432');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Create it first: CREATE DATABASE matrix_delivery_develop;');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Check username/password');
    }
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  listUsers();
}

module.exports = { listUsers };
