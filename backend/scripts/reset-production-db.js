#!/usr/bin/env node

/**
 * Safe Production Database Reset Script
 * This will drop and recreate the production database
 * 
 * Usage: node reset-production-db.js
 */

const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let config;
let dbName;

try {
    const url = new URL(process.env.DATABASE_URL);
    dbName = url.pathname.substring(1);
    config.host = url.hostname;
    config.port = parseInt(url.port || '5432');
    config.user = url.username;
    config.password = url.password;
    // Keep config.database as 'postgres'
} catch (e) {
    console.warn('Failed to parse DATABASE_URL, falling back to individual variables');
}

async function resetDatabase() {
    console.log('\n⚠️  WARNING: This will DROP the entire production database!');
    console.log('⚠️  All data will be LOST!\n');
    console.log('📋 Database Configuration:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${config.user}\n`);

    rl.question('Type \'YES I UNDERSTAND\' to continue: ', async (answer) => {
        if (answer !== 'YES I UNDERSTAND') {
            console.log('❌ Aborted');
            rl.close();
            process.exit(0);
        }

        const pool = new Pool(config);

        try {
            console.log('\n1️⃣  Terminating active connections...');
            await pool.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid();
      `, [dbName]);

            console.log('2️⃣  Dropping database...');
            await pool.query(`DROP DATABASE IF EXISTS ${dbName}`);

            console.log('3️⃣  Creating database...');
            await pool.query(`CREATE DATABASE ${dbName}`);

            await pool.end();

            // Connect to the new database to enable extensions
            const newPool = new Pool({
                ...config,
                database: dbName
            });

            console.log('4️⃣  Enabling PostGIS extension...');
            await newPool.query('CREATE EXTENSION IF NOT EXISTS postgis');
            await newPool.query('CREATE EXTENSION IF NOT EXISTS postgis_topology');

            await newPool.end();

            console.log('\n✅ Database reset complete!');
            console.log('\n📝 Next steps:');
            console.log('   1. Restart your backend server');
            console.log('   2. The database schema will be created automatically on startup');
            console.log('   3. Run migrations if needed');
            console.log('   4. Create admin user: node scripts/promote-to-admin.js <email>\n');

        } catch (error) {
            console.error('\n❌ Error:', error.message);
            process.exit(1);
        } finally {
            rl.close();
        }
    });
}

resetDatabase();
