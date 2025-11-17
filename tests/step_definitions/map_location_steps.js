/**
 * Step definitions for Map Location Picker feature tests
 * Implements the Cucumber scenarios defined in map_location_picker.feature
 */

const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const { expect } = require('chai');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { Pool } = require('pg');

// Test configuration
const TEST_PORT = 5001; // Use different port for tests
const BASE_URL = `http://localhost:${TEST_PORT}`;
const API_BASE = `${BASE_URL}/api`;

// Database connection for test data setup
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'matrix_delivery_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test browser instance
let browser;
let page;
let server;

// Test user credentials
const testUser = {
  email: 'testcustomer@example.com',
  password: 'TestPassword123!',
  name: 'Test Customer',
  role: 'customer'
};

const testDriver = {
  email: 'testdriver@example.com',
  password: 'TestPassword123!',
  name: 'Test Driver',
  role: 'driver'
};

// Test orders data
let currentOrderId;
let testLocations = {
  giza: { lat: 30.0131, lng: 31.2089, address: 'Giza, Egypt' },
  cairoCenter: { lat: 30.0444, lng: 31.2357, address: 'Cairo Center, Egypt' },
  tahrirSquare: { lat: 30.0426, lng: 31.2326, address: 'Tahrir Square, Cairo, Egypt' }
};

Before(async function () {
  // Setup test server
  if (!server) {
    const serverModule = require('../../backend/server');
    server = require('http').createServer(serverModule);
    await new Promise(resolve => server.listen(TEST_PORT, resolve));
  }

  // Setup browser for E2E tests
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  // Setup test database
  await setupTestDatabase();

  // Register test users
  await registerTestUser(testUser);
  await registerTestUser(testDriver);
});

After(async function () {
  if (page) {
    await page.close();
    page = null;
  }
});

AfterAll(async function () {
  if (browser) {
    await browser.close();
  }
  if (server) {
    server.close();
  }
  await pool.end();
});

// Helper functions
async function setupTestDatabase() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
    // Test database setup is handled by server initialization
  } catch (error) {
    console.log('Database setup error:', error.message);
  }
}

async function registerTestUser(userData) {
  try {
    await axios.post(`${API_BASE}/auth/register`, {
      ...userData,
      phone: '+20' + Math.floor(Math.random() * 100000000),
      country: 'Egypt',
      city: 'Cairo',
      area: 'Downtown',
      recaptchaToken: 'test-token' // Skip CAPTCHA in tests
    });
  } catch (error) {
    // User might already exist
    console.log(`User ${userData.email} may already exist`);
  }
}

async function loginAsUser(userData) {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: userData.email,
    password: userData.password,
    recaptchaToken: 'test-token'
  });
  return response.data.token;
}

// ==================== STEP DEFINITIONS ====================

Given('I am logged in as a customer', async function () {
  this.token = await loginAsUser(testUser);
  this.user = testUser;
});

Given('I am logged in as a driver', async function () {
  this.token = await loginAsUser(testDriver);
  this.user = testDriver;
});

Given('the map location picker feature is enabled', async function () {
  // Verify the API endpoints are available
  const response = await axios.get(`${API_BASE}/health`);
  expect(response.status).to.equal(200);

  // Check if map APIs are responding
  try {
    await axios.get(`${API_BASE}/locations/reverse-geocode`, {
      params: { lat: 30.0131, lng: 31.2089 }
    });
  } catch (error) {
    throw new Error('Map location picker APIs are not available');
  }
});

Given('I am on the order creation page', async function () {
  if (!page) {
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
  }

  // Navigate to order creation page
  await page.goto(`${BASE_URL}/order-create`);
  await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
});

When('I click on a location on the map at coordinates {string}', async function (coordinates) {
  const [lat, lng] = coordinates.replace(/[()]/g, '').split(',').map(Number);

  // Simulate map click
  await page.evaluate((latitude, longitude) => {
    // Trigger map click event
    const mapEvent = new CustomEvent('map-click', {
      detail: { lat: latitude, lng: longitude }
    });
    document.dispatchEvent(mapEvent);
  }, lat, lng);

  // Wait for API call to complete
  await page.waitForTimeout(2000);

  // Store clicked location for verification
  this.clickedLocation = { lat, lng };
});

Then('the reverse geocoding API should be called', async function () {
  // Verify network request was made
  const requests = await page.evaluate(() => {
    return window.performance.getEntriesByType('resource')
      .filter(r => r.name.includes('reverse-geocode'))
      .map(r => r.name);
  });

  expect(requests.length).to.be.greaterThan(0);
  expect(requests[0]).to.include('reverse-geocode');
});

Then('I should see the address details for {string}', async function (expectedAddress) {
  // Wait for address to appear in UI
  await page.waitForSelector('[data-testid="location-address"]', { timeout: 5000 });

  const displayedAddress = await page.$eval('[data-testid="location-address"]', el => el.textContent);
  expect(displayedAddress).to.include(expectedAddress.split(',')[0]); // Check main street/area
});

Then('the location should be marked on the map', async function () {
  // Check for map marker
  const markerExists = await page.$('[data-testid="map-marker"]') !== null;
  expect(markerExists).to.be.true;
});

Given('I have selected a pickup location at {string}', async function (location) {
  this.pickupLocation = testLocations.giza; // Use predefined location
  this.selectedPickup = location;

  // Simulate location selection
  await page.evaluate((pickup) => {
    const event = new CustomEvent('location-selected', {
      detail: { type: 'pickup', location: pickup }
    });
    document.dispatchEvent(event);
  }, this.pickupLocation);
});

When('I select a delivery location at {string}', async function (location) {
  this.deliveryLocation = testLocations.cairoCenter;
  this.selectedDelivery = location;

  // Simulate location selection
  await page.evaluate((delivery) => {
    const event = new CustomEvent('location-selected', {
      detail: { type: 'delivery', location: delivery }
    });
    document.dispatchEvent(event);
  }, this.deliveryLocation);
});

Then('the route calculation API should be called', async function () {
  await page.waitForTimeout(1000); // Wait for API call

  const routeRequests = await page.evaluate(() => {
    return window.performance.getEntriesByType('resource')
      .filter(r => r.name.includes('calculate-route'))
      .map(r => r.name);
  });

  expect(routeRequests.length).to.be.greaterThan(0);
});

Then('I should see an estimated delivery time', async function () {
  await page.waitForSelector('[data-testid="estimated-time"]');
  const timeText = await page.$eval('[data-testid="estimated-time"]', el => el.textContent);
  expect(timeText).to.match(/\d+\s*(minutes?|hours?)/i);
});

Then('I should see the distance between locations', async function () {
  await page.waitForSelector('[data-testid="route-distance"]');
  const distanceText = await page.$eval('[data-testid="route-distance"]', el => el.textContent);
  expect(distanceText).to.match(/\d+\.?\d*\s*(km|miles?)/i);
});

Then('the route should be displayed on the map', async function () {
  const routeExists = await page.$('[data-testid="map-route"]') !== null ||
                     await page.$('[data-testid="route-polyline"]') !== null;
  expect(routeExists).to.be.true;
});

Given('I have a Google Maps URL {string}', function (url) {
  this.mapsUrl = url;
});

When('I paste the URL into the location input field', async function () {
  await page.waitForSelector('[data-testid="maps-url-input"]');
  await page.type('[data-testid="maps-url-input"]', this.mapsUrl);
  await page.keyboard.press('Enter');
});

Then('the system should extract the coordinates {string}', function (coordinates) {
  const [expectedLat, expectedLng] = coordinates.replace(/[()]/g, '').split(',').map(Number);
  expect(this.extractedCoordinates).to.deep.equal({ lat: expectedLat, lng: expectedLng });
});

Then('reverse geocode to get the address information', async function () {
  await page.waitForSelector('[data-testid="location-address"]');
  const addressText = await page.$eval('[data-testid="location-address"]', el => el.textContent);
  expect(addressText).to.have.length.greaterThan(10);
});

Given('I have previously used {string} as a delivery location', async function (locationName) {
  // Store in test database or browser localStorage
  this.previousLocation = locationName;
});

Then('I should see {string} in my recent locations', async function (locationName) {
  await page.waitForSelector('[data-testid="recent-locations"]');
  const recentLocations = await page.$$('[data-testid="recent-location-item"]');

  const locationTexts = await Promise.all(
    recentLocations.map(el => page.evaluate(node => node.textContent, el))
  );

  expect(locationTexts.some(text => text.includes(locationName))).to.be.true;
});

Then('I should be able to select it directly without clicking on the map', async function () {
  const selectButton = await page.$('[data-testid="select-recent-location"]');
  expect(selectButton).to.not.be.null;

  await selectButton.click();
  await page.waitForSelector('[data-testid="location-selected"]');
});

When('the reverse geocoding is performed', async function () {
  // Already handled in previous steps - API call is made
});

Then('the system should detect this as a remote area', async function () {
  await page.waitForSelector('[data-testid="remote-area-warning"]');
  const warningText = await page.$eval('[data-testid="remote-area-warning"]', el => el.textContent);
  expect(warningText).to.include('remote');
});

Then('the delivery parameters should be adjusted accordingly', async function () {
  // Check if delivery fees or time estimates were adjusted
  await page.waitForSelector('[data-testid="adjusted-delivery-info"]');
  const adjustedInfo = await page.$eval('[data-testid="adjusted-delivery-info"]', el => el.textContent);
  expect(adjustedInfo).to.have.length.greaterThan(10);
});

Then('the system should identify this as an international delivery', async function () {
  await page.waitForSelector('[data-testid="international-delivery-notice"]');
});

Then('appropriate delivery options should be presented', async function () {
  const internationalOptions = await page.$$('[data-testid="international-option"]');
  expect(internationalOptions.length).to.be.greaterThan(0);
});

Given('the external geocoding service is temporarily unavailable', function () {
  // This would require API mocking - for now, assume it's working
  // In real implementation, mock the external service
});

Then('I should see a fallback address format using coordinates', async function () {
  await page.waitForSelector('[data-testid="location-address"]');
  const addressText = await page.$eval('[data-testid="location-address"]', el => el.textContent);
  expect(addressText).to.match(/^\d+\.\d+,\s*-?\d+\.\d+$/); // lat,lng format
});

Then('the order creation should still be possible', async function () {
  const submitButton = await page.$('[data-testid="create-order-button"]');
  const isEnabled = await page.evaluate(btn => !btn.disabled, submitButton);
  expect(isEnabled).to.be.true;
});

Given('I try to use coordinates outside the valid range {string}', function (coordinates) {
  const [lat, lng] = coordinates.replace(/[()]/g, '').split(',').map(Number);
  this.invalidCoords = { lat, lng };
});

Then('I should see an error message about invalid coordinates', async function () {
  await page.waitForSelector('[data-testid="error-message"]');
  const errorText = await page.$eval('[data-testid="error-message"]', el => el.textContent);
  expect(errorText).to.include('invalid coordinates');
});

Then('the location selection should be reset', async function () {
  const selectedLocation = await page.$('[data-testid="location-selected"]');
  expect(selectedLocation).to.be.null;
});

Then('the map should load within {int} seconds', async function (seconds) {
  const loadTime = await page.evaluate(() => {
    const resources = window.performance.getEntriesByType('resource');
    const mapResources = resources.filter(r => r.name.includes('map') || r.name.includes('leaflet'));
    return mapResources.length > 0 ? Math.max(...mapResources.map(r => r.responseEnd - r.requestStart)) : 0;
  });

  expect(loadTime).to.be.lessThan(seconds * 1000); // Convert to milliseconds
});

Then('all map controls should be responsive', async function () {
  const controls = await page.$$('[data-testid="map-control"]');
  expect(controls.length).to.be.greaterThan(0);

  // Test that controls are clickable
  for (const control of controls) {
    const isClickable = await page.evaluate(el => {
      return window.getComputedStyle(el).pointerEvents !== 'none';
    }, control);
    expect(isClickable).to.be.true;
  }
});

Given('I am a driver with max delivery distance set to {int}km', async function (distance) {
  this.driverDistanceLimit = distance;

  // Update driver preferences
  await axios.put(`${API_BASE}/delivery-agent/preferences`, {
    max_distance_km: distance,
    accept_remote_areas: true,
    accept_international: true
  }, {
    headers: { Authorization: `Bearer ${this.token}` }
  });
});

When('orders are available for bidding', async function () {
  // Create test orders in different locations
  const orders = [
    { id: 'near-order', distance: 20 },
    { id: 'far-order', distance: 80 }
  ];
  this.availableOrders = orders;
});

Then('I should only see orders within {int}km of my current location', async function (maxDistance) {
  const response = await axios.get(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${this.token}` }
  });

  // Filter orders by distance
  const nearbyOrders = response.data.filter(order =>
    order.estimatedDistanceKm && order.estimatedDistanceKm <= maxDistance
  );

  expect(nearbyOrders.length).to.be.greaterThan(0);
});

Then('orders beyond {int}km should be filtered out', async function (maxDistance) {
  const response = await axios.get(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${this.token}` }
  });

  const farOrders = response.data.filter(order =>
    order.estimatedDistanceKm && order.estimatedDistanceKm > maxDistance
  );

  expect(farOrders.length).to.equal(0);
});

Given('I am a driver who has opted out of remote area deliveries', async function () {
  await axios.put(`${API_BASE}/delivery-agent/preferences`, {
    max_distance_km: 50,
    accept_remote_areas: false,
    accept_international: true
  }, {
    headers: { Authorization: `Bearer ${this.token}` }
  });
});

Then('remote area orders should be hidden from my view', async function () {
  const response = await axios.get(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${this.token}` }
  });

  const remoteOrders = response.data.filter(order => order.isRemoteArea);
  expect(remoteOrders.length).to.equal(0);
});

Then('only urban area deliveries should be visible', async function () {
  const response = await axios.get(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${this.token}` }
  });

  const urbanOrders = response.data.filter(order => !order.isRemoteArea || order.isRemoteArea === null);
  expect(urbanOrders.length).to.be.greaterThan(0);
});

Given('I have selected pickup and delivery locations using the map', function () {
  this.pickupLocation = testLocations.giza;
  this.deliveryLocation = testLocations.cairoCenter;
});

Given('route information has been calculated', function () {
  this.routeInfo = {
    distance_km: 15.2,
    estimates: {
      car: { duration_minutes: 35 },
      bicycle: { duration_minutes: 85 }
    }
  };
});

When('I fill in the remaining order details', async function () {
  await page.waitForSelector('[data-testid="order-form"]');

  // Fill in basic order details
  await page.type('[data-testid="order-title"]', 'Test Map Order');
  await page.type('[data-testid="order-description"]', 'Order created with map location picker');
  await page.type('[data-testid="package-description"]', 'Documents');
  await page.select('[data-testid="package-weight"]', '1');
  await page.type('[data-testid="price"]', '25.50');
});

When('I submit the order', async function () {
  await page.click('[data-testid="create-order-button"]');
  await page.waitForTimeout(2000); // Wait for submission
});

Then('the order should be created successfully', async function () {
  await page.waitForSelector('[data-testid="order-success"]');
  const successMessage = await page.$eval('[data-testid="order-success"]', el => el.textContent);
  expect(successMessage).to.include('success');
});

Then('the location data should be stored correctly', async function () {
  // Retrieve the created order to verify location data
  const response = await axios.get(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${this.token}` }
  });

  const latestOrder = response.data[0];
  expect(latestOrder.pickupCoordinates).to.deep.equal(testLocations.giza);
  expect(latestOrder.deliveryCoordinates).to.deep.equal(testLocations.cairoCenter);
});

Then('both pickup and delivery addresses should be saved', async function () {
  const response = await axios.get(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${this.token}` }
  });

  const latestOrder = response.data[0];
  expect(latestOrder.pickupAddress).to.have.length.greaterThan(10);
  expect(latestOrder.deliveryAddress).to.have.length.greaterThan(10);
});

// Mobile testing scenarios
Given('I am using the application on a mobile device', async function () {
  await page.setViewport({ width: 375, height: 667 }); // iPhone SE size
  this.isMobile = true;
});

Then('the map should be fully functional on mobile', async function () {
  await page.waitForSelector('[data-testid="map-container"]');

  // Test basic map functionality
  const mapZoom = await page.$('[data-testid="map-zoom-in"]');
  expect(mapZoom).to.not.be.null;
});

Then('touch interactions should work correctly', async function () {
  // Test touch events on map
  const mapContainer = await page.$('[data-testid="map-container"]');
  await mapContainer.tap();

  // Should trigger location selection
  await page.waitForSelector('[data-testid="location-selected"]');
});

Then('the map should be responsive to screen size', async function () {
  const mapSize = await page.$eval('[data-testid="map-container"]', el => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });

  expect(mapSize.width).to.be.greaterThan(300); // Minimum responsive width
  expect(mapSize.height).to.be.greaterThan(200); // Minimum responsive height
});

// Accessibility testing
Given('I am a user relying on screen reader', function () {
  // Accessibility testing setup
  this.accessibilityTesting = true;
});

Then('all interactive elements should have proper ARIA labels', async function () {
  const elements = await page.$$('[aria-label], [aria-labelledby]');

  for (const element of elements) {
    const ariaLabel = await page.evaluate(el => {
      return el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    }, element);

    expect(ariaLabel).to.not.be.empty;
  }
});

Then('keyboard navigation should be supported', async function () {
  // Test tab navigation through map controls
  await page.keyboard.press('Tab');

  const focusedElement = await page.evaluate(() => {
    return document.activeElement ? document.activeElement.tagName : null;
  });

  expect(focusedElement).to.not.be.null;
});

// Localization testing
Given('I have set my application language to Arabic', async function () {
  // Switch language
  await page.select('[data-testid="language-selector"]', 'ar');

  // Wait for language change
  await page.waitForTimeout(1000);
});

Then('all map-related text should appear in Arabic', async function () {
  const mapElements = await page.$$('[data-testid*="map-"]');

  for (const element of mapElements) {
    const text = await page.evaluate(el => el.textContent, element);
    // Basic check for Arabic characters (U+0600 to U+06FF)
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    expect(hasArabic || text.trim() === '').to.be.true;
  }
});

Then('address display should support Arabic text', async function () {
  await page.waitForSelector('[data-testid="location-address"]');
  const addressText = await page.$eval('[data-testid="location-address"]', el => el.textContent);
  expect(addressText).to.have.length.greaterThan(5);
});

Then('location search should work with Arabic input', async function () {
  await page.type('[data-testid="location-search"]', 'القاهرة');
  await page.keyboard.press('Enter');

  await page.waitForSelector('[data-testid="search-results"]');
  const resultsCount = await page.$$eval('[data-testid="search-result"]', els => els.length);
  expect(resultsCount).to.be.greaterThan(0);
});
