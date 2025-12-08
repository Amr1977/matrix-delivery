import { Pool, QueryResult } from 'pg';

/**
 * Represents a database table schema definition
 */
export interface TableSchema {
    /** Table name */
    name: string;

    /** SQL CREATE TABLE statement */
    createStatement: string;

    /** Array of CREATE INDEX statements */
    indexes: string[];

    /** Optional ALTER TABLE statements for existing tables */
    alterStatements?: string[];
}

/**
 * Options for database initialization
 */
export interface DatabaseInitOptions {
    /** PostgreSQL connection pool */
    pool: Pool;

    /** Whether to drop existing tables before creating (dangerous!) */
    dropExisting?: boolean;

    /** Enable verbose logging */
    verbose?: boolean;
}

/**
 * Result of database initialization
 */
export interface InitializationResult {
    /** Whether initialization was successful */
    success: boolean;

    /** Names of tables that were created */
    tablesCreated: string[];

    /** Number of indexes created */
    indexesCreated: number;

    /** Any errors that occurred */
    errors: Error[];

    /** Duration in milliseconds */
    duration: number;
}

/**
 * Database query helper type
 */
export type QueryFunction = (text: string, params?: any[]) => Promise<QueryResult>;
