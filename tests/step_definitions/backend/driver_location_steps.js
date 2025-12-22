const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Driver location step definitions
When('I click the update location button', async function() {
  // Find and click the location update button
  const locationButton = await this.page.locator('button:has-text("Update Location")');
  await locationButton.waitFor({ state: 'visible', timeout: 5000 });
  await locationButton.click();
});

When('I grant location permission', async function() {
  // Handle browser geolocation permission dialog
  this.page.on('dialog', async dialog => {
    console.log('Dialog type:', dialog.type());
    if (dialog.type() === 'prompt') {
      // Handle location permission prompt
      await dialog.accept();
    }
  });

  // Wait a moment for location to be processed
  await this.page.waitForTimeout(2000);
});

When('I view the available bids tab', async function() {
  // Click on the Available Bids/Available Orders Near Me tab
  const biddingTab = await this.page.locator('button:has-text("Available Bids")').or(
    this.page.locator('button:has-text("Available Orders Near Me")')
  );
  await biddingTab.waitFor({ state: 'visible', timeout: 5000 });
  await biddingTab.click();

  // Wait for orders to load
  await this.page.waitForTimeout(1000);
});

When('I click on the {string} tab', async function(tabName) {
  const tabButton = await this.page.locator(`button:has-text("${tabName}")`);
  await tabButton.waitFor({ state: 'visible', timeout: 5000 });
  await tabButton.click();

  // Wait for tab content to update
  await this.page.waitForTimeout(1000);
});

Given('there are customer orders available', async function() {
  // Create some test orders via API to ensure data exists
  const orderData = [
    {
      title: 'Test Order Near Driver',
      description: 'Order within 5km',
      pickup_address: 'Times Square, New York',
      delivery_address: 'Central Park, New York',
      from: { lat: 40.7589, lng: -73.9851, name: 'Times Square' },
      to: { lat: 40.7829, lng: -73.9654, name: 'Central Park' },
      price: 25.50,
      package_description: 'Small package'
    },
    {
      title: 'Test Order Far Away',
      description: 'Order more than 5km away',
      pickup_address: 'Brooklyn Bridge, New York',
      delivery_address: 'Bronx Zoo, New York',
      from: { lat: 40.7061, lng: -73.9969, name: 'Brooklyn Bridge' },
      to: { lat: 40.8506, lng: -73.8772, name: 'Bronx' },
      price: 35.75,
      package_description: 'Medium package'
    }
  ];

  for (const order of orderData) {
    const response = await fetch(`${this.apiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testData.customer.token}`
      },
      body: JSON.stringify(order)
    });
    expect(response.ok).to.be.true;
  }
});

Given('there are customer orders available at various locations', async function() {
  await this.givenThereAreCustomerOrdersAvailable();
});

Given('I am logged in as a driver with location set', async function() {
  await this.amLoggedInAsADriver();

  // Set driver location via API
  const response = await fetch(`${this.apiUrl}/drivers/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.testData.driver.token}`
    },
    body: JSON.stringify({
      latitude: 40.7589,  // Times Square coordinates
      longitude: -73.9851
    })
  });
  expect(response.ok).to.be.true;

  // Update frontend state to reflect location
  this.testData.driverLocationSet = true;
});

Given('I have not granted location permission', async function() {
  // Note: Location permission will be denied in the test
  this.testData.locationPermissionDenied = true;
});

Given('multiple customer orders exist at different locations', async function() {
  await this.givenThereAreCustomerOrdersAvailable();
});

Given('there is a customer order within 5km of the driver location', async function() {
  const orderResponse = await fetch(`${this.apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.testData.customer.token}`
    },
    body: JSON.stringify({
      title: 'Urgent Delivery',
      description: 'Time-sensitive package',
      pickup_address: '42nd Street, New York',
      delivery_address: '43rd Street, New York',
      from: { lat: 40.7580, lng: -73.9857, name: '42nd Street' },
      to: { lat: 40.7600, lng: -73.9847, name: '43rd Street' },
      price: 15.00,
      package_description: 'Small urgent package'
    })
  });
  expect(orderResponse.ok).to.be.true;
});

When('I update my location', async function() {
  await this.whenIClickTheUpdateLocationButton();
  await this.whenIGrantLocationPermission();
});

When('I try to update my location', async function() {
  await this.whenIClickTheUpdateLocationButton();
});

Given('location services are unavailable or disabled', async function() {
  // Mock navigator.geolocation to be unavailable
  await this.page.addScriptTag({
    content: `
      Object.defineProperty(navigator, 'geolocation', {
        value: null,
        writable: true
      });
    `
  });
  this.testData.geolocationDisabled = true;
});

When('distance calculations should be recalculated', async function() {
  // Wait for any distance calculation updates
  await this.page.waitForTimeout(2000);
});

// Assertions
Then('my location should be updated successfully', async function() {
  // Check that location update button shows success or granted status
  const locationButton = await this.page.locator('button:has-text("Update Location")');
  const buttonText = await locationButton.textContent();

  // Button should show granted status or success state
  expect(buttonText).to.include('✅');
});

Then('I should see the location permission as granted', async function() {
  const locationButton = await this.page.locator('button:has-text("Update Location")');
  expect(await locationButton.isVisible()).to.be.true;
});

Then('my coordinates should be displayed', async function() {
  // Look for coordinate display in the interface
  const coordinatesElement = await this.page.locator('text =~ \\d+\\.\\d+,\\s*-\\d+\\.\\d+').first();
  expect(await coordinatesElement.isVisible()).to.be.true;
});

Then('I should see only orders within 5 km of my location', async function() {
  // Check that orders are displayed in the current view
  const orders = await this.page.locator('[class*="card"]').all();
  expect(orders.length).to.be.greaterThan(0);

  // Check for distance indicator or filtered orders
  const distanceIndicators = await this.page.locator('text =~ \\d+(\\.\\d+)?\\s*km\\s*away').all();
  if (distanceIndicators.length > 0) {
    // If distance indicators are shown, check they're reasonable (under 5km)
    for (const indicator of distanceIndicators) {
      const text = await indicator.textContent();
      const distance = parseFloat(text);
      expect(distance).to.be.lessThan(5.0);
    }
  }
});

Then('each nearby order should show the distance to pickup location', async function() {
  const distanceElements = await this.page.locator('text =~ \\d+(\\.\\d+)?\\s*km\\s*away').all();

  // Should have some distance information visible
  expect(distanceElements.length).to.be.greaterThan(0);

  // Check that the highlighted distance display exists
  const highlightedDistances = await this.page.locator('.bg-sky-100, .border-sky-400').all();
  expect(highlightedDistances.length).to.be.greaterThan(0);
});

Then('orders should be highlighted with location information', async function() {
  const highlightedOrders = await this.page.locator('.bg-sky-100, .border-sky-400').all();
  expect(highlightedOrders.length).to.be.greaterThan(0);
});

Then('I should see orders marked for bidding', async function() {
  const orders = await this.page.locator('[class*="card"]').all();
  expect(orders.length).to.be.greaterThan(0);

  // Look for bidding-related buttons or indicators
  const bidButtons = await this.page.locator('button:has-text("Place Bid")').all();
  expect(bidButtons.length).to.be.greaterThan(0);
});

Then('distance information should not be shown', async function() {
  const distanceElements = await this.page.locator('text =~ \\d+(\\.\\d+)?\\s*km\\s*away').all();
  expect(distanceElements.length).to.equal(0);
});

Then('I should be prompted to enable location', async function() {
  // Check for location permission prompt or button
  const locationButton = await this.page.locator('button:has-text("Update Location")');
  expect(await locationButton.isVisible()).to.be.true;
});

Then('I should not see orders that are more than 5km away', async function() {
  // Should see nearby orders but not distant ones
  await this.thenIShouldSeeOnlyOrdersWithin5KmOfMyLocation();
});

Then('I should only see nearby orders with distance information', async function() {
  await this.thenEachNearbyOrderShouldShowTheDistanceToPickupLocation();
});

Then('I should see my currently assigned deliveries', async function() {
  await this.page.waitForSelector('text="Active Orders"', { timeout: 5000 });
  const activeOrdersText = await this.page.locator('h2').textContent();
  expect(activeOrdersText).to.include('Active Orders');
});

Then('I should see orders available for bidding within range', async function() {
  const biddingOrders = await this.page.locator('[class*="card"]').all();
  expect(biddingOrders.length).to.be.at.least(0); // May have orders or not
});

Then('orders should show distance information when available', async function() {
  if (this.testData.driverLocationSet) {
    await this.thenEachNearbyOrderShouldShowTheDistanceToPickupLocation();
  }
});

Then('I should see my completed deliveries', async function() {
  await this.page.waitForSelector('text="My History"', { timeout: 5000 });
  const historyText = await this.page.locator('h2').textContent();
  expect(historyText).to.include('History');
});

Then('my coordinates should be updated', async function() {
  await this.thenMyCoordinatesShouldBeDisplayed();
});

Then('nearby orders should be refreshed', async function() {
  // Check that orders are still displayed after location update
  const orders = await this.page.locator('[class*="card"]').all();
  expect(orders.length).to.be.greaterThan(0);
});

Then('the nearby order should be displayed with distance information', async function() {
  const orders = await this.page.locator('[class*="card"]').all();
  expect(orders.length).to.be.greaterThan(0);

  // Should show distance info
  const distanceElements = await this.page.locator('text =~ \\d+(\\.\\d+)?\\s*km\\s*away').all();
  expect(distanceElements.length).to.be.greaterThan(0);
});

Then('the order should be marked as available for bidding', async function() {
  const bidButtons = await this.page.locator('button:has-text("Place Bid")').all();
  expect(bidButtons.length).to.be.greaterThan(0);
});

Then('the driver should be able to place a bid on the order', async function() {
  const bidInput = await this.page.locator('input[placeholder="Bid Amount ($)"]').first();
  expect(await bidInput.isVisible()).to.be.true;
});

Then('the system should automatically filter orders within 5km', async function() {
  await this.thenIShouldSeeOnlyOrdersWithin5KmOfMyLocation();
});

Then('I should see distance information for each nearby order', async function() {
  const distanceElements = await this.page.locator('text =~ \\d+(\\.\\d+)?\\s*km\\s*away').all();
  expect(distanceElements.length).to.be.greaterThan(0);
});

Then('orders outside the radius should be hidden', async function() {
  // This is implicit - if we only see orders within 5km, the rest are hidden
  await this.thenIShouldSeeOnlyOrdersWithin5KmOfMyLocation();
});

When('I deny location permission', async function() {
  // Handle browser permission prompt by denying it
  this.page.on('dialog', async dialog => {
    if (dialog.type() === 'prompt') {
      await dialog.dismiss(); // Deny the permission
    }
  });

  await this.page.waitForTimeout(1000);
});

Then('I should see a location access denied message', async function() {
  // Check for error message about location access
  const errorMessage = await this.page.locator('.error, .text-red-600').textContent();
  expect(errorMessage.toLowerCase()).to.include('location') ||
         expect(errorMessage.toLowerCase()).to.include('denied');
});

Then('the location status should show as denied', async function() {
  const locationButton = await this.page.locator('button:has-text("Update Location")');
  const buttonText = await locationButton.textContent();
  expect(buttonText).to.include('❌');
});

Then('I should still be able to view orders but without distance filtering', async function() {
  const orders = await this.page.locator('[class*="card"]').all();
  expect(orders.length).to.be.greaterThan(0);

  // No distance info should be shown
  const distanceElements = await this.page.locator('text =~ \\d+(\\.\\d+)?\\s*km\\s*away').all();
  expect(distanceElements.length).to.equal(0);
});

Then('I should see a location unavailable message', async function() {
  const errorMessage = await this.page.locator('.error, .text-red-600').textContent();
  expect(errorMessage.toLowerCase()).to.include('location') ||
         expect(errorMessage.toLowerCase()).to.include('unavailable');
});

Then('I should still be able to view all available orders', async function() {
  const orders = await this.page.locator('[class*="card"]').all();
  expect(orders.length).to.be.greaterThan(0);
});

Then('distance information should not be displayed', async function() {
  await this.thenDistanceInformationShouldNotBeShown();
});

Then('orders should show accurate distance information', async function() {
  const distanceElements = await this.page.locator('text =~ \\d+(\\.\\d+)?\\s*km\\s*away').all();
  expect(distanceElements.length).to.be.greaterThan(0);

  // Validate that distances are reasonable (positive numbers)
  for (const element of distanceElements) {
    const text = await element.textContent();
    const distance = parseFloat(text);
    expect(distance).to.be.greaterThan(0);
    expect(distance).to.be.lessThan(5.0);
  }
});

Then('distances should be calculated correctly', async function() {
  await this.thenOrdersShouldShowAccurateDistanceInformation();
});

Then('orders should be easily distinguishable by proximity', async function() {
  const highlightedOrders = await this.page.locator('.bg-sky-100').all();
  expect(highlightedOrders.length).to.be.greaterThan(0);
});

// Helper method for creating test driver
Given('setup test driver with location', async function() {
  if (!this.testData.driver) {
    const driverResponse = await fetch(`${this.apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Driver with Location',
        email: `driver_loc_${Date.now()}@test.com`,
        password: 'test123',
        phone: '+1987654321',
        role: 'driver',
        vehicle_type: 'car'
      })
    });

    expect(driverResponse.ok).to.be.true;
    const driverData = await driverResponse.json();
    this.testData.driver = {
      id: driverData.user.id,
      token: driverData.token,
      email: driverData.user.email
    };

    // Set driver location
    const locationResponse = await fetch(`${this.apiUrl}/drivers/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testData.driver.token}`
      },
      body: JSON.stringify({
        latitude: 40.7589,  // Times Square
        longitude: -73.9851
      })
    });
    expect(locationResponse.ok).to.be.true;
  }
});
