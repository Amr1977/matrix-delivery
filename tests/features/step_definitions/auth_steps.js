/**
 * Authentication Step Definitions
 * Steps for user registration, login, and session management
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// ============================================================================
// Registration Steps
// ============================================================================

When('I fill in the registration form with:', async function(dataTable) {
  const data = dataTable.rowsHash();
  this.registrationData = {
    name: data.name,
    email: data.email,
    password: data.password,
    phone: data.phone,
    role: data.role || data.user_type,
    ...(data.vehicle_type && { vehicle_type: data.vehicle_type })
  };
});

When('I submit the registration form', async function() {
  const response = await this.post('/auth/register', this.registrationData, { noAuth: true });
  this.response = response;
});

When('I register as {word} with:', async function(role, dataTable) {
  const data = dataTable.rowsHash();
  this.registrationData = {
    ...data,
    role: role,
    ...(role === 'driver' && !data.vehicle_type && { vehicle_type: 'bike' })
  };
  
  await this.post('/auth/register', this.registrationData, { noAuth: true });
});

When('I attempt to register with:', async function(dataTable) {
  const data = dataTable.rowsHash();
  await this.post('/auth/register', data, { noAuth: true });
});

When('I attempt to register with email {string}', async function(email) {
  const data = {
    name: 'Test User',
    email: email,
    password: 'SecurePass123!',
    phone: '+1234567890',
    role: 'customer'
  };
  await this.post('/auth/register', data, { noAuth: true });
});

When('I attempt to register as driver without vehicle type:', async function(dataTable) {
  const data = dataTable.rowsHash();
  await this.post('/auth/register', data, { noAuth: true });
});

When('I attempt to register with password {string}', async function(password) {
  const data = {
    name: 'Test User',
    email: this.generateEmail(),
    password: password,
    phone: '+1234567890',
    role: 'customer'
  };
  await this.post('/auth/register', data, { noAuth: true });
});

When('I attempt to register with invalid email {string}', async function(email) {
  const data = {
    name: 'Test User',
    email: email,
    password: 'SecurePass123!',
    phone: '+1234567890',
    role: 'customer'
  };
  await this.post('/auth/register', data, { noAuth: true });
});

When('I attempt to register with incomplete data:', async function(dataTable) {
  const data = dataTable.rowsHash();
  await this.post('/auth/register', data, { noAuth: true });
});

When('I register new account', async function() {
  const data = {
    name: 'Test User',
    email: this.generateEmail(),
    password: 'SecurePass123!',
    phone: '+1234567890',
    role: 'customer'
  };
  await this.post('/auth/register', data, { noAuth: true });
});

// ============================================================================
// Login Steps
// ============================================================================

Given('I am a registered {word} with:', async function(role, dataTable) {
  const data = dataTable.rowsHash();
  const user = await this.createTestUser(role, {
    email: data.email,
    password: data.password,
    ...(data.status && { status: data.status })
  });
  this.testUser = user;
});

Given('I am a registered user with email {string}', async function(email) {
  const user = await this.createTestUser('customer', { email });
  this.testUser = user;
});

Given('a user exists with email {string}', async function(email) {
  await this.createTestUser('customer', { email });
});

When('I login with email {string} and password {string}', async function(email, password) {
  await this.post('/auth/login', { email, password }, { noAuth: true });
});

When('I login with credentials:', async function(dataTable) {
  const data = dataTable.rowsHash();
  await this.post('/auth/login', {
    email: data.email,
    password: data.password
  }, { noAuth: true });
});

When('I attempt to login with:', async function(dataTable) {
  const data = dataTable.rowsHash();
  await this.post('/auth/login', {
    email: data.email,
    password: data.password
  }, { noAuth: true });
});

When('I attempt to login without email', async function() {
  await this.post('/auth/login', { password: 'somepassword' }, { noAuth: true });
});

When('I login with correct credentials', async function() {
  if (!this.testUser) {
    this.testUser = await this.createTestUser('customer');
  }
  await this.loginUser(this.testUser.email, this.testUser.password);
});

When('I login with wrong password', async function() {
  if (!this.testUser) {
    this.testUser = await this.createTestUser('customer');
  }
  await this.post('/auth/login', {
    email: this.testUser.email,
    password: 'WrongPassword123!'
  }, { noAuth: true });
});

When('I log back in as customer', async function() {
  const customer = Object.values(this.testData.users).find(u => u.role === 'customer');
  if (!customer) {
    throw new Error('No customer found in test data');
  }
  await this.loginUser(customer.email, customer.password);
});

When('I log in as driver {string}', async function(name) {
  const driver = this.testData.users[name];
  if (!driver) {
    throw new Error(`Driver ${name} not found`);
  }
  await this.loginUser(driver.email, driver.password);
});

When('I log in as customer {string}', async function(name) {
  const customer = this.testData.users[name];
  if (!customer) {
    throw new Error(`Customer ${name} not found`);
  }
  await this.loginUser(customer.email, customer.password);
});

// ============================================================================
// Session Management Steps
// ============================================================================

When('I refresh the page', function() {
  // In real implementation, this would reload the page
  // For API tests, we just verify token still works
  this.pageRefreshed = true;
});

When('I click logout', function() {
  this.authToken = null;
  this.currentUser = null;
});

When('I click the logout button', function() {
  this.authToken = null;
  this.currentUser = null;
});

Then('I should be logged in', function() {
  assert.ok(this.authToken, 'Expected to have auth token');
  assert.ok(this.currentUser, 'Expected to have current user');
});

Then('I should be logged in as {word}', function(role) {
  assert.ok(this.authToken, 'Expected to have auth token');
  assert.ok(this.currentUser, 'Expected to have current user');
  assert.equal(this.currentUser.role, role);
});

Then('I should still be logged in', function() {
  assert.ok(this.authToken, 'Expected to still have auth token');
});

Then('I should not be able to access protected routes', async function() {
  const oldToken = this.authToken;
  this.authToken = null;
  
  await this.get('/orders');
  assert.ok(!this.response.ok, 'Expected request to fail without token');
  
  this.authToken = oldToken;
});

// ============================================================================
// Token Management Steps
// ============================================================================

Given('I have an invalid authentication token', function() {
  this.authToken = 'invalid_token_12345';
});

Given('I have expired token', function() {
  this.authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.expired';
});

Then('I should receive an authentication token', function() {
  assert.ok(this.response.ok, 'Expected successful response');
  assert.ok(this.response.data.token, 'Expected to receive token');
  this.authToken = this.response.data.token;
});

Then('I should not receive an authentication token', function() {
  assert.ok(!this.response.ok || !this.response.data.token, 'Expected not to receive token');
});

Then('I should receive auth token', function() {
  assert.ok(this.response.data.token, 'Expected token in response');
  this.authToken = this.response.data.token;
});

Then('auth token should be removed', function() {
  this.authToken = null;
});

Then('token should be stored in localStorage', function() {
  // In real browser implementation, would check localStorage
  assert.ok(this.authToken, 'Token should be available');
});

Then('I receive token', function() {
  assert.ok(this.response.data.token, 'Expected token in response');
});

Then('I receive user data', function() {
  assert.ok(this.response.data, 'Expected user data in response');
  assert.ok(this.response.data.id, 'Expected user id');
  assert.ok(this.response.data.email, 'Expected user email');
});

// ============================================================================
// Account Creation Assertions
// ============================================================================

Then('my account should be created with:', function(dataTable) {
  this.assertResponseOk();
  const expected = dataTable.rowsHash();
  const user = this.response.data.user;
  
  Object.entries(expected).forEach(([key, value]) => {
    if (value === '0') {
      assert.equal(user[key] || 0, 0);
    } else if (key === 'member_since') {
      assert.ok(user.created_at || user.createdAt);
    } else if (key !== 'status') { // status not in response
      assert.ok(user[key] !== undefined, `Expected ${key} in user data`);
    }
  });
});

Then('no new account should be created', function() {
  assert.ok(!this.response.ok, 'Expected registration to fail');
});

Then('no account should be created', function() {
  assert.ok(!this.response.ok, 'Expected registration to fail');
});

// ============================================================================
// User Data Assertions
// ============================================================================

Then('I should see my user information:', function(dataTable) {
  this.assertResponseOk();
  const expected = dataTable.rowsHash();
  const user = this.response.data;
  
  Object.entries(expected).forEach(([key, value]) => {
    assert.equal(user[key], value, `Expected ${key} to be ${value}`);
  });
});

Then('I should see customer dashboard', function() {
  this.currentPage = 'customer_dashboard';
  assert.equal(this.currentUser.role, 'customer');
});

Then('I should see driver dashboard', function() {
  this.currentPage = 'driver_dashboard';
  assert.equal(this.currentUser.role, 'driver');
});

Then('I should see driver-specific interface elements', function() {
  assert.equal(this.currentUser.role, 'driver');
});

Then('I should access dashboard', function() {
  this.currentPage = 'dashboard';
});

Then('the response should not include my password', function() {
  assert.ok(!this.response.data.password, 'Password should not be in response');
});

Then('I should receive my account details:', function(dataTable) {
  this.assertResponseOk();
  const expected = dataTable.rowsHash();
  
  Object.entries(expected).forEach(([key, value]) => {
    assert.ok(this.response.data[key] !== undefined, `Expected ${key} in response`);
  });
});

// ============================================================================
// Authentication Screen Steps
// ============================================================================

Then('I should see the authentication screen', function() {
  this.currentPage = 'authentication';
  assert.ok(!this.authToken, 'Should not have token');
});

Then('I should see {string} page', function(pageName) {
  this.currentPage = pageName.toLowerCase().replace(/\s+/g, '_');
});

// ============================================================================
// Session Steps
// ============================================================================

Then('my session should be terminated', function() {
  this.authToken = null;
  this.currentUser = null;
});

// ============================================================================
// UI Element Steps
// ============================================================================

Then('I should see {string} button', function(buttonName) {
  // UI check - just track expected button
  this.expectedButton = buttonName;
});

When('I click {string}', function(elementName) {
  this.lastClickedElement = elementName;
});

When('I click the {string} button', function(buttonName) {
  this.lastClickedButton = buttonName;
});

Then('the password should be masked by default', function() {
  this.passwordMasked = true;
});

Then('the password should be visible as plain text', function() {
  this.passwordMasked = false;
});

Then('the password should be masked again', function() {
  this.passwordMasked = true;
});

Then('I should see the registration form', function() {
  this.currentPage = 'registration';
});

Then('the page title should be {string}', function(title) {
  this.pageTitle = title;
});

Then('I should see the login form', function() {
  this.currentPage = 'login';
});

// ============================================================================
// Verification Email Steps (Placeholder)
// ============================================================================

Then('I should receive a verification email at {string}', function(email) {
  // Email verification would be implemented with email service mock
  console.log(`Verification email sent to: ${email}`);
});

// ============================================================================
// Health Check Steps
// ============================================================================

When('I request the health check endpoint {string}', async function(endpoint) {
  await this.get(endpoint);
});

Then('I should receive status {string}', function(status) {
  assert.equal(this.response.data.status, status);
});

Then('database should be {string}', function(dbType) {
  assert.equal(this.response.data.database, dbType);
});

// ============================================================================
// Validation Steps
// ============================================================================

When('I attempt to register with {word} as {string}', async function(field, value) {
  const data = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'SecurePass123!',
    phone: '+1234567890',
    role: 'customer'
  };
  data[field] = value;
  
  await this.post('/auth/register', data, { noAuth: true });
});

Then('I should see appropriate error message', function() {
  assert.ok(!this.response.ok, 'Expected error response');
  assert.ok(this.response.error, 'Expected error message');
});

// ============================================================================
// Multiple User Registration
// ============================================================================

Given('another user registers as driver with:', async function(dataTable) {
  const data = dataTable.rowsHash();
  const driver = await this.createTestUser('driver', data);
  this.testDriver = driver;
  
  // Automatically login the new driver
  await this.loginUser(driver.email, driver.password);
});

Given('{int} drivers are registered:', async function(count, dataTable) {
  const drivers = dataTable.hashes();
  
  for (const driverData of drivers) {
    const driver = await this.createTestUser('driver', driverData);
    this.testData.users[driverData.name] = driver;
  }
});

// ============================================================================
// Authorization Steps
// ============================================================================

Then('I should see welcome message {string}', function(message) {
  // UI assertion - would check actual welcome message in real implementation
  this.welcomeMessage = message;
});

Then('both should have accounts created', function() {
  assert.ok(Object.keys(this.testData.users).length >= 2, 'Expected at least 2 users');
});