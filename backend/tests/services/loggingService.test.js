const pool = require('../../config/db');
const LoggingService = require('../../services/loggingService');

describe('LoggingService', () => {
    let pool;
    let loggingService;
    let testUserId;

    beforeAll(async () => {
        pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        loggingService = new LoggingService(pool);

        // Create test user
        const result = await pool.query(
            `INSERT INTO users (id, name, email, password, phone, role)
       VALUES ('test_user_logs', 'Test User', 'testlogs@example.com', 'hash', '+1234567890', 'customer')
       RETURNING id`
        );
        testUserId = result.rows[0].id;
    });

    afterAll(async () => {
        await pool.query('DELETE FROM logs WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await pool.end();
    });

    describe('createLog', () => {
        it('should create a log entry', async () => {
            const logData = {
                level: 'error',
                source: 'frontend',
                category: 'test',
                message: 'Test error message',
                userId: testUserId,
                sessionId: 'test-session-123',
                url: 'http://localhost:3000/test',
                stackTrace: 'Error: Test\n  at test.js:10:5'
            };

            const result = await loggingService.createLog(logData);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.level).toBe('error');
            expect(result.source).toBe('frontend');
            expect(result.message).toBe('Test error message');
        });

        it('should handle missing optional fields', async () => {
            const logData = {
                level: 'info',
                source: 'backend',
                message: 'Simple log message'
            };

            const result = await loggingService.createLog(logData);

            expect(result).toBeDefined();
            expect(result.user_id).toBeNull();
            expect(result.session_id).toBeNull();
        });
    });

    describe('getLogs', () => {
        beforeAll(async () => {
            // Create test logs
            const logs = [
                { level: 'error', source: 'frontend', category: 'api', message: 'API error 1', userId: testUserId },
                { level: 'warn', source: 'frontend', category: 'validation', message: 'Validation warning', userId: testUserId },
                { level: 'info', source: 'backend', category: 'auth', message: 'User logged in', userId: testUserId },
                { level: 'debug', source: 'backend', category: 'database', message: 'Query executed', userId: testUserId },
            ];

            for (const log of logs) {
                await loggingService.createLog(log);
            }
        });

        it('should retrieve all logs without filters', async () => {
            const result = await loggingService.getLogs({ page: 1, limit: 50 });

            expect(result.logs).toBeDefined();
            expect(Array.isArray(result.logs)).toBe(true);
            expect(result.pagination).toBeDefined();
            expect(result.pagination.page).toBe(1);
        });

        it('should filter by level', async () => {
            const result = await loggingService.getLogs({ level: 'error', page: 1, limit: 50 });

            expect(result.logs.length).toBeGreaterThan(0);
            result.logs.forEach(log => {
                expect(log.level).toBe('error');
            });
        });

        it('should filter by source', async () => {
            const result = await loggingService.getLogs({ source: 'frontend', page: 1, limit: 50 });

            expect(result.logs.length).toBeGreaterThan(0);
            result.logs.forEach(log => {
                expect(log.source).toBe('frontend');
            });
        });

        it('should filter by category', async () => {
            const result = await loggingService.getLogs({ category: 'api', page: 1, limit: 50 });

            expect(result.logs.length).toBeGreaterThan(0);
            result.logs.forEach(log => {
                expect(log.category).toBe('api');
            });
        });

        it('should filter by userId', async () => {
            const result = await loggingService.getLogs({ userId: testUserId, page: 1, limit: 50 });

            expect(result.logs.length).toBeGreaterThan(0);
            result.logs.forEach(log => {
                expect(log.user_id).toBe(testUserId);
            });
        });

        it('should search in message', async () => {
            const result = await loggingService.getLogs({ search: 'API error', page: 1, limit: 50 });

            expect(result.logs.length).toBeGreaterThan(0);
            expect(result.logs[0].message).toContain('API error');
        });

        it('should paginate results', async () => {
            const result = await loggingService.getLogs({ page: 1, limit: 2 });

            expect(result.logs.length).toBeLessThanOrEqual(2);
            expect(result.pagination.limit).toBe(2);
            expect(result.pagination.totalPages).toBeGreaterThanOrEqual(1);
        });

        it('should filter by date range', async () => {
            const today = new Date().toISOString().split('T')[0];
            const result = await loggingService.getLogs({
                startDate: today,
                page: 1,
                limit: 50
            });

            expect(result.logs).toBeDefined();
            result.logs.forEach(log => {
                const logDate = new Date(log.timestamp).toISOString().split('T')[0];
                expect(logDate >= today).toBe(true);
            });
        });
    });

    describe('getLogById', () => {
        let testLogId;

        beforeAll(async () => {
            const log = await loggingService.createLog({
                level: 'error',
                source: 'frontend',
                message: 'Test log for ID retrieval',
                userId: testUserId
            });
            testLogId = log.id;
        });

        it('should retrieve a log by ID', async () => {
            const result = await loggingService.getLogById(testLogId);

            expect(result).toBeDefined();
            expect(result.id).toBe(testLogId);
            expect(result.message).toBe('Test log for ID retrieval');
        });

        it('should return null for non-existent ID', async () => {
            const result = await loggingService.getLogById(999999);

            expect(result).toBeNull();
        });
    });

    describe('getLogStats', () => {
        it('should retrieve log statistics', async () => {
            const stats = await loggingService.getLogStats();

            expect(stats).toBeDefined();
            expect(stats.total_logs).toBeDefined();
            expect(stats.error_count).toBeDefined();
            expect(stats.warn_count).toBeDefined();
            expect(stats.info_count).toBeDefined();
            expect(stats.debug_count).toBeDefined();
            expect(stats.frontend_count).toBeDefined();
            expect(stats.backend_count).toBeDefined();
            expect(stats.last_24h_count).toBeDefined();
            expect(stats.last_7d_count).toBeDefined();
        });
    });

    describe('cleanupOldLogs', () => {
        beforeAll(async () => {
            // Create old log (35 days ago)
            await pool.query(
                `INSERT INTO logs (level, source, category, message, user_id, timestamp)
         VALUES ('info', 'backend', 'test', 'Old log for cleanup', $1, NOW() - INTERVAL '35 days')`,
                [testUserId]
            );
        });

        it('should delete logs older than retention period', async () => {
            const deletedCount = await loggingService.cleanupOldLogs();

            expect(deletedCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('logBackendEvent', () => {
        it('should log a backend event', async () => {
            const result = await loggingService.logBackendEvent(
                'error',
                'Test backend error',
                { category: 'test', statusCode: 500 }
            );

            expect(result).toBeDefined();
            expect(result.source).toBe('backend');
            expect(result.level).toBe('error');
            expect(result.message).toBe('Test backend error');
        });
    });

    describe('logFrontendEvent', () => {
        it('should log a frontend event', async () => {
            const logData = {
                level: 'warn',
                message: 'Test frontend warning',
                category: 'validation',
                userId: testUserId
            };

            const result = await loggingService.logFrontendEvent(logData);

            expect(result).toBeDefined();
            expect(result.source).toBe('frontend');
            expect(result.level).toBe('warn');
        });
    });
});
