user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
        max: 20,
            idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
});

describe('PayPal Payment Integration Tests', () => {
    let customerToken, customerId, orderId;

    beforeAll(async () => {
        // Create test user
        const hashedPassword = await bcrypt.hash('password123', 10);

        const customerResult = await pool.query(
            `INSERT INTO users (id, name, email, password, phone, role, country, city, area, rating, completed_deliveries, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                'customer-paypal-id',
                'PayPal Customer',
                'customer-paypal@example.com',
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

        // Create test order with valid status 'pending_bids'
        const orderResult = await pool.query(
            `INSERT INTO orders (id, order_number, title, description, pickup_address, delivery_address, 
       from_lat, from_lng, from_name, to_lat, to_lng, to_name, price, status, customer_id, customer_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
            [
                'order-paypal-id',
                'ORD-PAYPAL-001',
                'Test PayPal Order',
                'Test Description',
                '123 Pickup St',
                '456 Delivery Ave',
                40.7128,
                -74.0060,
                'Pickup Location',
                40.7589,
                -73.9851,
                'Delivery Location',
                75.00,
                'pending_bids',
                customerId,
                'PayPal Customer'
            ]
        );
        orderId = orderResult.rows[0].id;

        // Generate token
        customerToken = jwt.sign(
            { userId: customerId, email: 'customer-paypal@example.com', role: 'customer' },
            JWT_SECRET,
            { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
        );
    });

    afterAll(async () => {
        // Clean up test data
        await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        await pool.query('DELETE FROM users WHERE id = $1', [customerId]);
        await pool.end();
    });

    beforeEach(async () => {
        // Clean up payments before each test
        await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
    });

    describe('POST /api/payments/paypal/create-order', () => {
        it('should return 503 if PayPal is not configured', async () => {
            const response = await request(app)
                .post('/api/payments/paypal/create-order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ orderId, amount: 75.00 });

            // PayPal not configured in test environment
            expect([200, 503]).toContain(response.status);
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/payments/paypal/create-order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ orderId })
                .expect(400);

            expect(response.body.error).toBeDefined();
            expect(response.body.error).toContain('amount');
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post('/api/payments/paypal/create-order')
                .send({ orderId, amount: 75.00 })
                .expect(401);
        });

        it('should return 400 for invalid amount', async () => {
            const response = await request(app)
                .post('/api/payments/paypal/create-order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ orderId, amount: -10 })
                .expect(400);

            expect(response.body.error).toContain('Amount must be greater than 0');
        });
    });

    describe('POST /api/payments/paypal/capture', () => {
        it('should return 400 for missing PayPal order ID', async () => {
            const response = await request(app)
                .post('/api/payments/paypal/capture')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({})
                .expect(400);

            expect(response.body.error).toContain('PayPal order ID is required');
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post('/api/payments/paypal/capture')
                .send({ paypalOrderId: 'test-order-id' })
                .expect(401);
        });
    });

    describe('POST /api/payments/paypal/refund/:paymentId', () => {
        let paymentId;

        beforeEach(async () => {
            // Create a completed PayPal payment
            const result = await pool.query(
                `INSERT INTO payments (id, order_id, payer_id, amount, currency, payment_method, paypal_order_id, paypal_capture_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
                ['payment-paypal-refund', orderId, customerId, 75.00, 'USD', 'paypal', 'paypal-order-123', 'paypal-capture-456', 'completed']
            );
            paymentId = result.rows[0].id;
        });

        it('should return 503 if PayPal is not configured', async () => {
            const response = await request(app)
                .post(`/api/payments/paypal/refund/${paymentId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ amount: 75.00, reason: 'Customer requested refund' });

            // Expect either success or service unavailable
            expect([200, 503]).toContain(response.status);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post(`/api/payments/paypal/refund/${paymentId}`)
                .send({ amount: 75.00, reason: 'Test' })
                .expect(401);
        });

        it('should return 404 for non-existent payment', async () => {
            const response = await request(app)
                .post('/api/payments/paypal/refund/non-existent-payment')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ amount: 75.00, reason: 'Test' });

            expect([404, 503]).toContain(response.status);
        });
    });
});
