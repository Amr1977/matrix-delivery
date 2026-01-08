const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const request = require('supertest');
const { expect } = require('chai');
const crypto = require('crypto');
const app = require('../../../backend/server');
const pool = require('../../../backend/config/db');
const bcrypt = require('bcryptjs');

// Helper to generate unique IDs
const generateId = () => `${Date.now()}${crypto.randomBytes(4).toString('hex')}`;

// World extension for cash registry tests
Before({ tags: '@courier_cash_registry' }, async function () {
    this.cashDrivers = [];
    this.testOrders = [];
    this.driverTokens = {};
});

After({ tags: '@courier_cash_registry' }, async function () {
    // Cleanup test orders
    try {
        for (const orderId of this.testOrders) {
            await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        }
    } catch (error) {
        console.warn('Order cleanup error:', error.message);
    }

    // Cleanup test drivers
    try {
        for (const driverEmail of this.cashDrivers) {
            await pool.query('DELETE FROM users WHERE email = $1', [driverEmail]);
        }
    } catch (error) {
        console.warn('Driver cleanup error:', error.message);
    }
});

// ============ GIVEN STEPS ============

Given('a driver {string} exists', async function (driverName) {
    const email = `${driverName.toLowerCase().replace(/\s+/g, '_')}@test.com`;
    const password = 'Driver123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    const driverId = generateId();

    try {
        await pool.query(
            `INSERT INTO users (id, name, email, phone, password_hash, primary_role, is_verified, available_cash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET available_cash = 0`,
            [driverId, driverName, email, `+20100${Date.now() % 10000000}`, hashedPassword, 'driver', true, 0]
        );

        this.cashDrivers.push(email);

        // Login to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

        if (loginResponse.status === 200) {
            const cookies = loginResponse.headers['set-cookie'];
            if (cookies && cookies.length > 0) {
                // Find the cookie that has an actual token value (not the clearance cookies)
                const tokenCookie = cookies.find(c => c.startsWith('token=') && c.split(';')[0].length > 10);
                if (tokenCookie) {
                    const cookieValue = tokenCookie.split(';')[0]; // Keep 'token=value' format
                    this.driverTokens[driverName] = cookieValue;
                    this.currentDriverCookie = cookieValue;
                    this.currentDriverId = driverId;
                }
            }
        }
    } catch (error) {
        console.warn('Driver creation error:', error.message);
    }
});

Given('driver {string} has no cash registered', async function (driverName) {
    const email = `${driverName.toLowerCase().replace(/\s+/g, '_')}@test.com`;
    await pool.query(
        'UPDATE users SET available_cash = 0 WHERE email = $1',
        [email]
    );
});

Given('driver {string} has {int} EGP available cash', async function (driverName, amount) {
    const email = `${driverName.toLowerCase().replace(/\s+/g, '_')}@test.com`;
    await pool.query(
        'UPDATE users SET available_cash = $1 WHERE email = $2',
        [amount, email]
    );
});

Given('driver is located in Maadi', async function () {
    // Store driver location for order filtering (no need to update DB, just store for filter)
    this.driverLat = 29.9602;
    this.driverLng = 31.2494;
});

Given('these orders exist:', async function (dataTable) {
    const rows = dataTable.hashes();


    for (const row of rows) {
        const upfrontAmount = parseFloat(row['Upfront Payment'].replace(/[^0-9.]/g, ''));
        const orderId = generateId();

        // Create a basic order with upfront payment using correct column names
        await pool.query(
            `INSERT INTO orders (
        id, customer_id, pickup_address, delivery_address, 
        status, upfront_payment, created_at, order_number, price,
        from_lat, from_lng, to_lat, to_lng,
        pickup_coordinates, delivery_coordinates
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                orderId,
                this.currentDriverId, // Use driver as customer for simplicity
                'Test Pickup Maadi',
                'Test Delivery',
                'pending_bids',
                upfrontAmount,
                `ORD-${Date.now()}`,
                100.00, // price
                29.9602, 31.2494, // from_lat, from_lng (Maadi coordinates)
                29.9602, 31.2494, // to_lat, to_lng
                JSON.stringify({ lat: 29.9602, lng: 31.2494 }), // pickup_coordinates
                JSON.stringify({ lat: 29.9602, lng: 31.2494 }) // delivery_coordinates
            ]
        );

        this.testOrders.push(orderId);
        this.orderMap = this.orderMap || {};
        this.orderMap[row.Order] = orderId;
    }
});

Given('an order exists with {int} EGP upfront payment', async function (amount) {
    const orderId = generateId();

    await pool.query(
        `INSERT INTO orders (
      id, customer_id, pickup_address, delivery_address, 
      status, upfront_payment, created_at, order_number, price,
      from_lat, from_lng, to_lat, to_lng,
      pickup_coordinates, delivery_coordinates
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
            orderId,
            this.currentDriverId,
            'Test Pickup',
            'Test Delivery',
            'pending_bids',
            amount,
            `ORD-${Date.now()}`,
            100.00, // price
            29.9602, 31.2494, // from_lat, from_lng
            29.9602, 31.2494, // to_lat, to_lng
            JSON.stringify({ lat: 29.9602, lng: 31.2494 }), // pickup_coordinates
            JSON.stringify({ lat: 29.9602, lng: 31.2494 }) // delivery_coordinates
        ]
    );

    this.testOrders.push(orderId);
    this.lastOrderId = orderId;
});

// ============ WHEN STEPS ============

When('driver updates available cash to {int} EGP', async function (amount) {
    this.cashUpdateResponse = await request(app)
        .put('/api/users/me/cash-balance')
        .set('Cookie', this.currentDriverCookie)
        .send({ availableCash: amount });
});

When('driver views available orders', async function () {
    const lat = this.driverLat || 29.9602; // Default to Maadi if not set
    const lng = this.driverLng || 31.2494;

    this.ordersResponse = await request(app)
        .get(`/api/orders?lat=${lat}&lng=${lng}`)
        .set('Cookie', this.currentDriverCookie);
});

// ============ THEN STEPS ============

Then('driver\'s available cash should be {int} EGP', async function (expectedAmount) {
    const response = await request(app)
        .get('/api/users/me/cash-balance')
        .set('Cookie', this.currentDriverCookie);

    expect(response.status).to.equal(200);
    expect(response.body.availableCash).to.equal(expectedAmount);
});

Then('driver should see Order A and Order B', function () {
    expect(this.ordersResponse.status).to.equal(200);
    const orders = this.ordersResponse.body;

    const orderAId = this.orderMap['A'];
    const orderBId = this.orderMap['B'];

    const foundOrderA = orders.some(o => o.id === orderAId);
    const foundOrderB = orders.some(o => o.id === orderBId);

    expect(foundOrderA).to.be.true;
    expect(foundOrderB).to.be.true;
});

Then('driver should NOT see Order C', function () {
    expect(this.ordersResponse.status).to.equal(200);
    const orders = this.ordersResponse.body;

    const orderCId = this.orderMap['C'];
    const foundOrderC = orders.some(o => o.id === orderCId);

    expect(foundOrderC).to.be.false;
});

Then('driver should see Order A', function () {
    expect(this.ordersResponse.status).to.equal(200);
    const orders = this.ordersResponse.body;

    const orderAId = this.orderMap['A'];
    const foundOrderA = orders.some(o => o.id === orderAId);

    expect(foundOrderA).to.be.true;
});

Then('driver should NOT see Order B', function () {
    expect(this.ordersResponse.status).to.equal(200);
    const orders = this.ordersResponse.body;

    const orderBId = this.orderMap['B'];
    const foundOrderB = orders.some(o => o.id === orderBId);

    expect(foundOrderB).to.be.false;
});

Then('driver should see the order', function () {
    expect(this.ordersResponse.status).to.equal(200);
    const orders = this.ordersResponse.body;

    const foundOrder = orders.some(o => o.id === this.lastOrderId);
    expect(foundOrder).to.be.true;
});
