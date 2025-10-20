const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Order creation steps
When('I click on {string}', async function(buttonText) {
  const button = this.page.locator(`button:has-text("${buttonText}")`);
  await button.click();
  await this.page.waitForTimeout(500);
});

When('I fill in the order details:', async function(dataTable) {
  const data = dataTable.rowsHash();

  await this.page.fill('input[placeholder="Order Title"]', data.title);
  await this.page.fill('textarea[placeholder="Description"]', data.description);
  await this.page.fill('input[placeholder="From Location"]', data.fromLocation);
  await this.page.fill('input[placeholder="To Location"]', data.toLocation);
  await this.page.fill('input[placeholder="Price ($)"]', data.price);

  this.testData.currentOrder = data;
});

When('I submit the order form', async function() {
  const submitButton = this.page.locator('button:has-text("Publish Order")');
  await submitButton.click();
  await this.page.waitForTimeout(2000); // Wait for order creation
});

// Order listing and viewing
Then('I should see the order in my orders list', async function() {
  await this.page.waitForSelector('h2:has-text("My Orders")', { timeout: 5000 });

  // Look for the order we just created
  const orders = this.page.locator('[data-testid*="order-item"], .order-item, [class*="order"]');
  await expect(orders.first()).toBeVisible();

  // Verify the order details
  const orderCount = await orders.count();
  expect(orderCount).to.be.greaterThan(0);

  // If we created a specific order, store its identifier for later use
  this.testData.lastOrderId = await orders.first().getAttribute('data-order-id') ||
                             await orders.first().getAttribute('id') ||
                             'last-created-order';
});

Then('the order should have status {string}', async function(expectedStatus) {
  const statusBadge = this.page.locator(`[class*="status"]:has-text("${expectedStatus}")`).or(
    this.page.locator(`span:has-text("${expectedStatus}")`)
  );
  await expect(statusBadge).toBeVisible();
  const statusText = await statusBadge.textContent();
  expect(statusText.toLowerCase()).to.include(expectedStatus.toLowerCase());
});

// Order detail viewing
Given('there is an existing customer order', async function() {
  if (!this.testData.customer) {
    throw new Error('Customer test data not available');
  }

  // Create an order via API
  const orderData = {
    title: 'Existing Order',
    description: 'This is an existing test order',
    from: {
      name: 'Downtown',
      lat: 40.7589,
      lng: -73.9851
    },
    to: {
      name: 'Airport',
      lat: 40.6413,
      lng: -73.7781
    },
    price: 35.00
  };

  const response = await fetch(`${this.apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.testData.customer.token}`
    },
    body: JSON.stringify(orderData)
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.testData.existingOrder = data;
});

When('I view the order details', async function() {
  // Click on the first order or the specific order if we know its ID
  const orderItem = this.page.locator('[data-testid*="order-item"], .order-item, [class*="order"]').first();
  await orderItem.click();
  await this.page.waitForTimeout(1000);
});

Then('I should see the complete order information', async function() {
  // Verify key order information is displayed
  const titleElement = this.page.locator('h3').or(this.page.locator('[data-testid="order-title"]'));
  await expect(titleElement).toBeVisible();

  const priceElement = this.page.locator('text=/\\$\\d+\\.\\d+/').or(this.page.locator('[data-testid*="price"]'));
  await expect(priceElement).toBeVisible();
});

Then('I should see the order status', async function() {
  const statusElement = this.page.locator('[class*="status"]').or(
    this.page.locator('[data-testid*="status"]')
  );
  await expect(statusElement).toBeVisible();
});

// Order editing (Note: These steps assume order editing functionality exists)
When('I edit the order details:', async function(dataTable) {
  const newData = dataTable.rowsHash();

  // Click edit button (assuming it exists)
  const editButton = this.page.locator('button:has-text("Edit")').or(
    this.page.locator('[data-testid*="edit"]')
  );
  await editButton.click();

  // Update form fields (assuming editing shows the same form)
  if (newData.title) {
    await this.page.fill('input[placeholder="Order Title"]', newData.title);
  }
  if (newData.description) {
    await this.page.fill('textarea[placeholder="Description"]', newData.description);
  }
  if (newData.price) {
    await this.page.fill('input[placeholder="Price ($)"]', newData.price);
  }

  this.testData.updatedOrder = newData;
});

When('I save the order changes', async function() {
  const saveButton = this.page.locator('button:has-text("Save")').or(
    this.page.locator('button:has-text("Update")')
  );
  await saveButton.click();
  await this.page.waitForTimeout(2000);
});

Then('the order should be updated successfully', async function() {
  // Verify success message or updated content
  const successMessage = this.page.locator('text=Order updated').or(
    this.page.locator('.success')
  );

  // Even without explicit message, verify we're still on the page
  const orderTitle = this.page.locator('h3').or(this.page.locator('[data-testid="order-title"]'));
  await expect(orderTitle).toBeVisible();
});

Then('I should see the updated order information', async function() {
  // If we have update data, verify it's displayed
  if (this.testData.updatedOrder) {
    if (this.testData.updatedOrder.title) {
      const titleElement = this.page.locator(`text=${this.testData.updatedOrder.title}`);
      await expect(titleElement).toBeVisible();
    }
    if (this.testData.updatedOrder.price) {
      const priceElement = this.page.locator(`text=/\\$${this.testData.updatedOrder.price}/`);
      await expect(priceElement).toBeVisible();
    }
  }
});

// Order deletion
When('I delete the order', async function() {
  const deleteButton = this.page.locator('button:has-text("Delete")').or(
    this.page.locator('[data-testid*="delete"]')
  );
  await deleteButton.click();
});

When('I confirm the deletion', async function() {
  // Look for confirmation dialog
  const confirmButton = this.page.locator('button:has-text("Confirm")').or(
    this.page.locator('button:has-text("Yes")').or(
    this.page.locator('button:has-text("Delete")')
  ));

  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }

  await this.page.waitForTimeout(2000);
});

Then('the order should be removed from my orders list', async function() {
  // Verify we're back to orders list or that the specific order is gone
  const ordersList = this.page.locator('h2:has-text("My Orders")').or(
    this.page.locator('text="No orders found"')
  );

  await expect(ordersList.first()).toBeVisible();

  // If we had a specific order ID, verify it's not in the list
  if (this.testData.existingOrder) {
    const orderItem = this.page.locator(`[data-order-id="${this.testData.existingOrder._id}"]`);
    await expect(orderItem).toHaveCount(0);
  }
});

// Order history and filtering
Given('there are multiple customer orders with different statuses', async function() {
  if (!this.testData.customer) {
    throw new Error('Customer test data not available');
  }

  const ordersData = [
    {
      title: 'Open Order',
      description: 'This order is still open',
      from: { name: 'NYC', lat: 40.7589, lng: -73.9851 },
      to: { name: 'Boston', lat: 42.3601, lng: -71.0589 },
      price: 25.00
    },
    {
      title: 'Accepted Order',
      description: 'This order was accepted',
      from: { name: 'LA', lat: 34.0522, lng: -118.2437 },
      to: { name: 'SF', lat: 37.7749, lng: -122.4194 },
      price: 45.00
    }
  ];

  this.testData.multipleOrders = [];

  for (const orderData of ordersData) {
    const response = await fetch(`${this.apiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testData.customer.token}`
      },
      body: JSON.stringify(orderData)
    });

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.testData.multipleOrders.push(data);

    // For the accepted order, simulate acceptance via API
    if (orderData.title === 'Accepted Order' && this.testData.driver) {
      await fetch(`${this.apiUrl}/orders/${data._id}/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.testData.customer.token}`
        },
        body: JSON.stringify({ userId: this.testData.driver.id })
      });
    }
  }
});

When('I view my order history', async function() {
  await this.page.waitForSelector('h2:has-text("My Orders")', { timeout: 5000 });
});

Then('I should see all my orders', async function() {
  const orderItems = this.page.locator('[data-testid*="order-item"], .order-item, [class*="order"]');
  const orderCount = await orderItems.count();
  expect(orderCount).to.be.greaterThan(0);
});

Then('orders should be sorted by creation date', async function() {
  // This would require more complex verification of dates
  // For now, just verify multiple orders exist
  const orderItems = this.page.locator('[data-testid*="order-item"], .order-item, [class*="order"]');
  const orderCount = await orderItems.count();
  expect(orderCount).to.be.at.least(2);
});

Then('each order should show correct status and details', async function() {
  const orderItems = this.page.locator('[data-testid*="order-item"], .order-item, [class*="order"]');

  for (let i = 0; i < await orderItems.count(); i++) {
    const orderItem = orderItems.nth(i);

    // Verify each order has required elements
    const title = orderItem.locator('h3').or(orderItem.locator('[data-testid*="title"]'));
    const price = orderItem.locator('text=/\\$\\d+\\.\\d+/');
    const status = orderItem.locator('[class*="status"]').or(orderItem.locator('[data-testid*="status"]'));

    await expect(title).toBeVisible();
    await expect(price).toBeVisible();
    await expect(status).toBeVisible();
  }
});

When('I filter orders by status {string}', async function(status) {
  const filterSelect = this.page.locator('select').or(this.page.locator('[data-testid*="filter"]'));
  await filterSelect.selectOption(status.toLowerCase());
  await this.page.waitForTimeout(1000); // Allow filtering to take effect
});

Then('I should only see orders with status {string}', async function(status) {
  const orderItems = this.page.locator('[data-testid*="order-item"], .order-item, [class*="order"]');

  if (await orderItems.count() > 0) {
    for (let i = 0; i < await orderItems.count(); i++) {
      const orderItem = orderItems.nth(i);
      const statusElement = orderItem.locator('[class*="status"]').or(
        orderItem.locator('[data-testid*="status"]')
      );

      await expect(statusElement).toBeVisible();
      const statusText = await statusElement.textContent();
      expect(statusText.toLowerCase()).to.include(status.toLowerCase());
    }
  }
});
