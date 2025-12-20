const request = require('supertest');
const { logAdminAction } = require('../../../services/adminService');
const { createNotification } = require('../../../services/notificationService.ts');

// Mock dependencies before importing app
jest.mock('../../../config/db');
jest.mock('../../../services/adminService');
jest.mock('../../../services/notificationService.ts');
jest.mock('../../../middleware/rateLimit', () => ({
    apiRateLimit: (req, res, next) => next(),
    orderCreationRateLimit: (req, res, next) => next(),
    authRateLimit: (req, res, next) => next()
}));

const app = require('../../../server');
const pool = require('../../../config/db');

describe('Admin Routes - User Management', () => {
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery = jest.fn();
        pool.query = mockQuery;
        logAdminAction.mockResolvedValue();
        createNotification.mockResolvedValue();
    });

    const adminToken = 'valid-admin-token';
    const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@test.com',
        name: 'Admin User',
        primary_role: 'admin',
        granted_roles: []
    };

    describe('GET /api/admin/users', () => {
        beforeEach(() => {
            mockQuery
                .mockResolvedValueOnce({ rows: [mockAdminUser] }) // verifyAdmin
                .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // total count
                .mockResolvedValueOnce({ // users list
                    rows: Array(20).fill(null).map((_, i) => ({
                        id: `user-${i}`,
                        name: `User ${i}`,
                        email: `user${i}@test.com`,
                        phone: '1234567890',
                        primary_role: 'customer',
                        rating: '4.5',
                        completed_deliveries: 10,
                        is_verified: true,
                        is_available: true,
                        total_orders: '5',
                        total_reviews: '3',
                        created_at: new Date()
                    }))
                });
        });

        it('should return paginated users for admin', async () => {
            const response = await request(app)
                .get('/api/admin/users?page=1&limit=20')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body).toHaveProperty('users');
            expect(response.body.users).toHaveLength(20);
            expect(response.body).toHaveProperty('pagination');
            expect(response.body.pagination).toMatchObject({
                page: 1,
                limit: 20,
                totalCount: 50,
                totalPages: 3
            });
        });

        it('should filter users by search term', async () => {
            mockQuery.mockReset();
            mockQuery
                .mockResolvedValueOnce({ rows: [mockAdminUser] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'user-john',
                        name: 'John Doe',
                        email: 'john@test.com',
                        primary_role: 'customer',
                        is_verified: true,
                        total_orders: '0',
                        total_reviews: '0'
                    }]
                });

            const response = await request(app)
                .get('/api/admin/users?search=John')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body.users).toHaveLength(1);
            expect(response.body.users[0].name).toBe('John Doe');
        });

        it('should filter users by role', async () => {
            mockQuery.mockReset();
            mockQuery
                .mockResolvedValueOnce({ rows: [mockAdminUser] })
                .mockResolvedValueOnce({ rows: [{ count: '20' }] })
                .mockResolvedValueOnce({
                    rows: Array(20).fill(null).map((_, i) => ({
                        id: `driver-${i}`,
                        name: `Driver ${i}`,
                        primary_role: 'driver',
                        total_orders: '0',
                        total_reviews: '0'
                    }))
                });

            const response = await request(app)
                .get('/api/admin/users?role=driver')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body.users.every(u => u.role === 'driver')).toBe(true);
        });
    });

    describe('POST /api/admin/users/:id/verify', () => {
        it('should verify user and send notification', async () => {
            const mockUser = {
                id: 'user-123',
                name: 'Test User',
                email: 'test@example.com',
                is_verified: true
            };

            mockQuery
                .mockResolvedValueOnce({ rows: [mockAdminUser] }) // verifyAdmin
                .mockResolvedValueOnce({ rows: [mockUser] }); // update query

            const response = await request(app)
                .post('/api/admin/users/user-123/verify')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body.message).toBe('User verified successfully');
            expect(response.body.user.isVerified).toBe(true);
            expect(createNotification).toHaveBeenCalledWith(
                'user-123',
                null,
                'account_verified',
                'Account Verified',
                expect.any(String)
            );
            expect(logAdminAction).toHaveBeenCalledWith(
                'admin-123',
                'VERIFY_USER',
                'user',
                'user-123',
                expect.any(Object)
            );
        });
    });

    describe('POST /api/admin/users/:id/suspend', () => {
        it('should suspend user with reason', async () => {
            const mockUser = {
                id: 'user-456',
                name: 'Bad User',
                email: 'bad@example.com',
                is_available: false
            };

            mockQuery
                .mockResolvedValueOnce({ rows: [mockAdminUser] })
                .mockResolvedValueOnce({ rows: [mockUser] });

            const response = await request(app)
                .post('/api/admin/users/user-456/suspend')
                .set('Cookie', [`token=${adminToken}`])
                .send({ reason: 'Policy violation' })
                .expect(200);

            expect(response.body.message).toBe('User suspended successfully');
            expect(response.body.user.isAvailable).toBe(false);
            expect(createNotification).toHaveBeenCalled();
            expect(logAdminAction).toHaveBeenCalledWith(
                'admin-123',
                'SUSPEND_USER',
                'user',
                'user-456',
                expect.objectContaining({ reason: 'Policy violation' })
            );
        });
    });

    describe('DELETE /api/admin/users/:id', () => {
        it('should delete user without active orders', async () => {
            const mockUser = {
                id: 'user-789',
                name: 'Inactive User',
                email: 'inactive@example.com'
            };

            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [] }) // BEGIN
                    .mockResolvedValueOnce({ rows: [mockUser] }) // get user
                    .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // check active orders
                    .mockResolvedValueOnce({ rows: [] }) // delete
                    .mockResolvedValueOnce({ rows: [] }), // COMMIT
                release: jest.fn()
            };

            pool.connect = jest.fn().mockResolvedValue(mockClient);
            mockQuery.mockResolvedValueOnce({ rows: [mockAdminUser] }); // verifyAdmin

            const response = await request(app)
                .delete('/api/admin/users/user-789')
                .set('Cookie', [`token=${adminToken}`])
                .expect(200);

            expect(response.body.message).toBe('User deleted successfully');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should prevent deletion of user with active orders', async () => {
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [] }) // BEGIN
                    .mockResolvedValueOnce({ rows: [{ id: 'user-999' }] }) // get user
                    .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // active orders
                    .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
                release: jest.fn()
            };

            pool.connect = jest.fn().mockResolvedValue(mockClient);
            mockQuery.mockResolvedValueOnce({ rows: [mockAdminUser] });

            const response = await request(app)
                .delete('/api/admin/users/user-999')
                .set('Cookie', [`token=${adminToken}`])
                .expect(400);

            expect(response.body.error).toContain('active orders');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });
});
