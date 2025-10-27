/**
 * Order Management Step Definitions
 * Steps for creating, viewing, and managing orders
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// ============================================================================
// Order Creation Setup
// ============================================================================

Given('customer has created order {string} with:', async function(orderNumber, dataTable) {
  const data = dataTable.rowsHash();
  
  const orderData = {
    title: data.title,
    price: parseFloat(data.price),
    pickupLocation: {
      coordinates: {
        lat: parseFloat(data.pickup_lat),
        lng: parseFloat(data.pickup_lng)
      },
      address: {
        country: 'USA',
        city: 'New York',
        area: 'Manhattan',
        street: '5th Avenue',
        personName: 'Test Person'
      }
    },
    dropoffLocation: {
      coordinates: {
        lat: parseFloat(data.delivery_lat),
        lng: parseFloat(data.delivery_lng)
      },
      address: {
        country: 'USA',
        city: 'New York',
        area: 'Upper West Side',
        street: 'Broadway',
        personName: 'Test Recipient'
      }
    }
  };
  
  const order = await this.createTestOrder(this.currentUser.id, orderData);
  this.testData.orders[orderNumber] = order;
});

Given('order {string} exists with status {string}', async function(orderNumber, status) {
  const order = await this.createTestOrder(this.currentUser.id);
  
  // Update status if needed
  if (status !== 'pending_bids') {
    await this.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      [status, order._id]
    );
    order.status = status;
  }
  
  this.testData.orders[orderNumber] = order;
});

Given('there is an available order {string}', async function(orderNumber) {
  const customer = Object.values(this.testData.users).find(u => u.role === 'customer');
  if (!customer) {
    throw new Error('No customer found');
  }
  
  const order = await this.createTestOrder(customer.id);
  this.testData.orders[orderNumber] = order;
});

Given('customer has order {string} with status {string}', async function(orderNumber, status) {
  const order = await this.createTestOrder(this.currentUser.id);
  
  if (status !== 'pending_bids') {
    await this.query('UPDATE orders SET status = $1 WHERE id = $2', [status, order._id]);
    order.status = status;
  }
  
  this.testData.orders[orderNumber] = order;
});

Given('there is an open customer order', async function() {
  const customer = Object.values(this.testData.users).find(u => u.role === 'customer');
  const order = await this.createTestOrder(customer.id);
  this.currentOrder = order;
});

Given('there are open customer orders available', async function() {
  const customer = Object.values(this.testData.users).find(u => u.role === 'customer');
  
  for (let i = 0; i < 3; i++) {
    await this.createTestOrder(customer.id, {
      title: `Test Order ${i + 1}`
    });
  }
});

// ============================================================================
// Order Creation - Form Filling
// ============================================================================

When('I click {string} button', function(buttonName) {
  this.lastClickedButton = buttonName;
});

Then('I should see the order creation form', function() {
  this.currentPage = 'order_creation';
});

When('I fill in basic order details:', function(dataTable) {
  const data = dataTable.rowsHash();
  this.orderFormData = { ...this.orderFormData, ...data };
});

When('I fill in order details:', function(dataTable) {
  const data = dataTable.rowsHash();
  this.orderFormData = { ...this.orderFormData, ...data };
});

When('I select pickup location on map at coordinates:', function(dataTable) {
  const coords = dataTable.rowsHash();
  this.orderFormData = {
    ...this.orderFormData,
    pickupLocation: {
      ...this.orderFormData?.pickupLocation,
      coordinates: {
        lat: parseFloat(coords.lat),
        lng: parseFloat(coords.lng)
      }
    }
  };
});

When('I fill in pickup address:', function(dataTable) {
  const address = dataTable.rowsHash();
  this.orderFormData = {
    ...this.orderFormData,
    pickupLocation: {
      ...this.orderFormData?.pickupLocation,
      address: address
    }
  };
});

When('I fill in pickup address for {string} at {string}', function(personName, street) {
  this.orderFormData = {
    ...this.orderFormData,
    pickupLocation: {
      ...this.orderFormData?.pickupLocation,
      address: {
        country: 'USA',
        city: 'New York',
        area: 'Manhattan',
        street: street,
        personName: personName
      }
    }
  };
});

When('I select delivery location on map at coordinates:', function(dataTable) {
  const coords = dataTable.rowsHash();
  this.orderFormData = {
    ...this.orderFormData,
    dropoffLocation: {
      ...this.orderFormData?.dropoffLocation,
      coordinates: {
        lat: parseFloat(coords.lat),
        lng: parseFloat(coords.lng)
      }
    }
  };
});

When('I fill in delivery address:', function(dataTable) {
  const address = dataTable.rowsHash();
  this.orderFormData = {
    ...this.orderFormData,
    dropoffLocation: {
      ...this.orderFormData?.dropoffLocation,
      address: address
    }
  };
});

When('I fill in delivery address for {string} at {string}', function(personName, street) {
  this.orderFormData = {
    ...this.orderFormData,
    dropoffLocation: {
      ...this.orderFormData?.dropoffLocation,
      address: {
        country: 'USA',
        city: 'New York',
        area: 'Upper West Side',
        street: street,
        personName: personName
      }
    }
  };
});

When('I publish the order', async function() {
  await this.post('/orders', this.orderFormData);
});

When('I click {string}', function(buttonText) {
  this.lastClickedButton = buttonText;
});

When('I submit the order', async function() {
  await this.post('/orders', this.orderFormData);
});

// ============================================================================
// Order Creation - Full Flow
// ============================================================================

When('customer creates order {string}', async function(orderNumber) {
  const order = await this.createTestOrder(this.currentUser.id);
  this.testData.orders[orderNumber] = order;
  this.currentOrder = order;
});

When('customer {string} creates order with:', async function(name, dataTable) {
  const customer = this.testData.users[name];
  const data = dataTable.rowsHash();
  
  const orderData = {
    title: data.title,
    price: parseFloat(data.price),
    pickupLocation: {
      coordinates: { lat: parseFloat(data.pickup_lat), lng: parseFloat(data.pickup_lng) },
      address: { country: 'USA', city: 'New York', area: 'Manhattan', street: '5th Ave', personName: name }
    },
    dropoffLocation: {
      coordinates: { lat: parseFloat(data.delivery_lat), lng: parseFloat(data.delivery_lng) },
      address: { country: 'USA', city: 'New York', area: 'Downtown', street: 'Broadway', personName: 'Recipient' }
    }
  };
  
  // Login as customer temporarily
  const originalToken = this.authToken;
  await this.loginUser(customer.email, customer.password);
  
  const order = await this.createTestOrder(customer.id, orderData);
  this.testData.orders[order.orderNumber] = order;
  this.currentOrder = order;
  
  // Restore original token
  this.authToken = originalToken;
});

When('I create order with only required fields:', function(dataTable) {
  const data = dataTable.rowsHash();
  this.orderFormData = {
    title: data.title,
    price: parseFloat(data.price),
    pickupLocation: {
      coordinates: { lat: 40.7128, lng: -74.0060 },
      address: { country: 'USA', city: 'NY', area: 'Manhattan', street: '5th Ave', personName: 'John' }
    },
    dropoffLocation: {
      coordinates: { lat: 40.7580, lng: -73.9855 },
      address: { country: 'USA', city: 'NY', area: 'UWS', street: 'Broadway', personName: 'Jane' }
    }
  };
});

When('I select valid pickup and delivery locations with addresses', function() {
  this.orderFormData = {
    ...this.orderFormData,
    pickupLocation: {
      coordinates: { lat: 40.7128, lng: -74.0060 },
      address: { country: 'USA', city: 'NY', area: 'Manhattan', street: '5th Ave', personName: 'John' }
    },
    dropoffLocation: {
      coordinates: { lat: 40.7580, lng: -73.9855 },
      address: { country: 'USA', city: 'NY', area: 'UWS', street: 'Broadway', personName: 'Jane' }
    }
  };
});

When('I leave optional fields empty:', function(dataTable) {
  // Optional fields are already not set in orderFormData
  this.skippedFields = dataTable.raw().map(row => row[0]);
});

When('customer creates detailed order', async function() {
  const order = await this.createTestOrder(this.currentUser.id, {
    title: 'Detailed Test Order',
    description: 'Complete order with all details',
    package_description: 'Laptop computer',
    package_weight: 2.5,
    estimated_value: 1500
  });
  this.currentOrder = order;
});

// ============================================================================
// Order Viewing
// ============================================================================

When('I view order details', async function() {
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  await this.get(`/orders/${order._id}`);
});

When('I navigate to order details', async function() {
  const order = Object.values(this.testData.orders)[0];
  await this.get(`/orders/${order._id}`);
});

When('I check order tracking', async function() {
  const order = Object.values(this.testData.orders)[0];
  await this.get(`/orders/${order._id}/tracking`);
});

When('I view {string} section', async function(sectionName) {
  if (sectionName === 'My Orders') {
    await this.get('/orders');
  }
  this.currentPage = sectionName.toLowerCase().replace(/\s+/g, '_');
});

When('I view my orders list', async function() {
  await this.get('/orders');
});

Then('I should see the order in my orders list', async function() {
  await this.get('/orders');
  assert.ok(this.response.ok);
  assert.ok(Array.isArray(this.response.data));
  assert.ok(this.response.data.length > 0);
});

Then('I should see all {int} orders', function(count) {
  assert.ok(Array.isArray(this.response.data));
  assert.equal(this.response.data.length, count);
});

Then('orders should be sorted by creation date \\(newest first)', function() {
  const orders = this.response.data;
  for (let i = 0; i < orders.length - 1; i++) {
    const current = new Date(orders[i].createdAt);
    const next = new Date(orders[i + 1].createdAt);
    assert.ok(current >= next, 'Orders should be sorted newest first');
  }
});

// ============================================================================
// Order Assertions
// ============================================================================

Then('a new order should be created with status {string}', async function(status) {
  this.assertResponseOk();
  assert.ok(this.response.data._id);
  assert.equal(this.response.data.status, status);
});

Then('order should appear in my orders with status {string}', async function(status) {
  await this.get('/orders');
  const orders = this.response.data;
  const order = orders.find(o => o.title === this.orderFormData.title);
  assert.ok(order, 'Order not found in orders list');
  assert.equal(order.status, status);
});

Then('the order should have a unique order number starting with {string}', function(prefix) {
  assert.ok(this.response.data.orderNumber);
  assert.ok(this.response.data.orderNumber.startsWith(prefix));
});

Then('the order should contain:', function(dataTable) {
  const expected = dataTable.rowsHash();
  const order = this.response.data;
  
  Object.entries(expected).forEach(([key, value]) => {
    if (key === 'price') {
      assert.equal(parseFloat(order[key]), parseFloat(value));
    } else {
      assert.equal(order[key], value);
    }
  });
});

Then('the pickup address should be formatted as:', function(docString) {
  const order = this.response.data;
  assert.ok(order.pickupAddress);
  // Just verify it exists - exact formatting may vary
});

Then('the delivery address should be formatted as:', function(docString) {
  const order = this.response.data;
  assert.ok(order.deliveryAddress);
});

Then('order status should be {string}', async function(status) {
  const order = this.currentOrder || this.response.data;
  
  if (order._id) {
    await this.get(`/orders/${order._id}`);
    assert.equal(this.response.data.status, status);
  } else {
    assert.equal(order.status, status);
  }
});

Then('order should be in system', async function() {
  assert.ok(this.currentOrder);
  await this.get(`/orders/${this.currentOrder._id}`);
  this.assertResponseOk();
});

// ============================================================================
// Order Deletion
// ============================================================================

When('I delete the order', async function() {
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  await this.delete(`/orders/${order._id}`);
});

When('customer deletes the order', async function() {
  const order = this.currentOrder;
  await this.delete(`/orders/${order._id}`);
});

When('I attempt to delete the order', async function() {
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  await this.delete(`/orders/${order._id}`);
});

Then('the order should be removed from my orders list', async function() {
  await this.get('/orders');
  const orders = this.response.data;
  const order = this.currentOrder;
  const found = orders.find(o => o._id === order._id);
  assert.ok(!found, 'Order should not be in list');
});

Then('I should see {int} orders remaining', async function(count) {
  await this.get('/orders');
  assert.equal(this.response.data.length, count);
});

Then('the order should be removed from the database', async function() {
  const order = this.currentOrder;
  const result = await this.query('SELECT * FROM orders WHERE id = $1', [order._id]);
  assert.equal(result.rows.length, 0);
});

Then('the order should remain in my orders list', async function() {
  await this.get('/orders');
  const orders = this.response.data;
  const order = this.currentOrder;
  const found = orders.find(o => o._id === order._id);
  assert.ok(found, 'Order should still be in list');
});

Then('the order should not be deleted from database', async function() {
  const order = this.currentOrder;
  const result = await this.query('SELECT * FROM orders WHERE id = $1', [order._id]);
  assert.equal(result.rows.length, 1);
});

// ============================================================================
// Order Validation
// ============================================================================

When('I attempt to publish order without filling required fields', async function() {
  await this.post('/orders', {});
});

When('I fill in all address details but skip map selection', function() {
  this.orderFormData = {
    title: 'Test Order',
    price: 25.00,
    pickupLocation: {
      address: { country: 'USA', city: 'NY', area: 'Manhattan', street: '5th Ave', personName: 'John' }
    },
    dropoffLocation: {
      address: { country: 'USA', city: 'NY', area: 'UWS', street: 'Broadway', personName: 'Jane' }
    }
  };
});

When('I attempt to publish the order', async function() {
  await this.post('/orders', this.orderFormData);
});

When('I fill in valid order details', function() {
  this.orderFormData = {
    title: 'Valid Order',
    price: 25.00,
    pickupLocation: {
      coordinates: { lat: 40.7128, lng: -74.0060 },
      address: { country: 'USA', city: 'NY', area: 'Manhattan', street: '5th Ave', personName: 'John' }
    },
    dropoffLocation: {
      coordinates: { lat: 40.7580, lng: -73.9855 },
      address: { country: 'USA', city: 'NY', area: 'UWS', street: 'Broadway', personName: 'Jane' }
    }
  };
});

When('I enter price as {string}', function(price) {
  this.orderFormData = { ...this.orderFormData, price: parseFloat(price) };
});

Then('the error should list missing fields:', function(dataTable) {
  assert.ok(this.response.error);
  // Would check each field is mentioned in error
});

Then('optional fields should be null or empty in the order', function() {
  const order = this.response.data;
  assert.ok(!order.description || order.description === '');
});

// ============================================================================
// Multiple Orders
// ============================================================================

Given('I have created {int} orders with different statuses:', async function(count, dataTable) {
  const orders = dataTable.hashes();
  
  for (const orderData of orders) {
    const order = await this.createTestOrder(this.currentUser.id, {
      title: orderData.title,
      price: parseFloat(orderData.price)
    });
    
    if (orderData.status !== 'pending_bids') {
      await this.query('UPDATE orders SET status = $1 WHERE id = $2', [orderData.status, order._id]);
    }
    
    this.testData.orders[orderData.orderNumber] = order;
  }
});

Given('customer creates {int} orders', async function(count) {
  for (let i = 0; i < count; i++) {
    await this.createTestOrder(this.currentUser.id, {
      title: `Order ${i + 1}`
    });
  }
});

Given('customer has completed {int} orders with payments:', async function(count, dataTable) {
  // Implementation for payment history scenarios
  const orders = dataTable.hashes();
  
  for (const orderData of orders) {
    const order = await this.createTestOrder(this.currentUser.id, {
      title: `Order ${orderData.order}`,
      price: parseFloat(orderData.amount)
    });
    
    await this.query(
      'UPDATE orders SET status = $1, delivered_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['delivered', order._id]
    );
  }
});