const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load production environment variables for Neon
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

const logger = {
    info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
    error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`)
};

// Generate a unique database name
const newDbName = `matrix_delivery_local_${Date.now()}`;

async function dropAllObjects(client) {
    logger.info('🗑️  Dropping all existing objects in current database...');

    try {
        // Get all tables
        const tablesResult = await client.query(`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        `);

        // Drop tables in reverse dependency order
        for (const row of tablesResult.rows.reverse()) {
            try {
                await client.query(`DROP TABLE IF EXISTS ${row.tablename} CASCADE`);
                logger.info(`Dropped table: ${row.tablename}`);
            } catch (error) {
                logger.warn(`Could not drop table ${row.tablename}: ${error.message}`);
            }
        }

        // Drop all custom types
        const typesResult = await client.query(`
            SELECT typname FROM pg_type
            WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `);

        for (const row of typesResult.rows) {
            try {
                await client.query(`DROP TYPE IF EXISTS ${row.typname} CASCADE`);
                logger.info(`Dropped type: ${row.typname}`);
            } catch (error) {
                logger.warn(`Could not drop type ${row.typname}: ${error.message}`);
            }
        }

        // Drop all functions
        const functionsResult = await client.query(`
            SELECT proname, oidvectortypes(proargtypes) as argtypes
            FROM pg_proc
            WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `);

        for (const row of functionsResult.rows) {
            try {
                await client.query(`DROP FUNCTION IF EXISTS ${row.proname} CASCADE`);
                logger.info(`Dropped function: ${row.proname}`);
            } catch (error) {
                logger.warn(`Could not drop function ${row.proname}: ${error.message}`);
            }
        }

        // Drop topology schema if it exists
        try {
            await client.query(`DROP SCHEMA IF EXISTS topology CASCADE`);
            logger.info('Dropped topology schema');
        } catch (error) {
            logger.warn(`Could not drop topology schema: ${error.message}`);
        }

        logger.info('✅ Database cleanup completed');
    } catch (error) {
        logger.error(`Failed to cleanup database: ${error.message}`);
        throw error;
    }
}

async function migrateToNeon() {
    const schemaFile = path.join(__dirname, '../../schema_dump_neon_clean.sql'); // Use clean Neon-compatible schema

    if (!fs.existsSync(schemaFile)) {
        logger.error(`Schema file not found: ${schemaFile}`);
        process.exit(1);
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        logger.error('DATABASE_URL not found in environment variables');
        process.exit(1);
    }

    logger.info('🔗 Connecting to current Neon database...');

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false } // Neon requires SSL
    });

    let client;
    try {
        // Get client for current database
        client = await pool.connect();
        logger.info('✅ Connected to Neon database successfully');

        // Drop all existing objects
        await dropAllObjects(client);

        // Create topology schema first (required for PostGIS topology extension)
        logger.info('📐 Creating topology schema for PostGIS...');
        await client.query('CREATE SCHEMA IF NOT EXISTS topology;');

        // Read local schema file
        const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
        logger.info(`📄 Read local schema file (${schemaSQL.length} characters)`);

        // Execute the entire schema as one query (pg_dump format should handle this)
        logger.info('🚀 Applying local schema to Neon database...');

        await client.query(schemaSQL);

        logger.info('🎉 Migration completed successfully!');
        logger.info('📍 Your Neon database now contains your local schema');

        // Verify some key tables exist
        const tables = ['users', 'orders', 'balance_transactions', 'user_balances'];
        for (const table of tables) {
            try {
                const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
                logger.info(`✅ Table '${table}' exists with ${result.rows[0].count} rows`);
            } catch (error) {
                logger.error(`❌ Table '${table}' verification failed: ${error.message}`);
            }
        }

    } catch (error) {
        logger.error(`Migration failed: ${error.message}`);
        logger.error(`Stack: ${error.stack}`);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
        logger.info('Database connection closed');
    }
}

// Run the migration
migrateToNeon().catch(error => {
    logger.error(`Unexpected error: ${error.message}`);
    process.exit(1);
});