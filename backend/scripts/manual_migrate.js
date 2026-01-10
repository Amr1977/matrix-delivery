const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`)
};

const migrationsDir = path.join(__dirname, '..', 'migrations');
const migrationsTable = 'schema_migrations';

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function initializeMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${migrationsTable} (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_migration_name ON ${migrationsTable}(migration_name);
    `;

    try {
        await pool.query(query);
        logger.info('Migrations table initialized');
    } catch (error) {
        logger.error(`Failed to initialize migrations table: ${error.message}`);
        throw error;
    }
}

async function getAppliedMigrations() {
    try {
        const result = await pool.query(
            `SELECT migration_name FROM ${migrationsTable} ORDER BY id ASC`
        );
        return result.rows.map(row => row.migration_name);
    } catch (error) {
        logger.error(`Failed to get applied migrations: ${error.message}`);
        return [];
    }
}

function getMigrationFiles() {
    try {
        if (!fs.existsSync(migrationsDir)) {
            logger.warn(`Migrations directory not found: ${migrationsDir}`);
            return [];
        }

        return fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
    } catch (error) {
        logger.error(`Failed to read migration files: ${error.message}`);
        return [];
    }
}

function calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function applyMigration(migrationFile) {
    const migrationPath = path.join(migrationsDir, migrationFile);
    const startTime = Date.now();

    try {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        const checksum = calculateChecksum(migrationSQL);

        logger.info(`Applying migration: ${migrationFile}`);

        await pool.query('BEGIN');

        try {
            await pool.query(migrationSQL);

            const executionTime = Date.now() - startTime;
            await pool.query(
                `INSERT INTO ${migrationsTable} (migration_name, checksum, execution_time_ms)
        VALUES($1, $2, $3)`,
                [migrationFile, checksum, executionTime]
            );

            await pool.query('COMMIT');

            logger.info(`✅ Migration applied successfully: ${migrationFile} (${executionTime}ms)`);
            return { success: true, executionTime };
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        logger.error(`❌ Migration failed: ${migrationFile} - ${error.message}`);
        throw error;
    }
}

async function runPendingMigrations() {
    try {
        logger.info(`Connecting to database: ${process.env.DB_NAME} as ${process.env.DB_USER}`);

        await initializeMigrationsTable();

        const appliedMigrations = await getAppliedMigrations();
        const availableMigrations = getMigrationFiles();

        const pendingMigrations = availableMigrations.filter(
            migration => !appliedMigrations.includes(migration)
        );

        if (pendingMigrations.length === 0) {
            logger.info('✅ No pending migrations - database is up to date');
            return;
        }

        logger.info(`📋 Found ${pendingMigrations.length} pending migration(s)`);

        let successCount = 0;
        for (const migration of pendingMigrations) {
            try {
                await applyMigration(migration);
                successCount++;
            } catch (error) {
                logger.error(`Migration failed, stopping migration process: ${migration}`);
                throw error;
            }
        }

        logger.info(`✅ Successfully applied ${successCount} migration(s)`);
    } catch (error) {
        logger.error(`Migration process failed: ${error.message}`);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runPendingMigrations();
