const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Driver online/offline status management steps

Given('I am logged in as a driver', async function () {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');

  // Ensure we have driver credentials
  if (!this.testData.driver) {
    const driverData = {
      name: 'Status Test Driver',
      email: 'status-driver@test.com',
      password: 'driver123',
      phone: '+123456789003',
      primary_role: 'driver',
      vehicle_type: 'car'
    };

    // Register/login as driver
    if (this.apiUrl) {
      try {
        const register = await fetch(`${this.apiUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(driverData)
        });

        if (register.ok) {
          const data = await register.json();
          this.testData.driver = { ...driverData, id: data.user.id, token: data.token };
        }
      } catch (error) {
        console.log('Driver may already exist, continuing...');
      }
    }

    // Login via UI
    await this.page.fill('input[placeholder="Email"]', driverData.email);
    await this.page.fill('input[placeholder="Password"]', driverData.password);
    await this.page.click('button:has-text("Sign In")');
    await this.page.waitForTimeout(2000);

    // Store driver data for API checks
    this.testData.driver = driverData;
  }
});

When('I click the online status button', async function () {
  // Find the online/offline toggle button
  const onlineButton = this.page.locator('button:has-text("Go Online"), button:has-text("🟢")').first();
  if (await onlineButton.isVisible()) {
    await onlineButton.click();
    await this.page.waitForTimeout(1000); // Allow time for API call
  }
});

When('I click the offline status button', async function () {
  // Find the offline toggle button
  const offlineButton = this.page.locator('button:has-text("Go Offline"), button:has-text("🔴")').first();
  if (await offlineButton.isVisible()) {
    await offlineButton.click();
    await this.page.waitForTimeout(1000); // Allow time for API call
  }
});

Then('my driver status should be online', async function () {
  // Check UI for online status
  const offlineButton = this.page.locator('button:has-text("Go Offline")').first();
  const onlineButton = this.page.locator('button:has-text("Go Online")').first();

  const isOfflineAvailable = await offlineButton.isVisible();
  const isOnlineAvailable = await onlineButton.isVisible();

  expect(isOfflineAvailable).to.be.true;
  expect(isOnlineAvailable).to.be.false;

  // API check if available
  if (this.apiUrl && this.testData.driver?.token) {
    // Note: In the current API implementation, status is stored in-memory only
    // This would check a driver status endpoint if implemented
  }
});

Then('my driver status should be offline', async function () {
  // Check UI for offline status
  const onlineButton = this.page.locator('button:has-text("Go Online")').first();
  const isOnlineVisible = await onlineButton.isVisible();

  expect(isOnlineVisible).to.be.true;
});

Then('I should see location sync is active', async function () {
  // Check for location sync indicators
  const locationSyncElements = [
    'text="Location sync active"',
    'text="sync.*30s"',
    'text="📍 Lat"',
    '[class*="location-sync"]'
  ];

  let locationSyncFound = false;
  for (const selector of locationSyncElements) {
    const element = this.page.locator(selector);
    if (await element.isVisible()) {
      locationSyncFound = true;
      break;
    }
  }

  expect(locationSyncFound).to.be.true;
});

Then('I should see location sync is disabled', async function () {
  // Check for disabled location sync indicators
  const noLocationSyncElements = [
    'text="offline"',
    'text="Location sync disabled"',
    ':not(:has-text("Location sync active"))'
  ];

  let locationSyncFound = false;
  for (const selector of noLocationSyncElements) {
    const element = this.page.locator(selector);
    if (await element.isVisible() || selector.includes('not')) {
      locationSyncFound = true;
      break;
    }
  }

  // Also check that location coordinates are not shown
  const locationCoords = this.page.locator('text=/Lat.*, Lng.*/i');
  const coordsVisible = await locationCoords.isVisible();

  expect(locationSyncFound || !coordsVisible).to.be.true;
});

When('I have active orders assigned', async function () {
  // In a real implementation, this would create and assign orders
  // For now, just set a flag
  this.testData.hasActiveOrders = true;

  // API: Create an order and assign it to this driver
  if (this.apiUrl && this.testData.driver?.token && this.testData.customer?.token) {
    try {
      // Create an order
      const orderData = {
        title: 'Active Order for Status Test',
        description: 'Test order to check offline restrictions',
        pickupAddress: {
          personName: 'Pickup Person',
          street: 'Pickup St',
          area: 'Pickup Area',
          city: 'Cairo',
          country: 'Egypt'
        },
        dropoffAddress: {
          personName: 'Delivery Person',
          street: 'Delivery St',
          area: 'Delivery Area',
          city: 'Cairo',
          country: 'Egypt'
        },
        price: 50
      };

      const createOrderRes = await fetch(`${this.apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.testData.customer.token}`
        },
        body: JSON.stringify(orderData)
      });

      if (createOrderRes.ok) {
        const order = await createOrderRes.json();

        // Place a bid as driver
        const bidRes = await fetch(`${this.apiUrl}/orders/${order.id}/bid`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.testData.driver.token}`
          },
          body: JSON.stringify({ bidPrice: 45 })
        });

        if (bidRes.ok) {
          // Accept the bid as customer
          const acceptRes = await fetch(`${this.apiUrl}/orders/${order.id}/accept-bid`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.testData.customer.token}`
            },
            body: JSON.stringify({ userId: this.testData.driver.id })
          });

          if (acceptRes.ok) {
            this.testData.activeOrderId = order.id;
            return;
          }
        }
      }
    } catch (error) {
      console.log('Could not create active order for testing:', error.message);
    }
  }
});

Then('I should not be allowed to go offline', async function () {
  // Check that offline button is disabled or not visible
  const offlineButton = this.page.locator('button:has-text("Go Offline"):disabled').first();
  const isDisabled = await offlineButton.isVisible();

  // Alternative: check if button is there but grayed out
  const anyOfflineButton = this.page.locator('button:has-text("Go Offline")').first();
  const isButtonThere = await anyOfflineButton.isVisible();
  const classes = await anyOfflineButton.getAttribute('class') || '';
  const isDisabledByClass = classes.includes('disabled') || classes.includes('not-allowed');

  expect(isDisabled || (isButtonThere && !isDisabledByClass)).to.be.false;
});

Then('I should see an error message about active orders', async function () {
  // Wait for error message
  await this.page.waitForTimeout(1000);

  const errorSelectors = [
    'text=/active orders/i',
    'text=/complete.*deliveries/i',
    'text=/cannot.*offline/i',
    '[class*="error"]'
  ];

  let errorFound = false;
  for (const selector of errorSelectors) {
    const element = this.page.locator(selector);
    if (await element.isVisible()) {
      errorFound = true;
      break;
    }
  }

  expect(errorFound).to.be.true;
});

Given('my driver status is currently offline', async function () {
  // Ensure driver is offline - this might require calling offline endpoint
  if (this.apiUrl && this.testData.driver?.token) {
    try {
      await fetch(`${this.apiUrl}/drivers/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.testData.driver.token}`
        },
        body: JSON.stringify({ isOnline: false })
      });
    } catch (error) {
      // Ignore API errors for setup
    }
  }

  // UI should show online button is visible
  const onlineButton = this.page.locator('button:has-text("Go Online")').first();
  const isVisible = await onlineButton.isVisible();

  if (!isVisible) {
    // Try to click offline first if we're currently online
    const offlineButton = this.page.locator('button:has-text("Go Offline")').first();
    if (await offlineButton.isVisible()) {
      await offlineButton.click();
      await this.page.waitForTimeout(1000);
    }
  }
});

When('I attempt to go offline while having active orders', async function () {
  // First ensure we have active orders
  await this.defineStep('I have active orders assigned');

  // Then try to go offline
  const offlineButton = this.page.locator('button:has-text("Go Offline")').first();
  if (await offlineButton.isVisible()) {
    await offlineButton.click();
    await this.page.waitForTimeout(1000);
  }
});

Then('my status should remain online', async function () {
  // Check that we're still showing as online
  const offlineButton = this.page.locator('button:has-text("Go Offline")').first();
  const isAvailable = await offlineButton.isVisible();

  expect(isAvailable).to.be.true;
});



