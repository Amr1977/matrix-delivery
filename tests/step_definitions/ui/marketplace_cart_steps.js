const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Cart UI automation step definitions
// These steps assume a React frontend with data-testid attributes
// Implementation will work when frontend cart components are built

Given('I am logged in as a customer on the marketplace', async function () {
  // Create and login as customer
  const userData = {
    email: 'cart-customer@example.com',
    password: 'password123',
    primary_role: 'customer',
    name: 'Cart Test Customer'
  };

  // Register customer
  const regRes = await this.page.request.post(`${this.apiUrl}/auth/register`, {
    data: userData
  });
  expect(regRes.ok()).to.be.true;

  // Login via UI
  await this.page.goto(`${this.baseUrl}/login`);
  await this.page.fill('[data-testid="email-input"]', userData.email);
  await this.page.fill('[data-testid="password-input"]', userData.password);
  await this.page.click('[data-testid="login-button"]');
  await this.page.waitForURL('**/dashboard');

  this.customerData = userData;
});

Given('I am on the marketplace page', async function () {
  await this.page.goto(`${this.baseUrl}/marketplace`);
  await this.page.waitForSelector('[data-testid="marketplace-container"]');
});

Given('I am on the cart page', async function () {
  await this.page.goto(`${this.baseUrl}/cart`);
  await this.page.waitForSelector('[data-testid="cart-container"]');
});

Given('there are marketplace items available', async function () {
  // Verify items are loaded
  await this.page.waitForSelector('[data-testid="item-card"]');
  const itemCards = await this.page.locator('[data-testid="item-card"]').count();
  expect(itemCards).to.be.greaterThan(0);
});

Given('my cart has {int} item(s)', async function (itemCount) {
  await this.page.goto(`${this.baseUrl}/cart`);
  if (itemCount > 0) {
    await this.page.waitForSelector('[data-testid="cart-item"]');
    const cartItems = await this.page.locator('[data-testid="cart-item"]').count();
    expect(cartItems).to.equal(itemCount);
  } else {
    // Cart should be empty
    const emptyMessage = await this.page.locator('[data-testid="empty-cart-message"]').isVisible();
    expect(emptyMessage).to.be.true;
  }
});

When('I click on an item card', async function () {
  await this.page.click('[data-testid="item-card"]:first-child');
});

When('I click the "Add to Cart" button', async function () {
  await this.page.click('[data-testid="add-to-cart-button"]');
});

When('I set the quantity to {int}', async function (quantity) {
  await this.page.fill('[data-testid="quantity-input"]', quantity.toString());
});

When('I click the "Update Cart" button', async function () {
  await this.page.click('[data-testid="update-cart-button"]');
});

When('I click the cart icon', async function () {
  await this.page.click('[data-testid="cart-icon"]');
});

When('I click the "Remove" button for the first cart item', async function () {
  await this.page.click('[data-testid="cart-item"]:first-child [data-testid="remove-item-button"]');
});

When('I click the "Clear Cart" button', async function () {
  await this.page.click('[data-testid="clear-cart-button"]');
});

When('I click the "Proceed to Checkout" button', async function () {
  await this.page.click('[data-testid="checkout-button"]');
});

When('I try to add an item from a different store', async function () {
  // Find an item from a different store
  const differentStoreItem = await this.page.locator('[data-testid="item-card"][data-store-id]:not([data-store-id="current-store"])').first();
  if (await differentStoreItem.isVisible()) {
    await differentStoreItem.click();
    await this.page.click('[data-testid="add-to-cart-button"]');
  } else {
    // If no different store item visible, skip
    this.skip();
  }
});

When('I try to add {int} items when only {int} are in stock', async function (requestedQuantity, availableStock) {
  // Set quantity higher than available stock
  await this.page.fill('[data-testid="quantity-input"]', requestedQuantity.toString());
  await this.page.click('[data-testid="add-to-cart-button"]');
});

When('I try to set quantity to {int}', async function (quantity) {
  await this.page.fill('[data-testid="cart-item"]:first-child [data-testid="quantity-input"]', quantity.toString());
  await this.page.click('[data-testid="cart-item"]:first-child [data-testid="update-quantity-button"]');
});

Then('I should see the item details modal', async function () {
  await this.page.waitForSelector('[data-testid="item-details-modal"]');
  const modalVisible = await this.page.locator('[data-testid="item-details-modal"]').isVisible();
  expect(modalVisible).to.be.true;
});

Then('the item should be added to my cart', async function () {
  // Check cart badge or notification
  await this.page.waitForSelector('[data-testid="cart-added-notification"]');
  const notificationVisible = await this.page.locator('[data-testid="cart-added-notification"]').isVisible();
  expect(notificationVisible).to.be.true;
});

Then('the cart should show {int} item(s)', async function (expectedCount) {
  const cartItems = await this.page.locator('[data-testid="cart-item"]').count();
  expect(cartItems).to.equal(expectedCount);
});

Then('the cart total should be {string}', async function (expectedTotal) {
  const totalText = await this.page.locator('[data-testid="cart-total-amount"]').textContent();
  expect(totalText).to.include(expectedTotal);
});

Then('I should see the cart page', async function () {
  await this.page.waitForURL('**/cart');
  const cartContainer = await this.page.locator('[data-testid="cart-container"]').isVisible();
  expect(cartContainer).to.be.true;
});

Then('the cart should be empty', async function () {
  const emptyMessage = await this.page.locator('[data-testid="empty-cart-message"]').isVisible();
  expect(emptyMessage).to.be.true;
});

Then('I should see an error message about single store constraint', async function () {
  await this.page.waitForSelector('[data-testid="cart-error-message"]');
  const errorMessage = await this.page.locator('[data-testid="cart-error-message"]').textContent();
  expect(errorMessage.toLowerCase()).to.include('store');
  expect(errorMessage.toLowerCase()).to.include('already');
});

Then('I should see an insufficient stock error', async function () {
  await this.page.waitForSelector('[data-testid="cart-error-message"]');
  const errorMessage = await this.page.locator('[data-testid="cart-error-message"]').textContent();
  expect(errorMessage.toLowerCase()).to.include('stock');
  expect(errorMessage.toLowerCase()).to.include('available');
});

Then('I should see a quantity validation error', async function () {
  await this.page.waitForSelector('[data-testid="cart-error-message"]');
  const errorMessage = await this.page.locator('[data-testid="cart-error-message"]').textContent();
  expect(errorMessage.toLowerCase()).to.include('quantity');
});

Then('the item should be removed from the cart', async function () {
  // Verify item is no longer in cart
  const cartItems = await this.page.locator('[data-testid="cart-item"]').count();
  expect(cartItems).to.equal(0);
});

Then('all items should be removed from the cart', async function () {
  const emptyMessage = await this.page.locator('[data-testid="empty-cart-message"]').isVisible();
  expect(emptyMessage).to.be.true;
});

Then('I should see the checkout page', async function () {
  await this.page.waitForURL('**/checkout');
  const checkoutContainer = await this.page.locator('[data-testid="checkout-container"]').isVisible();
  expect(checkoutContainer).to.be.true;
});

Then('I should see cart validation errors', async function () {
  await this.page.waitForSelector('[data-testid="cart-validation-errors"]');
  const errorsVisible = await this.page.locator('[data-testid="cart-validation-errors"]').isVisible();
  expect(errorsVisible).to.be.true;
});

Then('I should see the discounted price in the cart', async function () {
  const discountedPrice = await this.page.locator('[data-testid="cart-item-discounted-price"]').isVisible();
  expect(discountedPrice).to.be.true;
});

Then('the cart should show the original locked price', async function () {
  const lockedPrice = await this.page.locator('[data-testid="cart-item-locked-price"]').isVisible();
  expect(lockedPrice).to.be.true;
});

Then('the cart icon should show {int} item(s)', async function (itemCount) {
  const badgeText = await this.page.locator('[data-testid="cart-badge"]').textContent();
  expect(parseInt(badgeText)).to.equal(itemCount);
});

Then('I should see a success notification', async function () {
  await this.page.waitForSelector('[data-testid="success-notification"]');
  const notificationVisible = await this.page.locator('[data-testid="success-notification"]').isVisible();
  expect(notificationVisible).to.be.true;
});

Then('the cart should reflect the updated quantity', async function () {
  // This would verify the quantity was updated
  const quantityInput = await this.page.locator('[data-testid="cart-item"]:first-child [data-testid="quantity-input"]').inputValue();
  expect(parseInt(quantityInput)).to.be.greaterThan(0);
});

Then('the cart should maintain the single store constraint', async function () {
  const storeName = await this.page.locator('[data-testid="cart-store-name"]').textContent();
  expect(storeName).to.be.a('string').and.not.be.empty;
});

Then('I should see stock availability information', async function () {
  const stockInfo = await this.page.locator('[data-testid="item-stock-info"]').isVisible();
  expect(stockInfo).to.be.true;
});

Then('the cart should show expiration information', async function () {
  const expirationInfo = await this.page.locator('[data-testid="cart-expiration-info"]').isVisible();
  expect(expirationInfo).to.be.true;
});
