const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'be_the_one',
});

async function checkUserVerification(email) {
  const client = await pool.connect();

  try {
    console.log(`Checking verification status for: ${email}`);

    const result = await client.query(`
      SELECT id, name, email, role, is_verified, created_at
      FROM users
      WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return false;
    }

    const user = result.rows[0];
    console.log('\n👤 User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Verified: ${user.is_verified ? '✅ YES' : '❌ NO'}`);
    console.log(`   Joined: ${new Date(user.created_at).toLocaleDateString()}`);

    return user.is_verified;

  } catch (error) {
    console.error('Error checking user verification:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'amr@driver.com';

checkUserVerification(email)
  .then((isVerified) => {
    console.log(`\n📋 Final Result: ${email} is ${isVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);
    process.exit(isVerified ? 0 : 1);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
