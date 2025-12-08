#!/usr/bin/env node
/**
 * Direct SQL Migration for Test Database
 * Runs the migration SQL directly without using the migration module
 */

// Force test environment
process.env.NODE_ENV = 'test';

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load test environment with absolute path
const envPath = path.join(__dirname, '../backend/.env.testing');
console.log(`Loading environment from: ${envPath}\n`);
dotenv.config({ path: envPath });

console.log('🔄 Running Migration on Test Database\n');
console.log(`${'='.repeat(80)}\n`);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('Connected to test database\n');

        // Check current schema
        const columnsCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('role', 'roles', 'primary_role', 'granted_roles')
      ORDER BY column_name
    `);

        console.log('Current columns:');
        columnsCheck.rows.forEach(row => console.log(`  - ${row.column_name}`));
        console.log('');

        const hasOldSchema = columnsCheck.rows.some(r => r.column_name === 'role');
        const hasNewSchema = columnsCheck.rows.some(r => r.column_name === 'primary_role');

        if (hasNewSchema) {
            console.log('✅ Migration already applied!\n');
            client.release();
            await pool.end();
            process.exit(0);
            return;
        }

        if (!hasOldSchema) {
            console.error('❌ Neither old nor new schema found. Database may be empty.\n');
            client.release();
            await pool.end();
            process.exit(1);
            return;
        }

        console.log('Starting migration...\n');

        await client.query('BEGIN');

        // Step 1: Rename role to primary_role
        console.log('Step 1: Renaming role → primary_role...');
        await client.query('ALTER TABLE users RENAME COLUMN role TO primary_role');
        console.log('✅ Done\n');

        // Step 2: Rename roles to granted_roles
        console.log('Step 2: Renaming roles → granted_roles...');
        await client.query('ALTER TABLE users RENAME COLUMN roles TO granted_roles');
        console.log('✅ Done\n');

        // Step 3: Ensure primary_role is in granted_roles
        console.log('Step 3: Ensuring primary_role is in granted_roles...');
        await client.query(`
      UPDATE users 
      SET granted_roles = array_append(granted_roles, primary_role)
      WHERE NOT (primary_role = ANY(granted_roles))
    `);
        console.log('✅ Done\n');

        // Step 4: Create GIN index
        console.log('Step 4: Creating GIN index on granted_roles...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_granted_roles 
      ON users USING GIN (granted_roles)
    `);
        console.log('✅ Done\n');

        await client.query('COMMIT');

        console.log(`${'='.repeat(80)}`);
        console.log('✅ Migration completed successfully!');
        console.log(`${'='.repeat(80)}\n`);

        // Verify
        const verifyCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('role', 'roles', 'primary_role', 'granted_roles')
      ORDER BY column_name
    `);

        console.log('New columns:');
        verifyCheck.rows.forEach(row => console.log(`  ✅ ${row.column_name}`));
        console.log('');

        client.release();
        await pool.end();
        process.exit(0);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        client.release();
        await pool.end();
        process.exit(1);
    }
}

runMigration();
