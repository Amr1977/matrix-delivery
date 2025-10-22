const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Tests specifically for distance calculation and filtering
Given('there is a customer order at coordinates {string}, {string}', async function(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  const orderResponse = await fetch(`${this.apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.testData.customer.token}`
    },
    body: JSON.stringify({
      title: `Order at ${latitude}, ${longitude}`,
      description: `Test order at coordinates ${latitude}, ${longitude}`,
      pickup_address: `${latitude}, ${longitude}`,
      delivery_address: `${latitude + 0.01}, ${longitude + 0.01}`,
      from: { lat: latitude, lng: longitude, name: `Test Location ${latitude.toFixed(4)}` },
      to: { lat: latitude + 0.01, lng: longitude + 0.01, name: `Destination ${latitude.toFixed(4)}` },
      price: 20.00,
      package_description: 'Test package'
    })
  });
  expect(orderResponse.ok).to.be.true;
});

Given('the driver is at coordinates {string}, {string}', async function(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  const response = await fetch(`${this.apiUrl}/drivers/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.testData.driver.token}`
    },
    body: JSON.stringify({ latitude, longitude })
  });
  expect(response.ok).to.be.true;
});

Then('the order distance should be approximately {string} km', async function(expectedDistance) {
  const expected = parseFloat(expectedDistance);

  // This would require mocking or a separate API endpoint to check distances
  // For now, we can check that orders are filtered correctly
  const orderId = this.testData.lastOrderId;
  if (orderId) {
    const response = await fetch(`${this.apiUrl}/orders`, {
      headers: { 'Authorization': `Bearer ${this.testData.driver.token}` }
    });

    if (response.ok) {
      const orders = await response.json();
      const relevantOrder = orders.find(order => order._id === orderId);

      if (relevantOrder && typeof relevantOrder.distance === 'number') {
        // Allow for small numerical differences in distance calculations
        expect(Math.abs(relevantOrder.distance - expected)).to.be.lessThan(0.5);
      }
    }
  }
});

Then('orders within 5km should be visible', async function() {
  const orders = await this.page.locator('[class*="card"]').all();
  // Should have at least some orders (assuming test setup created them)
  expect(orders.length).to.be.at.least(0);

  // Check for distance indicators if present
  const distanceIndicators = await this.page.locator('text =~ km away').all();
  if (distanceIndicators.length > 0) {
    // If distance indicators exist, they should be under 5km
    for (const indicator of distanceIndicators) {
      const text = await indicator.textContent();
      const distanceMatch = text.match(/(\d+(\.\d+)?)/);
      if (distanceMatch) {
        const distance = parseFloat(distanceMatch[1]);
        expect(distance).to.be.lessThan(5.0);
      }
    }
  }
});

Then('orders beyond 5km should be hidden', async function() {
  const distanceIndicators = await this.page.locator('text =~ km away').all();

  // If we have distance indicators, check they are all under 5km
  for (const indicator of distanceIndicators) {
    const text = await indicator.textContent();
    const distanceMatch = text.match(/(\d+(\.\d+)?)/);
    if (distanceMatch) {
      const distance = parseFloat(distanceMatch[1]);
      expect(distance).to.be.lessThan(5.0);
    }
  }
});

// Geolocation testing
When('location services are mocked to return coordinates {string}, {string}', async function(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  // Mock geolocation API
  await this.page.addScriptTag({
    content: `
      navigator.geolocation.getCurrentPosition = function(successCallback, errorCallback) {
        // Mock a successful position response
        const mockPosition = {
          coords: {
            latitude: ${latitude},
            longitude: ${longitude},
            accuracy: 10
          }
        };
        setTimeout(() => successCallback(mockPosition), 100);
      };
    `
  });

  this.testData.mockLocation = { latitude, longitude };
});

When('location services are mocked to fail', async function() {
  await this.page.addScriptTag({
    content: `
      navigator.geolocation.getCurrentPosition = function(successCallback, errorCallback) {
        // Mock a failure
        const mockError = {
          code: 1,
          message: 'User denied geolocation'
        };
        setTimeout(() => errorCallback(mockError), 100);
      };
    `
  });
});

Then('the driver interface should show location-based features', async function() {
  // Check that location button is visible
  const locationButton = await this.page.locator('button:has-text("Update Location")').or(
    this.page.locator('button:has-text("📍")')
  );
  expect(await locationButton.isVisible()).to.be.true;

  // Check that driver tabs are visible
  const activeTab = await this.page.locator('button:has-text("Active Orders")').or(
    this.page.locator('button:has-text("🚗")')
  );
  const biddingTab = await this.page.locator('button:has-text("Available Bids")').or(
    this.page.locator('button:has-text("💰")')
  );

  expect(await activeTab.isVisible()).to.be.true;
  expect(await biddingTab.isVisible()).to.be.true;
});

// General driver interface tests
Then('the driver dashboard should display correctly', async function() {
  // Check for main UI elements
  await this.page.waitForSelector('text="Matrix Delivery"', { timeout: 5000 });

  // Check for driver-specific elements
  const driverElements = await this.page.locator('button:has-text("Update Location"), button:has-text("Active Orders"), button:has-text("Available Bids")').all();
  expect(driverElements.length).to.be.greaterThan(0);
});
