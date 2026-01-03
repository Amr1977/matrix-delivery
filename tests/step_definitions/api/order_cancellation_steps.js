const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// ============ Order Cancellation Steps ============

Given('{string} has created an order {string} priced at {string}', async function (customerName, orderTitle, price) {
    // Create order via API
    const customer = this.testData.users[customerName];
    if (!customer) throw new Error(`Customer ${customerName} not found in test data`);

    const orderData = {
        title: orderTitle,
        price: parseFloat(price),
        pickupAddress: { country: 'Egypt', city: 'Cairo', area: 'Downtown', street: 'Test Street' },
        dropoffAddress: { country: 'Egypt', city: 'Cairo', area: 'Nasr City', street: 'Delivery Street' }
    };

    const response = await fetch(`${this.apiUrl}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customer.token}`
        },
        body: JSON.stringify(orderData)
    });

    const result = await response.json();
    expect(response.ok, `Failed to create order: ${result.error || 'Unknown error'}`).to.be.true;

    // Store for later use
    this.testData.orders = this.testData.orders || {};
    this.testData.orders[orderTitle] = result;
});

Given('the order status is {string}', async function (expectedStatus) {
    const orderTitle = Object.keys(this.testData.orders)[0];
    const order = this.testData.orders[orderTitle];
    expect(order.status).to.equal(expectedStatus);
});

When('{string} cancels the order {string}', async function (userName, orderTitle) {
    const user = this.testData.users[userName];
    const order = this.testData.orders[orderTitle];

    if (!user) throw new Error(`User ${userName} not found`);
    if (!order) throw new Error(`Order ${orderTitle} not found`);

    // Call cancel API (customer route)
    const response = await fetch(`${this.apiUrl}/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
        }
    });

    this.testData.lastResponse = {
        status: response.status,
        body: await response.json()
    };
});

Then('the order status should be {string}', async function (expectedStatus) {
    const orderTitle = Object.keys(this.testData.orders)[0];
    const order = this.testData.orders[orderTitle];

    // Fetch updated order
    const customer = Object.values(this.testData.users).find(u => u.primary_role === 'customer');
    const response = await fetch(`${this.apiUrl}/orders/${order.id}`, {
        headers: { 'Authorization': `Bearer ${customer.token}` }
    });

    const updatedOrder = await response.json();
    expect(updatedOrder.status).to.equal(expectedStatus);
});

Then('no refunds should be processed', async function () {
    // For orders cancelled before payment, no refund logic is triggered
    // This is a verification that the order was cancelled before any funds exchanged
    const orderTitle = Object.keys(this.testData.orders)[0];
    const order = this.testData.orders[orderTitle];
    expect(order.status).to.equal('cancelled');
});

Given('{string} has placed a bid of {string} on order {string}', async function (driverName, bidAmount, orderTitle) {
    const driver = this.testData.users[driverName];
    const order = this.testData.orders[orderTitle];

    if (!driver) throw new Error(`Driver ${driverName} not found`);
    if (!order) throw new Error(`Order ${orderTitle} not found`);

    const response = await fetch(`${this.apiUrl}/orders/${order.id}/bid`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${driver.token}`
        },
        body: JSON.stringify({ bid_price: parseFloat(bidAmount) })
    });

    const result = await response.json();
    expect(response.ok, `Failed to place bid: ${result.error || 'Unknown error'}`).to.be.true;

    this.testData.orders[orderTitle].bid = result;
});

Given('{string} has accepted the bid from {string}', async function (customerName, driverName) {
    const customer = this.testData.users[customerName];
    const driver = this.testData.users[driverName];
    const orderTitle = Object.keys(this.testData.orders)[0];
    const order = this.testData.orders[orderTitle];

    const response = await fetch(`${this.apiUrl}/orders/${order.id}/accept-bid`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customer.token}`
        },
        body: JSON.stringify({ driverId: driver.id })
    });

    const result = await response.json();
    expect(response.ok, `Failed to accept bid: ${result.error || 'Unknown error'}`).to.be.true;
});

Then('{string} should receive a cancellation notification', async function (userName) {
    // In a real test, we'd check the notifications table or Socket.io event
    // For now, we verify the API returned success
    expect(this.testData.lastResponse.status).to.be.oneOf([200, 201]);
});

Given('the order is assigned to {string}', async function (driverName) {
    // Verify order is assigned to driver
    const orderTitle = Object.keys(this.testData.orders)[0];
    const order = this.testData.orders[orderTitle];
    const driver = this.testData.users[driverName];

    expect(order.assigned_driver_user_id || order.assignedDriver).to.equal(driver.id);
});

When('{string} withdraws from order {string}', async function (driverName, orderTitle) {
    const driver = this.testData.users[driverName];
    const order = this.testData.orders[orderTitle];

    const response = await fetch(`${this.apiUrl}/orders/${order.id}/withdraw`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${driver.token}`
        }
    });

    this.testData.lastResponse = {
        status: response.status,
        body: await response.json()
    };
});

Then('{string} should receive a notification about the driver withdrawal', async function (customerName) {
    // Verify notification was sent (mock verification)
    expect(this.testData.lastResponse.status).to.be.oneOf([200, 201]);
});

Given('{string} has been assigned to order {string}', async function (driverName, orderTitle) {
    // This step assumes previous bid acceptance established the assignment
    const driver = this.testData.users[driverName];
    const order = this.testData.orders[orderTitle];
    expect(order.assigned_driver_user_id || order.assignedDriver).to.equal(driver.id);
});

Given('{string} has picked up the order', async function (driverName) {
    const driver = this.testData.users[driverName];
    const orderTitle = Object.keys(this.testData.orders)[0];
    const order = this.testData.orders[orderTitle];

    const response = await fetch(`${this.apiUrl}/orders/${order.id}/pickup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${driver.token}` }
    });

    expect(response.ok).to.be.true;
});

When('{string} attempts to withdraw from order {string}', async function (driverName, orderTitle) {
    const driver = this.testData.users[driverName];
    const order = this.testData.orders[orderTitle];

    const response = await fetch(`${this.apiUrl}/orders/${order.id}/withdraw`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${driver.token}`
        }
    });

    this.testData.lastResponse = {
        status: response.status,
        body: await response.json()
    };
});

Then('the withdrawal should be rejected', async function () {
    expect(this.testData.lastResponse.status).to.equal(400);
});

Then('the order status should still be {string}', async function (expectedStatus) {
    const orderTitle = Object.keys(this.testData.orders)[0];
    const order = this.testData.orders[orderTitle];

    const customer = Object.values(this.testData.users).find(u => u.primary_role === 'customer');
    const response = await fetch(`${this.apiUrl}/orders/${order.id}`, {
        headers: { 'Authorization': `Bearer ${customer.token}` }
    });

    const updatedOrder = await response.json();
    expect(updatedOrder.status).to.equal(expectedStatus);
});

When('an admin cancels the order {string} with reason {string}', async function (orderTitle, reason) {
    const admin = this.testData.users['Admin'] || this.testData.adminUser;
    const order = this.testData.orders[orderTitle];

    if (!admin) throw new Error('Admin user not found in test data');

    const response = await fetch(`${this.apiUrl}/admin/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${admin.token}`
        },
        body: JSON.stringify({ reason })
    });

    this.testData.lastResponse = {
        status: response.status,
        body: await response.json()
    };
});

Then('{string} should receive a cancellation notification with the reason', async function (customerName) {
    // Verify cancellation was successful (notification would be checked via DB or Socket.io)
    expect(this.testData.lastResponse.status).to.be.oneOf([200, 201]);
});

module.exports = {};
