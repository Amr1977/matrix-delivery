const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../app'); // Adjust path to app.js relative to this file
let server;
let response;

// Use a distinct port or just allowing app to be used by supertest directly usually works without listening
// But app.js might need db connection init.

Before(async function () {
    // Ensure DB is connected or initialized if needed.
    // In integration tests we usually have a helper.
    // For simplicity, we assume app.js initializes what's needed or we wait a bit.
    // Or we can rely on beforeAll in jest.
});

// Clean up user if possible, or just use unique emails
const uniqueId = Date.now();

Given('I have a registered account with email {string} and password {string}', async function (email, password) {
    // Create user directly via API or DB
    // We use the API to register to be safe
    const uniqueEmail = `${uniqueId}_${email}`;
    this.email = uniqueEmail;

    await request(app)
        .post('/api/auth/register')
        .send({
            name: 'BDD Test User',
            email: uniqueEmail,
            password: password,
            phone: '+1234567890',
            primary_role: 'customer',
            country: 'TestCountry',
            city: 'TestCity',
            area: 'TestArea'
        });
});

When('I attempt to login with email {string} and password {string}', async function (email, password) {
    // Use the unique email if it matches the one we set up
    const loginEmail = (email === "test_bdd@example.com") ? this.email : email;

    response = await request(app)
        .post('/api/auth/login')
        .send({
            email: loginEmail,
            password: password
        });
});

Then('I should receive a {int} status code', function (statusCode) {
    expect(response.status).to.equal(statusCode);
});

Then('the response error should contain {string}', function (errorMessage) {
    expect(response.body.error).to.include(errorMessage);
});
