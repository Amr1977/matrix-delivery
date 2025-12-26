const logger = require('../config/logger');
const { initializeDatabase } = require('./init.ts');
const { initAuditLogger } = require('../middleware/auditLogger');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Create admin-specific database tables
 * Creates admin_logs, system_settings, and backups tables
 */
async function createAdminTables(pool) {
    try {
        // Admin logs table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // System settings table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255) REFERENCES users(id)
      )
    `);

        // Backups table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS backups (
        id VARCHAR(255) PRIMARY KEY,
        created_by VARCHAR(255) NOT NULL REFERENCES users(id),
        table_counts JSONB,
        file_path TEXT,
        file_size BIGINT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action)`);

        // Insert default system settings
        await pool.query(`
      INSERT INTO system_settings (key, value, type, description)
      VALUES 
        ('platform_name', 'Matrix Delivery', 'string', 'Platform display name'),
        ('platform_commission', '15', 'number', 'Platform commission percentage'),
        ('default_currency', 'USD', 'string', 'Default currency code'),
        ('enable_2fa', 'true', 'boolean', 'Enable two-factor authentication'),
        ('require_email_verification', 'true', 'boolean', 'Require email verification'),
        ('enable_ip_whitelist', 'false', 'boolean', 'Enable IP whitelisting'),
        ('log_admin_actions', 'true', 'boolean', 'Log all admin actions')
      ON CONFLICT (key) DO NOTHING
    `);

        logger.info('✅ Admin tables created successfully', { category: 'database' });
    } catch (error) {
        logger.error('❌ Admin tables creation error:', error);
        throw error;
    }
}

/**
 * Create user-related database tables
 */
async function createUserTables(pool) {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_saved_addresses (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                label VARCHAR(100) NOT NULL,
                address_data JSONB NOT NULL,
                lat DECIMAL(10, 7),
                lng DECIMAL(10, 7),
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_saved_addresses_user ON user_saved_addresses(user_id)`);

        logger.info('✅ User tables created successfully', { category: 'database' });
    } catch (error) {
        logger.error('❌ User tables creation error:', error);
        throw error;
    }
}

/**
 * Complete database initialization
 * Orchestrates all database setup including schema, admin tables, audit logging, and migrations
 */
async function initDatabase(pool) {
    try {
        // Enable PostGIS extension
        try {
            await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
            logger.info('✅ PostGIS extension enabled', { category: 'database' });
        } catch (postgisError) {
            logger.warn('⚠️ PostGIS extension not available:', {
                category: 'database',
                error: postgisError.message
            });
        }

        // Initialize database schema using TypeScript modules
        const result = await initializeDatabase({ pool, verbose: true });

        if (!result.success) {
            logger.error('❌ Database initialization had errors', {
                category: 'database',
                errors: result.errors.map(e => e.message)
            });
            throw new Error('Database initialization failed');
        }

        // Initialize admin tables
        await createAdminTables(pool);
        await createUserTables(pool);

        // Initialize audit logging
        initAuditLogger(pool);

        // Initialize activity tracker for online status
        const { activityTracker } = require('../services/activityTracker.ts');
        activityTracker.initialize(pool);
        activityTracker.startPeriodicCommit();

        // Run database migrations automatically
        try {
            const { runMigrationsOnStartup } = require('../migrationRunner.ts');
            const migrationResult = await runMigrationsOnStartup(pool);
            logger.info(`✅ Migrations complete: ${migrationResult.applied} applied, ${migrationResult.skipped} already applied`, {
                category: 'database'
            });
        } catch (migrationError) {
            logger.error(`⚠️ Migration error: ${migrationError.message}`, {
                category: 'database'
            });
            // Don't crash server on migration failure in development
            if (IS_PRODUCTION) {
                throw migrationError;
            }
        }

        logger.info('✅ PostgreSQL Database initialized and user statistics recalculated', { category: 'database' });
    } catch (error) {
        logger.error('❌ Database initialization error:', error);
        throw error;
    }
}

module.exports = {
    initDatabase,
    createAdminTables
};
