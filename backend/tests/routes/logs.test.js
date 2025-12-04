const request = require('supertest');
const { Pool } = require('pg');
const app = require('../server');

describe('Logging API Tests', () => {
    let pool;
    let adminToken;
    let userToken;
    let testUserId;

    beforeAll(async () => {
        // Setup database connection
        pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        // Create test admin user and get token
        const adminResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@matrix-delivery.com',
                password: 'Admin@Matrix2024!'
            });

        adminToken = adminResponse.body.token;

        // Create test regular user
        const userResponse = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'testuser@example.com',
                password: 'Test@1234',
                phone: '+1234567890',
                role: 'customer'
            });

        userToken = userResponse.body.token;
        testUserId = userResponse.body.user.id;
    });

    afterAll(async () => {
        // Cleanup test data
        await pool.query('DELETE FROM logs WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE email = $1', ['testuser@example.com']);
        await pool.end();
    });

    describe('POST /api/logs/frontend', () => {
        it('should accept a single frontend log', async () => {
            const response = await request(app)
                .post('/api/logs/frontend')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    level: 'error',
                    message: 'Test error message',
                    category: 'test',
                    url: 'http://localhost:3000/test',
                    stackTrace: 'Error: Test error\n  at test.js:10:5'
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Logs received');
            expect(response.body.received).toBe(1);
            expect(response.body.success).toBe(1);
        });

        it('should accept batch frontend logs', async () => {
            const logs = [
                {
                    level: 'error',
                    message: 'Batch error 1',
                    category: 'test'
                },
                {
                    level: 'warn',
                    message: 'Batch warning 1',
                    category: 'test'
                },
                {
                    level: 'info',
                    message: 'Batch info 1',
                    category: 'test'
                }
            ];

            const response = await request(app)
                .post('/api/logs/frontend')
                .set('Authorization', `Bearer ${userToken}`)
                .send(logs);

            expect(response.status).toBe(201);
            expect(response.body.received).toBe(3);
            expect(response.body.success).toBe(3);
        });

        it('should reject unauthenticated requests', async () => {
            const response = await request(app)
                .post('/api/logs/frontend')
                .send({
                    level: 'error',
                    message: 'Test error'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/logs', () => {
        beforeAll(async () => {
            // Create test logs
            await pool.query(
                `INSERT INTO logs (level, source, category, message, user_id)
         VALUES 
         ('error', 'frontend', 'test', 'Test error 1', $1),
         ('warn', 'frontend', 'test', 'Test warning 1', $1),
         ('info', 'backend', 'test', 'Test info 1', $1),
         ('error', 'backend', 'api', 'API error 1', $1)`,
                [testUserId]
            );
        });

        it('should retrieve logs with admin token', async () => {
            const response = await request(app)
                .get('/api/logs')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.logs).toBeDefined();
            expect(Array.isArray(response.body.logs)).toBe(true);
            expect(response.body.pagination).toBeDefined();
        });

        it('should filter logs by level', async () => {
            const response = await request(app)
                .get('/api/logs?level=error')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            response.body.logs.forEach(log => {
                expect(log.level).toBe('error');
            });
        });

        it('should filter logs by source', async () => {
            const response = await request(app)
                .get('/api/logs?source=frontend')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            response.body.logs.forEach(log => {
                expect(log.source).toBe('frontend');
            });
        });

        it('should filter logs by category', async () => {
            const response = await request(app)
                .get('/api/logs?category=api')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            response.body.logs.forEach(log => {
                expect(log.category).toBe('api');
            });
        });

        it('should search logs', async () => {
            const response = await request(app)
                .get('/api/logs?search=API')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.logs.length).toBeGreaterThan(0);
        });

        it('should paginate logs', async () => {
            const response = await request(app)
                .get('/api/logs?page=1&limit=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.logs.length).toBeLessThanOrEqual(2);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(2);
        });

        it('should reject non-admin requests', async () => {
            const response = await request(app)
                .get('/api/logs')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/logs/stats', () => {
        it('should retrieve log statistics', async () => {
            const response = await request(app)
                .get('/api/logs/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.total_logs).toBeDefined();
            expect(response.body.error_count).toBeDefined();
            expect(response.body.warn_count).toBeDefined();
            expect(response.body.info_count).toBeDefined();
            expect(response.body.frontend_count).toBeDefined();
            expect(response.body.backend_count).toBeDefined();
            expect(response.body.last_24h_count).toBeDefined();
        });

        it('should reject non-admin requests', async () => {
            const response = await request(app)
                .get('/api/logs/stats')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/logs/:id', () => {
        let testLogId;

        beforeAll(async () => {
            const result = await pool.query(
                `INSERT INTO logs (level, source, category, message, user_id)
         VALUES ('error', 'frontend', 'test', 'Test log for ID fetch', $1)
         RETURNING id`,
                [testUserId]
            );
            testLogId = result.rows[0].id;
        });

        it('should retrieve a single log by ID', async () => {
            const response = await request(app)
                .get(`/api/logs/${testLogId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(testLogId);
            expect(response.body.message).toBe('Test log for ID fetch');
        });

        it('should return 404 for non-existent log', async () => {
            const response = await request(app)
                .get('/api/logs/999999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/logs/cleanup', () => {
        beforeAll(async () => {
            // Create old log (35 days ago)
            await pool.query(
                `INSERT INTO logs (level, source, category, message, user_id, timestamp)
         VALUES ('info', 'backend', 'test', 'Old log', $1, NOW() - INTERVAL '35 days')`,
                [testUserId]
            );
        });

        it('should cleanup old logs', async () => {
            const response = await request(app)
                .delete('/api/logs/cleanup')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Log cleanup completed');
            expect(response.body.deletedCount).toBeGreaterThanOrEqual(0);
        });

        it('should reject non-admin requests', async () => {
            const response = await request(app)
                .delete('/api/logs/cleanup')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });
    });
});
