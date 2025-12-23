import { Pool } from 'pg';
import { allSchemas } from './schema';
import { DatabaseInitOptions, InitializationResult } from './types';

// Import custom logger
const logger = require('../config/logger');

/**
 * Initialize database schema
 * Creates all tables, indexes, and runs alter statements
 * 
 * @param options - Database initialization options
 * @returns Result of initialization with success status and details
 */
export async function initializeDatabase(
    options: DatabaseInitOptions
): Promise<InitializationResult> {
    const { pool, dropExisting = false, verbose = true } = options;
    const startTime = Date.now();
    const result: InitializationResult = {
        success: true,
        tablesCreated: [],
        indexesCreated: 0,
        errors: [],
        duration: 0
    };

    try {
        if (verbose) {
            logger.info('🔧 Initializing database schema...', { category: 'database' });
        }

        // Drop existing tables if requested (DANGEROUS - only for development)
        if (dropExisting) {
            if (verbose) logger.warn('⚠️  Dropping existing tables...', { category: 'database' });
            for (const schema of [...allSchemas].reverse()) {
                try {
                    await pool.query(`DROP TABLE IF EXISTS ${schema.name} CASCADE`);
                    if (verbose) logger.info(`  Dropped table: ${schema.name}`, { category: 'database' });
                } catch (error) {
                    logger.warn(`Warning: Could not drop table ${schema.name}`, { category: 'database', error });
                }
            }
        }

        // Create tables in dependency order
        if (verbose) logger.info('📋 Creating tables...', { category: 'database' });
        for (const schema of allSchemas) {
            try {
                if (verbose) logger.info(`  Creating table: ${schema.name}`, { category: 'database' });
                await pool.query(schema.createStatement);
                result.tablesCreated.push(schema.name);
            } catch (error) {
                const err = error as Error;
                logger.error(`❌ Failed to create table ${schema.name}`, {
                    category: 'database',
                    error: err.message,
                    stack: err.stack
                });
                result.errors.push(err);
                result.success = false;
            }
        }

        // Run alter statements for existing tables
        if (verbose) logger.info('🔄 Running alter statements...', { category: 'database' });
        for (const schema of allSchemas) {
            if (schema.alterStatements && schema.alterStatements.length > 0) {
                for (const alterStatement of schema.alterStatements) {
                    try {
                        await pool.query(alterStatement);
                    } catch (error) {
                        // Alter statements may fail if column already exists - this is OK
                        if (verbose) {
                            logger.debug(`Note: Alter statement for ${schema.name} skipped (likely already applied)`, {
                                category: 'database'
                            });
                        }
                    }
                }
            }
        }

        // Create indexes
        if (verbose) logger.info('📊 Creating indexes...', { category: 'database' });
        for (const schema of allSchemas) {
            if (verbose && schema) logger.debug(`Processing indexes for schema: ${schema.name}`, { category: 'database' });

            if (schema && schema.indexes) {
                for (const indexStatement of schema.indexes) {
                    try {
                        await pool.query(indexStatement);
                        result.indexesCreated++;
                    } catch (error) {
                        // Index creation may fail if index already exists - this is OK
                        const err = error as Error;
                        if (!err.message.includes('already exists')) {
                            logger.warn(`Warning: Could not create index for ${schema.name}`, {
                                category: 'database',
                                error: err.message
                            });
                        }
                    }
                }
            }
        }

        result.duration = Date.now() - startTime;

        if (verbose) {
            logger.info(`✅ Database initialized successfully in ${result.duration}ms`, {
                category: 'database',
                tablesCreated: result.tablesCreated.length,
                indexesCreated: result.indexesCreated
            });
            if (result.errors.length > 0) {
                logger.warn(`⚠️  Errors during initialization: ${result.errors.length}`, {
                    category: 'database'
                });
            }
        }

    } catch (error) {
        result.success = false;
        result.errors.push(error as Error);
        logger.error('❌ Database initialization failed', {
            category: 'database',
            error: (error as Error).message,
            stack: (error as Error).stack
        });
    }

    return result;
}

/**
 * Reset database by dropping and recreating all tables
 * WARNING: This will delete all data!
 * Only use in development/testing environments
 * 
 * @param pool - PostgreSQL connection pool
 */
export async function resetDatabase(pool: Pool): Promise<InitializationResult> {
    logger.warn('⚠️  WARNING: Resetting database - all data will be lost!', { category: 'database' });
    return initializeDatabase({ pool, dropExisting: true, verbose: true });
}

/**
 * Check if database is initialized
 * @param pool - PostgreSQL connection pool
 * @returns true if all tables exist
 */
export async function isDatabaseInitialized(pool: Pool): Promise<boolean> {
    try {
        for (const schema of allSchemas) {
            const result = await pool.query(
                `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
                [schema.name]
            );
            if (!result.rows[0].exists) {
                return false;
            }
        }
        return true;
    } catch (error) {
        logger.error('Error checking database initialization', {
            category: 'database',
            error: (error as Error).message
        });
        return false;
    }
}
