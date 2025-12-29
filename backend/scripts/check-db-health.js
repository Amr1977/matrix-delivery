#!/usr/bin/env node

/**
 * Simple database health check script
 * Run this to verify database connectivity and table existence
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load production environment
dotenv.config({ path: '.env.production' });

console.log('🔍 Database Health Check');
console.log('========================\n');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
});

async function checkDatabase() {
  try {
    console.log('1. Testing basic connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');

    console.log('\n2. Testing basic query...');
    const result = await client.query('SELECT version()');
    console.log('✅ Query execution successful');
    console.log(`📋 PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);

    console.log('\n3. Checking required tables...');
    const requiredTables = [
      'users', 'orders', 'bids', 'notifications', 'reviews',
      'payments', 'driver_locations', 'location_updates'
    ];

    for (const table of requiredTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`✅ ${table}: ${count} records`);
      } catch (error) {
        console.log(`❌ ${table}: Table missing or error - ${error.message}`);
      }
    }

    console.log('\n4. Testing user creation (if no users exist)...');
    const userCountResult = await client.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountResult.rows[0].count);

    if (userCount === 0) {
      console.log('⚠️  No users found - this might cause authentication issues');
      console.log('💡 Consider running database seeding or migration scripts');
    } else {
      console.log(`✅ Found ${userCount} users in database`);
    }

    console.log('\n5. Testing recent activity...');
    const recentOrders = await client.query(
      'SELECT COUNT(*) as count FROM orders WHERE created_at > NOW() - INTERVAL \'1 day\''
    );
    const recentOrderCount = parseInt(recentOrders.rows[0].count);
    console.log(`📊 Orders created in last 24h: ${recentOrderCount}`);

    client.release();

    console.log('\n========================');
    console.log('✅ Database health check completed successfully');
    console.log('💡 If all checks pass but PM2 still shows errors, the issue is likely in the server startup code');

    process.exit(0);

  } catch (error) {
    console.log('\n========================');
    console.log('❌ Database health check failed');
    console.log(`Error: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.log('💡 PostgreSQL server is not running or not accessible');
      console.log('   - Check if PostgreSQL service is running: sudo systemctl status postgresql');
      console.log('   - Check if PostgreSQL is listening on the correct port: sudo netstat -tlnp | grep 5432');
    } else if (error.code === '42P01') {
      console.log('💡 Database or table does not exist');
      console.log('   - Check database name in .env.production');
      console.log('   - Run database migration scripts if available');
    } else if (error.code === '28000') {
      console.log('💡 Authentication failed - check database credentials');
      console.log('   - Verify DB_USER and DB_PASSWORD in .env.production');
      console.log('   - Check if user has access to the database');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Database host not found');
      console.log('   - Check DB_HOST in .env.production');
      console.log('   - Verify network connectivity to database server');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDatabase();
