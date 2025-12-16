/**
 * Balance API Integration Tests
 * 
 * Comprehensive tests for all Balance API v1 endpoints
 */

import request from 'supertest';
import { Pool } from 'pg';
import app from '../../server';

describe('Balance API v1', () => {
    let pool: Pool;
    let authToken: string;
    let adminToken: string;
    let testUserId: number;
    let testDriverId: number;
    let testAdminId: number;

    beforeAll(async () => {
        // Initialize database connection
        pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        // Create test users
        const timestamp = Date.now();

        // Create regular user
        const userResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area)
             VALUES ('Test User', $1, 'hashed', '01234567890', 'customer', 'Egypt', 'Cairo', 'Nasr City')
             RETURNING id`,
            [`test.user.${timestamp}@test.com`]
        );
        testUserId = userResult.rows[0].id;

        // Create driver user
        const driverResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area)
             VALUES ('Test Driver', $1, 'hashed', '01234567891', 'driver', 'Egypt', 'Cairo', 'Maadi')
             RETURNING id`,
            [`test.driver.${timestamp}@test.com`]
        );
        testDriverId = driverResult.rows[0].id;

        // Create admin user
        const adminResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area)
             VALUES ('Test Admin', $1, 'hashed', '01234567892', 'admin', 'Egypt', 'Cairo', 'Downtown')
             RETURNING id`,
            [`test.admin.${timestamp}@test.com`]
        );
        testAdminId = adminResult.rows[0].id;

        // Create balances
        await pool.query(
            `INSERT INTO user_balances (user_id, currency) VALUES ($1, 'EGP'), ($2, 'EGP')`,
            [testUserId, testDriverId]
        );

        // Generate auth tokens (mock JWT for testing)
        authToken = generateTestToken(testUserId, 'customer');
        adminToken = generateTestToken(testAdminId, 'admin');
    });

    afterAll(async () => {
        // Cleanup
        await pool.query(`DELETE FROM balance_holds WHERE user_id IN ($1, $2)`, [testUserId, testDriverId]);
        await pool.query(`DELETE FROM balance_transactions WHERE user_id IN ($1, $2)`, [testUserId, testDriverId]);
        await pool.query(`DELETE FROM user_balances WHERE user_id IN ($1, $2)`, [testUserId, testDriverId]);
        await pool.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [testUserId, testDriverId, testAdminId]);
        await pool.end();
    });

    beforeEach(async () => {
        // Reset balances before each test
        await pool.query(
            `UPDATE user_balances 
             SET available_balance = 0, pending_balance = 0, held_balance = 0,
                 is_frozen = FALSE, freeze_reason = NULL, frozen_at = NULL, frozen_by = NULL
             WHERE user_id IN ($1, $2)`,
            [testUserId, testDriverId]
        );

        // Clear transactions and holds
        await pool.query(`DELETE FROM balance_holds WHERE user_id IN ($1, $2)`, [testUserId, testDriverId]);
        await pool.query(`DELETE FROM balance_transactions WHERE user_id IN ($1, $2)`, [testUserId, testDriverId]);
    });

    // ========================================================================
    // HEALTH & VERSION ENDPOINTS
    // ========================================================================

    describe('GET /api/v1/health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/v1/health')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.version).toBe('v1');
            expect(response.body.status).toBe('healthy');
        });
    });

    describe('GET /api/v1/version', () => {
        it('should return version info', async () => {
            const response = await request(app)
                .get('/api/v1/version')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.apiVersion).toBe('v1');
            expect(response.body.features).toBeInstanceOf(Array);
        });
    });

    // ========================================================================
    // GET BALANCE
    // ========================================================================

    describe('GET /api/v1/balance/:userId', () => {
        it('should get user balance with valid token', async () => {
            const response = await request(app)
                .get(`/api/v1/balance/${testUserId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.userId).toBe(testUserId);
            expect(response.body.data.availableBalance).toBe(0);
            expect(response.body.data.currency).toBe('EGP');
        });

        it('should return 401 without auth token', async () => {
            await request(app)
                .get(`/api/v1/balance/${testUserId}`)
                .expect(401);
        });

        it('should return 403 when accessing another user balance', async () => {
            await request(app)
                .get(`/api/v1/balance/${testDriverId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);
        });

        it('should allow admin to access any balance', async () => {
            const response = await request(app)
                .get(`/api/v1/balance/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return 404 for non-existent user', async () => {
            await request(app)
                .get('/api/v1/balance/999999')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    // ========================================================================
    // DEPOSIT
    // ========================================================================

    describe('POST /api/v1/balance/deposit', () => {
        it('should deposit funds successfully', async () => {
            const response = await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 1000,
                    description: 'Test deposit'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.amount).toBe(1000);
            expect(response.body.data.balance.availableBalance).toBe(1000);
        });

        it('should validate minimum deposit amount', async () => {
            await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 0.5,
                    description: 'Too small'
                })
                .expect(422);
        });

        it('should validate maximum deposit amount', async () => {
            await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 200000,
                    description: 'Too large'
                })
                .expect(422);
        });

        it('should reject negative amounts', async () => {
            await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: -100,
                    description: 'Negative'
                })
                .expect(422);
        });

        it('should enforce rate limiting', async () => {
            // Make 21 deposits (limit is 20/hour)
            const promises = Array(21).fill(null).map((_, i) =>
                request(app)
                    .post('/api/v1/balance/deposit')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        userId: testUserId,
                        amount: 10,
                        description: `Deposit ${i}`
                    })
            );

            const results = await Promise.all(promises);
            const rateLimited = results.some(r => r.status === 429);
            expect(rateLimited).toBe(true);
        });
    });

    // ========================================================================
    // WITHDRAWAL
    // ========================================================================

    describe('POST /api/v1/balance/withdraw', () => {
        beforeEach(async () => {
            // Add balance for withdrawal tests
            await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 5000,
                    description: 'Setup for withdrawal'
                });
        });

        it('should withdraw funds successfully', async () => {
            const response = await request(app)
                .post('/api/v1/balance/withdraw')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 1000,
                    destination: 'bank_account',
                    description: 'Test withdrawal'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.amount).toBe(-1000);
            expect(response.body.data.balance.availableBalance).toBe(4000);
        });

        it('should reject withdrawal with insufficient balance', async () => {
            await request(app)
                .post('/api/v1/balance/withdraw')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 10000,
                    destination: 'bank_account',
                    description: 'Too much'
                })
                .expect(400);
        });

        it('should validate minimum withdrawal amount', async () => {
            await request(app)
                .post('/api/v1/balance/withdraw')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 5,
                    destination: 'bank_account',
                    description: 'Too small'
                })
                .expect(422);
        });

        it('should enforce withdrawal rate limiting', async () => {
            // Make 11 withdrawals (limit is 10/hour)
            const promises = Array(11).fill(null).map((_, i) =>
                request(app)
                    .post('/api/v1/balance/withdraw')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        userId: testUserId,
                        amount: 100,
                        destination: 'bank_account',
                        description: `Withdrawal ${i}`
                    })
            );

            const results = await Promise.all(promises);
            const rateLimited = results.some(r => r.status === 429);
            expect(rateLimited).toBe(true);
        });
    });

    // ========================================================================
    // TRANSACTION HISTORY
    // ========================================================================

    describe('GET /api/v1/balance/:userId/transactions', () => {
        beforeEach(async () => {
            // Create some transactions
            await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ userId: testUserId, amount: 1000, description: 'Deposit 1' });

            await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ userId: testUserId, amount: 500, description: 'Deposit 2' });
        });

        it('should get transaction history', async () => {
            const response = await request(app)
                .get(`/api/v1/balance/${testUserId}/transactions`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.transactions).toBeInstanceOf(Array);
            expect(response.body.data.transactions.length).toBeGreaterThan(0);
            expect(response.body.data.pagination).toBeDefined();
        });

        it('should filter by transaction type', async () => {
            const response = await request(app)
                .get(`/api/v1/balance/${testUserId}/transactions?type=deposit`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.data.transactions.every((t: any) => t.type === 'deposit')).toBe(true);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get(`/api/v1/balance/${testUserId}/transactions?limit=1&offset=0`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.data.transactions.length).toBe(1);
            expect(response.body.data.pagination.limit).toBe(1);
        });
    });

    // ========================================================================
    // BALANCE STATEMENT
    // ========================================================================

    describe('GET /api/v1/balance/:userId/statement', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ userId: testUserId, amount: 1000, description: 'Test' });
        });

        it('should generate balance statement', async () => {
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            const response = await request(app)
                .get(`/api/v1/balance/${testUserId}/statement`)
                .query({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.userId).toBe(testUserId);
            expect(response.body.data.period).toBeDefined();
            expect(response.body.data.totalDeposits).toBeGreaterThan(0);
        });

        it('should require start and end dates', async () => {
            await request(app)
                .get(`/api/v1/balance/${testUserId}/statement`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(422);
        });
    });

    // ========================================================================
    // BALANCE HOLDS
    // ========================================================================

    describe('POST /api/v1/balance/hold', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/v1/balance/deposit')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ userId: testUserId, amount: 2000, description: 'Setup' });
        });

        it('should create balance hold', async () => {
            const response = await request(app)
                .post('/api/v1/balance/hold')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 500,
                    reason: 'Order escrow'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.amount).toBe(500);
            expect(response.body.data.status).toBe('active');
        });

        it('should reject hold with insufficient balance', async () => {
            await request(app)
                .post('/api/v1/balance/hold')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 5000,
                    reason: 'Too much'
                })
                .expect(400);
        });
    });

    // ========================================================================
    // ADMIN ENDPOINTS
    // ========================================================================

    describe('POST /api/v1/balance/admin/freeze', () => {
        it('should freeze balance as admin', async () => {
            const response = await request(app)
                .post('/api/v1/balance/admin/freeze')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    userId: testUserId,
                    reason: 'Suspicious activity'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.isFrozen).toBe(true);
        });

        it('should reject freeze from non-admin', async () => {
            await request(app)
                .post('/api/v1/balance/admin/freeze')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testDriverId,
                    reason: 'Test'
                })
                .expect(403);
        });
    });

    describe('POST /api/v1/balance/admin/adjust', () => {
        it('should adjust balance as admin', async () => {
            const response = await request(app)
                .post('/api/v1/balance/admin/adjust')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    userId: testUserId,
                    amount: 500,
                    reason: 'Compensation'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.amount).toBe(500);
        });

        it('should reject adjustment from non-admin', async () => {
            await request(app)
                .post('/api/v1/balance/admin/adjust')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    amount: 100,
                    reason: 'Test'
                })
                .expect(403);
        });
    });
});

// Helper function to generate test JWT tokens
function generateTestToken(userId: number, role: string): string {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        { userId, role, primary_role: role },
        process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'matrix-delivery', audience: 'matrix-delivery-api' }
    );
}
