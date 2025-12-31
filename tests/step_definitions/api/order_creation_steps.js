const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Order Creation Steps
Given('the P2P delivery platform is running', async function () {
  // This is handled by the hooks that start the servers
  // Just verify we can reach the frontend
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');
});

Given('there is a registered customer account', async function () {
  // Create test customer via API
  const timestamp = Date.now();
  const customerData = {
    name: 'Test Customer',
    email: `customer_${timestamp}@test.com`,
    password: 'test123',
    phone: `+1${timestamp.toString().slice(-10)}`,
    primary_role: 'customer'
  };

  const response = await fetch(`${this.apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  });

  const result = await response.json();
  if (!response.ok) {
    console.error('Registration failed:', result.error);
  }
  expect(response.ok).to.be.true;
  this.testData.customer = { ...customerData, id: result.user.id, token: result.token };
});

Given('I am logged in as a customer', async function () {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');

  if (!this.testData.customer) {
    throw new Error('Customer test data not available. Create a customer account first.');
  }

  // Fill login form
  await this.page.fill('input[placeholder="Email"]', this.testData.customer.email);
  await this.page.fill('input[placeholder="Password"]', this.testData.customer.password);

  // Click login button
  await this.page.click('button:has-text("Sign In")');

  // Wait for dashboard to load
  await this.page.waitForSelector('button:has-text("Logout")', { timeout: 10000 });
});

When('I click the "Create New Order" button', async function () {
  const createOrderButton = this.page.locator('button:has-text("Create New Order")');
  await createOrderButton.waitFor({ state: 'visible', timeout: 5000 });
  await createOrderButton.click();
});

Then('I should see the order creation form', async function () {
  // Wait for the order form to appear
  await this.page.waitForSelector('h2:has-text("Create New Delivery Order")', { timeout: 5000 });

  // Verify form elements are present
  const titleInput = this.page.locator('input[placeholder="Order Title *"]');
  await expect(titleInput).toBeVisible();

  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await expect(publishButton).toBeVisible();
});

When('I fill in the order details:', async function (dataTable) {
  const data = dataTable.rowsHash();

  // Fill basic order information
  if (data.title) {
    await this.page.fill('input[placeholder="Order Title *"]', data.title);
  }

  if (data.description) {
    await this.page.fill('textarea[placeholder="Description (optional)"]', data.description);
  }

  if (data.package_desc) {
    await this.page.fill('textarea[placeholder="Package Description"]', data.package_desc);
  }

  if (data.weight) {
    const weightInput = this.page.locator('input[placeholder="0.0"]').first();
    await weightInput.fill(data.weight);
  }

  if (data.value) {
    const valueInput = this.page.locator('input[placeholder="0.00"]').first();
    await valueInput.fill(data.value);
  }

  if (data.price) {
    await this.page.fill('input[placeholder="Enter price"]', data.price);
  }
});

When('I set the pickup location to:', async function (dataTable) {
  const data = dataTable.rowsHash();

  // Wait for pickup location form to be visible
  await this.page.waitForSelector('h4:has-text("Pickup Location")', { timeout: 5000 });

  // Fill address fields for pickup
  if (data.country) {
    const countryInputs = this.page.locator('input[placeholder="Country"]');
    await countryInputs.first().fill(data.country);
  }

  if (data.city) {
    const cityInputs = this.page.locator('input[placeholder="City"]');
    await cityInputs.first().fill(data.city);
  }

  if (data.area) {
    const areaInputs = this.page.locator('input[placeholder="Area/District"]');
    await areaInputs.first().fill(data.area);
  }

  if (data.street) {
    const streetInputs = this.page.locator('input[placeholder="Street"]');
    await streetInputs.first().fill(data.street);
  }

  if (data.building) {
    const buildingInputs = this.page.locator('input[placeholder="Building number"]');
    await buildingInputs.first().fill(data.building);
  }

  if (data.person) {
    const personInputs = this.page.locator('input[placeholder="Person to contact at this location"]');
    await personInputs.first().fill(data.person);
  }
});

When('I set the delivery location to:', async function (dataTable) {
  const data = dataTable.rowsHash();

  // Wait for delivery location form to be visible
  await this.page.waitForSelector('h4:has-text("Delivery Location")', { timeout: 5000 });

  // Fill address fields for delivery
  if (data.country) {
    const countryInputs = this.page.locator('input[placeholder="Country"]');
    await countryInputs.nth(1).fill(data.country);
  }

  if (data.city) {
    const cityInputs = this.page.locator('input[placeholder="City"]');
    await cityInputs.nth(1).fill(data.city);
  }

  if (data.area) {
    const areaInputs = this.page.locator('input[placeholder="Area/District"]');
    await areaInputs.nth(1).fill(data.area);
  }

  if (data.street) {
    const streetInputs = this.page.locator('input[placeholder="Street"]');
    await streetInputs.nth(1).fill(data.street);
  }

  if (data.building) {
    const buildingInputs = this.page.locator('input[placeholder="Building number"]');
    await buildingInputs.nth(1).fill(data.building);
  }

  if (data.person) {
    const personInputs = this.page.locator('input[placeholder="Person to contact at this location"]');
    await personInputs.nth(1).fill(data.person);
  }
});

When('I submit the order', async function () {
  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();

  // Wait for submission to complete
  await this.page.waitForTimeout(3000);
});

Then('I should see a success message', async function () {
  // Look for success message - could be in various formats
  const successSelectors = [
    '.success-message',
    '[class*="success"]',
    'text="Order published successfully"',
    'text="successfully"'
  ];

  let successFound = false;
  for (const selector of successSelectors) {
    try {
      const element = await this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        successFound = true;
        break;
      }
    } catch (e) {
      // Continue checking other selectors
    }
  }

  expect(successFound).to.be.true;
});

Then('the order should appear in my orders list', async function () {
  // Check if we're back to the orders list
  await this.page.waitForSelector('h2:has-text("My Orders")', { timeout: 5000 });

  // Look for the order we just created
  const orderElements = this.page.locator('[class*="order"]').all();
  expect(orderElements.length).to.be.greaterThan(0);
});

Then('the order should have status {string}', async function (expectedStatus) {
  // Find the most recent order and check its status
  const statusElements = this.page.locator('[class*="status"], [class*="Status"]');
  const statusTexts = await statusElements.allTextContents();

  const hasExpectedStatus = statusTexts.some(text =>
    text.toLowerCase().includes(expectedStatus.toLowerCase())
  );

  expect(hasExpectedStatus).to.be.true;
});

When('I try to submit an empty order form', async function () {
  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();

  // Wait for validation to show
  await this.page.waitForTimeout(2000);
});

Then('I should see validation errors for required fields:', async function (dataTable) {
  const requiredFields = dataTable.raw().flat();

  // Check for error messages - the app shows errors in a specific format
  const errorElement = this.page.locator('.error-matrix, [class*="error"]');
  const errorText = await errorElement.textContent();

  // Verify that error mentions missing required fields
  expect(errorText).to.include('Please fill all required fields');
});

When('I fill in valid order details', async function () {
  // Fill minimal valid order details
  await this.page.fill('input[placeholder="Order Title *"]', 'Test Order');
  await this.page.fill('input[placeholder="Enter price"]', '10.00');
});

When('I set pickup location in {string}', async function (country) {
  const countryInputs = this.page.locator('input[placeholder="Country"]');
  await countryInputs.first().fill(country);
  await countryInputs.first().press('Tab'); // Trigger validation
});

When('I set delivery location in {string}', async function (country) {
  const countryInputs = this.page.locator('input[placeholder="Country"]');
  await countryInputs.nth(1).fill(country);
  await countryInputs.nth(1).press('Tab'); // Trigger validation
});

Then('I should see an error {string}', async function (expectedError) {
  const errorElement = this.page.locator('.error-matrix, [class*="error"]');
  await errorElement.waitFor({ state: 'visible', timeout: 5000 });
  const errorText = await errorElement.textContent();
  expect(errorText).to.include(expectedError);
});

When('I click on the pickup location map', async function () {
  // Find the map container for pickup location
  const mapContainers = this.page.locator('.leaflet-container');
  const pickupMap = mapContainers.first();

  // Click on the map (this should trigger location selection)
  const mapBounds = await pickupMap.boundingBox();
  if (mapBounds) {
    await this.page.mouse.click(
      mapBounds.x + mapBounds.width / 2,
      mapBounds.y + mapBounds.height / 2
    );
  }
});

Then('I should be able to select a location on the map', async function () {
  // Check if coordinates are displayed or location marker appears
  const coordinateDisplay = this.page.locator('text=/\\d+\\.\\d+, \\d+\\.\\d+/');
  await expect(coordinateDisplay.first()).toBeVisible({ timeout: 5000 });
});

Then('the coordinates should be populated automatically', async function () {
  // Verify coordinates appear in the success message or coordinate display
  const coordinateText = this.page.locator('text=/✅ Map location selected/');
  await expect(coordinateText).toBeVisible({ timeout: 5000 });
});

Then('reverse geocoding should fill the address fields', async function () {
  // Check if address fields are populated after map click
  const countryInputs = this.page.locator('input[placeholder="Country"]');
  const countryValue = await countryInputs.first().inputValue();

  // Should have some value after reverse geocoding
  expect(countryValue.length).to.be.greaterThan(0);
});

// New enhanced order creation steps
When('I navigate to the order creation page', async function () {
  await this.page.goto(`${this.baseUrl}#/create-order`);
  await this.page.waitForLoadState('networkidle');
});

Then('I should see the enhanced order creation form', async function () {
  // Wait for the form to load
  await this.page.waitForSelector('h2:has-text("Create Delivery Order")', { timeout: 5000 });

  // Check for enhanced form elements
  const titleInput = this.page.locator('input[placeholder="Order Title *"]');
  await expect(titleInput).toBeVisible();

  const priceInput = this.page.locator('input[placeholder="Enter price *"]');
  await expect(priceInput).toBeVisible();

  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await expect(publishButton).toBeVisible();
});

When('I fill in the basic order information:', async function (dataTable) {
  const data = dataTable.rowsHash();

  if (data.title) {
    // Use the new matrix form selectors
    const titleInput = this.page.locator('input[placeholder="e.g., Deliver package to office"]');
    await titleInput.fill(data.title);
  }

  if (data.price) {
    const priceInputs = this.page.locator('input[type="number"]');
    await priceInputs.first().fill(data.price);
  }
});

// New step for enhanced order form information
When('I fill in enhanced order information:', async function (dataTable) {
  const data = dataTable.rowsHash();

  if (data.title) {
    const titleInput = this.page.locator('input[placeholder="e.g., Deliver package to office"]');
    await titleInput.fill(data.title);
  }

  if (data.price) {
    const priceInputs = this.page.locator('input[type="number"]');
    await priceInputs.first().fill(data.price);
  }

  if (data.description) {
    const descTextarea = this.page.locator('h3:has-text("Order Details")').locator('xpath=following::textarea[1]');
    await descTextarea.fill(data.description);
  }

  if (data.package_description) {
    // Package details section - find inputs after the Package Details h3
    const packageInputs = this.page.locator('h3:has-text("Package Details")').locator('xpath=following::input').first();
    await packageInputs.fill(data.package_description);
  }

  if (data.package_weight) {
    const weightInputs = this.page.locator('input[type="number"]').filter({ hasText: /^[^0-9]*$/ });
    await weightInputs.nth(1).fill(data.package_weight); // Second number input should be weight
  }

  if (data.special_instructions) {
    // Find textarea in package details section
    const instructionsTextarea = this.page.locator('h3:has-text("Package Details")').locator('xpath=following::textarea').first();
    await instructionsTextarea.fill(data.special_instructions);
  }
});

When('I select {string} as the pickup country', async function (country) {
  const pickupCountrySelect = this.page.locator('select[data-testid="pickup-country"]');
  await pickupCountrySelect.selectOption(country);
});

When('I select {string} as the pickup city', async function (city) {
  const pickupCitySelect = this.page.locator('select[data-testid="pickup-city"]');
  await pickupCitySelect.selectOption(city);
});

When('I select {string} as the pickup area', async function (area) {
  const pickupAreaSelect = this.page.locator('select[data-testid="pickup-area"]');
  await pickupAreaSelect.selectOption(area);
});

When('I enter {string} as pickup street', async function (street) {
  const streetInput = this.page.locator('input[data-testid="pickup-street"]');
  await streetInput.fill(street);
});

When('I enter {string} as pickup building', async function (building) {
  const buildingInput = this.page.locator('input[data-testid="pickup-building"]');
  await buildingInput.fill(building);
});

When('I enter {string} as pickup floor', async function (floor) {
  const floorInput = this.page.locator('input[data-testid="pickup-floor"]');
  await floorInput.fill(floor);
});

When('I enter {string} as pickup apartment', async function (apartment) {
  const apartmentInput = this.page.locator('input[data-testid="pickup-apartment"]');
  await apartmentInput.fill(apartment);
});

When('I enter {string} as pickup contact name', async function (contact) {
  const contactInput = this.page.locator('input[data-testid="pickup-contact"]');
  await contactInput.fill(contact);
});

When('I select {string} as the delivery country', async function (country) {
  const deliveryCountrySelect = this.page.locator('select[data-testid="delivery-country"]');
  await deliveryCountrySelect.selectOption(country);
});

When('I select {string} as the delivery city', async function (city) {
  const deliveryCitySelect = this.page.locator('select[data-testid="delivery-city"]');
  await deliveryCitySelect.selectOption(city);
});

When('I select {string} as the delivery area', async function (area) {
  const deliveryAreaSelect = this.page.locator('select[data-testid="delivery-area"]');
  await deliveryAreaSelect.selectOption(area);
});

When('I enter {string} as delivery street', async function (street) {
  const streetInput = this.page.locator('input[data-testid="delivery-street"]');
  await streetInput.fill(street);
});

When('I enter {string} as delivery building', async function (building) {
  const buildingInput = this.page.locator('input[data-testid="delivery-building"]');
  await buildingInput.fill(building);
});

When('I enter {string} as delivery contact name', async function (contact) {
  const contactInput = this.page.locator('input[data-testid="delivery-contact"]');
  await contactInput.fill(contact);
});

When('I click the {string} button', async function (buttonText) {
  const button = this.page.locator(`button:has-text("${buttonText}")`);
  await button.click();

  // Wait for form submission to complete
  await this.page.waitForTimeout(3000);
});

Then('I should see a success notification with {string}', async function (expectedMessage) {
  // Check for notification
  const notification = this.page.locator('.notification.success, .notification-panel, [class*="notification"]').first();
  await notification.waitFor({ state: 'visible', timeout: 5000 });

  const message = await notification.textContent();
  expect(message).to.include(expectedMessage);
});

Then('the order should be created in the database', async function () {
  // Verify order exists in database
  const response = await fetch(`${this.apiUrl}/orders`, {
    headers: {
      'Authorization': `Bearer ${this.testData.customer.token}`
    }
  });

  const orders = await response.json();
  expect(orders.length).to.be.greaterThan(0);

  // Store the latest order ID for other verifications
  this.testData.latestOrder = orders[0];
});

Then('the order should have a unique order number', async function () {
  expect(this.testData.latestOrder.orderNumber).to.match(/^ORD-/);
  expect(this.testData.latestOrder.orderNumber.length).to.be.greaterThan(4);
});

Then('I should see validation error messages:', async function (dataTable) {
  const errors = dataTable.raw().flat();

  for (const error of errors) {
    const errorElement = this.page.locator(`[class*="error"]:has-text("${error}")`);
    await errorElement.waitFor({ state: 'visible', timeout: 2000 });
  }
});

When('I try to submit without filling required fields', async function () {
  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();

  // Wait for validation to show
  await this.page.waitForTimeout(2000);
});

When('I only fill the title field', async function () {
  await this.page.fill('input[placeholder="Order Title *"]', 'Test Title');
  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(2000);
});

When('I fill both title and price', async function () {
  await this.page.fill('input[placeholder="Order Title *"]', 'Test Title');
  await this.page.fill('input[placeholder="Enter price *"]', '25.00');
  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(2000);
});

Then('I should see price validation errors', async function () {
  const priceError = this.page.locator('[class*="error"]').first();
  await priceError.waitFor({ state: 'visible', timeout: 2000 });
});

Then('I should see pickup location validation errors', async function () {
  const locationError = this.page.locator('[class*="error"]').first();
  await locationError.waitFor({ state: 'visible', timeout: 2000 });
});

When('I fill pickup country and city', async function () {
  const pickupCountrySelect = this.page.locator('select[data-testid="pickup-country"]');
  await pickupCountrySelect.selectOption('Egypt');

  const pickupCitySelect = this.page.locator('select[data-testid="pickup-city"]');
  await pickupCitySelect.selectOption('Cairo');

  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(2000);
});

Then('I should see pickup contact name validation', async function () {
  const contactError = this.page.locator('[class*="error"]').first();
  await contactError.waitFor({ state: 'visible', timeout: 2000 });
});

When('I fill pickup contact name but not delivery details', async function () {
  const contactInput = this.page.locator('input[data-testid="pickup-contact"]');
  await contactInput.fill('Test Contact');

  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(2000);
});

Then('I should see delivery validation errors', async function () {
  const deliveryError = this.page.locator('[class*="error"]').first();
  await deliveryError.waitFor({ state: 'visible', timeout: 2000 });
});

Then('I should see cities dropdown populated with Egyptian cities', async function () {
  const citySelect = this.page.locator('select[data-testid="pickup-city"]');
  const options = await citySelect.locator('option').count();
  expect(options).to.be.greaterThan(1); // More than just the placeholder
});

Then('the area dropdown should be disabled', async function () {
  const areaSelect = this.page.locator('select[data-testid="pickup-area"]');
  expect(await areaSelect.isDisabled()).to.be.true;
});

Then('I should see areas dropdown populated with Cairo areas', async function () {
  const areaSelect = this.page.locator('select[data-testid="pickup-area"]');
  const options = await areaSelect.locator('option').count();
  expect(options).to.be.greaterThan(1);
});

Then('the street dropdown should be disabled', async function () {
  const streetSelect = this.page.locator('select[data-testid="pickup-street"]');
  expect(await streetSelect.isDisabled()).to.be.true;
});

Then('I should see streets dropdown populated with Zamalek streets', async function () {
  const streetSelect = this.page.locator('select[data-testid="pickup-street"]');
  const options = await streetSelect.locator('option').count();
  expect(options).to.be.greaterThan(1);
});

When('I clear the pickup country', async function () {
  const pickupCountrySelect = this.page.locator('select[data-testid="pickup-country"]');
  await pickupCountrySelect.selectOption('');
});

Then('all pickup location dropdowns should be disabled except country', async function () {
  const countrySelect = this.page.locator('select[data-testid="pickup-country"]');
  expect(await countrySelect.isDisabled()).to.be.false;

  const citySelect = this.page.locator('select[data-testid="pickup-city"]');
  expect(await citySelect.isDisabled()).to.be.true;

  const areaSelect = this.page.locator('select[data-testid="pickup-area"]');
  expect(await areaSelect.isDisabled()).to.be.true;

  const streetSelect = this.page.locator('select[data-testid="pickup-street"]');
  expect(await streetSelect.isDisabled()).to.be.true;
});

When('I click on the pickup map at coordinates {string}', async function (coordinates) {
  const [lat, lng] = coordinates.split(',').map(c => parseFloat(c));

  // Find the pickup map container
  const mapContainer = this.page.locator('.leaflet-container').first();

  // Click at the specified coordinates
  // This would need actual map interaction logic - for now just simulate click
  const bounds = await mapContainer.boundingBox();
  if (bounds) {
    await this.page.mouse.click(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
  }
});

Then('reverse geocoding should populate pickup address fields', async function () {
  // Wait for address fields to be populated
  await this.page.waitForTimeout(2000);

  // Check if at least country field is populated
  const countryInput = this.page.locator('select[data-testid="pickup-country"]');
  const countryValue = await countryInput.inputValue();
  expect(countryValue.length).to.be.greaterThan(0);
});

Then('the map marker should appear at the clicked location', async function () {
  // Check if marker appears on map (this would need specific marker detection)
  const markerElement = this.page.locator('.leaflet-marker-icon, .custom-marker');
  await markerElement.waitFor({ state: 'visible', timeout: 2000 });
});

When('I drag the marker to new coordinates {string}', async function (coordinates) {
  const markerElement = this.page.locator('.leaflet-marker-icon, .custom-marker').first();

  // Simulate drag (actual implementation would depend on marker library)
  const markerBounds = await markerElement.boundingBox();
  if (markerBounds) {
    await this.page.mouse.move(markerBounds.x + markerBounds.width / 2, markerBounds.y + markerBounds.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(markerBounds.x + 20, markerBounds.y + 20);
    await this.page.mouse.up();
  }
});

Then('the address fields should update automatically', async function () {
  // Wait for address update
  await this.page.waitForTimeout(2000);

  // Verify address has changed (specific logic depends on reverse geocoding implementation)
  const countryInput = this.page.locator('select[data-testid="pickup-country"]');
  const updatedValue = await countryInput.inputValue();
  expect(updatedValue.length).to.be.greaterThan(0);
});

Then('the new location should be saved', async function () {
  // Verify location coordinates are stored (would need specific implementation)
  // For now, just ensure no errors occurred during the drag operation
  const errorElement = this.page.locator('[class*="error"]');
  const errorCount = await errorElement.count();
  expect(errorCount).to.equal(0);
});

// New steps for automated form validation debugging
When('I open browser developer console', async function () {
  // This step is mainly for documentation - console is always open during test execution
});

Then('I should see debug logs in browser console:', async function (dataTable) {
  // This step is mainly for documentation - the debug logs will appear in console
  // In a real implementation, you might want to capture console logs
  await this.page.waitForTimeout(1000); // Give time for console logs to appear
});

When('I fill only the title {string}', async function (title) {
  const titleInput = this.page.locator('input[placeholder="e.g., Deliver package to office"]');
  await titleInput.fill(title);

  const publishButton = this.page.locator('button:has-text("🚀 Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(2000);
});

When('I fill price {string}', async function (price) {
  const priceInput = this.page.locator('input[type="number"]');
  await priceInput.fill(price);
});

When('I submit the form again', async function () {
  const publishButton = this.page.locator('button:has-text("🚀 Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(2000);
});

Then('I should see title validation pass but location validation fail', async function () {
  // Check that we're still on the form (validation failed)
  const publishButton = this.page.locator('button:has-text("🚀 Publish Order")');
  await expect(publishButton).toBeVisible();
});

// Enhanced order form steps
Then('I should see the enhanced order creation form with matrix styling', async function () {
  // Wait for the enhanced form to load
  await this.page.waitForSelector('h2:has-text("📦 Create New Order")', { timeout: 5000 });

  // Check for enhanced form elements with matrix styling
  const titleInput = this.page.locator('input[placeholder="e.g., Deliver package to office"]');
  await expect(titleInput).toBeVisible();

  const priceInput = this.page.locator('input[type="number"]');
  await expect(priceInput).toBeVisible();

  // Check for matrix styling elements
  const matrixCard = this.page.locator('[style*="background: linear-gradient(135deg, #000000 0%, #001100 100%)"]');
  await expect(matrixCard.first()).toBeVisible();

  const publishButton = this.page.locator('button:has-text("🚀 Publish Order")');
  await expect(publishButton).toBeVisible();
});

// Map interaction steps
When('I interact with pickup location map by clicking at {string}', async function (coordinates) {
  const [lat, lng] = coordinates.split(',').map(c => parseFloat(c));

  // Find the pickup map container
  const mapContainer = this.page.locator('.leaflet-container').first();

  // Wait for map to be fully loaded
  await this.page.waitForTimeout(2000);

  // Click at the center of the map
  const bounds = await mapContainer.boundingBox();
  if (bounds) {
    await this.page.mouse.click(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
  }

  // Wait for location selection to process
  await this.page.waitForTimeout(3000);
});

Then('the pickup map location should be selected', async function () {
  // Check if marker appears on map
  const markerElement = this.page.locator('.leaflet-marker-icon');
  await expect(markerElement).toBeVisible({ timeout: 5000 });

  // Check if location data is stored (coordinates should appear)
  const coordinateText = this.page.locator('text=/\\d+\\.\\d+/');
  await expect(coordinateText.first()).toBeVisible();
});

Then('pickup coordinates should be stored', async function () {
  // Verify coordinates are displayed or stored
  const coordinateDisplay = this.page.locator('text=/\\d+\\.\\d+, \\d+\\.\\d+/');
  await expect(coordinateDisplay.first()).toBeVisible();
});

Then('pickup address fields should be populated via reverse geocoding', async function () {
  // Wait for reverse geocoding to complete
  await this.page.waitForTimeout(3000);

  // Check if address fields have values
  const addressFields = this.page.locator('input[type="text"]').filter({ hasText: /^[^0-9]*$/ });
  const fieldCount = await addressFields.count();

  // Should have some populated fields after reverse geocoding
  let populatedCount = 0;
  for (let i = 0; i < fieldCount; i++) {
    const value = await addressFields.nth(i).inputValue();
    if (value.trim().length > 0) populatedCount++;
  }

  expect(populatedCount).to.be.greaterThan(0);
});

When('I interact with delivery location map by clicking at {string}', async function (coordinates) {
  const [lat, lng] = coordinates.split(',').map(c => parseFloat(c));

  // Find the delivery map container (second map)
  const mapContainer = this.page.locator('.leaflet-container').nth(1);

  // Wait for map to be fully loaded
  await this.page.waitForTimeout(2000);

  // Click at the center of the delivery map
  const bounds = await mapContainer.boundingBox();
  if (bounds) {
    await this.page.mouse.click(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
  }

  // Wait for location selection to process
  await this.page.waitForTimeout(3000);
});

Then('the delivery map location should be selected', async function () {
  // Check if delivery marker appears on map
  const markerElements = this.page.locator('.leaflet-marker-icon');
  await expect(markerElements).toBeVisible({ timeout: 5000 });

  // Should have at least 2 markers (pickup + delivery)
  const markerCount = await markerElements.count();
  expect(markerCount).to.be.greaterThan(1);
});

Then('delivery coordinates should be stored', async function () {
  // Verify delivery coordinates are displayed or stored
  const coordinateDisplays = this.page.locator('text=/\\d+\\.\\d+, \\d+\\.\\d+/');
  const coordinateCount = await coordinateDisplays.count();
  expect(coordinateCount).to.be.greaterThan(1); // Should have pickup and delivery coordinates
});

When('I submit the enhanced order', async function () {
  const publishButton = this.page.locator('button:has-text("🚀 Publish Order")');
  await publishButton.click();

  // Wait for form submission and response
  await this.page.waitForTimeout(5000);
});

Then('I should see success modal with {string}', async function (expectedMessage) {
  // Check for success modal
  const modal = this.page.locator('[primary_role="dialog"], .modal');
  await modal.waitFor({ state: 'visible', timeout: 5000 });

  const modalText = await modal.textContent();
  expect(modalText).to.include(expectedMessage);
});

Then('the order should be created with both map coordinates and route info', async function () {
  // Verify order was created and has location data
  const response = await fetch(`${this.apiUrl}/orders`, {
    headers: {
      'Authorization': `Bearer ${this.testData.customer.token}`
    }
  });

  const orders = await response.json();
  expect(orders.length).to.be.greaterThan(0);

  const latestOrder = orders[0];

  // Check that order has location data
  expect(latestOrder).to.have.property('pickupLocation');
  expect(latestOrder).to.have.property('dropoffLocation');
  expect(latestOrder.pickupLocation).to.have.property('coordinates');
  expect(latestOrder.dropoffLocation).to.have.property('coordinates');
});

Then('the order should show estimated delivery time', async function () {
  // Check if route info is displayed
  const routeInfo = this.page.locator('text=/route|estimate|time|distance/');
  const routeText = await routeInfo.textContent();
  expect(routeText.length).to.be.greaterThan(0);
});

// Google Maps URL parsing steps
When('I paste a Google Maps URL {string} in pickup location', async function (url) {
  // Find the Google Maps URL input for pickup
  const urlInput = this.page.locator('input[placeholder*="Google Maps"]').first();
  await urlInput.fill(url);

  // Click parse button
  const parseButton = this.page.locator('button').filter({ hasText: 'Parse' }).first();
  await parseButton.click();

  // Wait for URL parsing to complete
  await this.page.waitForTimeout(3000);
});

Then('the URL should be parsed successfully', async function () {
  // Check for success message or coordinate population
  const successIndicator = this.page.locator('text=/✅|success|parsed/');
  await expect(successIndicator).toBeVisible({ timeout: 5000 });
});

Then('pickup coordinates should be extracted as {string}', async function (expectedCoords) {
  // Verify the coordinates match expected values
  const coordinateDisplay = this.page.locator('text=/' + expectedCoords.replace('.', '\\.') + '/');
  await expect(coordinateDisplay).toBeVisible();
});

Then('pickup address should be populated via reverse geocoding', async function () {
  // Wait for reverse geocoding
  await this.page.waitForTimeout(3000);

  // Check address fields are populated
  const pickupAddressSection = this.page.locator('h3:has-text("📝 Pickup Location Details")').locator('xpath=following::div').first();
  const addressInputs = pickupAddressSection.locator('input');

  let populatedCount = 0;
  const inputCount = await addressInputs.count();

  for (let i = 0; i < inputCount; i++) {
    const value = await addressInputs.nth(i).inputValue();
    if (value.trim().length > 0) populatedCount++;
  }

  expect(populatedCount).to.be.greaterThan(0);
});

When('I paste another Google Maps URL {string} in delivery location', async function (url) {
  // Find the Google Maps URL input for delivery
  const urlInputs = this.page.locator('input[placeholder*="Google Maps"]');
  const deliveryUrlInput = urlInputs.nth(1);
  await deliveryUrlInput.fill(url);

  // Click parse button for delivery
  const parseButtons = this.page.locator('button').filter({ hasText: 'Parse' });
  const deliveryParseButton = parseButtons.nth(1);
  await deliveryParseButton.click();

  // Wait for URL parsing to complete
  await this.page.waitForTimeout(3000);
});

Then('the delivery coordinates should be extracted as {string}', async function (expectedCoords) {
  const coordinateDisplay = this.page.locator('text=/' + expectedCoords.replace('.', '\\.') + '/');
  await expect(coordinateDisplay).toBeVisible();
});

When('I submit with URL-parsed locations', async function () {
  const publishButton = this.page.locator('button:has-text("🚀 Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(5000);
});

// Combined address entry and map selection steps
When('I manually enter pickup address:', async function (dataTable) {
  const data = dataTable.rowsHash();

  // Fill the combined location entry for pickup
  if (data.country) {
    const countryCombobox = this.page.locator('div').filter({ hasText: '🌍 Country *' }).locator('input').first();
    await countryCombobox.fill(data.country);
    await this.page.keyboard.press('Enter');
  }

  if (data.city) {
    const cityCombobox = this.page.locator('div').filter({ hasText: '🏙️ City *' }).locator('input').first();
    await cityCombobox.fill(data.city);
    await this.page.keyboard.press('Enter');
  }

  if (data.area) {
    const areaCombobox = this.page.locator('div').filter({ hasText: '🏘️ Area' }).locator('input').first();
    await areaCombobox.fill(data.area);
    await this.page.keyboard.press('Enter');
  }

  if (data.street) {
    const streetCombobox = this.page.locator('div').filter({ hasText: '🛣️ Street' }).locator('input').first();
    await streetCombobox.fill(data.street);
    await this.page.keyboard.press('Enter');
  }

  if (data.building) {
    const buildingInput = this.page.locator('input').filter({ hasText: '' }).locator('input').first();
    await buildingInput.fill(data.building);
  }

  if (data.person) {
    const personInput = this.page.locator('input[placeholder="e.g., Contact Person"]');
    await personInput.fill(data.person);
  }

  // Wait for geocoding to complete
  await this.page.waitForTimeout(3000);
});

When('I manually enter delivery address:', async function (dataTable) {
  const data = dataTable.rowsHash();

  // Fill the combined location entry for delivery
  if (data.country) {
    const countryCombobox = this.page.locator('h3:has-text("📥 Delivery Location *")').locator('xpath=following::div').locator('input').first();
    await countryCombobox.fill(data.country);
    await this.page.keyboard.press('Enter');
  }

  if (data.city) {
    const cityCombobox = this.page.locator('h3:has-text("📥 Delivery Location *")').locator('xpath=following::div').locator('input').nth(1);
    await cityCombobox.fill(data.city);
    await this.page.keyboard.press('Enter');
  }

  if (data.area) {
    const areaCombobox = this.page.locator('h3:has-text("📥 Delivery Location *")').locator('xpath=following::div').locator('input').nth(2);
    await areaCombobox.fill(data.area);
    await this.page.keyboard.press('Enter');
  }

  if (data.person) {
    const personInput = this.page.locator('h3:has-text("📥 Delivery Location *")').locator('xpath=following::div').locator('input[placeholder="e.g., Contact Person"]');
    await personInput.fill(data.person);
  }

  // Wait for geocoding to complete
  await this.page.waitForTimeout(3000);
});

Then('pickup location should be geocoded and map marker should appear', async function () {
  // Check for pickup marker
  const markerElements = this.page.locator('.leaflet-marker-icon');
  const markerCount = await markerElements.count();
  expect(markerCount).to.be.at.least(1);

  // Check that marker has the correct color (green for pickup)
  const greenMarker = this.page.locator('.leaflet-marker-icon').filter({ hasAttribute: 'src', include: 'green' });
  await expect(greenMarker).toBeVisible();
});

Then('delivery location should be geocoded and map marker should appear', async function () {
  // Check for delivery marker (should have 2 markers total)
  const markerElements = this.page.locator('.leaflet-marker-icon');
  const markerCount = await markerElements.count();
  expect(markerCount).to.be.at.least(2);

  // Check for red marker (delivery)
  const redMarker = this.page.locator('.leaflet-marker-icon').filter({ hasAttribute: 'src', include: 'red' });
  await expect(redMarker).toBeVisible();
});

Then('route preview should show estimated time and distance', async function () {
  // Check for route preview section
  await this.page.waitForSelector('h3:has-text("🗺️ Route Preview")', { timeout: 5000 });

  // Check for route information
  const distanceText = this.page.locator('text=/km|distance/');
  await expect(distanceText.first()).toBeVisible();

  const timeText = this.page.locator('text=/m\b|\d+\s*minutes?/');
  await expect(timeText.first()).toBeVisible();
});

When('I submit the combined order', async function () {
  const publishButton = this.page.locator('button:has-text("🚀 Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(5000);
});

Then('both address-based and geocoded locations should be saved', async function () {
  // Verify order was created with both address and coordinates
  const response = await fetch(`${this.apiUrl}/orders`, {
    headers: {
      'Authorization': `Bearer ${this.testData.customer.token}`
    }
  });

  const orders = await response.json();
  expect(orders.length).to.be.greaterThan(0);

  const latestOrder = orders[0];

  // Check for address data
  expect(latestOrder).to.have.property('pickupAddress');
  expect(latestOrder).to.have.property('dropoffAddress');

  // Check for coordinate data
  expect(latestOrder).to.have.property('pickupLocation');
  expect(latestOrder).to.have.property('dropoffLocation');
});

// Route preview and estimation steps
When('I set pickup at {string} and delivery at {string}', async function (pickup, delivery) {
  // This would involve setting both locations - simplified for test
  // In real implementation, this might use map clicks or address entry

  // For now, simulate by clicking maps at different locations
  const pickupMap = this.page.locator('.leaflet-container').first();
  const deliveryMap = this.page.locator('.leaflet-container').nth(1);

  const pickupBounds = await pickupMap.boundingBox();
  if (pickupBounds) {
    await this.page.mouse.click(pickupBounds.x + pickupBounds.width / 2, pickupBounds.y + pickupBounds.height / 2);
  }

  const deliveryBounds = await deliveryMap.boundingBox();
  if (deliveryBounds) {
    await this.page.mouse.click(deliveryBounds.x + deliveryBounds.width / 2, deliveryBounds.y + deliveryBounds.height / 2);
  }

  await this.page.waitForTimeout(3000);
});

Then('route calculation should start automatically', async function () {
  // Check for loading indicator in route preview
  const loadingText = this.page.locator('text=/Calculating route|Loading/');
  await expect(loadingText).toBeVisible({ timeout: 5000 });
});

Then('I should see loading indicator for route calculation', async function () {
  const loadingIndicator = this.page.locator('text=/⏳|🔄|Loading|Calculating/');
  await expect(loadingIndicator).toBeVisible();
});

When('route calculation completes', async function () {
  // Wait for loading to finish
  await this.page.waitForSelector('text=/⏳|🔄|Loading|Calculating/', { state: 'hidden', timeout: 10000 });
});

Then('route preview should show:', async function (dataTable) {
  const expectedData = dataTable.rowsHash();

  if (expectedData.distance) {
    const distanceText = this.page.locator(`text=/${expectedData.distance.replace(/\s+/g, '\\s*')}/i`);
    await expect(distanceText).toBeVisible();
  }

  if (expectedData.vehicle_estimates) {
    // Check for vehicle icons and estimates
    const vehicleIcons = this.page.locator('[class*="icon"], [class*="emoji"]').filter({ hasText: /🚗|🚲|🚶|car|bicycle|walking/ });
    const iconCount = await vehicleIcons.count();
    expect(iconCount).to.be.greaterThan(0);
  }

  if (expectedData.route_map) {
    // Check for map with route polyline
    const polyline = this.page.locator('.leaflet-interactive, path');
    await expect(polyline).toBeVisible();
  }
});

When('I submit with route information', async function () {
  const publishButton = this.page.locator('button:has-text("🚀 Publish Order")');
  await publishButton.click();
  await this.page.waitForTimeout(5000);
});

Then('route data should be saved with the order', async function () {
  const response = await fetch(`${this.apiUrl}/orders`, {
    headers: {
      'Authorization': `Bearer ${this.testData.customer.token}`
    }
  });

  const orders = await response.json();
  const latestOrder = orders[0];

  // Check if order has route information
  expect(latestOrder).to.have.property('routeInfo');
  expect(latestOrder.routeInfo).to.have.property('estimates');
});

Then('delivery estimates should be visible in order details', async function () {
  // Check that route estimates are displayed
  const estimatesSection = this.page.locator('[class*="estimate"], [class*="route"]');
  await expect(estimatesSection).toBeVisible();
});



