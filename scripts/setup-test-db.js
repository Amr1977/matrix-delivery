#!/usr/bin/env node
/**
 * Setup Test Database
 * Creates test database and sets up postgres user password
 */

const { Client } = require('pg');
const dotenv = require('dotenv');

// Load test environment
dotenv.config({ path: '../backend/.env.testing' });

const password = process.env.DB_PASSWORD || 'be_the_one';
const testDbName = process.env.DB_NAME_TEST || 'matrix_delivery_test';

console.log('🔧 Matrix Delivery Test Database Setup\n');
console.log(`${'='.repeat(80)}\n`);

async function setupTestDatabase() {
    // First, connect to default postgres database to create test database
    const adminClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: 'postgres', // Connect to default database
        user: process.env.DB_USER || 'postgres',
        password: password
    });

    try {
        console.log('Step 1: Connecting to PostgreSQL...\n');
        await adminClient.connect();
        console.log('✅ Connected to PostgreSQL\n');

        // Check if test database exists
        console.log(`Step 2: Checking if database '${testDbName}' exists...\n`);
        const dbCheck = await adminClient.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [testDbName]
        );

        if (dbCheck.rows.length === 0) {
            console.log(`Creating database '${testDbName}'...\n`);
            await adminClient.query(`CREATE DATABASE ${testDbName}`);
            console.log(`✅ Database '${testDbName}' created\n`);
        } else {
            console.log(`✅ Database '${testDbName}' already exists\n`);
        }

        await adminClient.end();

        // Now connect to test database and verify
        console.log(`Step 3: Connecting to test database...\n`);
        const testClient = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: testDbName,
            user: process.env.DB_USER || 'postgres',
            password: password
        });

        await testClient.connect();
        console.log('✅ Connected to test database\n');

        // Check if users table exists
        const tableCheck = await testClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

        if (tableCheck.rows.length === 0) {
            console.log('⚠️  Users table does not exist - migration needed\n');
        } else {
            console.log('✅ Users table exists\n');

            // Check columns
            const columnsCheck = await testClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('role', 'roles', 'primary_role', 'granted_roles')
        ORDER BY column_name
      `);

            console.log('Role-related columns:');
            if (columnsCheck.rows.length > 0) {
                columnsCheck.rows.forEach(row => console.log(`  ✅ ${row.column_name}`));
            } else {
                console.log('  ⚠️  No role columns found - migration needed');
            }
            console.log('');
        }

        await testClient.end();

        console.log(`${'='.repeat(80)}`);
        console.log('✅ Test database setup complete!');
        console.log(`${'='.repeat(80)}\n`);
        console.log('Next steps:');
        console.log('  1. Run migration: node scripts/migrate-test-db.js');
        console.log('  2. Run tests: node scripts/run-statistics-tests.js\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('\nError details:', error);

        if (error.message.includes('password authentication failed')) {
            console.error('\n💡 Solution: Update postgres password');
            console.error('   Run in psql as superuser:');
            console.error(`   ALTER USER postgres WITH PASSWORD '${password}';`);
            console.error('\n   Or update .env.testing with your current postgres password\n');
        }

        process.exit(1);
    }
}

setupTestDatabase();
