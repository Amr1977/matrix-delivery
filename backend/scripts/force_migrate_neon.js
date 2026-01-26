const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');

// Robust .env loading
const envPath = path.join(__dirname, '../.env.production');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    console.warn(`[WARN] .env.production not found at ${envPath}`);
}

const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`)
};

const migrationsDir = path.join(__dirname, '..', 'migrations');
const migrationsTable = 'schema_migrations';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Neon requires SSL
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

function getMigrationFiles() {
    try {
        if (!fs.existsSync(migrationsDir)) {
            logger.warn(`Migrations directory not found: ${migrationsDir}`);
            return [];
        }

        return fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql') && !file.includes('test_schema') && !file.includes('dev_orders_schema'))
            .sort();
    } catch (error) {
        logger.error(`Failed to read migration files: ${error.message}`);
        return [];
    }
}

function calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function isAlreadyExistsError(error) {
    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('already exists') ||
           errorMessage.includes('duplicate key') ||
           errorMessage.includes('relation already exists') ||
           errorMessage.includes('column already exists') ||
           errorMessage.includes('constraint already exists') ||
           errorMessage.includes('index already exists');
}

async function forceApplyMigration(migrationFile) {
    const migrationPath = path.join(migrationsDir, migrationFile);
    const startTime = Date.now();

    try {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        const checksum = calculateChecksum(migrationSQL);

        logger.info(`🔄 Force applying migration: ${migrationFile}`);

        await pool.query('BEGIN');

        try {
            await pool.query(migrationSQL);

            const executionTime = Date.now() - startTime;
            await pool.query(
                `INSERT INTO ${migrationsTable} (migration_name, checksum, execution_time_ms)
        VALUES($1, $2, $3)
        ON CONFLICT (migration_name) DO UPDATE SET
            checksum = EXCLUDED.checksum,
            execution_time_ms = EXCLUDED.execution_time_ms,
            applied_at = CURRENT_TIMESTAMP`,
                [migrationFile, checksum, executionTime]
            );

            await pool.query('COMMIT');

            logger.info(`✅ Migration force applied successfully: ${migrationFile} (${executionTime}ms)`);
            return { success: true, executionTime };
        } catch (error) {
            await pool.query('ROLLBACK');

            if (isAlreadyExistsError(error)) {
                logger.warn(`⚠️ Skipped redundant migration: ${migrationFile} (Object already exists)`);

                try {
                    const executionTime = Date.now() - startTime;
                    await pool.query(
                        `INSERT INTO ${migrationsTable} (migration_name, checksum, execution_time_ms)
              VALUES($1, $2, $3)
              ON CONFLICT (migration_name) DO UPDATE SET
                  checksum = EXCLUDED.checksum,
                  execution_time_ms = EXCLUDED.execution_time_ms,
                  applied_at = CURRENT_TIMESTAMP`,
                        [migrationFile, checksum, executionTime]
                    );
                    return { success: true, skipped: true, executionTime };
                } catch (err) {
                    logger.warn(`Failed to mark skipped migration as applied: ${err.message}`);
                    return { success: false, error: err.message };
                }
            } else {
                throw error;
            }
        }
    } catch (error) {
        logger.error(`❌ Migration failed: ${migrationFile} - ${error.message}`);
        throw error;
    }
}

async function forceRunAllMigrations() {
    try {
        logger.info(`🔗 Connecting to Neon database...`);

        await initializeMigrationsTable();

        const availableMigrations = getMigrationFiles();

        if (availableMigrations.length === 0) {
            logger.info('❌ No migration files found');
            return;
        }

        logger.info(`📋 Found ${availableMigrations.length} migration file(s) - forcing all`);

        let successCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const migration of availableMigrations) {
            try {
                const result = await forceApplyMigration(migration);
                if (result.success) {
                    if (result.skipped) {
                        skippedCount++;
                    } else {
                        successCount++;
                    }
                }
            } catch (error) {
                failedCount++;
                logger.error(`Migration failed, continuing with next: ${migration} - ${error.message}`);
            }
        }

        logger.info(`✅ Force migration complete:`);
        logger.info(`   - Applied: ${successCount}`);
        logger.info(`   - Skipped (already exists): ${skippedCount}`);
        logger.info(`   - Failed: ${failedCount}`);

        if (failedCount > 0) {
            logger.warn(`⚠️ ${failedCount} migrations failed - check logs above`);
            process.exit(1);
        }

    } catch (error) {
        logger.error(`Force migration process failed: ${error.message}`);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

forceRunAllMigrations();