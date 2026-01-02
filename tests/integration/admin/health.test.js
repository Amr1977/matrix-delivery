const request = require('supertest');
const { logAdminAction } = require('../../../backend/services/adminService');

// Mock dependencies before importing app
jest.mock('../../../backend/config/db');
jest.mock('../../../backend/services/adminService');
jest.mock('../../../backend/services/notificationService.ts');
jest.mock('../../../backend/middleware/auth', () => ({
    verifyToken: (req, res, next) => {
        req.user = { userId: 'test-user', primary_role: 'admin' };
        next();
    },
    verifyAdmin: (req, res, next) => {
        req.user = { userId: 'admin-123', primary_role: 'admin' };
        next();
    },
    requireRole: () => (req, res, next) => next(),
    requireAdmin: (req, res, next) => next()
}));
jest.mock('../../../backend/database/startup.js', () => ({
    initDatabase: jest.fn(),
    createAdminTables: jest.fn()
}));
jest.mock('../../../backend/services/socketService.ts', () => ({
    initializeSocket: jest.fn(),
    io: { emit: jest.fn() }
}), { virtual: true });
jest.mock('../../../backend/services/activityTracker.ts', () => ({
    activityTracker: {
        initialize: jest.fn(),
        trackActivity: jest.fn(),
        startPeriodicCommit: jest.fn()
    }
}), { virtual: true });
jest.mock('../../../backend/migrationRunner.ts', () => ({
    runMigrationsOnStartup: jest.fn().mockResolvedValue({ applied: 0, skipped: 0 })
}), { virtual: true });
jest.mock('../../../backend/database/init.ts', () => ({
    initializeDatabase: jest.fn().mockResolvedValue({ success: true, errors: [] })
}), { virtual: true });
jest.mock('../../../backend/routes/vendors', () => {
    const mockRouter = () => { };
    mockRouter.get = jest.fn();
    mockRouter.post = jest.fn();
    mockRouter.put = jest.fn();
    mockRouter.delete = jest.fn();
    mockRouter.use = jest.fn();
    return mockRouter;
}, { virtual: true });

// Mock process.memoryUsage for consistent results
const originalMemoryUsage = process.memoryUsage;
beforeAll(() => {
    process.memoryUsage = jest.fn(() => ({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        external: 0
    }));
});
afterAll(() => {
    process.memoryUsage = originalMemoryUsage;
});

// Import app after mocks
const app = require('../../../backend/server');
const pool = require('../../../backend/config/db');

describe('Admin Routes - System Health', () => {
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery = jest.fn();
        pool.query = mockQuery;
        logAdminAction.mockResolvedValue();
    });

    const adminToken = 'valid-admin-token';

    describe('GET /api/admin/health/current', () => {
        it('should return current system health metrics', async () => {
            // Mock DB query for latest log
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    memory_percent: 45.5,
                    memory_used_mb: 450,
                    memory_available_mb: 550,
                    pm2_total_memory_mb: 200,
                    pm2_processes: JSON.stringify([{ name: 'server', status: 'online', memory_mb: 100 }]),
                    uptime: '2d 4h 30m',
                    timestamp: new Date().toISOString()
                }]
            });

            const response = await request(app)
                .get('/api/admin/health/current')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body).toHaveProperty('memoryPercent');
            expect(response.body).toHaveProperty('memoryUsedMb');
            expect(response.body).toHaveProperty('pm2Processes');
            expect(response.body.pm2Processes).toHaveLength(1);
            expect(response.body.pm2Processes[0].name).toBe('server');
        });

        it('should return fallback metrics if no DB logs exist', async () => {
            // Mock empty DB result
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/admin/health/current')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body).toHaveProperty('memoryPercent');
            expect(response.body).toHaveProperty('memoryUsedMb');
            // Should be calculated live from process.memoryUsage mock
        });

        it('should handle database errors gracefully', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/admin/health/current')
                .set('Cookie', [`token=${adminToken}`])
                .expect(500);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/admin/health/history', () => {
        it('should return health history for default range', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        timestamp: new Date().toISOString(),
                        memory_percent: 40,
                        memory_used_mb: 400,
                        memory_available_mb: 600,
                        pm2_total_memory_mb: 200
                    },
                    {
                        timestamp: new Date(Date.now() - 3600000).toISOString(),
                        memory_percent: 35,
                        memory_used_mb: 350,
                        memory_available_mb: 650,
                        pm2_total_memory_mb: 180
                    }
                ]
            });

            const response = await request(app)
                .get('/api/admin/health/history')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body).toHaveProperty('history');
            expect(response.body.history).toHaveLength(2);
            expect(response.body.hours).toBe(24);
        });

        it('should accept custom hours parameter', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/admin/health/history?hours=72')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body.hours).toBe(72);
            // Verify query utilized the hours parameter
            const queryCall = mockQuery.mock.calls[0];
            expect(queryCall[1]).toEqual(expect.arrayContaining(['72 hours']));
            // Note: Exact query verification depends on implementation specifics (INTERVAL '72 hours')
        });
    });
});
