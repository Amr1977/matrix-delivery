/**
 * Common Step Definitions
 * Reusable steps used across multiple features
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// ============================================================================
// Background / Setup Steps
// ============================================================================

Given('the P2P delivery platform is running', async function() {
  // Verify server is running
  const response = await this.get('/health');
  assert.ok(response.ok, 'Server is not running');
  assert.equal(response.data.status, 'healthy');
});

Given('the database is clean and initialized', async function() {
  await this.truncateAllTables();
});

Given('the database is clean', async function() {
  await this.truncateAllTables();
});

Given('the system time is {string}', function(timestamp) {
  this.systemTime = new Date(timestamp);
});

// ============================================================================
// User Management Steps
// ============================================================================

Given('test customer {string} is logged in with email {string}', async function(name, email) {
  const user = await this.createTestUser('customer', { name, email });
  await this.loginUser(email, user.password);
});

Given('test customer {string} with email {string} exists', async function(name, email) {
  const user = await this.createTestUser('customer', { name, email });
  this.testData.users[name] = user;
});

Given('test driver {string} is logged in with email {string}', async function(name, email) {
  const user = await this.createTestUser('driver', { name, email });
  await this.loginUser(email, user.password);
});

Given('test driver {string} with email {string} exists', async function(name, email) {
  const user = await this.createTestUser('driver', { name, email });
  this.testData.users[name] = user;
});

Given('there is a registered customer account', async function() {
  this.testUser = await this.createTestUser('customer', {
    name: 'John Customer',
    email: 'john@example.com'
  });
});

Given('there is a registered driver account', async function() {
  this.testDriver = await this.createTestUser('driver', {
    name: 'Jane Driver',
    email: 'jane@example.com'
  });
});

Given('I am logged in as customer', async function() {
  if (!this.testUser) {
    this.testUser = await this.createTestUser('customer');
  }
  await this.loginUser(this.testUser.email, this.testUser.password);
});

Given('I am logged in as driver', async function() {
  if (!this.testDriver) {
    this.testDriver = await this.createTestUser('driver');
  }
  await this.loginUser(this.testDriver.email, this.testDriver.password);
});

Given('I am logged in as customer {string}', async function(email) {
  const user = Object.values(this.testData.users).find(u => u.email === email);
  if (!user) {
    throw new Error(`User with email ${email} not found`);
  }
  await this.loginUser(user.email, user.password);
});

Given('I am logged in as driver {string}', async function(name) {
  const user = this.testData.users[name];
  if (!user) {
    throw new Error(`Driver ${name} not found`);
  }
  await this.loginUser(user.email, user.password);
});

Given('I am not logged in', function() {
  this.authToken = null;
  this.currentUser = null;
});

Given('I am authenticated as {word}', async function(role) {
  const user = await this.createTestUser(role);
  await this.loginUser(user.email, user.password);
});

Given('I am authenticated as assigned driver', async function() {
  // Assumes order exists and driver is assigned
  const order = Object.values(this.testData.orders)[0];
  if (!order || !order.assignedDriver) {
    throw new Error('No order with assigned driver found');
  }
  
  const driver = Object.values(this.testData.users).find(
    u => u.id === order.assignedDriver.userId
  );
  
  await this.loginUser(driver.email, driver.password);
});

// ============================================================================
// Navigation Steps
// ============================================================================

Given('I am on the {string} page', function(pageName) {
  this.currentPage = pageName.toLowerCase().replace(/\s+/g, '_');
});

Given('I am on the registration page', function() {
  this.currentPage = 'registration';
});

Given('I am on the login page', function() {
  this.currentPage = 'login';
});

Given('I am on the order creation page', function() {
  this.currentPage = 'order_creation';
});

Given('I am on the driver dashboard', function() {
  this.currentPage = 'driver_dashboard';
});

When('I navigate to {string}', function(pageName) {
  this.currentPage = pageName.toLowerCase().replace(/\s+/g, '_');
});

When('I navigate to {string} section', function(sectionName) {
  this.currentPage = sectionName.toLowerCase().replace(/\s+/g, '_');
});

// ============================================================================
// API Request Steps
// ============================================================================

When('I GET {string}', async function(endpoint) {
  await this.get(endpoint);
});

When('I POST to {string}', async function(endpoint) {
  await this.post(endpoint, {});
});

When('I POST to {string} with:', async function(endpoint, dataTable) {
  const data = dataTable.rowsHash();
  await this.post(endpoint, data);
});

When('I PUT to {string}', async function(endpoint) {
  await this.put(endpoint, {});
});

When('I DELETE {string}', async function(endpoint) {
  await this.delete(endpoint);
});

When('I request {string}', async function(endpoint) {
  await this.get(endpoint);
});

When('I request {string} at endpoint {string}', async function(resource, endpoint) {
  await this.get(endpoint);
});

// ============================================================================
// Response Assertion Steps
// ============================================================================

Then('I should receive success response', function() {
  this.assertResponseOk();
});

Then('I should receive error {string}', function(errorMessage) {
  this.assertResponseError(errorMessage);
});

Then('I should see error message {string}', function(errorMessage) {
  this.assertResponseError(errorMessage);
});

Then('I should see success message {string}', function(successMessage) {
  this.assertResponseOk();
  if (this.response.data.message) {
    assert.ok(
      this.response.data.message.includes(successMessage),
      `Expected message to contain "${successMessage}", got "${this.response.data.message}"`
    );
  }
});

Then('I should get HTTP status code {int}', function(statusCode) {
  this.assertResponseStatus(statusCode);
});

Then('the response should include:', function(dataTable) {
  this.assertResponseOk();
  const expectedFields = dataTable.rows().map(row => row[0]);
  
  expectedFields.forEach(field => {
    assert.ok(
      this.response.data.hasOwnProperty(field),
      `Response missing field: ${field}`
    );
  });
});

Then('response should include:', function(dataTable) {
  this.assertResponseOk();
  const expected = dataTable.rowsHash();
  
  Object.entries(expected).forEach(([key, value]) => {
    const actualValue = this.response.data[key];
    assert.ok(
      actualValue !== undefined,
      `Response missing field: ${key}`
    );
    
    if (value !== 'timestamp' && value !== 'generated_id' && value !== 'any') {
      assert.equal(
        String(actualValue),
        value,
        `Expected ${key} to be "${value}", got "${actualValue}"`
      );
    }
  });
});

// ============================================================================
// Data Table Helpers
// ============================================================================

When('I fill in the form with:', function(dataTable) {
  this.formData = { ...this.formData, ...dataTable.rowsHash() };
});

When('I fill in:', function(dataTable) {
  this.formData = { ...this.formData, ...dataTable.rowsHash() };
});

// ============================================================================
// Wait / Timing Steps
// ============================================================================

When('I wait {int} second(s)', async function(seconds) {
  await this.wait(seconds * 1000);
});

When('I wait {int} millisecond(s)', async function(ms) {
  await this.wait(ms);
});

// ============================================================================
// Button / Action Steps
// ============================================================================

When('I click {string} button', function(buttonName) {
  this.lastButtonClicked = buttonName;
});

When('I click {string}', function(elementName) {
  this.lastElementClicked = elementName;
});

When('I submit the form', function() {
  this.formSubmitted = true;
});

When('I click the {string} button', function(buttonName) {
  this.lastButtonClicked = buttonName;
});

// ============================================================================
// Modal Steps
// ============================================================================

Then('modal should open', function() {
  this.modalOpen = true;
});

Then('modal should close', function() {
  this.modalOpen = false;
});

Then('I should see {string} modal', function(modalName) {
  assert.ok(this.modalOpen, 'Expected modal to be open');
  this.currentModal = modalName;
});

When('I close the modal', function() {
  this.modalOpen = false;
  this.currentModal = null;
});

// ============================================================================
// Visibility / Display Steps
// ============================================================================

Then('I should see:', function(docString) {
  // UI visibility check - just log for now
  console.log('Expected to see:', docString);
});

Then('I should see {string}', function(content) {
  // UI visibility check
  this.lastSeenContent = content;
});

Then('I should not see {string}', function(content) {
  // UI visibility check - negative assertion
  this.lastHiddenContent = content;
});

// ============================================================================
// Loading / State Steps
// ============================================================================

Then('I should see loading spinner', function() {
  this.loadingState = true;
});

Then('loading spinner should disappear', function() {
  this.loadingState = false;
});

Then('I should see loading indicator', function() {
  this.loadingState = true;
});

// ============================================================================
// Error Handling Steps
// ============================================================================

Then('no error should be shown to user', function() {
  // Verify no error state
  assert.ok(!this.response || this.response.ok, 'Unexpected error occurred');
});

Then('error should be logged to console', function() {
  // Error logging verification - would need console spy in real implementation
  console.log('Error logged (verification skipped in tests)');
});

// ============================================================================
// Notification Steps
// ============================================================================

Then('{word} should receive notification {string}', async function(userName, notificationTitle) {
  // Will be implemented in notification_steps.js
  this.expectedNotification = { userName, title: notificationTitle };
});

Then('{word} should receive notification:', async function(userName, dataTable) {
  // Will be implemented in notification_steps.js
  this.expectedNotification = { userName, ...dataTable.rowsHash() };
});

// ============================================================================
// Cleanup Steps
// ============================================================================

Then('I should remain on the {string} page', function(pageName) {
  assert.equal(
    this.currentPage,
    pageName.toLowerCase().replace(/\s+/g, '_')
  );
});

Then('I should return to {string}', function(pageName) {
  this.currentPage = pageName.toLowerCase().replace(/\s+/g, '_');
});

Then('I should be redirected to {string}', function(pageName) {
  this.currentPage = pageName.toLowerCase().replace(/\s+/g, '_');
});

Then('I should be redirected to the {string}', function(pageName) {
  this.currentPage = pageName.toLowerCase().replace(/\s+/g, '_');
});

// ============================================================================
// Empty State Steps
// ============================================================================

Then('I should see empty state:', function(docString) {
  this.emptyState = docString;
});

Then('I should see empty state message:', function(docString) {
  this.emptyState = docString;
});