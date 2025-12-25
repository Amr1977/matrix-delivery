/**
 * Migration: Rename primary_role columns to primary_role and granted_roles
 * 
 * This migration renames:
 *   primary_role  -> primary_role (active primary_role)
 *   granted_roles -> granted_roles (all granted_roles user can switch to)
 */

const pool = require('../config/db');

async function up() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting migration: rename_role_columns');

        await client.query('BEGIN');

        // Step 1: Create backup table
        console.log('📦 Creating backup table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS users_backup_role_migration AS 
      SELECT * FROM users
    `);
        console.log('✅ Backup created');

        // Step 2: Check if columns already renamed
        const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('primary_role', 'granted_roles', 'primary_role', 'granted_roles')
    `);

        const existingColumns = checkColumns.rows.map(r => r.column_name);

        if (existingColumns.includes('primary_role')) {
            console.log('⚠️  Migration already applied, skipping...');
            await client.query('ROLLBACK');
            return { success: true, alreadyApplied: true };
        }

        // Step 3: Rename columns
        console.log('🔄 Renaming primary_role -> primary_role...');
        await client.query('ALTER TABLE users RENAME COLUMN primary_role TO primary_role');

        console.log('🔄 Renaming granted_roles -> granted_roles...');
        await client.query('ALTER TABLE users RENAME COLUMN granted_roles TO granted_roles');
        console.log('✅ Columns renamed');

        // Step 4: Ensure granted_roles includes primary_role
        console.log('🔄 Ensuring granted_roles includes primary_role...');
        await client.query(`
      UPDATE users 
      SET granted_roles = CASE
          WHEN granted_roles IS NULL THEN ARRAY[primary_role]
          WHEN NOT (primary_role = ANY(granted_roles)) THEN array_append(granted_roles, primary_role)
          ELSE granted_roles
      END
    `);
        console.log('✅ Data integrity ensured');

        // Step 5: Add index
        console.log('🔄 Creating index on granted_roles...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_granted_roles 
      ON users USING GIN(granted_roles)
    `);
        console.log('✅ Index created');

        // Step 6: Add comments
        await client.query(`
      COMMENT ON COLUMN users.primary_role IS 'Currently active primary_role for the user'
    `);
        await client.query(`
      COMMENT ON COLUMN users.granted_roles IS 'Array of all granted_roles the user is granted and can switch to'
    `);

        await client.query('COMMIT');

        // Verification
        console.log('\n📊 Verification:');
        const verifyResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE NOT (primary_role = ANY(granted_roles))) as invalid
      FROM users
    `);

        console.log(`   Total users: ${verifyResult.rows[0].total}`);
        console.log(`   Invalid entries: ${verifyResult.rows[0].invalid}`);

        if (verifyResult.rows[0].invalid > 0) {
            throw new Error('Data integrity check failed!');
        }

        console.log('\n✅ Migration completed successfully!');
        return { success: true };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

async function down() {
    const client = await pool.connect();

    try {
        console.log('🔄 Rolling back migration: rename_role_columns');

        await client.query('BEGIN');

        // Rename back
        console.log('🔄 Renaming primary_role -> primary_role...');
        await client.query('ALTER TABLE users RENAME COLUMN primary_role TO primary_role');

        console.log('🔄 Renaming granted_roles -> granted_roles...');
        await client.query('ALTER TABLE users RENAME COLUMN granted_roles TO granted_roles');

        // Drop index
        console.log('🔄 Dropping index...');
        await client.query('DROP INDEX IF EXISTS idx_users_granted_roles');

        await client.query('COMMIT');

        console.log('✅ Rollback completed successfully!');
        return { success: true };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Rollback failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Run migration if called directly
if (require.main === module) {
    const command = process.argv[2];

    if (command === 'down') {
        down()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else {
        up()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    }
}

module.exports = { up, down };
