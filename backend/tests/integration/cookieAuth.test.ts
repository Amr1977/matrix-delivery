/**
 * Integration Tests for Cookie-Based Authentication
 * 
 * These tests ensure that all API calls use cookie-based authentication
 * and prevent regressions to Authorization header usage.
 */

import request from 'supertest';
import app from '../../server';
import pool from '../../config/db';
import bcrypt from 'bcryptjs';

describe('Cookie-Based Authentication Integration Tests', () => {
    let authCookie: string;
    let testUser: any;
    let hashedPassword: string;

    beforeAll(async () => {
        // Hash password
        hashedPassword = await bcrypt.hash('password123', 10);

        // Create test user
        const result = await pool.query(
            `INSERT INTO users (id, name, email, password_hash, phone, primary_role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            ['test-user-auth', 'Test User', 'test@auth.com', hashedPassword, '1234567890', 'customer', true]
        );
        testUser = result.rows[0];
    });

    afterAll(async () => {
        // Cleanup
        await pool.query('DELETE FROM users WHERE id = $1', ['test-user-auth']);
        // Don't close pool - it's shared across tests
    });

    describe('Authentication Flow', () => {
        it('should set httpOnly cookie on login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@auth.com',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.headers['set-cookie']).toBeDefined();

            const cookies = (response.headers['set-cookie'] || []) as unknown as string[];
            const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));

            expect(tokenCookie).toBeDefined();
            expect(tokenCookie).toContain('HttpOnly');
            expect(tokenCookie).toContain('SameSite=Lax');

            // Store cookie for subsequent requests
            authCookie = tokenCookie!.split(';')[0];
        });

        it('should NOT include token in response body', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@auth.com',
                    password: 'password123'
                });

            expect(response.body.token).toBeUndefined();
            expect(response.body.user).toBeDefined();
        });
    });

    describe('Protected Endpoints - Cookie Authentication', () => {
        beforeEach(async () => {
            // Login to get cookie
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@auth.com',
                    password: 'password123'
                });

            authCookie = loginResponse.headers['set-cookie']![0].split(';')[0];
        });

        it('should accept requests with cookie (no Authorization header)', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Cookie', authCookie);

            expect(response.status).toBe(200);
            expect(response.body.email).toBe('test@auth.com');
        });

        it('should reject requests without cookie', async () => {
            const response = await request(app)
                .get('/api/auth/me');

            expect(response.status).toBe(401);
        });

        it('should reject requests with Authorization header but no cookie', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer fake-token');

            expect(response.status).toBe(401);
        });

        it('should work for /api/orders with cookie', async () => {
            const response = await request(app)
                .get('/api/orders')
                .set('Cookie', authCookie);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should work for /api/notifications with cookie', async () => {
            const response = await request(app)
                .get('/api/notifications')
                .set('Cookie', authCookie);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should work for /api/drivers/location with cookie (driver role)', async () => {
            // Cleanup potential leftover
            await pool.query('DELETE FROM users WHERE id = $1', ['test-driver-auth']);

            // Create driver user
            await pool.query(
                `INSERT INTO users (id, name, email, password_hash, phone, primary_role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['test-driver-auth', 'Test Driver', 'driver@auth.com', hashedPassword, '1234567890', 'driver', true]
            );

            // Login as driver
            const driverLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'driver@auth.com',
                    password: 'password123'
                });

            const driverCookie = driverLogin.headers['set-cookie']![0].split(';')[0];

            const response = await request(app)
                .get('/api/drivers/location')
                .set('Cookie', driverCookie);

            expect(response.status).not.toBe(401); // Should not be unauthorized

            // Cleanup
            await pool.query('DELETE FROM users WHERE id = $1', ['test-driver-auth']);
        });
    });

    describe('Admin Endpoints - Cookie Authentication', () => {
        let adminCookie: string;

        beforeEach(async () => {
            // Cleanup potential leftover
            await pool.query('DELETE FROM users WHERE id = $1', ['test-admin-auth']);

            // Create admin user
            await pool.query(
                `INSERT INTO users (id, name, email, password_hash, phone, primary_role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['test-admin-auth', 'Test Admin', 'admin@auth.com', hashedPassword, '1234567890', 'admin', true]
            );

            // Login as admin
            const adminLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@auth.com',
                    password: 'password123'
                });

            adminCookie = adminLogin.headers['set-cookie']![0].split(';')[0];
        });

        afterEach(async () => {
            await pool.query('DELETE FROM users WHERE id = $1', ['test-admin-auth']);
        });

        it('should work for /api/admin/users with cookie', async () => {
            const response = await request(app)
                .get('/api/admin/users')
                .set('Cookie', adminCookie);

            expect(response.status).not.toBe(401);
        });

        it('should work for /api/admin/dashboard with cookie', async () => {
            const response = await request(app)
                .get('/api/admin/dashboard')
                .set('Cookie', adminCookie);

            expect(response.status).not.toBe(401);
        });
    });

    describe('Logout Flow', () => {
        it('should clear cookie on logout', async () => {
            // Login first
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@auth.com',
                    password: 'password123'
                });

            const cookie = loginResponse.headers['set-cookie']![0].split(';')[0];

            // Logout
            const logoutResponse = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', cookie);

            expect(logoutResponse.status).toBe(200);

            const clearCookie = logoutResponse.headers['set-cookie'];
            expect(clearCookie).toBeDefined();
            expect(clearCookie![0]).toContain('token=;');
            expect(clearCookie![0]).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
        });


    });

    describe('Regression Prevention', () => {
        it('should NOT accept malformed JWT in Authorization header', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer authenticated'); // The old bug

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('token');
        });

        it('should NOT accept string "authenticated" as token', async () => {
            const response = await request(app)
                .get('/api/drivers/location')
                .set('Authorization', 'Bearer authenticated');

            expect(response.status).toBe(401);
        });
    });
});
