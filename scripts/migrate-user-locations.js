const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'be_the_one',
  database: process.env.DB_NAME || 'matrix_delivery',
  port: process.env.DB_PORT || 5432,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function migrateUserLocations() {
  let client;

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    client = await pool.connect();

    console.log('📊 Checking existing users without location data...');

    // Check how many users need migration
    const countResult = await client.query(`
      SELECT COUNT(*) as count FROM users
      WHERE country IS NULL OR city IS NULL
    `);

    const usersToMigrate = parseInt(countResult.rows[0].count);
    console.log(`👥 Found ${usersToMigrate} users that need location data migration`);

    if (usersToMigrate === 0) {
      console.log('✅ All users already have location data. Migration not needed.');
      return;
    }

    console.log('🏛️ Updating existing users with default location data...');

    // Update existing users with default location data
    const updateResult = await client.query(`
      UPDATE users
      SET country = 'Egypt',
          city = 'Cairo',
          area = 'Unknown'
      WHERE country IS NULL OR city IS NULL
    `);

    console.log(`✅ Successfully updated ${updateResult.rowCount} users with default location data`);

    // Verify the migration
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count FROM users
      WHERE country IS NULL OR city IS NULL
    `);

    const remainingUsers = parseInt(verifyResult.rows[0].count);

    if (remainingUsers === 0) {
      console.log('🎉 Migration completed successfully! All users now have location data.');
    } else {
      console.log(`⚠️ Warning: ${remainingUsers} users still don't have location data.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
      console.log('🔌 Database connection released.');
    }
    await pool.end();
  }
}

// Run the migration
console.log('🚀 Starting user location migration...');
migrateUserLocations().catch(error => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});
