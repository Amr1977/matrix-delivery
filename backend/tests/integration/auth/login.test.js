const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../../config/db');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const pool = require('../../../config/db');

describe('POST /api/auth/login', () => {
    let app;
    const JWT_SECRET = 'test-secret-key-for-testing-only';

    beforeEach(() => {
        app = express();
        app.use(express.json());

        process.env.JWT_SECRET = JWT_SECRET;
        process.env.NODE_ENV = 'test';

        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('Successful Login', () => {
        it('should login with valid credentials', async () => {
            const loginData = {
                email: 'john@example.com',
                password: 'SecurePass123!'
            };

            const mockUser = {
                id: 'user-123',
                name: 'John Doe',
                email: loginData.email,
                password: 'hashed-password',
                primary_role: 'customer',
                phone: '+1234567890',
                country: 'USA',
                city: 'New York',
                area: 'Manhattan'
            };

            // Mock database query
            pool.query.mockResolvedValueOnce({ rows: [mockUser] });

            // Mock bcrypt compare
            bcrypt.compare.mockResolvedValue(true);

            // Mock JWT
            jwt.sign.mockReturnValue('test-jwt-token');

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', loginData.email);
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('should set httpOnly cookie on successful login', async () => {
            const loginData = {
                email: 'john@example.com',
                password: 'SecurePass123!'
            };

            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 'user-123',
                    email: loginData.email,
                    password: 'hashed-password',
                    primary_role: 'customer'
                }]
            });

            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('test-jwt-token');

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain('httpOnly');
        });
    });

    describe('Failed Login Attempts', () => {
        it('should reject login with non-existent email', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'SecurePass123!'
            };

            // Mock no user found
            pool.query.mockResolvedValueOnce({ rows: [] });

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Invalid');
        });

        it('should reject login with wrong password', async () => {
            const loginData = {
                email: 'john@example.com',
                password: 'WrongPassword123!'
            };

            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 'user-123',
                    email: loginData.email,
                    password: 'hashed-password',
                    primary_role: 'customer'
                }]
            });

            // Mock password mismatch
            bcrypt.compare.mockResolvedValue(false);

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Invalid');
        });

        it('should reject login with missing email', async () => {
            const loginData = {
                password: 'SecurePass123!'
            };

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.status).toBe(400);
        });

        it('should reject login with missing password', async () => {
            const loginData = {
                email: 'john@example.com'
            };

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.status).toBe(400);
        });
    });

    describe('Security Features', () => {
        it('should not leak information about user existence', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'SecurePass123!'
            };

            pool.query.mockResolvedValueOnce({ rows: [] });

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            // Error message should be generic
            expect(res.body.error).not.toContain('not found');
            expect(res.body.error).not.toContain('does not exist');
        });

        it('should generate JWT with correct payload', async () => {
            const loginData = {
                email: 'john@example.com',
                password: 'SecurePass123!'
            };

            const mockUser = {
                id: 'user-123',
                name: 'John Doe',
                email: loginData.email,
                password: 'hashed-password',
                primary_role: 'customer'
            };

            pool.query.mockResolvedValueOnce({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('test-jwt-token');

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUser.id,
                    email: mockUser.email,
                    name: mockUser.name
                }),
                JWT_SECRET,
                expect.any(Object)
            );
        });
    });

    describe('Database Errors', () => {
        it('should handle database errors gracefully', async () => {
            const loginData = {
                email: 'john@example.com',
                password: 'SecurePass123!'
            };

            pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const loginRoute = require('../routes/auth');
            app.use('/api/auth', loginRoute);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.status).toBe(500);
        });
    });
});
