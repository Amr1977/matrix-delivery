const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'be_the_one',
});

async function verifyUserByEmail(email) {
  const client = await pool.connect();

  try {
    console.log(`Verifying user: ${email}`);

    // First check if user exists and current status
    const checkResult = await client.query(`
      SELECT id, name, email, role, is_verified, created_at
      FROM users
      WHERE email = $1
    `, [email]);

    if (checkResult.rows.length === 0) {
      console.log('❌ User not found in database');
      return false;
    }

    const user = checkResult.rows[0];
    console.log('\n👤 Current User Status:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Verified: ${user.is_verified ? '✅ YES' : '❌ NO'}`);

    if (user.is_verified) {
      console.log('\n⚠️  User is already verified!');
      return true;
    }

    // Update the verification status
    console.log('\n🔄 Updating verification status...');
    const updateResult = await client.query(`
      UPDATE users
      SET is_verified = true
      WHERE email = $1
    `, [email]);

    if (updateResult.rowCount > 0) {
      console.log('✅ User verification successful!');

      // Verify the update
      const verifyResult = await client.query(`
        SELECT id, name, email, role, is_verified, created_at
        FROM users
        WHERE email = $1
      `, [email]);

      if (verifyResult.rows.length > 0) {
        const updatedUser = verifyResult.rows[0];
        console.log('\n🎉 Verification Complete!');
        console.log(`   Name: ${updatedUser.name}`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Role: ${updatedUser.role}`);
        console.log(`   Verified: ${updatedUser.is_verified ? '✅ YES' : '❌ NO'}`);
        console.log(`   Joined: ${new Date(updatedUser.created_at).toLocaleDateString()}`);

        return true;
      }
    } else {
      console.log('❌ Failed to update user verification status');
      return false;
    }

  } catch (error) {
    console.error('Error verifying user:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node verify-user.js <email>');
  console.log('Example: node verify-user.js amr@driver.com');
  process.exit(1);
}

verifyUserByEmail(email)
  .then((success) => {
    if (success) {
      console.log(`\n✅ ${email} has been successfully verified!`);
      console.log('The user will now see the green "Verified" badge in the Matrix Delivery app.');
    } else {
      console.log(`\n❌ Failed to verify ${email}`);
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });
