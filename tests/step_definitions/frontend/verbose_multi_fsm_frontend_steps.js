const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const assert = require('assert');
const { chromium } = require('playwright');

// Browser and page instances
let browser;
let page;

Before(async function () {
  browser = await chromium.launch();
  page = await browser.newPage();

  // Set up test data
  this.testData = {
    customer: { id: 1, email: 'customer@test.com' },
    vendor: { id: 2, email: 'vendor@test.com' },
    courier: { id: 3, email: 'courier@test.com' },
    admin: { id: 4, email: 'admin@test.com' }
  };
});

After(async function () {
  await browser.close();
});

// Authentication steps
Given('I am logged in as a customer', async function () {
  await page.goto('http://localhost:3000/login');
  await page.fill('[data-testid="email-input"]', this.testData.customer.email);
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
});

Given('I am logged in as a vendor', async function () {
  await page.goto('http://localhost:3000/login');
  await page.fill('[data-testid="email-input"]', this.testData.vendor.email);
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/vendor/dashboard');
});

Given('I am logged in as a courier', async function () {
  await page.goto('http://localhost:3000/login');
  await page.fill('[data-testid="email-input"]', this.testData.courier.email);
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/courier/dashboard');
});

Given('I am logged in as an admin', async function () {
  await page.goto('http://localhost:3000/login');
  await page.fill('[data-testid="email-input"]', this.testData.admin.email);
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/admin/dashboard');
});

// Order creation steps
Given('I have items in my cart', async function () {
  await page.goto('http://localhost:3000/marketplace');
  await page.click('[data-testid="product-item"]:first-child [data-testid="add-to-cart-button"]');
  await page.click('[data-testid="cart-icon"]');
  const cartItems = await page.locator('[data-testid="cart-item"]').count();
  assert(cartItems > 0, 'Cart should have items');
});

When('I proceed to checkout', async function () {
  await page.click('[data-testid="checkout-button"]');
  await page.waitForURL('**/checkout');
});

When('I enter delivery address {string}', async function (address) {
  await page.fill('[data-testid="delivery-address-input"]', address);
  await page.fill('[data-testid="delivery-lat-input"]', '30.0444');
  await page.fill('[data-testid="delivery-lng-input"]', '31.2357');
});

When('I place the order', async function () {
  await page.click('[data-testid="place-order-button"]');
  await page.waitForURL('**/orders/**');
  const url = page.url();
  const orderId = url.split('/').pop();
  this.orderId = parseInt(orderId);
});

Then('I should see the order confirmation', async function () {
  await page.waitForSelector('[data-testid="order-confirmation"]');
  const confirmationText = await page.textContent('[data-testid="order-confirmation"]');
  assert(confirmationText.includes('Order created successfully'), 'Should show order confirmation');
});

Then('the order should show vendor confirmation pending', async function () {
  const statusElement = await page.locator('[data-testid="order-status"]').textContent();
  assert(statusElement.includes('pending') || statusElement.includes('confirmation'), 'Should show pending status');
});

// Vendor actions
When('I view my vendor orders', async function () {
  await page.click('[data-testid="orders-tab"]');
  await page.waitForSelector('[data-testid="vendor-orders-list"]');
});

When('I accept the order', async function () {
  await page.click('[data-testid="accept-order-button"]');
  await page.click('[data-testid="confirm-accept-button"]');
});

Then('the order should show preparation status', async function () {
  await page.waitForSelector('[data-testid="order-status"]');
  const statusElement = await page.locator('[data-testid="order-status"]').textContent();
  assert(statusElement.includes('preparing') || statusElement.includes('preparation'), 'Should show preparation status');
});

When('I mark the order as prepared', async function () {
  await page.click('[data-testid="mark-prepared-button"]');
  await page.click('[data-testid="confirm-prepared-button"]');
});

Then('the order should show ready for pickup', async function () {
  await page.waitForSelector('[data-testid="order-status"]');
  const statusElement = await page.locator('[data-testid="order-status"]').textContent();
  assert(statusElement.includes('ready') || statusElement.includes('pickup'), 'Should show ready status');
});

// Payment actions
When('I proceed to payment', async function () {
  await page.click('[data-testid="pay-now-button"]');
  await page.waitForURL('**/payment');
});

When('I enter payment details', async function () {
  await page.fill('[data-testid="card-number-input"]', '4111111111111111');
  await page.fill('[data-testid="expiry-input"]', '12/25');
  await page.fill('[data-testid="cvv-input"]', '123');
  await page.fill('[data-testid="cardholder-input"]', 'John Doe');
});

When('I complete the payment', async function () {
  await page.click('[data-testid="complete-payment-button"]');
  await page.waitForSelector('[data-testid="payment-success"]');
});

Then('I should see payment confirmation', async function () {
  const successMessage = await page.textContent('[data-testid="payment-success"]');
  assert(successMessage.includes('Payment successful'), 'Should show payment success');
});

Then('the order should show paid status', async function () {
  await page.goto(`/orders/${this.orderId}`);
  const statusElement = await page.locator('[data-testid="order-status"]').textContent();
  assert(statusElement.includes('paid'), 'Should show paid status');
});

// Courier actions
When('I view available deliveries', async function () {
  await page.click('[data-testid="available-deliveries-tab"]');
  await page.waitForSelector('[data-testid="delivery-requests-list"]');
});

When('I accept the delivery request', async function () {
  await page.click('[data-testid="accept-delivery-button"]:first-child');
  await page.click('[data-testid="confirm-accept-delivery-button"]');
});

Then('the delivery should be assigned to me', async function () {
  await page.waitForSelector('[data-testid="my-deliveries-list"]');
  const myDeliveries = await page.locator('[data-testid="my-delivery-item"]').count();
  assert(myDeliveries > 0, 'Should have deliveries assigned');
});

When('I arrive at vendor location', async function () {
  await page.click('[data-testid="arrived-at-vendor-button"]');
  await page.click('[data-testid="confirm-arrival-vendor-button"]');
});

When('I pickup the order from vendor', async function () {
  await page.click('[data-testid="pickup-order-button"]');
  await page.click('[data-testid="confirm-pickup-button"]');
});

When('I arrive at customer location', async function () {
  await page.click('[data-testid="arrived-at-customer-button"]');
  await page.click('[data-testid="confirm-arrival-customer-button"]');
});

When('I mark order as delivered', async function () {
  await page.click('[data-testid="mark-delivered-button"]');
  await page.click('[data-testid="confirm-delivery-button"]');
});

Then('the delivery should show awaiting confirmation', async function () {
  const statusElement = await page.locator('[data-testid="delivery-status"]').textContent();
  assert(statusElement.includes('awaiting') || statusElement.includes('confirmation'), 'Should show awaiting confirmation');
});

// Customer confirmation
When('I view my order details', async function () {
  await page.click('[data-testid="my-orders-tab"]');
  await page.click(`[data-testid="order-item-${this.orderId}"]`);
});

When('I confirm receipt of the order', async function () {
  await page.click('[data-testid="confirm-receipt-button"]');
  await page.click('[data-testid="confirm-receipt-dialog-button"]');
});

Then('the order should be completed', async function () {
  await page.waitForSelector('[data-testid="order-status"]');
  const statusElement = await page.locator('[data-testid="order-status"]').textContent();
  assert(statusElement.includes('completed'), 'Should show completed status');
});

// FSM State verification
Then('the vendor FSM should be in state {string}', async function (expectedState) {
  await page.reload(); // Refresh to get latest data
  const fsmStates = await page.locator('[data-testid="fsm-states"]').textContent();
  const states = JSON.parse(fsmStates);
  assert.strictEqual(states.vendor, expectedState, `Vendor FSM should be in ${expectedState}`);
});

Then('the payment FSM should be in state {string}', async function (expectedState) {
  await page.reload();
  const fsmStates = await page.locator('[data-testid="fsm-states"]').textContent();
  const states = JSON.parse(fsmStates);
  assert.strictEqual(states.payment, expectedState, `Payment FSM should be in ${expectedState}`);
});

Then('the delivery FSM should be in state {string}', async function (expectedState) {
  await page.reload();
  const fsmStates = await page.locator('[data-testid="fsm-states"]').textContent();
  const states = JSON.parse(fsmStates);
  assert.strictEqual(states.delivery, expectedState, `Delivery FSM should be in ${expectedState}`);
});

// Tracking information
When('I check the delivery tracking', async function () {
  await page.click('[data-testid="tracking-tab"]');
  await page.waitForSelector('[data-testid="tracking-info"]');
});

Then('I should see the current delivery status', async function () {
  const trackingInfo = await page.locator('[data-testid="tracking-info"]').textContent();
  assert(trackingInfo.length > 0, 'Should show tracking information');
});

Then('I should see courier information', async function () {
  const courierInfo = await page.locator('[data-testid="courier-info"]').textContent();
  assert(courierInfo.length > 0, 'Should show courier information');
  assert(courierInfo.includes('John Driver'), 'Should show courier name');
});

// Error scenarios
When('I attempt an invalid action', async function () {
  // Try to perform an action that's not allowed in current state
  await page.click('[data-testid="invalid-action-button"]');
});

Then('I should see an error message', async function () {
  await page.waitForSelector('[data-testid="error-message"]');
  const errorMessage = await page.textContent('[data-testid="error-message"]');
  assert(errorMessage.length > 0, 'Should show error message');
});

Then('the order state should remain unchanged', async function () {
  const initialStatus = this.initialOrderStatus;
  const currentStatus = await page.locator('[data-testid="order-status"]').textContent();
  assert.strictEqual(currentStatus, initialStatus, 'Order status should remain unchanged');
});

// Admin actions
When('I assign a courier to the order', async function () {
  await page.click('[data-testid="assign-courier-button"]');
  await page.selectOption('[data-testid="courier-select"]', '3'); // Courier ID
  await page.click('[data-testid="confirm-assign-button"]');
});

Then('the courier should be assigned', async function () {
  await page.waitForSelector('[data-testid="assigned-courier-info"]');
  const assignedCourier = await page.textContent('[data-testid="assigned-courier-info"]');
  assert(assignedCourier.length > 0, 'Should show assigned courier');
});

// Real-time updates
Then('the order status should update in real-time', async function () {
  // Wait for real-time update (WebSocket or polling)
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-testid="order-status"]');
    return status && !status.textContent.includes('pending');
  }, { timeout: 10000 });
});

// Data persistence
Then('the FSM states should be persisted', async function () {
  await page.reload();
  const fsmStatesAfterReload = await page.locator('[data-testid="fsm-states"]').textContent();
  assert(fsmStatesAfterReload.length > 0, 'FSM states should persist after page reload');
});

// Performance
Then('the UI should respond quickly', async function () {
  const startTime = Date.now();
  await page.click('[data-testid="some-action-button"]');
  await page.waitForSelector('[data-testid="action-result"]');
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  assert(responseTime < 2000, `Response time should be less than 2 seconds, got ${responseTime}ms`);
});
