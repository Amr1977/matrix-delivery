const { Pool } = require('pg');

// Load local environment variables
require('dotenv').config({ path: '../.env' });

const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
};

async function listDatabases() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: 'postgres', // Connect to default postgres database
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
    });

    try {
        logger.info('Connecting to local PostgreSQL...');
        const client = await pool.connect();
        logger.info('✅ Connected successfully');

        // List all databases
        const result = await client.query(`
            SELECT datname, encoding, datcollate, datctype
            FROM pg_database
            WHERE datistemplate = false
            ORDER BY datname
        `);

        logger.info('\n📋 Local Databases:');
        logger.info('==================');

        result.rows.forEach(db => {
            logger.info(`- ${db.datname} (encoding: ${db.encoding}, collate: ${db.datcollate})`);
        });

        // Show current database size info
        logger.info('\n📊 Database Sizes:');
        logger.info('==================');

        for (const db of result.rows) {
            try {
                const sizeResult = await client.query(`
                    SELECT pg_size_pretty(pg_database_size($1)) as size
                `, [db.datname]);

                logger.info(`- ${db.datname}: ${sizeResult.rows[0].size}`);
            } catch (error) {
                logger.info(`- ${db.datname}: Unable to get size (${error.message})`);
            }
        }

        client.release();
    } catch (error) {
        logger.error(`Failed to list databases: ${error.message}`);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

listDatabases();