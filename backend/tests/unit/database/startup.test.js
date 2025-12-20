const { initDatabase, createAdminTables } = require('../../../database/startup');

// Mock dependencies
jest.mock('../../../config/logger');
jest.mock('../../../database/init.ts');
jest.mock('../../../middleware/auditLogger');
jest.mock('../../../services/activityTracker.ts');
jest.mock('../../../migrationRunner.ts');

const logger = require('../../../config/logger');
const { initializeDatabase } = require('../../../database/init.ts');
const { initAuditLogger } = require('../../../middleware/auditLogger');

describe('Database Startup Module', () => {
    let mockPool;

    beforeEach(() => {
        // Create mock pool
        mockPool = {
            query: jest.fn()
        };

        // Clear all mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        initializeDatabase.mockResolvedValue({
            success: true,
            tablesCreated: ['users', 'orders'],
            indexesCreated: 10,
            errors: [],
            duration: 100
        });

        initAuditLogger.mockImplementation(() => { });
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('createAdminTables', () => {
        it('should create all admin tables successfully', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await createAdminTables(mockPool);

            // Should create 3 tables + 3 indexes + 1 settings insert = 7 queries
            expect(mockPool.query).toHaveBeenCalledTimes(7);

            // Verify admin_logs table creation
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS admin_logs')
            );

            // Verify system_settings table creation
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS system_settings')
            );

            // Verify backups table creation
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS backups')
            );

            // Verify indexes created
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_admin_logs_admin')
            );

            // Verify default settings inserted
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO system_settings')
            );

            // Verify success logged
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Admin tables created successfully'),
                expect.any(Object)
            );
        });

        it('should handle database errors gracefully', async () => {
            const dbError = new Error('Database connection failed');
            mockPool.query.mockRejectedValue(dbError);

            await expect(createAdminTables(mockPool)).rejects.toThrow('Database connection failed');

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Admin tables creation error'),
                dbError
            );
        });

        it('should create admin_logs table with correct schema', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await createAdminTables(mockPool);

            const adminLogsCall = mockPool.query.mock.calls.find(call =>
                call[0].includes('CREATE TABLE IF NOT EXISTS admin_logs')
            );

            expect(adminLogsCall).toBeDefined();
            expect(adminLogsCall[0]).toContain('id SERIAL PRIMARY KEY');
            expect(adminLogsCall[0]).toContain('admin_id VARCHAR(255)');
            expect(adminLogsCall[0]).toContain('action VARCHAR(100)');
            expect(adminLogsCall[0]).toContain('details JSONB');
        });

        it('should insert default system settings', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await createAdminTables(mockPool);

            const settingsCall = mockPool.query.mock.calls.find(call =>
                call[0].includes('INSERT INTO system_settings')
            );

            expect(settingsCall).toBeDefined();
            expect(settingsCall[0]).toContain('platform_name');
            expect(settingsCall[0]).toContain('platform_commission');
            expect(settingsCall[0]).toContain('ON CONFLICT (key) DO NOTHING');
        });
    });

    describe('initDatabase', () => {
        beforeEach(() => {
            // Mock activity tracker
            jest.mock('../../../services/activityTracker.ts', () => ({
                activityTracker: {
                    initialize: jest.fn(),
                    startPeriodicCommit: jest.fn()
                }
            }));

            // Mock migration runner
            jest.mock('../../../migrationRunner.ts', () => ({
                runMigrationsOnStartup: jest.fn().mockResolvedValue({
                    applied: 5,
                    skipped: 10
                })
            }));
        });

        it('should initialize database successfully', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await initDatabase(mockPool);

            // Verify PostGIS extension enabled
            expect(mockPool.query).toHaveBeenCalledWith(
                'CREATE EXTENSION IF NOT EXISTS postgis'
            );

            // Verify schema initialization called
            expect(initializeDatabase).toHaveBeenCalledWith({
                pool: mockPool,
                verbose: true
            });

            // Verify audit logger initialized
            expect(initAuditLogger).toHaveBeenCalledWith(mockPool);

            // Verify success logged
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('PostgreSQL Database initialized'),
                expect.any(Object)
            );
        });

        it('should handle PostGIS extension errors gracefully', async () => {
            mockPool.query
                .mockRejectedValueOnce(new Error('PostGIS not available'))
                .mockResolvedValue({ rows: [] });

            await initDatabase(mockPool);

            // Should log warning but continue
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('PostGIS extension not available'),
                expect.any(Object)
            );

            // Should still complete initialization
            expect(initializeDatabase).toHaveBeenCalled();
        });

        it('should throw error if schema initialization fails', async () => {
            initializeDatabase.mockResolvedValue({
                success: false,
                errors: [new Error('Schema creation failed')],
                tablesCreated: [],
                indexesCreated: 0,
                duration: 50
            });

            await expect(initDatabase(mockPool)).rejects.toThrow('Database initialization failed');

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Database initialization had errors'),
                expect.objectContaining({
                    category: 'database',
                    errors: expect.any(Array)
                })
            );
        });

        it('should handle migration errors in development', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            mockPool.query.mockResolvedValue({ rows: [] });

            const { runMigrationsOnStartup } = require('../../../migrationRunner.ts');
            runMigrationsOnStartup.mockRejectedValue(new Error('Migration failed'));

            // Should not throw in development
            await expect(initDatabase(mockPool)).resolves.not.toThrow();

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Migration error'),
                expect.any(Object)
            );

            process.env.NODE_ENV = originalEnv;
        });

        it('should log migration results', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            const { runMigrationsOnStartup } = require('../../../migrationRunner.ts');
            runMigrationsOnStartup.mockResolvedValue({
                applied: 3,
                skipped: 7
            });

            await initDatabase(mockPool);

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Migrations complete: 3 applied, 7 already applied'),
                expect.objectContaining({ category: 'database' })
            );
        });
    });

    describe('Integration', () => {
        it('should call all initialization steps in correct order', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });
            const callOrder = [];

            mockPool.query.mockImplementation((sql) => {
                if (sql.includes('postgis')) callOrder.push('postgis');
                if (sql.includes('admin_logs')) callOrder.push('admin_tables');
                return Promise.resolve({ rows: [] });
            });

            initializeDatabase.mockImplementation(() => {
                callOrder.push('schema');
                return Promise.resolve({ success: true, errors: [], tablesCreated: [], indexesCreated: 0, duration: 0 });
            });

            initAuditLogger.mockImplementation(() => {
                callOrder.push('audit');
            });

            await initDatabase(mockPool);

            // Verify order: PostGIS -> Schema -> Admin Tables -> Audit Logger
            expect(callOrder[0]).toBe('postgis');
            expect(callOrder[1]).toBe('schema');
            expect(callOrder).toContain('admin_tables');
            expect(callOrder).toContain('audit');
        });
    });
});
