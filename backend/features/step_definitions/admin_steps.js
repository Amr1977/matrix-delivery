const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const pool = require('../../config/db');

// Mock dependencies
jest.mock('../../config/db');
jest.mock('../../services/adminService');
jest.mock('../../middleware/rateLimit', () => ({
    apiRateLimit: (req, res, next) => next()
}));

// World object to share state between steps
class AdminWorld {
    constructor() {
        this.response = null;
        this.adminToken = 'test-admin-token';
        this.adminUser = {
            id: 'admin-123',
            email: 'admin@test.com',
            name: 'Admin User',
            primary_role: 'admin',
            granted_roles: []
        };
        this.regularUser = {
            id: 'user-456',
            email: 'user@test.com',
            name: 'Regular User',
            primary_role: 'customer',
            granted_roles: []
        };
        this.mockData = {};
        this.mockQuery = jest.fn();
        pool.query = this.mockQuery;
    }

    setMockData(key, value) {
        this.mockData[key] = value;
    }

    getMockData(key) {
        return this.mockData[key];
    }
}

Before(function () {
    this.world = new AdminWorld();
    jest.clearAllMocks();
});

After(function () {
    jest.clearAllMocks();
});

// ============ AUTHENTICATION STEPS ============

Given('I am authenticated as an admin user', function () {
    this.world.isAdmin = true;
    this.world.mockQuery.mockResolvedValueOnce({
        rows: [this.world.adminUser]
    });
});

Given('I am not authenticated', function () {
    this.world.isAdmin = false;
    this.world.adminToken = null;
});

Given('I am authenticated as a regular user', function () {
    this.world.isAdmin = false;
    this.world.mockQuery.mockResolvedValueOnce({
        rows: [this.world.regularUser]
    });
});

// ============ DATA SETUP STEPS ============

Given('the system has the following data:', function (dataTable) {
    const data = dataTable.rowsHash();
    Object.entries(data).forEach(([key, value]) => {
        this.world.setMockData(key, parseInt(value));
    });

    // Mock database responses for stats
    this.world.mockQuery
        .mockResolvedValueOnce({ rows: [{ count: data.total_users || '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: data.total_orders || '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: data.completed_orders || '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: data.revenue || '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_value: '0' }] })
        .mockResolvedValueOnce({ rows: [{ rate: '0' }] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [{ avg_rating: '0' }] });
});

Given('the system has {int} registered users', function (count) {
    this.world.setMockData('user_count', count);

    // Mock user list query
    this.world.mockQuery
        .mockResolvedValueOnce({ rows: [{ count: count.toString() }] })
        .mockResolvedValueOnce({
            rows: Array(Math.min(count, 20)).fill(null).map((_, i) => ({
                id: `user-${i}`,
                name: `User ${i}`,
                email: `user${i}@test.com`,
                primary_role: 'customer',
                is_verified: true,
                is_available: true,
                total_orders: '0',
                total_reviews: '0'
            }))
        });
});

Given('there is an unverified user {string}', function (email) {
    this.world.setMockData('target_user', {
        id: 'user-unverified',
        email,
        name: 'Unverified User',
        is_verified: false
    });

    this.world.mockQuery.mockResolvedValueOnce({
        rows: [{
            ...this.world.getMockData('target_user'),
            is_verified: true
        }]
    });
});

// ============ ACTION STEPS ============

When('I request dashboard statistics', async function () {
    const req = request(app).get('/api/admin/stats');

    if (this.world.adminToken) {
        req.set('Cookie', [`token=${this.world.adminToken}`]);
    }

    this.world.response = await req;
});

When('I request dashboard statistics with range {string}', async function (range) {
    const req = request(app)
        .get(`/api/admin/stats?range=${range}`)
        .set('Cookie', [`token=${this.world.adminToken}`]);

    this.world.response = await req;
});

When('I request the user list with page {int} and limit {int}', async function (page, limit) {
    const req = request(app)
        .get(`/api/admin/users?page=${page}&limit=${limit}`)
        .set('Cookie', [`token=${this.world.adminToken}`]);

    this.world.response = await req;
});

When('I verify the user account', async function () {
    const userId = this.world.getMockData('target_user').id;

    const req = request(app)
        .post(`/api/admin/users/${userId}/verify`)
        .set('Cookie', [`token=${this.world.adminToken}`]);

    this.world.response = await req;
});

When('I suspend the user with reason {string}', async function (reason) {
    const userId = this.world.getMockData('target_user').id;

    const req = request(app)
        .post(`/api/admin/users/${userId}/suspend`)
        .set('Cookie', [`token=${this.world.adminToken}`])
        .send({ reason });

    this.world.response = await req;
});

// ============ ASSERTION STEPS ============

Then('I should receive a successful response', function () {
    expect(this.world.response.status).to.equal(200);
});

Then('I should receive an unauthorized error', function () {
    expect(this.world.response.status).to.equal(401);
    expect(this.world.response.body).to.have.property('error');
});

Then('I should receive a forbidden error', function () {
    expect(this.world.response.status).to.equal(403);
    expect(this.world.response.body).to.have.property('error');
});

Then('the response status should be {int}', function (statusCode) {
    expect(this.world.response.status).to.equal(statusCode);
});

Then('the response should contain:', function (dataTable) {
    const expected = dataTable.rowsHash();
    Object.entries(expected).forEach(([key, value]) => {
        expect(this.world.response.body).to.have.property(key);
        const actualValue = this.world.response.body[key];
        const expectedValue = isNaN(value) ? value : parseInt(value);
        expect(actualValue).to.equal(expectedValue);
    });
});

Then('the response should contain {int} users', function (count) {
    expect(this.world.response.body.users).to.be.an('array');
    expect(this.world.response.body.users).to.have.lengthOf(count);
});

Then('the pagination should show:', function (dataTable) {
    const expected = dataTable.rowsHash();
    expect(this.world.response.body).to.have.property('pagination');

    Object.entries(expected).forEach(([key, value]) => {
        expect(this.world.response.body.pagination[key]).to.equal(parseInt(value));
    });
});

Then('the metrics should include average order value', function () {
    expect(this.world.response.body).to.have.property('metrics');
    expect(this.world.response.body.metrics).to.have.property('avgOrderValue');
});

Then('the metrics should include completion rate', function () {
    expect(this.world.response.body).to.have.property('metrics');
    expect(this.world.response.body.metrics).to.have.property('completionRate');
});

Then('the admin action should be logged', function () {
    const { logAdminAction } = require('../../services/adminService');
    expect(logAdminAction).toHaveBeenCalled();
});

Then('the log should contain:', function (dataTable) {
    const { logAdminAction } = require('../../services/adminService');
    const expected = dataTable.rowsHash();

    expect(logAdminAction).toHaveBeenCalledWith(
        expect.anything(),
        expected.action,
        expected.target_type,
        expect.anything(),
        expect.anything()
    );
});

Then('the user should be marked as verified', function () {
    expect(this.world.response.body.user).to.have.property('isVerified', true);
});

Then('a verification notification should be sent', function () {
    const { createNotification } = require('../../services/notificationService.ts');
    expect(createNotification).toHaveBeenCalled();
});

Then('the admin action should be logged as {string}', function (action) {
    const { logAdminAction } = require('../../services/adminService');
    expect(logAdminAction).toHaveBeenCalledWith(
        expect.anything(),
        action,
        expect.anything(),
        expect.anything(),
        expect.anything()
    );
});

module.exports = { AdminWorld };
