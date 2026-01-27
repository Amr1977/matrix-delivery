const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`)
};

const migrationsDir = path.join(__dirname, '..', 'migrations');
const schemaFile = path.join(migrationsDir, 'test_schema.sql');
const migrationsTable = 'schema_migrations';

const poolConfig = { connectionString: process.env.DATABASE_URL };
const pool = new Pool(poolConfig);

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

async function runBaseSchema() {
    if (!fs.existsSync(schemaFile)) {
        throw new Error(`Base schema file not found: ${schemaFile}`);
    }

    logger.info(`Reading base schema from: ${schemaFile}`);
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');

    logger.info('Running base schema...');

    try {
        await pool.query(schemaSql);
        logger.info('✅ Base schema applied successfully');
    } catch (error) {
        logger.error(`Failed to apply base schema: ${error.message}`);
        throw error;
    }
}

const crypto = require('crypto');

async function getAppliedMigrations() {
    try {
        const result = await pool.query(
            `SELECT migration_name FROM ${migrationsTable} ORDER BY id ASC`
        );
        return result.rows.map(row => row.migration_name);
    } catch (error) {
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
            .filter(file => file.endsWith('.sql') && file !== 'test_schema.sql' && file !== 'dev_orders_schema.sql')
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
        // Check for "already exists" errors (Postgres codes: 42P07 for table, 42701 for column, 42P06 for schema, 42710 for constraint)
        const isAlreadyExistsError =
            error.code === '42P07' ||
            error.code === '42701' ||
            error.code === '42710' ||
            error.message.includes('already exists');

        if (isAlreadyExistsError) {
            logger.warn(`⚠️ Skipped redundant migration: ${migrationFile} (Object already exists)`);

            try {
                const migrationPath = path.join(migrationsDir, migrationFile);
                const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
                const checksum = calculateChecksum(migrationSQL);

                await pool.query(
                    `INSERT INTO ${migrationsTable} (migration_name, checksum, execution_time_ms)
                     VALUES($1, $2, $3)
                     ON CONFLICT (migration_name) DO NOTHING`,
                    [migrationFile, checksum, 0]
                );
            } catch (err) {
                logger.warn(`Failed to mark skipped migration as applied: ${err.message}`);
            }
            return { success: true, skipped: true };
        }

        logger.error(`❌ Migration failed: ${migrationFile} - ${error.message}`);
        throw error;
    }
}

async function main() {
    try {
        logger.info(`Connecting to database: ${process.env.DATABASE_URL}`);

        // Check if users table exists (more reliable than just any table)
        const tablesResult = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        `);

        if (tablesResult.rows.length === 0) {
            logger.info('Users table missing. Running base schema...');
            await runBaseSchema();
        } else {
            logger.info(`Users table found. Skipping base schema.`);
        }

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
                logger.error(`Migration failed, stopping: ${migration}`);
                throw error;
            }
        }

        logger.info(`✅ Successfully applied ${successCount} migration(s)`);
    } catch (error) {
        logger.error(`Setup process failed: ${error.message}`);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
