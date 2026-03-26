const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load test env
dotenv.config({ path: path.join(__dirname, '../../backend/.env.testing') });

// Configuration
let dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || "5433"),
    database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
};

if (process.env.DATABASE_URL) {
    try {
        const url = new URL(process.env.DATABASE_URL);
        dbConfig = {
            host: url.hostname,
            port: url.port || 5432,
            database: url.pathname.substring(1),
            user: url.username,
            password: url.password,
        };
    } catch (e) {
        console.warn('Failed to parse DATABASE_URL, falling back to individual variables');
    }
}

const adminConfig = {
    ...dbConfig,
    database: 'postgres' // Connect to default DB to create test DB
};

async function setupDB() {
    console.log('🔧 Setting up Test Database...');
    console.log(`   Target: ${dbConfig.database}`);

    // 1. Create DB if not exists
    const adminPool = new Pool(adminConfig);
    try {
        const res = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname='${dbConfig.database}'`);
        if (res.rowCount === 0) {
            console.log('   Creating database...');
            await adminPool.query(`CREATE DATABASE "${dbConfig.database}"`);
            console.log('   ✅ Database created.');
        } else {
            console.log('   ℹ️  Database already exists.');
        }
    } catch (e) {
        console.error('   ❌ Error checking/creating DB:', e.message);
        process.exit(1);
    } finally {
        await adminPool.end();
    }

    // 2. Apply Schema
    const pool = new Pool(dbConfig);
    try {
        console.log('   Applying schema...');
        const schemaPath = path.join(__dirname, '../../backend/migrations/test_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schemaSql);
        console.log('   ✅ Schema applied successfully.');

    } catch (e) {
        console.error('   ❌ Error applying schema:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }

    console.log('🎉 Test Database Setup Complete!\n');
}

setupDB();
