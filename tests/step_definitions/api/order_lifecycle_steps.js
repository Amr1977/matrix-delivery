const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../../backend/app');
const { Pool } = require('pg');

// Setup independent pool for verification
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || "5433"),
    database: 'matrix_delivery_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

let customerToken, driverToken, orderId;
let customerId, driverId;

Given('the platform commission rate is {int}%', function (rate) {
    // Assuming default is set in config, or we mock it. verification logic below handles math.
    this.commissionRate = rate / 100;
});

Given('a driver with balance of {float} EGP', async function (balance) {
    // Create driver
    const timestamp = Date.now();
    const email = `driver_${timestamp}@test.com`;

    // Ensure JWT Secret is set for signing if app doesn't have it (fallback)
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret';

    // Register
    const regRes = await request(app).post('/api/auth/register').send({
        name: 'Lifecycle Driver',
        email,
        password: 'Password123!',
        phone: `+20${timestamp.toString().substr(-9)}`,
        primary_role: 'driver',
        vehicle_type: 'car',
        country: 'Egypt',
        city: 'Cairo',
        area: 'TestArea'
    });

    if (regRes.status !== 201) {
        console.error('Driver Registration Failed:', JSON.stringify(regRes.body));
        throw new Error(`Driver Registration Failed: ${regRes.status}`);
    }

    // Login
    const loginRes = await request(app).post('/api/auth/login').send({
        email,
        password: 'Password123!'
    });

    if (loginRes.status !== 200) {
        console.error('Driver Login Failed:', JSON.stringify(loginRes.body));
        throw new Error(`Driver Login Failed: ${loginRes.status}`);
    }

    // Extract token from cookie (find the one that is not cleared)
    const cookies = loginRes.headers['set-cookie'];
    const tokenCookie = cookies && cookies.find(c => c.startsWith('token=') && !c.startsWith('token=;'));
    if (!tokenCookie) {
        throw new Error('No valid token cookie found');
    }
    driverToken = tokenCookie.split(';')[0].split('=')[1];

    const decoded = JSON.parse(Buffer.from(driverToken.split('.')[1], 'base64').toString());
    driverId = decoded.userId;

    // Set balance (direct DB manipulation for setup)
    await pool.query('INSERT INTO user_balances(user_id, available_balance) VALUES($1, $2) ON CONFLICT(user_id) DO UPDATE SET available_balance = $2', [driverId, balance]);
});

Given('a customer exists', async function () {
    const timestamp = Date.now();
    const email = `cust_${timestamp}@test.com`;

    const regRes = await request(app).post('/api/auth/register').send({
        name: 'Lifecycle Customer',
        email,
        password: 'Password123!',
        phone: `+20${timestamp.toString().substr(-9)}`,
        primary_role: 'customer',
        country: 'Egypt',
        city: 'Cairo',
        area: 'TestArea'
    });

    if (regRes.status !== 201) {
        console.error('Customer Registration Failed:', JSON.stringify(regRes.body));
        throw new Error(`Customer Registration Failed: ${regRes.status}`);
    }

    const loginRes = await request(app).post('/api/auth/login').send({
        email,
        password: 'Password123!'
    });

    if (loginRes.status !== 200) {
        console.error('Customer Login Failed:', JSON.stringify(loginRes.body));
        throw new Error(`Customer Login Failed: ${loginRes.status}`);
    }

    // Extract token from cookie (find the one that is not cleared)
    const cookies = loginRes.headers['set-cookie'];
    const tokenCookie = cookies && cookies.find(c => c.startsWith('token=') && !c.startsWith('token=;'));
    if (!tokenCookie) {
        throw new Error('No valid token cookie found');
    }
    customerToken = tokenCookie.split(';')[0].split('=')[1];

    const decoded = JSON.parse(Buffer.from(customerToken.split('.')[1], 'base64').toString());
    customerId = decoded.userId;
});

Given('the driver has accepted an order worth {float} EGP', async function (amount) {
    // 1. Create Order
    const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
            title: 'Commission Test Order',
            price: amount,
            description: 'Test',
            pickupLocation: { coordinates: { lat: 30.0, lng: 31.0 }, address: { country: 'Egypt', city: 'Cairo' } },
            dropoffLocation: { coordinates: { lat: 30.1, lng: 31.1 }, address: { country: 'Egypt', city: 'Cairo' } }
        });

    if (createRes.status !== 201) {
        console.error('Order Creation Failed:', JSON.stringify(createRes.body));
        throw new Error(`Order Creation Failed: ${createRes.status}`);
    }

    orderId = createRes.body.id;

    // 2. Bid
    const bidRes = await request(app)
        .post(`/api/orders/${orderId}/bid`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ bidPrice: amount });

    if (bidRes.status !== 200) {
        console.error('Bid Failed:', JSON.stringify(bidRes.body));
        throw new Error(`Bid Failed: ${bidRes.status}`);
    }

    // 3. Accept Bid
    const acceptRes = await request(app)
        .post(`/api/orders/${orderId}/accept-bid`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ driverId });

    if (acceptRes.status !== 200) {
        console.error('Bid Acceptance Failed:', JSON.stringify(acceptRes.body));
        throw new Error(`Bid Acceptance Failed: ${acceptRes.status}`);
    }
});

Given('the order is in "in_transit" status', async function () {
    // Transitions: Accepted -> Picked Up -> In Transit
    await request(app)
        .post(`/api/orders/${orderId}/pickup`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

    await request(app)
        .post(`/api/orders/${orderId}/in-transit`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
});

When('the driver marks the order as "delivered"', async function () {
    // Current "complete" action maps to "delivered_pending"
    const res = await request(app)
        .post(`/api/orders/${orderId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`);

    if (res.status !== 200) {
        console.error('Driver Complete Failed:', JSON.stringify(res.body));
        throw new Error(`Driver Complete Failed: ${res.status}`);
    }
});

Then('the lifecycle order status should be {string}', async function (expectedStatus) {
    const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

    if (res.body.status !== expectedStatus) {
        console.error(`Status Mismatch: Expected ${expectedStatus}, Got ${res.body.status}`);
    }
    expect(res.body.status).to.equal(expectedStatus);
});

Then('the driver balance should still be {float} EGP', async function (expectedBalance) {
    const res = await pool.query('SELECT available_balance FROM user_balances WHERE user_id = $1', [driverId]);
    expect(parseFloat(res.rows[0].available_balance)).to.be.closeTo(expectedBalance, 0.01);
});

Then('no commission should be deducted yet', async function () {
    const res = await pool.query('SELECT * FROM balance_transactions WHERE user_id = $1 AND type = \'commission_deduction\'', [driverId]);
    // Assuming fresh driver for this scenario.
    expect(res.rows.length).to.equal(0);
});

When('the customer confirms the delivery', async function () {
    // New action: confirm_delivery
    // Using POST /api/orders/:orderId/confirm_delivery
    const res = await request(app)
        .post(`/api/orders/${orderId}/confirm_delivery`)
        .set('Authorization', `Bearer ${customerToken}`);

    if (res.status !== 200) {
        console.error('Confirm Delivery Failed:', JSON.stringify(res.body));
        throw new Error(`Confirm Delivery Failed: ${res.status}`);
    }
});

Then('the platform should deduct {float} EGP commission', async function (amount) {
    // Implicitly checked by balance, but can check transaction log
    const res = await pool.query('SELECT amount FROM balance_transactions WHERE user_id = $1 AND type = \'commission_deduction\' ORDER BY created_at DESC LIMIT 1', [driverId]);

    if (res.rows.length === 0) {
        throw new Error('No commission deduction found in balance_transactions');
    }

    expect(Math.abs(parseFloat(res.rows[0].amount))).to.be.closeTo(amount, 0.01);
});

Then('the driver balance should be {float} EGP', async function (expectedBalance) {
    const res = await pool.query('SELECT available_balance FROM user_balances WHERE user_id = $1', [driverId]);
    expect(parseFloat(res.rows[0].available_balance)).to.be.closeTo(expectedBalance, 0.01);
});
