const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// ============ Driver Order Discovery Steps ============

Given('a driver {string} exists with location {string}', async function (driverName, coordinates) {
    const [lat, lng] = coordinates.split(',').map(c => parseFloat(c.trim()));

    // Register driver via API
    const timestamp = Date.now();
    const driverData = {
        name: driverName,
        email: `${driverName.toLowerCase().replace(' ', '_')}_${timestamp}@test.com`,
        password: 'Test123!',
        phone: `+20${timestamp.toString().slice(-10)}`,
        primary_role: 'driver'
    };

    const regResponse = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverData)
    });

    const regResult = await regResponse.json();
    if (!regResponse.ok) {
        console.log('Driver registration failed:', regResult.error);
    }

    // Update driver location
    const locResponse = await fetch(`${this.apiUrl}/drivers/location`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${regResult.token}`
        },
        body: JSON.stringify({ latitude: lat, longitude: lng })
    });

    // Store driver data
    this.testData.users = this.testData.users || {};
    this.testData.users[driverName] = {
        ...driverData,
        id: regResult.user?.id,
        token: regResult.token,
        location: { lat, lng }
    };
});

Given('{string} has set max delivery distance to {int} km', async function (driverName, maxDistance) {
    const driver = this.testData.users[driverName];
    if (!driver) throw new Error(`Driver ${driverName} not found`);

    const response = await fetch(`${this.apiUrl}/delivery-agent/preferences`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${driver.token}`
        },
        body: JSON.stringify({ max_distance_km: maxDistance })
    });

    expect(response.ok).to.be.true;
    driver.maxDistance = maxDistance;
});

Given('{string} has created an order {string} at location {string}', async function (customerName, orderTitle, coordinates) {
    const [lat, lng] = coordinates.split(',').map(c => parseFloat(c.trim()));
    const customer = this.testData.users[customerName];

    if (!customer) throw new Error(`Customer ${customerName} not found`);

    const orderData = {
        title: orderTitle,
        price: 50.00,
        pickupLocation: { lat, lng },
        pickupAddress: { country: 'Egypt', city: 'Cairo', area: 'Test Area', street: 'Test Street' },
        dropoffAddress: { country: 'Egypt', city: 'Cairo', area: 'Delivery Area', street: 'Delivery Street' }
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
    expect(response.ok, `Failed to create order: ${result.error}`).to.be.true;

    this.testData.orders = this.testData.orders || {};
    this.testData.orders[orderTitle] = { ...result, location: { lat, lng } };
});

Given('the distance between {string} and order {string} is approximately {float} km', async function (driverName, orderTitle, distance) {
    // This is a given condition for test clarity - actual distance is calculated by the backend
    const driver = this.testData.users[driverName];
    const order = this.testData.orders[orderTitle];

    // Store expected distance for assertions
    this.testData.expectedDistances = this.testData.expectedDistances || {};
    this.testData.expectedDistances[`${driverName}-${orderTitle}`] = distance;
});

When('{string} fetches available orders', async function (driverName) {
    const driver = this.testData.users[driverName];
    if (!driver) throw new Error(`Driver ${driverName} not found`);

    const response = await fetch(
        `${this.apiUrl}/orders?lat=${driver.location.lat}&lng=${driver.location.lng}`,
        {
            headers: { 'Authorization': `Bearer ${driver.token}` }
        }
    );

    const orders = await response.json();
    this.testData.lastFetchedOrders = orders;
});

Then('{string} should see order {string} in the list', async function (driverName, orderTitle) {
    const targetOrder = this.testData.orders[orderTitle];
    const found = this.testData.lastFetchedOrders.some(o =>
        o.id === targetOrder.id || o.title === orderTitle
    );

    expect(found, `Order "${orderTitle}" should be visible to ${driverName}`).to.be.true;
});

Then('{string} should NOT see order {string} in the list', async function (driverName, orderTitle) {
    const targetOrder = this.testData.orders[orderTitle];
    const found = this.testData.lastFetchedOrders.some(o =>
        o.id === targetOrder.id || o.title === orderTitle
    );

    expect(found, `Order "${orderTitle}" should NOT be visible to ${driverName}`).to.be.false;
});

Given('driver {string} exists without a set location', async function (driverName) {
    const timestamp = Date.now();
    const driverData = {
        name: driverName,
        email: `${driverName.toLowerCase().replace(' ', '_')}_${timestamp}@test.com`,
        password: 'Test123!',
        phone: `+20${timestamp.toString().slice(-10)}`,
        primary_role: 'driver'
    };

    const regResponse = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverData)
    });

    const regResult = await regResponse.json();

    this.testData.users = this.testData.users || {};
    this.testData.users[driverName] = {
        ...driverData,
        id: regResult.user?.id,
        token: regResult.token,
        location: null // No location set
    };
});

When('{string} fetches available orders without providing location', async function (driverName) {
    const driver = this.testData.users[driverName];
    if (!driver) throw new Error(`Driver ${driverName} not found`);

    const response = await fetch(`${this.apiUrl}/orders`, {
        headers: { 'Authorization': `Bearer ${driver.token}` }
    });

    const orders = await response.json();
    this.testData.lastFetchedOrders = orders;
});

Then('{string} should see an empty list or only assigned orders', async function (driverName) {
    const driver = this.testData.users[driverName];
    const orders = this.testData.lastFetchedOrders;

    // Without location, driver should only see orders assigned to them (empty for new driver)
    const nonAssignedOrders = orders.filter(o =>
        o.assigned_driver_user_id !== driver.id && o.assignedDriver !== driver.id
    );

    expect(nonAssignedOrders.length, 'Driver without location should not see unassigned pending orders').to.equal(0);
});

Given('{string} has set {string} preference to {word}', async function (driverName, preference, value) {
    const driver = this.testData.users[driverName];
    if (!driver) throw new Error(`Driver ${driverName} not found`);

    const prefValue = value === 'true';
    const body = {};
    body[preference] = prefValue;

    const response = await fetch(`${this.apiUrl}/delivery-agent/preferences`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${driver.token}`
        },
        body: JSON.stringify(body)
    });

    expect(response.ok).to.be.true;
});

Given('{string} has created an order {string} tagged as {string}', async function (customerName, orderTitle, tag) {
    const customer = this.testData.users[customerName];
    if (!customer) throw new Error(`Customer ${customerName} not found`);

    const orderData = {
        title: orderTitle,
        price: 60.00,
        tags: [tag],
        pickupAddress: { country: 'Egypt', city: 'Remote City', area: 'Remote Area', street: 'Remote Street' },
        dropoffAddress: { country: 'Egypt', city: 'Cairo', area: 'Downtown', street: 'Main Street' }
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
    expect(response.ok, `Failed to create order: ${result.error}`).to.be.true;

    this.testData.orders = this.testData.orders || {};
    this.testData.orders[orderTitle] = { ...result, tags: [tag] };
});

module.exports = {};
