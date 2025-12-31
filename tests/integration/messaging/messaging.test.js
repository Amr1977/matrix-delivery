const request = require('supertest');
const pool = require('../../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

let app;

describe('Messaging API Tests', () => {
    let customerToken, driverToken, customerId, driverId, orderId;

    beforeAll(async () => {
        // Initialize app
        app = require('../../../server');

        // Create test users
        const hashedPassword = await bcrypt.hash('password123', 10);

        const customerResult = await pool.query(
            `INSERT INTO users (id, name, email, password, phone, primary_role, country, city, area, rating, completed_deliveries, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                'customer-msg-id',
                'Customer User',
                'customer-msg@example.com',
                hashedPassword,
                '+1234567890',
                'customer',
                'Test Country',
                'Test City',
                'Test Area',
                5.0,
                0,
                true
            ]
        );
        customerId = customerResult.rows[0].id;

        const driverResult = await pool.query(
            `INSERT INTO users (id, name, email, password, phone, primary_role, country, city, area, rating, completed_deliveries, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                'driver-msg-id',
                'Driver User',
                'driver-msg@example.com',
                hashedPassword,
                '+1234567891',
                'driver',
                'Test Country',
                'Test City',
                'Test Area',
                5.0,
                0,
                true
            ]
        );
        driverId = driverResult.rows[0].id;

        // Create test order
        const orderResult = await pool.query(
            `INSERT INTO orders (id, order_number, title, description, pickup_address, delivery_address, 
       from_lat, from_lng, from_name, to_lat, to_lng, to_name, price, status, customer_id, customer_name, assigned_driver_user_id, assigned_driver_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
            [
                'order-msg-id',
                'ORD-MSG-001',
                'Test Order',
                'Test Description',
                '123 Pickup St',
                '456 Delivery Ave',
                40.7128,
                -74.0060,
                'Pickup Location',
                40.7589,
                -73.9851,
                'Delivery Location',
                50.00,
                'accepted',
                customerId,
                'Customer User',
                driverId,
                'Driver User'
            ]
        );
        orderId = orderResult.rows[0].id;

        // Generate tokens
        customerToken = jwt.sign(
            { userId: customerId, email: 'customer-msg@example.com', primary_role: 'customer' },
            JWT_SECRET,
            { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
        );

        driverToken = jwt.sign(
            { userId: driverId, email: 'driver-msg@example.com', primary_role: 'driver' },
            JWT_SECRET,
            { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
        );
    });

    afterAll(async () => {
        // Clean up test data
        await pool.query('DELETE FROM messages WHERE order_id = $1', [orderId]);
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [customerId, driverId]);
        await pool.end();
    });

    beforeEach(async () => {
        // Clean up messages before each test
        await pool.query('DELETE FROM messages WHERE order_id = $1', [orderId]);
    });

    describe('POST /api/messages', () => {
        it('should send a message successfully', async () => {
            const messageData = {
                orderId,
                recipientId: driverId,
                content: 'Hello, when will you pick up the package?'
            };

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(messageData)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message.content).toBe(messageData.content);
            expect(response.body.message.sender_id).toBe(customerId);
            expect(response.body.message.recipient_id).toBe(driverId);
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ orderId })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post('/api/messages')
                .send({ orderId, recipientId: driverId, content: 'Test' })
                .expect(401);
        });
    });

    describe('GET /api/messages/order/:orderId', () => {
        beforeEach(async () => {
            // Create test messages
            await pool.query(
                `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['msg-1', orderId, customerId, driverId, 'Message 1', 'text', false]
            );
            await pool.query(
                `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['msg-2', orderId, driverId, customerId, 'Message 2', 'text', false]
            );
        });

        it('should get messages for an order', async () => {
            const response = await request(app)
                .get(`/api/messages/order/${orderId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('messages');
            expect(Array.isArray(response.body.messages)).toBe(true);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .get(`/api/messages/order/${orderId}`)
                .expect(401);
        });
    });

    describe('GET /api/messages/conversations', () => {
        it('should get user conversations', async () => {
            // Create a message first
            await pool.query(
                `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['msg-conv-1', orderId, customerId, driverId, 'Test message', 'text', false]
            );

            const response = await request(app)
                .get('/api/messages/conversations')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('conversations');
            expect(Array.isArray(response.body.conversations)).toBe(true);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .get('/api/messages/conversations')
                .expect(401);
        });
    });

    describe('POST /api/messages/order/:orderId/read', () => {
        beforeEach(async () => {
            // Create unread message
            await pool.query(
                `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['msg-unread', orderId, driverId, customerId, 'Unread message', 'text', false]
            );
        });

        it('should mark messages as read', async () => {
            const response = await request(app)
                .post(`/api/messages/order/${orderId}/read`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);

            // Verify message is marked as read
            const result = await pool.query(
                'SELECT is_read FROM messages WHERE id = $1',
                ['msg-unread']
            );
            expect(result.rows[0].is_read).toBe(true);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post(`/api/messages/order/${orderId}/read`)
                .expect(401);
        });
    });

    describe('GET /api/messages/unread-count', () => {
        beforeEach(async () => {
            // Create unread messages
            await pool.query(
                `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['msg-unread-1', orderId, driverId, customerId, 'Unread 1', 'text', false]
            );
            await pool.query(
                `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['msg-unread-2', orderId, driverId, customerId, 'Unread 2', 'text', false]
            );
        });

        it('should get unread message count', async () => {
            const response = await request(app)
                .get('/api/messages/unread-count')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('unreadCount');
            expect(response.body.unreadCount).toBeGreaterThanOrEqual(2);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .get('/api/messages/unread-count')
                .expect(401);
        });
    });
});
