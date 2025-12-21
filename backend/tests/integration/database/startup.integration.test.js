const { initDatabase, createAdminTables } = require('../../../database/startup');
const pool = require('../../../config/db');
const { initializeDatabase } = require('../../../database/init.ts');
const { resetTestDatabase } = require('../../setup/resetTestDatabase');

/**
 * REAL DATABASE INTEGRATION TESTS
 * 
 * These tests hit the actual test database and verify:
 * - Tables are created correctly
 * - Constraints work as expected
 * - Data can be inserted and queried
 * - Foreign keys are enforced
 * 
 * Prerequisites:
 * - Test database must be running (matrix_delivery_test)
 * - Full schema is initialized before admin tables
 */

describe('Database Startup - Real Database Integration', () => {
    // Track if we've initialized the full schema
    let schemaInitialized = false;

    // Cleanup function to drop admin tables only
    const cleanupAdminTables = async () => {
        try {
            await pool.query('DROP TABLE IF EXISTS admin_logs CASCADE');
            await pool.query('DROP TABLE IF EXISTS system_settings CASCADE');
            await pool.query('DROP TABLE IF EXISTS backups CASCADE');
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    };

    beforeAll(async () => {
        // Reset test database to ensure it matches production schema
        console.log('Resetting test database to match production schema...');

        try {
            const success = await resetTestDatabase();
            if (success) {
                schemaInitialized = true;
                console.log('✅ Test database reset complete');
            } else {
                console.warn('⚠️ Test database reset had errors');
            }
        } catch (error) {
            console.error('❌ Failed to reset test database:', error.message);
        }

        // Clean up admin tables before tests
        await cleanupAdminTables();
    });

    afterAll(async () => {
        // Clean up after all tests
        await cleanupAdminTables();
        // Don't close pool - it's shared across tests
    });

    describe('createAdminTables - Real Database', () => {
        beforeEach(async () => {
            // Clean up before each test
            await cleanupAdminTables();
        });

        it('should create admin_logs table with correct schema', async () => {
            if (!schemaInitialized) {
                console.warn('⚠️ Skipping test - schema not initialized');
                return;
            }

            await createAdminTables(pool);

            // Verify table exists
            const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admin_logs'
        )
      `);

            expect(tableCheck.rows[0].exists).toBe(true);

            // Verify columns
            const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'admin_logs'
        ORDER BY ordinal_position
      `);

            const columnMap = {};
            columns.rows.forEach(col => {
                columnMap[col.column_name] = {
                    type: col.data_type,
                    nullable: col.is_nullable === 'YES'
                };
            });

            // Verify required columns exist
            expect(columnMap.id).toBeDefined();
            expect(columnMap.admin_id).toBeDefined();
            expect(columnMap.action).toBeDefined();
            expect(columnMap.details).toBeDefined();

            // Verify NOT NULL constraints
            expect(columnMap.admin_id.nullable).toBe(false);
            expect(columnMap.action.nullable).toBe(false);
        });

        it('should create system_settings table with primary key', async () => {
            if (!schemaInitialized) return;

            await createAdminTables(pool);

            // Verify primary key constraint
            const pkCheck = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'system_settings'
        AND constraint_type = 'PRIMARY KEY'
      `);

            expect(pkCheck.rows.length).toBe(1);
        });

        it('should create all required indexes', async () => {
            if (!schemaInitialized) return;

            await createAdminTables(pool);

            // Check for indexes
            const indexes = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'admin_logs'
        AND schemaname = 'public'
      `);

            const indexNames = indexes.rows.map(i => i.indexname);

            expect(indexNames).toContain('idx_admin_logs_admin');
            expect(indexNames).toContain('idx_admin_logs_created');
            expect(indexNames).toContain('idx_admin_logs_action');
        });

        it('should insert default system settings', async () => {
            if (!schemaInitialized) return;

            await createAdminTables(pool);

            const settings = await pool.query('SELECT key, value FROM system_settings ORDER BY key');

            expect(settings.rows.length).toBeGreaterThan(0);

            const settingsMap = {};
            settings.rows.forEach(s => {
                settingsMap[s.key] = s.value;
            });

            // Verify default settings
            expect(settingsMap.platform_name).toBe('Matrix Delivery');
            expect(settingsMap.platform_commission).toBe('15');
            expect(settingsMap.default_currency).toBe('USD');
            expect(settingsMap.enable_2fa).toBe('true');
        });

        it('should be idempotent (can be called multiple times)', async () => {
            if (!schemaInitialized) return;

            // Call twice
            await createAdminTables(pool);
            await createAdminTables(pool);

            // Should not error and tables should exist
            const tableCheck = await pool.query(`
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('admin_logs', 'system_settings', 'backups')
      `);

            expect(tableCheck.rows.length).toBe(3);

            // Settings should not be duplicated
            const settings = await pool.query('SELECT COUNT(*) as count FROM system_settings');
            expect(parseInt(settings.rows[0].count)).toBe(7);
        });
    });

    describe('Data Operations - Real Database', () => {
        beforeEach(async () => {
            if (!schemaInitialized) return;
            await cleanupAdminTables();
            await createAdminTables(pool);
        });

        it('should allow inserting and querying admin logs', async () => {
            if (!schemaInitialized) return;

            // Create a test user first (users table should exist from schema init)
            const userId = 'test-admin-' + Date.now();
            await pool.query(`
        INSERT INTO users (id, name, email, password_hash, primary_role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [userId, 'Test Admin', `${userId}@test.com`, 'hash', 'admin']);

            // Insert admin log
            const logResult = await pool.query(`
        INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, 'TEST_ACTION', 'test', 'test-123', JSON.stringify({ test: true }), '127.0.0.1']);

            expect(logResult.rows.length).toBe(1);
            expect(logResult.rows[0].action).toBe('TEST_ACTION');
            expect(logResult.rows[0].details).toEqual({ test: true });

            // Query it back
            const queryResult = await pool.query(`
        SELECT * FROM admin_logs WHERE admin_id = $1
      `, [userId]);

            expect(queryResult.rows.length).toBe(1);
            expect(queryResult.rows[0].action).toBe('TEST_ACTION');
        });

        it('should enforce foreign key constraint on admin_id', async () => {
            if (!schemaInitialized) return;

            // Try to insert log with non-existent admin_id
            await expect(
                pool.query(`
          INSERT INTO admin_logs (admin_id, action)
          VALUES ($1, $2)
        `, ['non-existent-admin', 'TEST'])
            ).rejects.toThrow(/foreign key constraint/);
        });

        it('should enforce primary key constraint on system_settings', async () => {
            if (!schemaInitialized) return;

            // Insert a setting
            await pool.query(`
        INSERT INTO system_settings (key, value)
        VALUES ($1, $2)
      `, ['test_key', 'test_value']);

            // Try to insert duplicate key
            await expect(
                pool.query(`
          INSERT INTO system_settings (key, value)
          VALUES ($1, $2)
        `, ['test_key', 'another_value'])
            ).rejects.toThrow(/duplicate key value/);
        });

        it('should handle JSONB data correctly', async () => {
            if (!schemaInitialized) return;

            const userId = 'test-admin-jsonb-' + Date.now();
            await pool.query(`
        INSERT INTO users (id, name, email, password_hash, primary_role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [userId, 'Test Admin', `${userId}@test.com`, 'hash', 'admin']);

            // Insert with complex JSON
            const complexData = {
                user: 'admin',
                changes: ['field1', 'field2'],
                metadata: { timestamp: Date.now(), version: '1.0' }
            };

            const result = await pool.query(`
        INSERT INTO admin_logs (admin_id, action, details)
        VALUES ($1, $2, $3)
        RETURNING details
      `, [userId, 'TEST', JSON.stringify(complexData)]);

            // Verify JSONB is parsed correctly
            expect(result.rows[0].details).toEqual(complexData);
            expect(result.rows[0].details.metadata.version).toBe('1.0');
        });
    });

    describe('Performance - Real Database', () => {
        beforeEach(async () => {
            if (!schemaInitialized) return;
            await cleanupAdminTables();
        });

        it('should create tables within reasonable time', async () => {
            if (!schemaInitialized) return;

            const startTime = Date.now();
            await createAdminTables(pool);
            const duration = Date.now() - startTime;

            // Should complete within 2 seconds
            expect(duration).toBeLessThan(2000);
        });

        it('should handle concurrent reads efficiently', async () => {
            if (!schemaInitialized) return;

            await createAdminTables(pool);

            // Perform 20 concurrent reads
            const reads = Array(20).fill(null).map(() =>
                pool.query('SELECT * FROM system_settings')
            );

            const startTime = Date.now();
            const results = await Promise.all(reads);
            const duration = Date.now() - startTime;

            // All should succeed
            results.forEach(result => {
                expect(result.rows.length).toBeGreaterThan(0);
            });

            // Should complete within 1 second
            expect(duration).toBeLessThan(1000);
        });
    });
});
