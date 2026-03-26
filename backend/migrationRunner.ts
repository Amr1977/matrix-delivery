import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';
import logger from './config/logger';

interface MigrationResult {
    success: boolean;
    executionTime: number;
}

interface MigrationStatus {
    total: number;
    applied: number;
    pending: number;
    appliedList: string[];
    pendingList: string[];
}

interface MigrationRunResult {
    applied: number;
    skipped: number;
}

/**
 * Database Migration Runner
 * Automatically applies pending migrations on server startup
 * Tracks applied migrations in a meta table
 */
export class MigrationRunner {
    private pool: Pool;
    private migrationsDir: string;
    private migrationsTable: string;
    private migrationLockNamespace: number;
    private migrationLockKey: number;

    constructor(pool: Pool) {
        this.pool = pool;
        this.migrationsDir = path.join(__dirname, 'migrations');
        this.migrationsTable = 'public.schema_migrations';
        this.migrationLockNamespace = 98765;
        this.migrationLockKey = 43210;
    }

    private isAlreadyExistsError(error: unknown): boolean {
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
        return errorMessage.includes('already exists') ||
            errorMessage.includes('duplicate key value violates unique constraint') ||
            errorMessage.includes('relation "') && errorMessage.includes('" already exists') ||
            errorMessage.includes('index "') && errorMessage.includes('" already exists') ||
            errorMessage.includes('column "') && errorMessage.includes('" already exists') ||
            errorMessage.includes('constraint "') && errorMessage.includes('" already exists');
    }

    private async recordMigration(
        migrationFile: string,
        checksum: string,
        executionTime: number,
        client?: PoolClient
    ): Promise<void> {
        const executor = client ?? this.pool;

        await executor.query(
            `INSERT INTO ${this.migrationsTable} (migration_name, checksum, execution_time_ms)
             VALUES($1, $2, $3)
             ON CONFLICT (migration_name) DO UPDATE SET
                 checksum = EXCLUDED.checksum,
                 execution_time_ms = EXCLUDED.execution_time_ms,
                 applied_at = CURRENT_TIMESTAMP`,
            [migrationFile, checksum, executionTime]
        );
    }

    private async withMigrationLock<T>(operation: () => Promise<T>): Promise<T> {
        const lockClient = await this.pool.connect();

        try {
            logger.info('🔒 Waiting for migration lock...');
            await lockClient.query(
                'SELECT pg_advisory_lock($1, $2)',
                [this.migrationLockNamespace, this.migrationLockKey]
            );
            logger.info('🔒 Migration lock acquired');
            return await operation();
        } finally {
            try {
                await lockClient.query(
                    'SELECT pg_advisory_unlock($1, $2)',
                    [this.migrationLockNamespace, this.migrationLockKey]
                );
                logger.info('🔓 Migration lock released');
            } catch (unlockError) {
                const errorMessage = unlockError instanceof Error ? unlockError.message : 'Unknown error';
                logger.error(`Failed to release migration lock: ${errorMessage}`);
            } finally {
                lockClient.release();
            }
        }
    }

    /**
     * Initialize migrations table if it doesn't exist
     */
    async initializeMigrationsTable(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_migration_name ON ${this.migrationsTable}(migration_name);
    `;

        try {
            await this.pool.query(query);
            logger.info('Migrations table initialized');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to initialize migrations table: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get list of applied migrations from database
     */
    async getAppliedMigrations(): Promise<string[]> {
        try {
            const result = await this.pool.query<{ migration_name: string }>(
                `SELECT migration_name FROM ${this.migrationsTable} ORDER BY id ASC`
            );
            return result.rows.map(row => row.migration_name);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to get applied migrations: ${errorMessage}`, error);
            return [];
        }
    }

    /**
     * Get list of migration files from migrations directory
     */
    getMigrationFiles(): string[] {
        try {
            if (!fs.existsSync(this.migrationsDir)) {
                logger.warn(`Migrations directory not found: ${this.migrationsDir} `);
                return [];
            }

            const files = fs.readdirSync(this.migrationsDir)
                .filter(file => file.endsWith('.sql') && file !== 'test_schema.sql' && file !== 'dev_orders_schema.sql')
                .sort(); // Alphabetical order ensures chronological execution

            return files;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to read migration files: ${errorMessage} `);
            return [];
        }
    }

    /**
     * Calculate checksum for migration file (for integrity verification)
     */
    private calculateChecksum(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Apply a single migration
     */
    async applyMigration(migrationFile: string): Promise<MigrationResult> {
        const migrationPath = path.join(this.migrationsDir, migrationFile);
        const startTime = Date.now();
        const client = await this.pool.connect();

        try {
            // Read migration file
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            const checksum = this.calculateChecksum(migrationSQL);

            logger.info(`Applying migration: ${migrationFile} `);

            // Begin transaction
            await client.query('BEGIN');

            try {
                // Execute migration SQL
                await client.query(migrationSQL);

                // Record migration in tracking table
                const executionTime = Date.now() - startTime;
                await this.recordMigration(migrationFile, checksum, executionTime, client);

                // Commit transaction
                await client.query('COMMIT');

                logger.info(`✅ Migration applied successfully: ${migrationFile} (${executionTime}ms)`);
                return { success: true, executionTime };
            } catch (error) {
                // Rollback on error
                await client.query('ROLLBACK');

                if (this.isAlreadyExistsError(error)) {
                    const executionTime = Date.now() - startTime;
                    await this.recordMigration(migrationFile, checksum, executionTime);
                    logger.warn(`⚠️ Migration marked as applied (objects already exist): ${migrationFile}`);
                    return { success: true, executionTime };
                }

                throw error;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`❌ Migration failed: ${migrationFile} - ${errorMessage} `);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Run all pending migrations
     */
    async runPendingMigrations(): Promise<MigrationRunResult> {
        return this.withMigrationLock(async () => {
            try {
                logger.info('🔄 Checking for pending migrations...');

                // Initialize migrations table
                await this.initializeMigrationsTable();

                // Get applied and available migrations (after lock acquisition)
                const appliedMigrations = await this.getAppliedMigrations();
                const availableMigrations = this.getMigrationFiles();

                // Find pending migrations
                const pendingMigrations = availableMigrations.filter(
                    migration => !appliedMigrations.includes(migration)
                );

                if (pendingMigrations.length === 0) {
                    logger.info('✅ No pending migrations - database is up to date');
                    return { applied: 0, skipped: appliedMigrations.length };
                }

                logger.info(`📋 Found ${pendingMigrations.length} pending migration(s)`);

                // Apply each pending migration
                let successCount = 0;
                for (const migration of pendingMigrations) {
                    try {
                        await this.applyMigration(migration);
                        successCount++;
                    } catch (error) {
                        logger.error(`Migration failed, continuing with next migration: ${migration} `);
                    }
                }

                logger.info(`✅ Successfully applied ${successCount} migration(s)`);
                return { applied: successCount, skipped: appliedMigrations.length };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Migration process failed: ${errorMessage} `);
                throw error;
            }
        });
    }

    /**
     * Get migration status (for debugging/monitoring)
     */
    async getMigrationStatus(): Promise<MigrationStatus> {
        try {
            const appliedMigrations = await this.getAppliedMigrations();
            const availableMigrations = this.getMigrationFiles();
            const pendingMigrations = availableMigrations.filter(
                migration => !appliedMigrations.includes(migration)
            );

            return {
                total: availableMigrations.length,
                applied: appliedMigrations.length,
                pending: pendingMigrations.length,
                appliedList: appliedMigrations,
                pendingList: pendingMigrations
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to get migration status: ${errorMessage} `);
            throw error;
        }
    }
}

/**
 * Run migrations on server startup
 */
export async function runMigrationsOnStartup(pool: Pool): Promise<MigrationRunResult> {
    const runner = new MigrationRunner(pool);

    try {
        const result = await runner.runPendingMigrations();
        return result;
    } catch (error) {
        logger.error('Failed to run migrations on startup');
        // Don't crash the server, but log the error
        // In production, you might want to prevent server start if migrations fail
        if (process.env.NODE_ENV === 'production') {
            logger.error('CRITICAL: Migrations failed in production - server may not function correctly');
        }
        throw error;
    }
}

/**
 * Get migration status endpoint handler
 */
export async function getMigrationStatusHandler(pool: Pool): Promise<MigrationStatus> {
    const runner = new MigrationRunner(pool);
    return await runner.getMigrationStatus();
}
