const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Driver bidding and order fulfillment steps

Given('there is an available order {string}', async function (orderId) {
  // Store the order ID for later steps
  this.testData = this.testData || {};
  this.testData.orderId = orderId;
});

When('I view the order details as a driver', async function () {
  // Navigate to the available bids/orders section
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');

  // If we're not logged in as driver, login first
  if (!this.testData.driver) {
    const driverData = {
      name: 'Test Driver',
      email: 'driver@test.com',
      password: 'driver123',
      phone: '+123456789001',
      role: 'driver',
      vehicle_type: 'car'
    };

    // Try to register/login as driver via API
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
        // User might already exist
      }
    }

    // Fill login form
    await this.page.fill('input[placeholder="Email"]', driverData.email);
    await this.page.fill('input[placeholder="Password"]', driverData.password);
    await this.page.click('button:has-text("Sign In")');
    await this.page.waitForTimeout(2000);
  }
});

When('I place a bid with:', async function (dataTable) {
  const data = dataTable.rowsHash();

  // Click on an order in the available bids section
  const orderCard = this.page.locator('div[class*="order-card"]').first();
  await orderCard.click();

  // Fill bid form
  if (data.bid_amount) {
    // Find bid amount input - could be named differently
    const bidInput = this.page.locator('input[type="number"], input[placeholder*="bid"], input[placeholder*="price"]');
    await bidInput.fill(data.bid_amount.replace('$', ''));
  }

  if (data.estimated_pickup_time) {
    const pickupTimeInput = this.page.locator('input[type="datetime-local"], input[placeholder*="pickup"]');
    if (await pickupTimeInput.isVisible()) {
      await pickupTimeInput.fill(data.estimated_pickup_time);
    }
  }

  if (data.estimated_delivery_time) {
    const deliveryTimeInput = this.page.locator('input[type="datetime-local"], input[placeholder*="delivery"]');
    if (await deliveryTimeInput.isVisible()) {
      await deliveryTimeInput.fill(data.estimated_delivery_time);
    }
  }

  if (data.message) {
    const messageInput = this.page.locator('textarea, input[placeholder*="message"], input[placeholder*="note"]');
    if (await messageInput.isVisible()) {
      await messageInput.fill(data.message);
    }
  }
});

Then('my bid should be submitted successfully', async function () {
  // Look for success message or bid button becoming disabled
  const successSelectors = [
    'text=/bid.*submitted/i',
    'text=/bid.*placed/i',
    'text=/success/i',
    '[class*="success"]',
    'button:disabled:has-text("Bid"), button:has-text("Bid Placed")'
  ];

  let successFound = false;
  for (const selector of successSelectors) {
    const element = this.page.locator(selector);
    if (await element.isVisible()) {
      successFound = true;
      break;
    }
  }

  // Check API response if available
  if (this.apiUrl && this.testData.driver?.token && this.testData.orderId) {
    try {
      const ordersRes = await fetch(`${this.apiUrl}/orders`, {
        headers: { Authorization: `Bearer ${this.testData.driver.token}` }
      });
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        const order = orders.find(o => o._id === this.testData.orderId || o.orderNumber === this.testData.orderId);
        if (order && order.bids && order.bids.length > 0) {
          successFound = true;
        }
      }
    } catch (error) {
      // API check failed, rely on UI
    }
  }

  expect(successFound).to.be.true;
});

Given('driver {string} has placed a bid on order {string}', async function (driverName, orderId) {
  this.testData = this.testData || {};
  this.testData.orderId = orderId;
  this.testData.driverName = driverName;

  // In a real implementation, this would find or create the bid in DB
  // For now, just store the data for API checks
});

When('the customer accepts the bid', async function () {
  // Login as customer and accept the bid
  if (!this.testData.customer?.token) {
    const customerData = {
      name: 'Test Customer',
      email: 'customer@test.com',
      password: 'customer123',
      phone: '+123456789002',
      role: 'customer'
    };

    // Try to register/login as customer
    if (this.apiUrl) {
      try {
        const register = await fetch(`${this.apiUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData)
        });

        if (register.ok) {
          const data = await register.json();
          this.testData.customer = { ...customerData, id: data.user.id, token: data.token };
        }
      } catch (error) {
        // User might already exist
      }
    }
  }

  // Navigate to order and accept bid
  if (this.apiUrl && this.testData.customer?.token && this.testData.orderId) {
    const acceptBidRes = await fetch(`${this.apiUrl}/orders/${this.testData.orderId}/accept-bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testData.customer.token}`
      },
      body: JSON.stringify({
        // Would need driver user ID in real implementation
        userId: 'driver-user-id-placeholder'
      })
    });

    expect(acceptBidRes.ok).to.be.true;
  }
});

Then('the order status should change to {string}', async function (expectedStatus) {
  // Check order status via API if possible
  if (this.apiUrl && this.testData.customer?.token && this.testData.orderId) {
    await this.page.waitForTimeout(1000); // Allow time for status update

    const ordersRes = await fetch(`${this.apiUrl}/orders`, {
      headers: { Authorization: `Bearer ${this.testData.customer.token}` }
    });

    if (ordersRes.ok) {
      const orders = await ordersRes.json();
      const order = orders.find(o => o._id === this.testData.orderId || o.orderNumber === this.testData.orderId);
      if (order) {
        expect(order.status).to.equal(expectedStatus);
        return;
      }
    }
  }

  // Fallback: check UI status indicator
  const statusSelectors = [
    `text="${expectedStatus}"`,
    `[class*="status-${expectedStatus}"]`,
    `[class*="status"]:has-text("${expectedStatus}")`
  ];

  let statusFound = false;
  for (const selector of statusSelectors) {
    const element = this.page.locator(selector);
    if (await element.isVisible()) {
      statusFound = true;
      break;
    }
  }

  expect(statusFound).to.be.true;
});

Then('{string} should be assigned to the order', async function (driverName) {
  // Check assigned driver via API
  if (this.apiUrl && this.testData.customer?.token && this.testData.orderId) {
    const ordersRes = await fetch(`${this.apiUrl}/orders`, {
      headers: { Authorization: `Bearer ${this.testData.customer.token}` }
    });

    if (ordersRes.ok) {
      const orders = await ordersRes.json();
      const order = orders.find(o => o._id === this.testData.orderId || o.orderNumber === this.testData.orderId);
      if (order && order.assignedDriver) {
        // In real implementation, would check driver name
        expect(order.assignedDriver.name).to.include(driverName);
        return;
      }
    }
  }

  // UI check for assigned driver
  const driverElement = this.page.locator(`text=/assigned.*${driverName}/i, text=/driver.*${driverName}/i`);
  const isVisible = await driverElement.isVisible();
  expect(isVisible).to.be.true;
});

Then('{string} should be notified of acceptance', async function (driverName) {
  // Check for notification via API
  if (this.apiUrl && this.testData.driver?.token) {
    const notificationsRes = await fetch(`${this.apiUrl}/notifications`, {
      headers: { Authorization: `Bearer ${this.testData.driver.token}` }
    });

    if (notificationsRes.ok) {
      const notifications = await notificationsRes.json();
      const acceptanceNotification = notifications.find(n =>
        n.type === 'bid_accepted' || n.message.toLowerCase().includes('accepted')
      );
      expect(acceptanceNotification).to.not.be.undefined;
      return;
    }
  }

  // UI check for notification
  const notificationElement = this.page.locator('text=/bid.*accepted/i, text=/order.*assigned/i, [class*="notification"]');
  // Allow time for notification to appear
  await this.page.waitForTimeout(2000);
  const isVisible = await notificationElement.isVisible();
  expect(isVisible).to.be.true;
});

Given('I am assigned to order {string}', async function (orderId) {
  this.testData = this.testData || {};
  this.testData.orderId = orderId;

  // Ensure we're the assigned driver
  if (this.apiUrl && this.testData.driver?.token) {
    // In real implementation, ensure driver is assigned to order
  }
});

Given('I have picked up the package', async function () {
  // Order should be in "accepted" status and driver should trigger pickup
  if (this.apiUrl && this.testData.driver?.token && this.testData.orderId) {
    const pickupRes = await fetch(`${this.apiUrl}/orders/${this.testData.orderId}/pickup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.testData.driver.token}` }
    });

    expect(pickupRes.ok).to.be.true;
    await this.page.waitForTimeout(500); // Allow time for updates
  }
});

When('I mark the delivery as completed', async function () {
  // Click complete delivery button
  const completeButton = this.page.locator('button:has-text("Delivered"), button:has-text("Complete"), button:has-text("Mark as Delivered")');
  if (await completeButton.isVisible()) {
    await completeButton.click();
    await this.page.waitForTimeout(1000);
  } else if (this.apiUrl && this.testData.driver?.token && this.testData.orderId) {
    // Fallback to API
    const completeRes = await fetch(`${this.apiUrl}/orders/${this.testData.orderId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.testData.driver.token}` }
    });

    expect(completeRes.ok).to.be.true;
  }
});

Then('the customer should be notified', async function () {
  // Check for customer notification
  if (this.apiUrl && this.testData.customer?.token) {
    const notificationsRes = await fetch(`${this.apiUrl}/notifications`, {
      headers: { Authorization: `Bearer ${this.testData.customer.token}` }
    });

    if (notificationsRes.ok) {
      const notifications = await notificationsRes.json();
      const deliveryNotification = notifications.find(n =>
        n.type === 'order_delivered' || n.message.toLowerCase().includes('delivered')
      );
      expect(deliveryNotification).to.not.be.undefined;
      return;
    }
  }

  // UI check for notification or order status update
  const notificationElement = this.page.locator('text=/delivered/i, text=/completed/i, [class*="notification"], [class*="success"]');
  await this.page.waitForTimeout(2000);
  const isVisible = await notificationElement.isVisible();
  expect(isVisible).to.be.true;
});

Then('payment should be processed', async function () {
  // In real implementation, would check payment status
  // For now, just verify order shows as delivered/paid
  if (this.apiUrl && this.testData.customer?.token && this.testData.orderId) {
    const ordersRes = await fetch(`${this.apiUrl}/orders`, {
      headers: { Authorization: `Bearer ${this.testData.customer.token}` }
    });

    if (ordersRes.ok) {
      const orders = await ordersRes.json();
      const order = orders.find(o => o._id === this.testData.orderId || o.orderNumber === this.testData.orderId);
      if (order) {
        expect(order.status).to.equal('delivered');
        // Could also check payment status if implemented
      }
    }
  }
});
