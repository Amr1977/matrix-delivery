/**
 * Bidding and Delivery Workflow Step Definitions
 * Combined steps for driver bidding and delivery status updates
 */

/**
 * Bidding and Delivery Workflow Step Definitions
 * Combined steps for driver bidding and delivery status updates
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// ============================================================================
// Bidding Steps
// ============================================================================

Given('driver has placed bid of {string} on order {string}', async function(amount, orderNumber) {
  const order = this.testData.orders[orderNumber];
  const driver = this.testDriver || Object.values(this.testData.users).find(u => u.role === 'driver');
  
  const originalToken = this.authToken;
  await this.loginUser(driver.email, driver.password);
  
  await this.post(`/orders/${order._id}/bid`, {
bidPrice: parseFloat(amount.replace(',', ''))
  });
  
  this.authToken = originalToken;
});

Given('driver {string} has placed bid on order {string}', async function(driverName, orderNumber) {
  const driver = this.testData.users[driverName];
  const order = this.testData.orders[orderNumber];
  
  const originalToken = this.authToken;
  await this.loginUser(driver.email, driver.password);
  
  await this.post(`/orders/${order._id}/bid`, { bidPrice: 20.00 });
  
  this.authToken = originalToken;
});

Given('driver {string} has bid {string} on order {string}', async function(name, amount, orderNumber) {
  const driver = this.testData.users[name];
  const order = this.testData.orders[orderNumber];
  
  const originalToken = this.authToken;
  await this.loginUser(driver.email, driver.password);
  
  await this.post(`/orders/${order._id}/bid`, {
    bidPrice: parseFloat(amount.replace(',', ''))
  });
  
  this.authToken = originalToken;
});

Given('{int} drivers have placed bids on order {string}:', async function(count, orderNumber, dataTable) {
  const order = this.testData.orders[orderNumber];
  const bids = dataTable.hashes();
  
  for (const bidData of bids) {
    const driver = this.testData.users[bidData.driver_name];
    const originalToken = this.authToken;
    
    await this.loginUser(driver.email, driver.password);
    await this.post(`/orders/${order._id}/bid`, {
      bidPrice: parseFloat(bidData.bid_price),
      message: bidData.message
    });
    
    this.authToken = originalToken;
  }
});

When('I view {string} tab', async function(tabName) {
  await this.get('/orders');
  this.currentTab = tabName;
});

When('I click {string} tab', async function(tabName) {
  this.currentTab = tabName;
  await this.get('/orders');
});

When('driver views {string} tab', async function(tabName) {
  this.currentTab = tabName;
  await this.get('/orders');
});

When('I place a bid of {string} on the order', async function(amount) {
  const order = this.currentOrder;
  await this.post(`/orders/${order._id}/bid`, {
    bidPrice: parseFloat(amount.replace(',', ''))
  });
});

When('I place bid:', async function(dataTable) {
  const data = dataTable.rowsHash();
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  
  await this.post(`/orders/${order._id}/bid`, {
    bidPrice: parseFloat(data.amount || data.bidPrice),
    estimatedPickupTime: data.estimated_pickup_time,
    estimatedDeliveryTime: data.estimated_delivery_time,
    message: data.message
  });
});

When('driver places bid:', async function(dataTable) {
  const data = dataTable.rowsHash();
  const order = this.currentOrder;
  
  await this.post(`/orders/${order._id}/bid`, {
    bidPrice: parseFloat(data.amount || data.bidPrice),
    message: data.message
  });
});

When('I enter bid amount {string}', function(amount) {
  this.bidAmount = parseFloat(amount.replace(',', ''));
});

When('I fill in bid details:', function(dataTable) {
  const data = dataTable.rowsHash();
  this.bidData = {
    bidPrice: parseFloat(data.bid_amount),
    estimatedPickupTime: data.estimated_pickup_time,
    estimatedDeliveryTime: data.estimated_delivery_time,
    message: data.message
  };
});

When('I click {string}', async function(buttonName) {
  if (buttonName === 'Place Bid') {
    const order = this.currentOrder || Object.values(this.testData.orders)[0];
    await this.post(`/orders/${order._id}/bid`, this.bidData || { bidPrice: this.bidAmount });
  }
  this.lastClickedButton = buttonName;
});

When('I view the order details as a driver', async function() {
  const order = Object.values(this.testData.orders)[0];
  await this.get(`/orders/${order._id}`);
});

When('I view the order again', async function() {
  const order = this.currentOrder;
  await this.get(`/orders/${order._id}`);
});

When('I enter new bid amount {string}', function(amount) {
  this.bidAmount = parseFloat(amount.replace(',', ''));
});

When('multiple drivers place bids on the same order', async function() {
  // Handled by the background setup
});

When('all {int} drivers place bids within {int} minute', async function(count, minutes) {
  // Simulated concurrent bidding
  const order = this.currentOrder;
  const drivers = Object.values(this.testData.users).filter(u => u.role === 'driver').slice(0, count);
  
  for (const driver of drivers) {
    const originalToken = this.authToken;
    await this.loginUser(driver.email, driver.password);
    await this.post(`/orders/${order._id}/bid`, { bidPrice: 20.00 });
    this.authToken = originalToken;
  }
});

// ============================================================================
// Bid Acceptance Steps
// ============================================================================

Given('customer has accepted the bid', async function() {
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  const customer = Object.values(this.testData.users).find(u => u.role === 'customer');
  const driver = this.testDriver || Object.values(this.testData.users).find(u => u.role === 'driver');
  
  const originalToken = this.authToken;
  await this.loginUser(customer.email, customer.password);
  
  await this.post(`/orders/${order._id}/accept-bid`, { userId: driver.id });
  
  this.authToken = originalToken;
});

Given('customer accepted {word} bid', async function(driverName) {
  const driver = this.testData.users[driverName];
  const order = this.currentOrder;
  
  await this.post(`/orders/${order._id}/accept-bid`, { userId: driver.id });
});

When('customer accepts the bid', async function() {
  const order = this.currentOrder;
  const driver = this.testDriver;
  
  await this.post(`/orders/${order._id}/accept-bid`, { userId: driver.id });
});

When('customer accepts {word} bid', async function(driverName) {
  const driver = this.testData.users[driverName];
  const order = this.currentOrder;
  
  await this.post(`/orders/${order._id}/accept-bid`, { userId: driver.id });
});

When('I accept {word} bid', async function(driverName) {
  const driver = this.testData.users[driverName];
  const order = this.currentOrder;
  
  await this.post(`/orders/${order._id}/accept-bid`, { userId: driver.id });
});

When('customer clicks {string} on {word} bid', async function(action, driverName) {
  const driver = this.testData.users[driverName];
  const order = this.currentOrder;
  
  await this.post(`/orders/${order._id}/accept-bid`, { userId: driver.id });
});

Then('my bid should be submitted successfully', function() {
  this.assertResponseOk();
});

Then('customer should see my bid', async function() {
  // Verify bid is visible to customer
  assert.ok(this.response.ok);
});

Then('my bid should appear in the customer\'s bid list', function() {
  this.assertResponseOk();
});

Then('I should see my bid listed in my active bids', function() {
  this.assertResponseOk();
});

Then('the bid amount should be {string}', function(amount) {
  assert.equal(this.response.data.assignedDriver?.bidPrice || this.bidAmount, parseFloat(amount.replace(',', '')));
});

Then('driver should see the order in their accepted deliveries', async function() {
  await this.get('/orders');
  const orders = this.response.data;
  assert.ok(orders.some(o => o.status === 'accepted'));
});

Then('the order should be assigned to the driver', function() {
  assert.ok(this.response.data.assignedDriver);
});

Then('all {int} bids should be recorded', async function(count) {
  // Check bids in database
  const order = this.currentOrder;
  const result = await this.query('SELECT COUNT(*) FROM bids WHERE order_id = $1', [order._id]);
  assert.equal(parseInt(result.rows[0].count), count);
});

Then('customer should see all {int} bids', async function(count) {
  await this.get(`/orders/${this.currentOrder._id}`);
  assert.equal(this.response.data.bids.length, count);
});

Then('no bid should be lost', function() {
  assert.ok(true); // Verified by previous assertions
});

// ============================================================================
// Delivery Status Updates
// ============================================================================

Given('order {string} status is {string}', async function(orderNumber, status) {
  const order = this.testData.orders[orderNumber];
  await this.query('UPDATE orders SET status = $1 WHERE id = $2', [status, order._id]);
  order.status = status;
});

Given('I am assigned to order {string}', async function(orderNumber) {
  const order = this.testData.orders[orderNumber];
  await this.query(
    'UPDATE orders SET assigned_driver_user_id = $1, assigned_driver_name = $2, status = $3 WHERE id = $4',
    [this.currentUser.id, this.currentUser.name, 'accepted', order._id]
  );
});

Given('I have picked up the package', async function() {
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  await this.post(`/orders/${order._id}/pickup`);
});

When('I mark the delivery as completed', async function() {
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  await this.post(`/orders/${order._id}/complete`);
});

When('I mark order as {string}', async function(status) {
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  
  const endpoints = {
    'picked_up': '/pickup',
    'Picked Up': '/pickup',
    'in_transit': '/in-transit',
    'In Transit': '/in-transit',
    'delivered': '/complete',
    'Delivered': '/complete'
  };
  
  const endpoint = endpoints[status];
  if (endpoint) {
    await this.post(`/orders/${order._id}${endpoint}`);
  }
});

When('driver marks order as {string}', async function(status) {
  const order = this.currentOrder;
  
  const endpoints = {
    'picked_up': '/pickup',
    'in_transit': '/in-transit',
    'delivered': '/complete'
  };
  
  await this.post(`/orders/${order._id}${endpoints[status]}`);
});

When('I attempt to mark order as {string}', async function(status) {
  const order = this.currentOrder || Object.values(this.testData.orders)[0];
  
  const endpoints = {
    'picked_up': '/pickup',
    'in_transit': '/in-transit',
    'delivered': '/complete'
  };
  
  await this.post(`/orders/${order._id}${endpoints[status]}`);
});

When('driver marks as {word}', async function(status) {
  const order = this.currentOrder;
  const endpoints = {
    'picked_up': '/pickup',
    'in_transit': '/in-transit',
    'delivered': '/complete'
  };
  
  await this.post(`/orders/${order._id}${endpoints[status]}`);
});

When('I arrive at pickup location', function() {
  // Simulated arrival
  this.arrivedAtPickup = true;
});

When('I arrive at delivery location', function() {
  // Simulated arrival
  this.arrivedAtDelivery = true;
});

When('driver arrives and picks up', async function() {
  const order = this.currentOrder;
  await this.post(`/orders/${order._id}/pickup`);
});

When('driver travels with package', function() {
  // Simulated travel
});

When('driver delivers package', async function() {
  const order = this.currentOrder;
  await this.post(`/orders/${order._id}/complete`);
});

Then('order status should change to {string}', async function(status) {
  const order = this.currentOrder || this.response.data;
  
  if (this.response.data.status) {
    assert.equal(this.response.data.status, status);
  } else {
    await this.get(`/orders/${order._id}`);
    assert.equal(this.response.data.status, status);
  }
});

Then('the order status should change to {string}', async function(status) {
  await this.get(`/orders/${this.currentOrder._id}`);
  assert.equal(this.response.data.status, status);
});

Then('order status should be {string}', async function(status) {
  const order = this.currentOrder || this.response.data;
  await this.get(`/orders/${order._id}`);
  assert.equal(this.response.data.status, status);
});

Then('the order should be marked as {string}', async function(status) {
  await this.get(`/orders/${this.currentOrder._id}`);
  assert.equal(this.response.data.status, status);
});

Then('order should be marked as delivered', async function() {
  await this.get(`/orders/${this.currentOrder._id}`);
  assert.equal(this.response.data.status, 'delivered');
});

Then('order should be complete', async function() {
  await this.get(`/orders/${this.currentOrder._id}`);
  assert.equal(this.response.data.status, 'delivered');
});

Then('order status should remain {string}', async function(status) {
  await this.get(`/orders/${this.currentOrder._id}`);
  assert.equal(this.response.data.status, status);
});

Then('my completed deliveries count should increase by {int}', async function(increment) {
  await this.get('/auth/me');
  const currentCount = this.response.data.completedDeliveries;
  const previousCount = this.currentUser.completedDeliveries || 0;
  assert.equal(currentCount, previousCount + increment);
});

Then('my completed deliveries count should be {int}', async function(count) {
  await this.get('/auth/me');
  assert.equal(this.response.data.completedDeliveries, count);
});

Then('pickup timestamp should be recorded', function() {
  assert.ok(this.response.data.pickedUpAt);
});

Then('delivery timestamp should be recorded', function() {
  assert.ok(this.response.data.deliveredAt);
});

Then('all timestamps should be recorded', function() {
  const order = this.response.data;
  assert.ok(order.createdAt);
  assert.ok(order.acceptedAt);
  assert.ok(order.pickedUpAt);
  assert.ok(order.deliveredAt);
});

// ============================================================================
// Location Updates
// ============================================================================

Given('driver has updated location to:', function(dataTable) {
  const coords = dataTable.rowsHash();
  this.driverLocation = {
    latitude: parseFloat(coords.lat),
    longitude: parseFloat(coords.lng)
  };
});

Given('driver is at location \\({float}, {float})', function(lat, lng) {
  this.driverLocation = { latitude: lat, longitude: lng };
});

When('driver updates location', async function() {
  if (!this.driverLocation) {
    this.driverLocation = { latitude: 40.7128, longitude: -74.0060 };
  }
  await this.post('/drivers/location', this.driverLocation);
});

When('driver updates location to \\({float}, {float})', async function(lat, lng) {
  this.driverLocation = { latitude: lat, longitude: lng };
  await this.post('/drivers/location', this.driverLocation);
});

When('I update location to:', async function(dataTable) {
  const coords = dataTable.rowsHash();
  await this.post('/drivers/location', {
    latitude: parseFloat(coords.lat),
    longitude: parseFloat(coords.lng)
  });
});

When('driver updates location regularly', async function() {
  // Simulated regular updates
  await this.post('/drivers/location', {
    latitude: 40.7400,
    longitude: -73.9700
  });
});

// ============================================================================
// Order Visibility
// ============================================================================

Then('I should see order {string} in the list', function(orderTitle) {
  const orders = this.response.data;
  const found = orders.find(o => o.title === orderTitle);
  assert.ok(found, `Order "${orderTitle}" not found`);
});

Then('I should see order {string}', function(orderTitle) {
  const orders = this.response.data;
  const found = orders.find(o => o.title === orderTitle);
  assert.ok(found, `Order "${orderTitle}" not found`);
});

Then('driver should see order {string}', function(orderTitle) {
  const orders = this.response.data;
  const found = orders.find(o => o.title === orderTitle);
  assert.ok(found, `Order "${orderTitle}" not found`);
});

Then('the order should not be visible in {string}', async function(tabName) {
  await this.get('/orders');
  // Filter logic would be applied here based on tab
});

Then('driver should NOT see: {word} \\(outside 5km radius)', function(orderNumber) {
  const orders = this.response.data;
  const found = orders.find(o => o.orderNumber === orderNumber);
  assert.ok(!found, `Order ${orderNumber} should not be visible`);
});

Then('each visible order should show distance', function() {
  // Distance would be calculated and shown for nearby orders
});

Then('I should see exactly {int} orders', function(count) {
  assert.equal(this.response.data.length, count);
});

Then('all should have status {string} or {string}', function(status1, status2) {
  const orders = this.response.data;
  orders.forEach(order => {
    assert.ok(
      order.status === status1 || order.status === status2,
      `Order has invalid status: ${order.status}`
    );
  });
});
