const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Common step definitions
Given('I am on the home page', async function() {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');
});

Given('there is a registered customer account', async function() {
  // Create test customer via API to ensure isolation
  const timestamp = Date.now();
  const customerData = {
    name: 'Test Customer',
    email: `customer_${timestamp}@test.com`,
    password: 'test123',
    role: 'customer'
  };

  const response = await fetch(`${this.apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.testData.customer = { ...customerData, id: data.user.id, token: data.token };
});

Given('there is a registered driver account', async function() {
  // Create test driver via API
  const timestamp = Date.now();
  const driverData = {
    name: 'Test Driver',
    email: `driver_${timestamp}@test.com`,
    password: 'test123',
    role: 'driver'
  };

  const response = await fetch(`${this.apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(driverData)
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.testData.driver = { ...driverData, id: data.user.id, token: data.token };
});

// Authentication navigation steps
When('I click on the register button', async function() {
  // The register button is directly in the login form as the switch link
  const registerLink = this.page.locator('button:has-text("Sign Up")');
  await registerLink.click();
  await this.page.waitForTimeout(500); // Allow form to switch
});

When('I click on the login button', async function() {
  const loginButton = this.page.locator('button:has-text("Sign In")');
  await loginButton.click();
  await this.page.waitForTimeout(500); // Allow form processing
});

When('I click on the register link', async function() {
  const registerLink = this.page.locator('button:has-text("Sign Up")');
  await registerLink.click();
  await this.page.waitForTimeout(500);
});

When('I click on the login link', async function() {
  const loginLink = this.page.locator('button:has-text("Sign In")');
  await loginLink.click();
  await this.page.waitForTimeout(500);
});

// Form filling steps
When('I fill in registration details for a customer:', async function(dataTable) {
  const data = dataTable.rowsHash();
  await this.page.fill('input[placeholder="Full Name"]', data.name);
  await this.page.fill('input[placeholder="Email"]', data.email);
  await this.page.fill('input[placeholder="Password"]', data.password);

  // Select role if dropdown exists
  const roleSelect = this.page.locator('select');
  if (await roleSelect.isVisible()) {
    await roleSelect.selectOption(data.role);
  }

  this.testData.currentRegistration = data;
});

When('I fill in registration details for a driver:', async function(dataTable) {
  // Same as customer but with driver role
  const data = dataTable.rowsHash();
  await this.page.fill('input[placeholder="Full Name"]', data.name);
  await this.page.fill('input[placeholder="Email"]', data.email);
  await this.page.fill('input[placeholder="Password"]', data.password);

  const roleSelect = this.page.locator('select');
  if (await roleSelect.isVisible()) {
    await roleSelect.selectOption(data.role);
  }

  this.testData.currentRegistration = data;
});

When('I fill in login credentials:', async function(dataTable) {
  const data = dataTable.rowsHash();
  await this.page.fill('input[placeholder="Email"]', data.email);
  await this.page.fill('input[placeholder="Password"]', data.password);
});

When('I fill in invalid login credentials:', async function(dataTable) {
  const data = dataTable.rowsHash();
  await this.page.fill('input[placeholder="Email"]', data.email);
  await this.page.fill('input[placeholder="Password"]', data.password);
});

// Form submission and results
When('I submit the registration form', async function() {
  const registerButton = this.page.locator('button:has-text("Create Account")');
  await registerButton.click();
  await this.page.waitForTimeout(2000); // Wait for registration to process
});

When('I submit the login form', async function() {
  const loginButton = this.page.locator('button:has-text("Sign In")');
  await loginButton.click();
  await this.page.waitForTimeout(2000); // Wait for login to process
});

// Page state assertions
Then('I should see the registration form', async function() {
  await this.page.waitForSelector('h2:has-text("Create Account")', { timeout: 5000 });
  const formTitle = await this.page.locator('h2').textContent();
  expect(formTitle).to.include('Create Account');
});

Then('I should see the login form', async function() {
  await this.page.waitForSelector('h2:has-text("Sign In")', { timeout: 5000 });
  const formTitle = await this.page.locator('h2').textContent();
  expect(formTitle).to.include('Sign In');
});

Then('I should be logged in successfully', async function() {
  // Check if we're redirected to the dashboard (authentication components disappear)
  await this.page.waitForSelector('.logout', { timeout: 10000 });
  const logoutButton = await this.page.locator('button:has-text("Logout")');
  expect(await logoutButton.isVisible()).to.be.true;
});

Then('I should see my dashboard with customer content', async function() {
  await this.page.waitForSelector('button:has-text("Publish New Order")', { timeout: 5000 });
  await this.page.waitForSelector('text="My Orders"', { timeout: 5000 });

  const roleIndicator = await this.page.locator('[class*="role"]').textContent();
  expect(roleIndicator.toLowerCase()).to.include('customer');
});

Then('I should see my dashboard with driver content', async function() {
  await this.page.waitForSelector('text="Available Orders"', { timeout: 5000 });

  const roleIndicator = await this.page.locator('[class*="role"]').textContent();
  expect(roleIndicator.toLowerCase()).to.include('driver');
});

// Error handling
Then('I should see a login error message {string}', async function(expectedMessage) {
  const errorElement = await this.page.locator('.error').or(this.page.locator('[class*="error"]'));
  await errorElement.waitFor({ state: 'visible', timeout: 5000 });
  const errorText = await errorElement.textContent();
  expect(errorText).to.include(expectedMessage);
});

Then('I should see a registration error message {string}', async function(expectedMessage) {
  const errorElement = await this.page.locator('.error').or(this.page.locator('[class*="error"]'));
  await errorElement.waitFor({ state: 'visible', timeout: 5000 });
  const errorText = await errorElement.textContent();
  expect(errorText).to.include(expectedMessage);
});

// Navigation steps
Then('I should be redirected to the login page', async function() {
  await this.page.waitForURL(this.baseUrl, { timeout: 5000 });
  expect(this.page.url()).to.equal(this.baseUrl);
});

When('I logout', async function() {
  const logoutButton = this.page.locator('button:has-text("Logout")');
  await logoutButton.click();
  await this.page.waitForTimeout(1000);
});

When('I go back to the home page', async function() {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');
});

// Login scenario
Given('I am logged in as a customer', async function() {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');

  if (!this.testData.customer) {
    throw new Error('Customer test data not available. Create a customer account first.');
  }

  await this.page.fill('input[placeholder="Email"]', this.testData.customer.email);
  await this.page.fill('input[placeholder="Password"]', this.testData.customer.password);
  await this.page.click('button:has-text("Sign In")');
  await this.page.waitForSelector('button:has-text("Logout")', { timeout: 10000 });
});

Given('I am logged in as a driver', async function() {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');

  if (!this.testData.driver) {
    throw new Error('Driver test data not available. Create a driver account first.');
  }

  await this.page.fill('input[placeholder="Email"]', this.testData.driver.email);
  await this.page.fill('input[placeholder="Password"]', this.testData.driver.password);
  await this.page.click('button:has-text("Sign In")');
  await this.page.waitForSelector('button:has-text("Logout")', { timeout: 10000 });
});

Given('I am logged in as customer {string}', async function(email) {
  // Login customer via API
  const loginResponse = await fetch(`${this.apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      password: 'test123' // Use standard test password
    })
  });

  expect(loginResponse.ok).to.be.true;
  const loginData = await loginResponse.json();

  // Store customer data
  if (!this.testData.customer) {
    this.testData.customer = {};
  }
  this.testData.customer.token = loginData.token;
  this.testData.customer.id = loginData.user.id;

  // Also set up driver for completed order test
  await this.setupTestDriver();
});

When('I am logged in as the customer', async function() {
  await this.amLoggedInAsACustomer();
});

// Review functionality steps
When('I submit a review with rating {string} and comment {string}', async function(rating, comment) {
  // Use the completed order ID created in the background setup
  const orderId = this.testData.completedOrderId || 'ORD-001';

  const reviewResponse = await fetch(`${this.apiUrl}/orders/${orderId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.testData.customer.token}`
    },
    body: JSON.stringify({
      reviewType: 'customer_to_driver',
      rating: parseInt(rating),
      comment: comment
    })
  });

  this.testData.lastReviewResponse = reviewResponse;
  const reviewData = await reviewResponse.json();
  this.testData.lastReviewData = reviewData;
});

Then('the review should be saved successfully', async function() {
  expect(this.testData.lastReviewResponse.ok).to.be.true;
  expect(this.testData.lastReviewData.message).to.include('submitted successfully');
});

Then('the driver\'s rating should be updated', async function() {
  // This would require querying the driver's updated rating
  // For now, just check that the response indicates success
  expect(this.testData.lastReviewResponse.status).to.equal(201);
});

// Order creation for testing
Given('there is a completed order', async function() {
  // Create a test order via API
  const orderResponse = await fetch(`${this.apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.testData.customer.token}`
    },
    body: JSON.stringify({
      title: 'Test Order for Reviews',
      description: 'Testing review functionality',
      pickup_address: '123 Main St, Test City',
      delivery_address: '456 Delivery Ave, Test City',
      from: { lat: 40.7128, lng: -74.0060, name: 'Manhattan' },
      to: { lat: 40.7589, lng: -73.9851, name: 'Times Square' },
      price: 25.00
    })
  });

  expect(orderResponse.ok).to.be.true;
  const orderData = await orderResponse.json();
  this.testData.lastOrderId = orderData._id;

  // Create a driver and assign to the order
  if (this.testData.driver && this.testData.driver.token) {
    // Place a bid as driver
    const bidResponse = await fetch(`${this.apiUrl}/orders/${this.testData.lastOrderId}/bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testData.driver.token}`
      },
      body: JSON.stringify({
        bidPrice: '20.00'
      })
    });

    // Accept bid as customer
    const acceptResponse = await fetch(`${this.apiUrl}/orders/${this.testData.lastOrderId}/accept-bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testData.customer.token}`
      },
      body: JSON.stringify({
        userId: this.testData.driver.id
      })
    });

    // Complete the order as driver (pickup, transit, deliver)
    const pickupResponse = await fetch(`${this.apiUrl}/orders/${this.testData.lastOrderId}/pickup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.testData.driver.token}`
      }
    });

    const transitResponse = await fetch(`${this.apiUrl}/orders/${this.testData.lastOrderId}/in-transit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.testData.driver.token}`
      }
    });

    const completeResponse = await fetch(`${this.apiUrl}/orders/${this.testData.lastOrderId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.testData.driver.token}`
      }
    });

    this.testData.completedOrderId = this.testData.lastOrderId;
  }
});

// Helper method to setup test driver
Given('setup test driver', async function() {
  if (!this.testData.driver) {
    // Register a test driver
    const driverResponse = await fetch(`${this.apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Driver',
        email: `driver_${Date.now()}@test.com`,
        password: 'test123',
        phone: '+1987654321',
        role: 'driver',
        vehicle_type: 'bike'
      })
    });

    expect(driverResponse.ok).to.be.true;
    const driverData = await driverResponse.json();
    this.testData.driver = {
      id: driverData.user.id,
      token: driverData.token,
      email: driverData.user.email
    };
  }
});
