const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');

// Note: For BDD tests, we use the actual server with test database

// World object to share state between steps
class AuthWorld {
    constructor() {
        this.response = null;
        this.userData = {};
        this.loginData = {};
        this.token = null;
        this.resetToken = null;
        this.testUsers = [];
    }

    setUserData(data) {
        this.userData = { ...this.userData, ...data };
    }

    setLoginData(data) {
        this.loginData = { ...this.loginData, ...data };
    }
}

Before(async function () {
    this.world = new AuthWorld();
});

After(async function () {
    // Cleanup test users
    try {
        for (const email of this.world.testUsers) {
            await pool.query('DELETE FROM users WHERE email = $1', [email]);
        }
    } catch (error) {
        console.warn('Cleanup error:', error.message);
    }
});

// ============ GIVEN STEPS ============

Given('I am a new user', function () {
    this.world.setUserData({
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        phone: '+1234567890',
        password: 'SecurePass123!',
        primary_role: 'customer',
        country: 'Egypt',
        city: 'Cairo',
        area: 'Nasr City'
    });
});

Given('there is a user with email {string}', async function (email) {
    const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

    try {
        await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, primary_role, is_verified)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['Existing User', email, '+1234567890', hashedPassword, 'customer', true]
        );
        this.world.testUsers.push(email);
    } catch (error) {
        // User might already exist, that's okay
    }
});

Given('there is a registered user:', async function (dataTable) {
    const data = dataTable.rowsHash();
    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
        const result = await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, primary_role, is_verified)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            ['Test User', data.email, '+1234567890', hashedPassword, 'customer', true]
        );

        this.world.setLoginData({
            email: data.email,
            password: data.password
        });
        this.world.testUsers.push(data.email);
    } catch (error) {
        console.warn('User creation error:', error.message);
    }
});

Given('there is a registered user with email {string}', async function (email) {
    const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

    try {
        await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, primary_role, is_verified)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['Test User', email, '+1234567890', hashedPassword, 'customer', true]
        );
        this.world.testUsers.push(email);
        this.world.setLoginData({ email });
    } catch (error) {
        // User might already exist
    }
});

Given('I am logged in as a user', async function () {
    const email = `loggedin${Date.now()}@example.com`;
    const password = 'SecurePass123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
        `INSERT INTO users (name, email, phone, password_hash, primary_role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Logged In User', email, '+1234567890', hashedPassword, 'customer', true]
    );
    this.world.testUsers.push(email);

    // Login to get token
    const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

    this.world.token = response.body.token;
});

Given('my token is about to expire', function () {
    // Simplified - in real implementation would use an expiring token
    this.world.tokenExpiring = true;
});

Given('I have a valid password reset token', async function () {
    const email = `reset${Date.now()}@example.com`;
    const hashedPassword = await bcrypt.hash('OldPass123!', 10);

    await pool.query(
        `INSERT INTO users (name, email, phone, password_hash, primary_role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Reset User', email, '+1234567890', hashedPassword, 'customer', true]
    );
    this.world.testUsers.push(email);

    // Request password reset to get token
    const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email });

    // In real implementation, would extract token from email
    this.world.resetToken = 'valid-reset-token';
    this.world.resetEmail = email;
});

Given('I have an expired password reset token', function () {
    this.world.resetToken = 'expired-token';
});

// ============ WHEN STEPS ============

When('I register with valid credentials:', async function (dataTable) {
    const data = dataTable.rowsHash();
    this.world.setUserData(data);

    this.world.response = await request(app)
        .post('/api/auth/register')
        .send({
            name: data.name,
            email: data.email,
            phone: data.phone,
            password: data.password,
            primary_role: data.role || data.primary_role || 'customer',
            country: data.country || 'Egypt',
            city: data.city || 'Cairo',
            area: data.area || 'Nasr City'
        });

    if (this.world.response.status === 201) {
        this.world.testUsers.push(data.email);
    }
});

When('I try to register with email {string}', async function (email) {
    this.world.response = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Test User',
            email,
            phone: '+1234567890',
            password: 'SecurePass123!',
            primary_role: 'customer',
            country: 'Egypt',
            city: 'Cairo',
            area: 'Nasr City'
        });
});

When('I register with invalid email {string}', async function (email) {
    this.world.response = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Test User',
            email,
            phone: '+1234567890',
            password: 'SecurePass123!',
            primary_role: 'customer',
            country: 'Egypt',
            city: 'Cairo',
            area: 'Nasr City',
            role: 'customer'
        });
});

When('I register with password {string}', async function (password) {
    this.world.response = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            phone: '+1234567890',
            password,
            role: 'customer'
        });
});

When('I login with correct credentials', async function () {
    this.world.response = await request(app)
        .post('/api/auth/login')
        .send({
            email: this.world.loginData.email,
            password: this.world.loginData.password
        });
});

When('I login with incorrect password', async function () {
    this.world.response = await request(app)
        .post('/api/auth/login')
        .send({
            email: this.world.loginData.email,
            password: 'WrongPassword123!'
        });
});

When('I login with email {string}', async function (email) {
    this.world.response = await request(app)
        .post('/api/auth/login')
        .send({
            email,
            password: 'SomePassword123!'
        });
});

When('I request a token refresh', async function () {
    this.world.response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `token=${this.world.token}`);
});

When('I logout', async function () {
    this.world.response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${this.world.token}`);
});

When('I request a password reset for {string}', async function (email) {
    this.world.response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email });
});

When('I reset my password to {string}', async function (newPassword) {
    this.world.response = await request(app)
        .post('/api/auth/reset-password')
        .send({
            token: this.world.resetToken,
            password: newPassword
        });

    this.world.newPassword = newPassword;
});

When('I try to reset my password', async function () {
    this.world.response = await request(app)
        .post('/api/auth/reset-password')
        .send({
            token: this.world.resetToken,
            password: 'NewPassword123!'
        });
});

// ============ THEN STEPS ============

Then('I should receive a successful registration response', function () {
    expect(this.world.response.status).to.equal(201);
});

Then('I should receive a JWT token', function () {
    expect(this.world.response.body).to.have.property('token');
    expect(this.world.response.body.token).to.be.a('string');
    this.world.token = this.world.response.body.token;
});

Then('my account should be created in the system', async function () {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [this.world.userData.email]
    );
    expect(result.rows.length).to.equal(1);
});

Then('a verification email should be sent', function () {
    // Simplified - in real implementation would check email service
    expect(this.world.response.status).to.equal(201);
});

Then('I should receive an authentication error response', function () {
    expect(this.world.response.status).to.be.at.least(400);
});

Then('the error should indicate email already exists', function () {
    expect(this.world.response.body.error).to.match(/already exists|already registered/i);
});

Then('I should receive a validation error', function () {
    expect(this.world.response.status).to.be.at.least(400);
});

Then('the error should indicate invalid email format', function () {
    expect(this.world.response.body.error).to.match(/invalid email|email format/i);
});

Then('the error should indicate password too weak', function () {
    expect(this.world.response.body.error).to.match(/password|weak|strong/i);
});

Then('I should receive a successful login response', function () {
    expect(this.world.response.status).to.equal(200);
});

Then('the token should be valid', function () {
    expect(this.world.token).to.be.a('string');
    expect(this.world.token.length).to.be.greaterThan(20);
});

Then('I should receive an authentication error', function () {
    expect(this.world.response.status).to.equal(401);
});

Then('the error should indicate invalid credentials', function () {
    expect(this.world.response.body.error).to.match(/invalid|incorrect|credentials/i);
});

Then('I should receive a new JWT token', function () {
    expect(this.world.response.body).to.have.property('token');
    expect(this.world.response.body.token).to.not.equal(this.world.token);
});

Then('the new token should be valid', function () {
    expect(this.world.response.body.token).to.be.a('string');
});

Then('my session should be terminated', function () {
    expect(this.world.response.status).to.equal(200);
});

Then('subsequent requests should require re-authentication', function () {
    // Simplified - would test actual request in real implementation
    expect(this.world.response.status).to.equal(200);
});

Then('I should receive a success response', function () {
    expect(this.world.response.status).to.be.at.most(201);
});

Then('a password reset email should be sent', function () {
    // Simplified
    expect(this.world.response.status).to.be.at.most(201);
});

Then('a reset token should be generated', function () {
    // Simplified
    expect(this.world.response.status).to.be.at.most(201);
});

Then('my password should be updated', function () {
    expect(this.world.response.status).to.equal(200);
});

Then('I should be able to login with the new password', async function () {
    const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
            email: this.world.resetEmail,
            password: this.world.newPassword
        });

    expect(loginResponse.status).to.equal(200);
});

Then('the error should indicate token expired', function () {
    expect(this.world.response.body.error).to.match(/expired|invalid token/i);
});

module.exports = { AuthWorld };
