// Load environment variables FIRST before importing server
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env.testing') });

const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../backend/server');
const pool = require('../../../backend/config/db');
const bcrypt = require('bcryptjs');
const { createTestToken } = require('../../utils/testAuth');
const orderService = require('../../../backend/services/orderService');

//World for authorization tests
class AuthorizationWorld {
    constructor() {
        this.response = null;
        this.testUsers = {};
        this.testOrders = {};
        this.tokens = {};
    }
}

Before({ tags: '@api' }, async function () {
    this.authWorld = new AuthorizationWorld();
});

After({ tags: '@api' }, async function () {
    // Cleanup test data in correct order (foreign keys)
    try {
        const orderIds = Object.keys(this.authWorld.testOrders);
        const userIds = Object.keys(this.authWorld.testUsers);

        // Delete bids first (references orders)
        if (orderIds.length > 0) {
            await pool.query(
                `DELETE FROM bids WHERE order_id = ANY($1)`,
                [orderIds]
            );
        }

        // Delete orders (references users)
        if (orderIds.length > 0) {
            await pool.query(
                `DELETE FROM orders WHERE id = ANY($1)`,
                [orderIds]
            );
        }

        // Finally delete users
        if (userIds.length > 0) {
            await pool.query(
                `DELETE FROM users WHERE id = ANY($1)`,
                [userIds]
            );
        }
    } catch (error) {
        console.warn('Cleanup error:', error.message);
    }
});

// ============ GIVEN STEPS (API) ============

Given('the system is running', async function () {
    // Verify database connection
    const result = await pool.query('SELECT 1');
    expect(result.rows).to.have.length(1);
});

Given('test users exist:', async function (dataTable) {
    for (const user of dataTable.hashes()) {
        const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

        const result = await pool.query(
            `INSERT INTO users (id, name, email, phone, password_hash, primary_role, granted_roles, is_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING
             RETURNING *`,
            [
                user.userId,
                `Test ${user.role}`,
                user.email,
                '+1234567890',
                hashedPassword,
                user.role,
                [user.role],
                true
            ]
        );

        // If user already existed, fetch it
        if (result.rows.length === 0) {
            const existing = await pool.query('SELECT * FROM users WHERE id = $1', [user.userId]);
            this.authWorld.testUsers[user.userId] = existing.rows[0];
        } else {
            this.authWorld.testUsers[user.userId] = result.rows[0];
        }

        this.authWorld.tokens[user.userId] = createTestToken(user.userId, user.role);
    }
});

Given('{string} has an order {string}', async function (userId, orderId) {
    // Use orderService to create complete order with correct structure
    const orderData = {
        title: 'Test Order',
        price: 100.00,
        description: 'Authorization test order',
        pickupLocation: {
            coordinates: { lat: 30.0444, lng: 31.2357 }
        },
        dropoffLocation: {
            coordinates: { lat: 30.0626, lng: 31.2497 }
        },
        pickupAddress: {
            personName: 'John Doe',
            street: '123 Test St',
            buildingNumber: '10',
            floor: '1',
            apartmentNumber: '1A',
            area: 'Zamalek',
            city: 'Cairo',
            country: 'Egypt'
        },
        dropoffAddress: {
            personName: 'Jane Smith',
            street: '456 Delivery Ave',
            buildingNumber: '20',
            floor: '2',
            apartmentNumber: '2B',
            area: 'Maadi',
            city: 'Cairo',
            country: 'Egypt'
        }
    };

    const order = await orderService.createOrder(orderData, userId, this.authWorld.testUsers[userId].name);

    // Update the order ID to match expected test ID
    await pool.query('UPDATE orders SET id = $1 WHERE id = $2', [orderId, order._id]);
    order.id = orderId;

    this.authWorld.testOrders[orderId] = order;
});

Given('{string} has order {string} assigned to {string}', async function (customerId, orderId, driverId) {
    const orderData = {
        title: 'Test Assigned Order',
        price: 100.00,
        pickupLocation: {
            coordinates: { lat: 30.0444, lng: 31.2357 }
        },
        dropoffLocation: {
            coordinates: { lat: 30.0626, lng: 31.2497 }
        },
        pickupAddress: {
            personName: 'John Doe',
            street: '123 Test St',
            city: 'Cairo',
            country: 'Egypt',
            area: 'Zamalek',
            buildingNumber: '10'
        },
        dropoffAddress: {
            personName: 'Jane Smith',
            street: '456 Delivery Ave',
            city: 'Cairo',
            country: 'Egypt',
            area: 'Maadi',
            buildingNumber: '20'
        }
    };

    const order = await orderService.createOrder(orderData, customerId, this.authWorld.testUsers[customerId].name);

    // Assign to driver and update status
    await pool.query(
        `UPDATE orders SET assigned_driver_user_id = $1, status = 'accepted', id = $2 WHERE id = $3`,
        [driverId, orderId, order._id]
    );
    order.id = orderId;
    order.assigned_driver_user_id = driverId;
    order.status = 'accepted';

    this.authWorld.testOrders[orderId] = order;
});

Given('{string} has order {string} with status {string}', async function (userId, orderId, status) {
    const orderData = {
        title: 'Test Order',
        price: 100.00,
        pickupLocation: {
            coordinates: { lat: 30.0444, lng: 31.2357 }
        },
        dropoffLocation: {
            coordinates: { lat: 30.0626, lng: 31.2497 }
        },
        pickupAddress: {
            personName: 'John Doe',
            street: '123 Test St',
            city: 'Cairo',
            country: 'Egypt',
            area: 'Zamalek'
        },
        dropoffAddress: {
            personName: 'Jane Smith',
            street: '456 Delivery Ave',
            city: 'Cairo',
            country: 'Egypt',
            area: 'Maadi'
        }
    };

    const order = await orderService.createOrder(orderData, userId, this.authWorld.testUsers[userId].name);

    // Update status and ID
    await pool.query('UPDATE orders SET status = $1, id = $2 WHERE id = $3', [status, orderId, order._id]);
    order.id = orderId;
    order.status = status;

    this.authWorld.testOrders[orderId] = order;
});

Given('{string} has placed bid on order {string}', async function (driverId, orderId) {
    // Create a bid for testing bid acceptance
    const token = this.authWorld.tokens[driverId];

    await request(app)
        .post(`/api/orders/${orderId}/bid`)
        .set('Cookie', `token=${token}`)
        .send({ bid_price: 50.00 });
});

// ============ WHEN STEPS (API) ============

When('{string} tries to access order {string}', async function (userId, orderId) {
    const token = this.authWorld.tokens[userId];

    this.authWorld.response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Cookie', `token=${token}`);
});

When('{string} tries to update profile for {string}', async function (actorId, targetId) {
    const token = this.authWorld.tokens[actorId];

    this.authWorld.response = await request(app)
        .patch(`/api/users/${targetId}/profile`)
        .set('Cookie', `token=${token}`)
        .send({ name: 'Updated Name' });
});

When('{string} tries to view balance for {string}', async function (actorId, targetId) {
    const token = this.authWorld.tokens[actorId];

    this.authWorld.response = await request(app)
        .get(`/api/balance/${targetId}`)
        .set('Cookie', `token=${token}`);
});

When('{string} tries to access {string}', async function (userId, path) {
    const token = this.authWorld.tokens[userId];

    this.authWorld.response = await request(app)
        .get(path)
        .set('Cookie', `token=${token}`);
});

When('{string} tries to update status of order {string} to {string}', async function (driverId, orderId, newStatus) {
    const token = this.authWorld.tokens[driverId];

    this.authWorld.response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Cookie', `token=${token}`)
        .send({ status: newStatus });
});

When('{string} tries to cancel order {string}', async function (userId, orderId) {
    const token = this.authWorld.tokens[userId];

    this.authWorld.response = await request(app)
        .post(`/api/admin/orders/${orderId}/cancel`)
        .set('Cookie', `token=${token}`);
});

When('{string} tries to bid on order {string}', async function (driverId, orderId) {
    const token = this.authWorld.tokens[driverId];

    this.authWorld.response = await request(app)
        .post(`/api/orders/${orderId}/bid`)
        .set('Cookie', `token=${token}`)
        .send({ bid_price: 50.00 });
});

When('{string} tries to update their own profile', async function (userId) {
    const token = this.authWorld.tokens[userId];

    this.authWorld.response = await request(app)
        .put('/api/users/me/profile')
        .set('Cookie', `token=${token}`)
        .send({ name: 'Updated Name' });
});

When('{string} tries to accept bid on order {string}', async function (customerId, orderId) {
    const token = this.authWorld.tokens[customerId];
    const driverId = 'driver-1'; // Using the driver who placed the bid

    this.authWorld.response = await request(app)
        .post(`/api/orders/${orderId}/accept-bid`)
        .set('Cookie', `token=${token}`)
        .send({ driverId });
});

When('{string} tries to access {string} for {string}', async function (actorId, path, targetId) {
    const token = this.authWorld.tokens[actorId];

    this.authWorld.response = await request(app)
        .get(path)
        .set('Cookie', `token=${token}`)
        .query({ userId: targetId });
});

// ============ THEN STEPS (API) ============

Then('access should be denied with status {int}', function (statusCode) {
    expect(this.authWorld.response.status).to.equal(statusCode);
    expect(this.authWorld.response.body.error).to.exist;
});

Then('access should be granted with status {int}', function (statusCode) {
    expect(this.authWorld.response.status).to.equal(statusCode);
});

module.exports = { AuthorizationWorld };



