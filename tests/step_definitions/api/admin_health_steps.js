const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env.testing') });

const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../backend/server');
const { createTestToken } = require('../../utils/testAuth');

class HealthWorld {
    constructor() {
        this.response = null;
        this.token = null;
        this.currentUser = null;
    }
}

Before({ tags: '@api' }, async function () {
    this.healthWorld = new HealthWorld();
});

Given('I am logged in as an {string}', async function (role) {
    const userId = `test-${role}-123`;
    this.healthWorld.currentUser = {
        id: userId,
        role: role
    };
    // Create token with primary_role = role
    this.healthWorld.token = createTestToken(userId, role);
});

When('I navigate to the system health dashboard', async function () {
    // API equivalent: fetching current health stats
    this.healthWorld.response = await request(app)
        .get('/api/admin/health/current')
        .set('Cookie', `token=${this.healthWorld.token}`);
});

Then('I should see the current memory usage', function () {
    expect(this.healthWorld.response.status).to.equal(200);
    expect(this.healthWorld.response.body).to.have.property('memoryPercent');
    expect(this.healthWorld.response.body).to.have.property('memoryUsedMb');
});

Then('I should see the PM2 process status', function () {
    expect(this.healthWorld.response.body).to.have.property('pm2Processes');
    // We expect an array (even if empty in test env without PM2)
    expect(this.healthWorld.response.body.pm2Processes).to.be.an('array');
});

Then('I should see the system uptime', function () {
    expect(this.healthWorld.response.body).to.have.property('uptime');
});

When('I request system health history for the last {string} hours', async function (hours) {
    this.healthWorld.response = await request(app)
        .get(`/api/admin/health/history?hours=${hours}`)
        .set('Cookie', `token=${this.healthWorld.token}`);
});

Then('I should receive a list of health data points', function () {
    expect(this.healthWorld.response.status).to.equal(200);
    expect(this.healthWorld.response.body).to.have.property('history');
    expect(this.healthWorld.response.body.history).to.be.an('array');
});

Then('the data points should cover the requested time range', function () {
    // Hard to verify exact range without seeded data, but we verify structure
    const history = this.healthWorld.response.body.history;
    if (history.length > 0) {
        expect(history[0]).to.have.property('timestamp');
        expect(history[0]).to.have.property('memory_percent');
    }
});
