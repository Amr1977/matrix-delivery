const request = require('supertest');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../server');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

describe('Payment API Tests', () => {
    let customerToken, driverToken, customerId, driverId, orderId, paymentId;

    beforeAll(async () => {
        // Create test users
        const hashedPassword = await bcrypt.hash('password123', 10);

        const customerResult = await pool.query(
            `INSERT INTO users (id, name, email, password, phone, role, country, city, area, rating, completed_deliveries, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                'customer-pay-id',
                'Customer User',
                'customer-pay@example.com',
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
            `INSERT INTO users (id, name, email, password, phone, role, country, city, area, rating, completed_deliveries, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                'driver-pay-id',
                'Driver User',
                'driver-pay@example.com',
                hashedPassword,
                '+1234567891',
                'driver',
                'Test Country',
                'Test City',
                'Test Area',
                5.0,
                10,
                true
            ]
        );
        driverId = driverResult.rows[0].id;

        // Create test order
        const orderResult = await pool.query(
            `INSERT INTO orders (id, order_number, title, description, pickup_address, delivery_address, 
       from_lat, from_lng, from_name, to_lat, to_lng, to_name, price, status, customer_id, customer_name, 
       assigned_driver_user_id, assigned_driver_name, assigned_driver_bid_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
            [
                'order-pay-id',
                'ORD-PAY-001',
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
                'delivered',
                customerId,
                'Customer User',
                driverId,
                'Driver User',
                45.00
            ]
        );
        orderId = orderResult.rows[0].id;

        // Generate tokens
        customerToken = jwt.sign(
            { userId: customerId, email: 'customer-pay@example.com', role: 'customer' },
            JWT_SECRET,
            { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
        );

        driverToken = jwt.sign(
            { userId: driverId, email: 'driver-pay@example.com', role: 'driver' },
            JWT_SECRET,
            { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
        );
    });

    afterAll(async () => {
        // Clean up test data
        await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [customerId, driverId]);
        await pool.end();
    });

    beforeEach(async () => {
        // Clean up payments before each test
        await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
    });

    describe('POST /api/payments/create-intent', () => {
        it('should create payment intent successfully', async () => {
            const paymentData = {
                orderId,
                amount: 50.00,
                currency: 'usd'
            };

            const response = await request(app)
                .post('/api/payments/create-intent')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(paymentData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('paymentIntent');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/payments/create-intent')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ orderId })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post('/api/payments/create-intent')
                .send({ orderId, amount: 50.00 })
                .expect(401);
        });

        it('should return 400 for invalid amount', async () => {
            const response = await request(app)
                .post('/api/payments/create-intent')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ orderId, amount: -10 })
                .expect(400);

            expect(response.body.error).toContain('Amount must be greater than 0');
        });
    });

    describe('GET /api/payments/order/:orderId', () => {
        beforeEach(async () => {
            // Create test payment
            const result = await pool.query(
                `INSERT INTO payments (id, order_id, amount, currency, payment_method, status, payer_id, payee_id, platform_fee, driver_earnings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
                ['payment-test-id', orderId, 50.00, 'USD', 'credit_card', 'completed', customerId, driverId, 5.00, 45.00]
            );
            paymentId = result.rows[0].id;
        });

        it('should get payment details for an order', async () => {
            const response = await request(app)
                .get(`/api/payments/order/${orderId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('payment');
            expect(response.body.payment.order_id).toBe(orderId);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .get(`/api/payments/order/${orderId}`)
                .expect(401);
        });

        it('should return 404 for non-existent order', async () => {
            await request(app)
                .get('/api/payments/order/non-existent-order')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(404);
        });
    });

    describe('POST /api/payments/refund/:paymentId', () => {
        beforeEach(async () => {
            // Create completed payment
            const result = await pool.query(
                `INSERT INTO payments (id, order_id, amount, currency, payment_method, status, payer_id, payee_id, platform_fee, driver_earnings, stripe_payment_intent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
                ['payment-refund-id', orderId, 50.00, 'USD', 'credit_card', 'completed', customerId, driverId, 5.00, 45.00, 'pi_test_123']
            );
            paymentId = result.rows[0].id;
        });

        it('should process refund successfully', async () => {
            const refundData = {
                amount: 50.00,
                reason: 'Customer requested cancellation'
            };

            const response = await request(app)
                .post(`/api/payments/refund/${paymentId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send(refundData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('refund');
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post(`/api/payments/refund/${paymentId}`)
                .send({ amount: 50.00, reason: 'Test' })
                .expect(401);
        });
    });

    describe('GET /api/payments/methods', () => {
        it('should get payment methods for user', async () => {
            const response = await request(app)
                .get('/api/payments/methods')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('paymentMethods');
            expect(Array.isArray(response.body.paymentMethods)).toBe(true);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .get('/api/payments/methods')
                .expect(401);
        });
    });

    describe('POST /api/payments/methods', () => {
        it('should add payment method successfully', async () => {
            const paymentMethodData = {
                paymentMethodId: 'pm_test_123'
            };

            const response = await request(app)
                .post('/api/payments/methods')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(paymentMethodData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('paymentMethod');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/payments/methods')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({})
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post('/api/payments/methods')
                .send({ paymentMethodId: 'pm_test_123' })
                .expect(401);
        });
    });
});
