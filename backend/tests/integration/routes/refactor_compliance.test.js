const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../config/db');
jest.mock('jsonwebtoken');
jest.mock('../../../config/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    security: jest.fn(),
    auth: jest.fn(),
    http: jest.fn()
}));

const pool = require('../../../config/db');

describe('Refactored Routes Compliance', () => {
    let app;
    const JWT_SECRET = 'test-secret';

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        process.env.NODE_ENV = 'test';
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(cookieParser());

        // Setup routes
        app.use('/api/browse', require('../../../routes/browse'));
        app.use('/api/vendors', require('../../../routes/vendors'));
        app.use('/api/users', require('../../../routes/users'));

        jest.clearAllMocks();
    });

    describe('GET /api/browse/vendors', () => {
        it('should require authentication', async () => {
            const res = await request(app).get('/api/browse/vendors');
            expect(res.status).toBe(401);
        });

        it('should return vendors list when authenticated', async () => {
            // Mock JWT verify
            jwt.verify.mockReturnValue({ userId: 'user-123', role: 'customer' });

            // Mock DB query
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'v1', name: 'Vendor 1' }] });

            const res = await request(app)
                .get('/api/browse/vendors')
                .set('Authorization', 'Bearer valid-token');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(res.body.items[0].name).toBe('Vendor 1');
            expect(pool.query).toHaveBeenCalled();
        });
    });

    describe('GET /api/vendors', () => {
        // Public endpoint
        it('should be public and return vendors', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'v1', name: 'Vendor Public' }] });

            const res = await request(app).get('/api/vendors');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Vendor Public');
        });
    });

    describe('GET /api/users/me/profile', () => {
        it('should require authentication', async () => {
            const res = await request(app).get('/api/users/me/profile');
            expect(res.status).toBe(401);
        });

        it('should return user profile when authenticated', async () => {
            jwt.verify.mockReturnValue({ userId: 'user-123', role: 'customer' });

            // Mock queries: 1. User profile, 2. Payment methods count, 3. Favorites count
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123', name: 'John Doe' }] })
                .mockResolvedValueOnce({ rows: [{ cnt: 2 }] })
                .mockResolvedValueOnce({ rows: [{ cnt: 5 }] });

            const res = await request(app)
                .get('/api/users/me/profile')
                .set('Authorization', 'Bearer valid-token');

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('John Doe');
            expect(res.body.paymentMethodsCount).toBe(2);
            expect(res.body.favoritesCount).toBe(5);
        });
    });
});
