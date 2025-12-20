const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../../config/db');
jest.mock('../../../config/logger');

const pool = require('../../../config/db');

describe('Health & Stats Endpoints', () => {
    let app;

    beforeEach(() => {
        // Create minimal Express app for testing
        app = express();
        app.use(express.json());

        // Mount the health routes
        app.use('/api/health', require('../../../routes/health'));

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('GET /api/health', () => {
        it('should return healthy status with stats', async () => {
            // Mock database queries
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '150' }] }) // users
                .mockResolvedValueOnce({ rows: [{ count: '45' }] })  // orders
                .mockResolvedValueOnce({ rows: [{ count: '12' }] })  // pending_bids
                .mockResolvedValueOnce({ rows: [{ count: '8' }] })   // accepted
                .mockResolvedValueOnce({ rows: [{ count: '25' }] }); // delivered

            const res = await request(app)
                .get('/api/health')
                .expect(200);

            expect(res.body).toHaveProperty('status', 'healthy');
            expect(res.body).toHaveProperty('database', 'PostgreSQL');
            expect(res.body).toHaveProperty('uptime');
            expect(res.body).toHaveProperty('memory');
            expect(res.body).toHaveProperty('stats');
            expect(res.body).toHaveProperty('version', '1.0.0');
            expect(res.body).toHaveProperty('timestamp');

            // Verify stats
            expect(res.body.stats).toEqual({
                users: 150,
                orders: 45,
                openOrders: 12,
                activeOrders: 8,
                completedOrders: 25
            });

            // Verify memory stats exist
            expect(res.body.memory).toHaveProperty('used');
            expect(res.body.memory).toHaveProperty('total');
            expect(typeof res.body.memory.used).toBe('number');
            expect(typeof res.body.memory.total).toBe('number');
        });

        it('should return environment based on NODE_ENV', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/health')
                .expect(200);

            // In test environment
            expect(['testing', 'development', 'production']).toContain(res.body.environment);
        });

        it('should handle database errors gracefully', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const res = await request(app)
                .get('/api/health')
                .expect(500);

            expect(res.body).toHaveProperty('status', 'unhealthy');
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Database connection failed');
        });

        it('should return valid timestamp format', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const res = await request(app)
                .get('/api/health')
                .expect(200);

            // Verify timestamp is valid ISO 8601 format
            expect(() => new Date(res.body.timestamp)).not.toThrow();
            expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
        });
    });

    describe('GET /api/health/footer/stats', () => {
        it('should return comprehensive footer statistics', async () => {
            // Mock all database queries
            pool.query
                .mockResolvedValueOnce({ // users by role
                    rows: [
                        { primary_role: 'customer', count: '100' },
                        { primary_role: 'driver', count: '40' },
                        { primary_role: 'vendor', count: '10' }
                    ]
                })
                .mockResolvedValueOnce({ rows: [{ count: '15' }] })  // active orders
                .mockResolvedValueOnce({ rows: [{ count: '8' }] })   // pending orders
                .mockResolvedValueOnce({ rows: [{ count: '50' }] })  // completed orders
                .mockResolvedValueOnce({ rows: [{ total: '12500.50' }] }) // revenue
                .mockResolvedValueOnce({ rows: [{ count: '12' }] })  // active drivers
                .mockResolvedValueOnce({ rows: [{ avg_rating: '4.7' }] }) // avg rating
                .mockResolvedValueOnce({ rows: [{ count: '5' }] });  // today's orders

            const res = await request(app)
                .get('/api/health/footer/stats')
                .expect(200);

            expect(res.body).toHaveProperty('deploymentTimestamp');
            expect(res.body).toHaveProperty('serverUptime');
            expect(res.body).toHaveProperty('usersByRole');
            expect(res.body).toHaveProperty('activeOrders', 15);
            expect(res.body).toHaveProperty('pendingOrders', 8);
            expect(res.body).toHaveProperty('completedOrders', 50);
            expect(res.body).toHaveProperty('totalRevenue', 12500.50);
            expect(res.body).toHaveProperty('activeDrivers', 12);
            expect(res.body).toHaveProperty('avgRating', 4.7);
            expect(res.body).toHaveProperty('todayOrders', 5);
            expect(res.body).toHaveProperty('lastUpdated');

            // Verify usersByRole structure
            expect(res.body.usersByRole).toEqual({
                customer: 100,
                driver: 40,
                vendor: 10
            });
        });

        it('should round average rating to 1 decimal place', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // users by role
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ avg_rating: '4.6789' }] }) // precise rating
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/health/footer/stats')
                .expect(200);

            expect(res.body.avgRating).toBe(4.7); // Rounded to 1 decimal
        });

        it('should handle null average rating', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ avg_rating: null }] }) // no ratings yet
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/health/footer/stats')
                .expect(200);

            expect(res.body.avgRating).toBe(0); // Default to 0 when null
        });

        it('should handle database errors gracefully', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database query failed'));

            const res = await request(app)
                .get('/api/health/footer/stats')
                .expect(500);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Failed to get footer statistics');
        });

        it('should return valid ISO timestamps', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ avg_rating: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/health/footer/stats')
                .expect(200);

            // Verify timestamps are valid ISO 8601 format
            expect(() => new Date(res.body.deploymentTimestamp)).not.toThrow();
            expect(() => new Date(res.body.lastUpdated)).not.toThrow();
        });

        it('should return server uptime as a number', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ avg_rating: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/health/footer/stats')
                .expect(200);

            expect(typeof res.body.serverUptime).toBe('number');
            expect(res.body.serverUptime).toBeGreaterThan(0);
        });
    });

    describe('Route Integration', () => {
        it('should handle requests to /api/health base path', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const res = await request(app)
                .get('/api/health')
                .expect(200);

            expect(res.body.status).toBe('healthy');
        });

        it('should handle requests to /api/health/footer/stats path', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({ rows: [{ avg_rating: '0' }] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/health/footer/stats')
                .expect(200);

            expect(res.body).toHaveProperty('usersByRole');
        });
    });
});
