const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../../config/db');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../middleware/rateLimit', () => ({
    authRateLimit: (req, res, next) => next() // Bypass rate limiting in tests
}));

const pool = require('../../../config/db');

describe('POST /api/auth/register', () => {
    let app;
    const JWT_SECRET = 'test-secret-key-for-testing-only';

    beforeEach(() => {
        // Create minimal Express app for testing
        app = express();
        app.use(express.json());

        // Mock environment variables
        process.env.JWT_SECRET = JWT_SECRET;
        process.env.NODE_ENV = 'test';

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('Successful Registration', () => {
        it('should register a new customer with valid data', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                phone: '+1234567890',
                primary_role: 'customer',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            // Mock database queries
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // Check existing user
                .mockResolvedValueOnce({ // Insert new user
                    rows: [{
                        id: 'user-123',
                        name: userData.name,
                        email: userData.email,
                        phone: userData.phone,
                        primary_role: userData.primary_role,
                        country: userData.country,
                        city: userData.city,
                        area: userData.area
                    }]
                });

            // Mock bcrypt
            bcrypt.hash.mockResolvedValue('hashed-password');

            // Mock JWT
            jwt.sign.mockReturnValue('test-jwt-token');

            // Import route after mocks are set up
            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(res.status).toBe(201);
            expect(res.body).not.toHaveProperty('token'); // Token is in httpOnly cookie, not body
            expect(res.body.user).toHaveProperty('email', userData.email);
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('should register a new driver with vehicle_type', async () => {
            const driverData = {
                name: 'Jane Driver',
                email: 'jane@example.com',
                password: 'SecurePass123!',
                phone: '+1234567891',
                primary_role: 'driver',
                vehicle_type: 'sedan',
                country: 'USA',
                city: 'Los Angeles',
                area: 'Downtown'
            };

            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'driver-123',
                        ...driverData,
                        password: undefined
                    }]
                });

            bcrypt.hash.mockResolvedValue('hashed-password');
            jwt.sign.mockReturnValue('test-jwt-token');

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(driverData);

            expect(res.status).toBe(201);
            expect(res.body.user).toHaveProperty('vehicle_type', 'sedan');
        });
    });

    describe('Validation Errors', () => {
        it('should reject registration with missing required fields', async () => {
            const incompleteData = {
                name: 'John Doe',
                email: 'john@example.com'
                // Missing password, phone, primary_role, location
            };

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(incompleteData);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('required');
        });

        it('should reject registration with invalid email format', async () => {
            const invalidEmailData = {
                name: 'John Doe',
                email: 'invalid-email',
                password: 'SecurePass123!',
                phone: '+1234567890',
                primary_role: 'customer',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(invalidEmailData);

            expect(res.status).toBe(400); // Validation errors return 400 Bad Request
            expect(res.body.error).toBeDefined();
        });

        it('should reject registration with weak password', async () => {
            const weakPasswordData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'weak',
                phone: '+1234567890',
                primary_role: 'customer',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(weakPasswordData);

            expect(res.status).toBe(400); // Validation errors return 400 Bad Request
            expect(res.body.error).toBeDefined();
        });

        it('should reject registration with invalid primary_role', async () => {
            const invalidRoleData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                phone: '+1234567890',
                primary_role: 'invalid_role',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(invalidRoleData);

            expect(res.status).toBe(400); // Validation errors return 400 Bad Request
            expect(res.body.error).toBeDefined();
        });

        it('should reject driver registration without vehicle_type', async () => {
            const driverWithoutVehicle = {
                name: 'Jane Driver',
                email: 'jane@example.com',
                password: 'SecurePass123!',
                phone: '+1234567891',
                primary_role: 'driver',
                // Missing vehicle_type
                country: 'USA',
                city: 'Los Angeles',
                area: 'Downtown'
            };

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(driverWithoutVehicle);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Vehicle type'); // Exact error message
        });

        it('should reject registration with duplicate email', async () => {
            const userData = {
                name: 'John Doe',
                email: 'existing@example.com',
                password: 'SecurePass123!',
                phone: '+1234567890',
                primary_role: 'customer',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            // Mock existing user found
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 'existing-user-id' }]
            });

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(res.status).toBe(409); // Conflict status for duplicate
            expect(res.body.error).toContain('already registered');
        });
    });

    describe('Security Features', () => {
        it('should hash password before storing', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                phone: '+1234567890',
                primary_role: 'customer',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] });

            bcrypt.hash.mockResolvedValue('hashed-password');
            jwt.sign.mockReturnValue('test-jwt-token');

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
        });

        it('should set httpOnly cookie with token', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                phone: '+1234567890',
                primary_role: 'customer',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] });

            bcrypt.hash.mockResolvedValue('hashed-password');
            jwt.sign.mockReturnValue('test-jwt-token');

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(userData);

            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain('HttpOnly'); // Capital H
        });

        it('should generate JWT with correct payload', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                phone: '+1234567890',
                primary_role: 'customer',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'user-123',
                        name: userData.name,
                        email: userData.email,
                        primary_role: userData.primary_role
                    }]
                });

            bcrypt.hash.mockResolvedValue('hashed-password');
            jwt.sign.mockReturnValue('test-jwt-token');

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    email: userData.email,
                    name: userData.name
                }),
                JWT_SECRET,
                expect.objectContaining({
                    expiresIn: '30d',
                    issuer: 'matrix-delivery',
                    audience: 'matrix-delivery-api'
                })
            );
        });
    });

    describe('Rate Limiting', () => {
        it('should reject requests exceeding rate limit', async () => {
            // This test would require implementing rate limiting mock
            // Skipping for now as rate limiting is in-memory
        });
    });

    describe('Database Errors', () => {
        it('should handle database connection errors gracefully', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                phone: '+1234567890',
                primary_role: 'customer',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const registerRoute = require('../../../routes/auth');
            app.use('/api/auth', registerRoute);

            const res = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(res.status).toBe(500);
        });
    });
});
