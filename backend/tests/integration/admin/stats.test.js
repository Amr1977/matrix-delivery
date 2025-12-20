const request = require('supertest');
const { logAdminAction } = require('../../../services/adminService');

// Mock dependencies before importing app
jest.mock('../../../config/db');
jest.mock('../../../services/adminService');
jest.mock('../../../services/notificationService.ts');
jest.mock('../../../middleware/rateLimit', () => ({
    apiRateLimit: (req, res, next) => next(),
    orderCreationRateLimit: (req, res, next) => next(),
    authRateLimit: (req, res, next) => next()
}));

// Import app after mocks are set up
const app = require('../../../server');
const pool = require('../../../config/db');

describe('Admin Routes - Dashboard Stats', () => {
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery = jest.fn();
        pool.query = mockQuery;
        logAdminAction.mockResolvedValue();
    });

    const adminToken = 'valid-admin-token';
    const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@test.com',
        name: 'Admin User',
        primary_role: 'admin',
        granted_roles: []
    };

    describe('GET /api/admin/stats', () => {
        beforeEach(() => {
            // Mock verifyAdmin middleware - simulate admin user
            mockQuery
                .mockResolvedValueOnce({ rows: [mockAdminUser] }) // verifyAdmin check
                .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // total users
                .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // new users
                .mockResolvedValueOnce({ rows: [{ primary_role: 'customer', count: '60' }, { primary_role: 'driver', count: '40' }] }) // users by role
                .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // total orders
                .mockResolvedValueOnce({ rows: [{ status: 'delivered', count: '30' }] }) // orders by status
                .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // active orders
                .mockResolvedValueOnce({ rows: [{ count: '30' }] }) // completed orders
                .mockResolvedValueOnce({ rows: [{ total: '15000' }] }) // revenue
                .mockResolvedValueOnce({ rows: [{ month: 'Jan', revenue: '5000' }] }) // revenue by month
                .mockResolvedValueOnce({ rows: [{ date: '2024-01', users: '20' }] }) // user growth
                .mockResolvedValueOnce({ rows: [{ avg_value: '500' }] }) // avg order value
                .mockResolvedValueOnce({ rows: [{ rate: '85.5' }] }) // completion rate
                .mockResolvedValueOnce({ rows: [{ avg_hours: '2.5' }] }) // avg delivery time
                .mockResolvedValueOnce({ rows: [{ avg_rating: '4.5' }] }); // avg rating
        });

        it('should return dashboard stats for admin user', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Cookie', [`token = ${adminToken} `])
                .expect(200);

            expect(response.body).toHaveProperty('totalUsers', 100);
            expect(response.body).toHaveProperty('newUsers', 10);
            expect(response.body).toHaveProperty('totalOrders', 50);
            expect(response.body).toHaveProperty('revenue', 15000);
            expect(response.body).toHaveProperty('metrics');
            expect(response.body.metrics).toHaveProperty('avgOrderValue', 500);
            expect(response.body.metrics).toHaveProperty('completionRate', 85.5);
        });

        it('should accept custom date range', async () => {
            const response = await request(app)
                .get('/api/admin/stats?range=30d')
                .set('Cookie', [`token = ${adminToken} `])
                .expect(200);

            expect(response.body).toHaveProperty('totalUsers');
            // Verify the date range was used in queries
            const calls = mockQuery.mock.calls;
            const newUsersQuery = calls.find(call =>
                call[0] && call[0].includes('created_at >=')
            );
            expect(newUsersQuery).toBeDefined();
        });

        it('should return 401 without authentication token', async () => {
            mockQuery.mockReset(); // Clear admin check mock

            const response = await request(app)
                .get('/api/admin/stats')
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 403 for non-admin user', async () => {
            const nonAdminUser = {
                ...mockAdminUser,
                primary_role: 'customer',
                granted_roles: []
            };

            mockQuery.mockReset();
            mockQuery.mockResolvedValueOnce({ rows: [nonAdminUser] });

            const response = await request(app)
                .get('/api/admin/stats')
                .set('Cookie', [`token = ${adminToken} `])
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Admin access required');
        });

        it('should handle database errors gracefully', async () => {
            mockQuery.mockReset();
            mockQuery
                .mockResolvedValueOnce({ rows: [mockAdminUser] }) // admin check
                .mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/admin/stats')
                .set('Cookie', [`token = ${adminToken} `])
                .expect(500);

            expect(response.body).toHaveProperty('error', 'Failed to get statistics');
        });

        it('should log admin action', async () => {
            await request(app)
                .get('/api/admin/stats?range=7d')
                .set('Cookie', [`token = ${adminToken} `])
                .expect(200);

            expect(logAdminAction).toHaveBeenCalledWith(
                'admin-123',
                'VIEW_STATS',
                'dashboard',
                null,
                expect.objectContaining({
                    range: '7d'
                })
            );
        });

        it('should handle all valid range values', async () => {
            const ranges = ['24h', '7d', '30d', '90d'];

            for (const range of ranges) {
                mockQuery.mockClear();
                // Re-mock all queries for each iteration
                mockQuery
                    .mockResolvedValueOnce({ rows: [mockAdminUser] })
                    .mockResolvedValue({ rows: [{ count: '0' }] })
                    .mockResolvedValue({ rows: [] });

                const response = await request(app)
                    .get(`/ api / admin / stats ? range = ${range} `)
                    .set('Cookie', [`token = ${adminToken} `])
                    .expect(200);

                expect(response.body).toHaveProperty('totalUsers');
            }
        });

        it('should return usersByRole as object', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Cookie', [`token = ${adminToken} `])
                .expect(200);

            expect(response.body.usersByRole).toEqual({
                customer: 60,
                driver: 40
            });
        });
    });
});
