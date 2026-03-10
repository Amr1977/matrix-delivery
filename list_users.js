const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' });

// Use DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:***REDACTED***@localhost:5432/matrix_delivery_develop';

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

    // Get table structure first
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 USERS TABLE STRUCTURE:');
    console.log('Column Name'.padEnd(25), 'Data Type'.padEnd(15), 'Nullable');
    console.log('-'.repeat(60));
    schemaResult.rows.forEach(col => {
      console.log(
        col.column_name.padEnd(25),
        col.data_type.padEnd(15),
        col.is_nullable
      );
    });

    // Get user count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
    const totalUsers = countResult.rows[0].total;
    console.log(`\n👥 Total users: ${totalUsers}`);

    if (totalUsers > 0) {
      // Get first 20 users
      const limit = Math.min(20, totalUsers);
      const usersResult = await pool.query(`
        SELECT id, email, first_name, last_name, phone, primary_role, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      console.log(`\n📋 First ${limit} users (most recent):`);
      console.log('ID'.padStart(3), 'Email'.padEnd(30), 'Name'.padEnd(20), 'Phone'.padEnd(15), 'Role'.padEnd(10), 'Created');
      console.log('-'.repeat(100));

      usersResult.rows.forEach(user => {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        const created = new Date(user.created_at).toLocaleDateString();
        console.log(
          String(user.id).padStart(3),
          (user.email || '').padEnd(30),
          name.padEnd(20),
          (user.phone || '').padEnd(15),
          (user.primary_role || '').padEnd(10),
          created
        );
      });

      if (totalUsers > limit) {
        console.log(`\n... and ${totalUsers - limit} more users`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

listUsers();
