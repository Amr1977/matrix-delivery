const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const driversRouter = require('../drivers');

// Mock database pool
const mockPool = {
    query: jest.fn()
};

// Create test app
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    });

    app.use('/api/drivers', driversRouter);
    return app;
};

// Helper to create JWT token
const createToken = (userId, primary_role) => {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'test-secret');
};

describe('Driver Earnings Endpoints', () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });

    describe('GET /api/drivers/earnings/stats', () => {
        const driverId = 1;
        const driverToken = createToken(driverId, 'driver');
        const customerToken = createToken(2, 'customer');

        it('should return 401 for unauthenticated requests', async () => {
            const res = await request(app)
                .get('/api/drivers/earnings/stats');

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('No token provided');
        });

        it('should return 403 for non-driver users', async () => {
            const res = await request(app)
                .get('/api/drivers/earnings/stats')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(403);
        });

        it('should return correct stats for driver with earnings', async () => {
            // Mock today's earnings
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: '150.50' }]
            });

            // Mock week's earnings
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: '850.75' }]
            });

            // Mock month's earnings
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: '3200.00' }]
            });

            // Mock 7-day trend
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { date: '2025-12-01', amount: '150.50' },
                    { date: '2025-11-30', amount: '200.00' },
                    { date: '2025-11-29', amount: '175.25' },
                    { date: '2025-11-28', amount: '125.00' },
                    { date: '2025-11-27', amount: '100.00' },
                    { date: '2025-11-26', amount: '50.00' },
                    { date: '2025-11-25', amount: '50.00' }
                ]
            });

            const res = await request(app)
                .get('/api/drivers/earnings/stats')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                today: 150.50,
                week: 850.75,
                month: 3200.00,
                chartData: expect.arrayContaining([
                    expect.objectContaining({ date: expect.any(String), amount: expect.any(Number) })
                ])
            });
            expect(res.body.chartData).toHaveLength(7);
        });

        it('should return zero stats for driver with no earnings', async () => {
            mockPool.query.mockResolvedValue({ rows: [{ total: null }] });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: null }] });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: null }] });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: null }] });
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/drivers/earnings/stats')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(res.status).toBe(200);
            expect(res.body.today).toBe(0);
            expect(res.body.week).toBe(0);
            expect(res.body.month).toBe(0);
            expect(res.body.chartData).toEqual([]);
        });

        it('should calculate daily earnings correctly (today only)', async () => {
            const today = new Date().toISOString().split('T')[0];

            mockPool.query.mockImplementation((query) => {
                if (query.text && query.text.includes('DATE(delivered_at) = CURRENT_DATE')) {
                    return Promise.resolve({ rows: [{ total: '150.50' }] });
                }
                return Promise.resolve({ rows: [{ total: null }] });
            });

            const res = await request(app)
                .get('/api/drivers/earnings/stats')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(res.status).toBe(200);
            expect(res.body.today).toBe(150.50);
        });

        it('should fall back to order price when driver_earnings is null', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: '100.00' }] // From orders.price
            });

            const res = await request(app)
                .get('/api/drivers/earnings/stats')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(res.status).toBe(200);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('COALESCE(p.driver_earnings, o.price, b.bid_price)')
                })
            );
        });
    });

    describe('GET /api/drivers/earnings/history', () => {
        const driverId = 1;
        const driverToken = createToken(driverId, 'driver');
        const customerToken = createToken(2, 'customer');

        it('should return 401 for unauthenticated requests', async () => {
            const res = await request(app)
                .get('/api/drivers/earnings/history');

            expect(res.status).toBe(401);
        });

        it('should return 403 for non-driver users', async () => {
            const res = await request(app)
                .get('/api/drivers/earnings/history')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(403);
        });

        it('should return paginated order history', async () => {
            const mockOrders = [
                {
                    id: 1,
                    order_number: 'ORD-001',
                    delivered_at: '2025-12-01T10:00:00Z',
                    amount: '50.00',
                    rating: 5
                },
                {
                    id: 2,
                    order_number: 'ORD-002',
                    delivered_at: '2025-11-30T15:30:00Z',
                    amount: '75.50',
                    rating: 4
                }
            ];

            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: '25' }]
            });

            mockPool.query.mockResolvedValueOnce({
                rows: mockOrders
            });

            const res = await request(app)
                .get('/api/drivers/earnings/history?page=1&limit=10')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(res.status).toBe(200);
            expect(res.body.orders).toHaveLength(2);
            expect(res.body.orders[0]).toMatchObject({
                id: 1,
                orderNumber: 'ORD-001',
                date: '2025-12-01T10:00:00Z',
                amount: 50.00,
                rating: 5
            });
            expect(res.body.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 25,
                totalPages: 3
            });
        });

        it('should only return completed orders for authenticated driver', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await request(app)
                .get('/api/drivers/earnings/history')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringMatching(/WHERE.*assigned_driver_user_id.*=.*AND.*status.*=.*'delivered'/i)
                })
            );
        });

        it('should respect page and limit parameters', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: '50' }] });
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/drivers/earnings/history?page=3&limit=20')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('LIMIT'),
                    values: expect.arrayContaining([20, 40]) // limit, offset
                })
            );
        });

        it('should return correct pagination metadata', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: '47' }] });
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/drivers/earnings/history?page=2&limit=15')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(res.body.pagination).toEqual({
                page: 2,
                limit: 15,
                total: 47,
                totalPages: 4 // ceil(47/15)
            });
        });

        it('should handle empty results gracefully', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/drivers/earnings/history')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(res.status).toBe(200);
            expect(res.body.orders).toEqual([]);
            expect(res.body.pagination.total).toBe(0);
        });

        it('should order by delivered_at DESC', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await request(app)
                .get('/api/drivers/earnings/history')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringMatching(/ORDER BY.*delivered_at.*DESC/i)
                })
            );
        });

        it('should include order number, date, amount, and rating', async () => {
            const mockOrder = {
                id: 1,
                order_number: 'ORD-123',
                delivered_at: '2025-12-01T10:00:00Z',
                amount: '99.99',
                rating: 5
            };

            mockPool.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
            mockPool.query.mockResolvedValueOnce({ rows: [mockOrder] });

            const res = await request(app)
                .get('/api/drivers/earnings/history')
                .set('Authorization', `Bearer ${driverToken}`);

            expect(res.body.orders[0]).toHaveProperty('orderNumber');
            expect(res.body.orders[0]).toHaveProperty('date');
            expect(res.body.orders[0]).toHaveProperty('amount');
            expect(res.body.orders[0]).toHaveProperty('rating');
        });
    });
});

module.exports = { createToken };
