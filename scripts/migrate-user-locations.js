const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'be_the_one',
  database: process.env.DB_NAME || 'matrix_delivery',
  port: process.env.DB_PORT || 3306
};

async function migrateUserLocations() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);

    console.log('📊 Checking existing users without location data...');

    // Check how many users need migration
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count FROM users
      WHERE country IS NULL OR city IS NULL
    `);

    const usersToMigrate = rows[0].count;
    console.log(`👥 Found ${usersToMigrate} users that need location data migration`);

    if (usersToMigrate === 0) {
      console.log('✅ All users already have location data. Migration not needed.');
      return;
    }

    console.log('🏛️ Updating existing users with default location data...');

    // Update existing users with default location data
    const [updateResult] = await connection.execute(`
      UPDATE users
      SET country = 'Egypt',
          city = 'Cairo',
          area = 'Unknown'
      WHERE country IS NULL OR city IS NULL
    `);

    console.log(`✅ Successfully updated ${updateResult.affectedRows} users with default location data`);

    // Verify the migration
    const [verifyRows] = await connection.execute(`
      SELECT COUNT(*) as count FROM users
      WHERE country IS NULL OR city IS NULL
    `);

    const remainingUsers = verifyRows[0].count;

    if (remainingUsers === 0) {
      console.log('🎉 Migration completed successfully! All users now have location data.');
    } else {
      console.log(`⚠️ Warning: ${remainingUsers} users still don't have location data.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the migration
console.log('🚀 Starting user location migration...');
migrateUserLocations().catch(error => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});
