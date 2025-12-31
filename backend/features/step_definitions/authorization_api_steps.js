const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const { createTestToken } = require('../../tests/utils/testAuth');

// World for authorization tests
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
    // Cleanup test data
    try {
        // Delete test orders
        for (const orderId of Object.keys(this.authWorld.testOrders)) {
            await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        }

        // Delete test users
        for (const userId of Object.keys(this.authWorld.testUsers)) {
            await pool.query('DELETE FROM users WHERE id = $1', [userId]);
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

        this.authWorld.testUsers[user.userId] = result.rows[0];
        this.authWorld.tokens[user.userId] = createTestToken(user.userId, user.role);
    }
});

Given('{string} has an order {string}', async function (userId, orderId) {
    const result = await pool.query(
        `INSERT INTO orders (id, customer_id, title, status, price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [orderId, userId, 'Test Order', 'pending', 100.00]
    );

    this.authWorld.testOrders[orderId] = result.rows[0];
});

Given('{string} has order {string} assigned to {string}', async function (customerId, orderId, driverId) {
    const result = await pool.query(
        `INSERT INTO orders (id, customer_id, assigned_driver_user_id, title, status, price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [orderId, customerId, driverId, 'Test Assigned Order', 'accepted', 100.00]
    );

    this.authWorld.testOrders[orderId] = result.rows[0];
});

Given('{string} has order {string} with status {string}', async function (userId, orderId, status) {
    const result = await pool.query(
        `INSERT INTO orders (id, customer_id, title, status, price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [orderId, userId, 'Test Order', status, 100.00]
    );

    this.authWorld.testOrders[orderId] = result.rows[0];
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
        .post(`/api/orders/${orderId}/cancel`)
        .set('Cookie', `token=${token}`);
});

When('{string} tries to bid on order {string}', async function (driverId, orderId) {
    const token = this.authWorld.tokens[driverId];

    this.authWorld.response = await request(app)
        .post(`/api/orders/${orderId}/bids`)
        .set('Cookie', `token=${token}`)
        .send({ bid_price: 50.00 });
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
