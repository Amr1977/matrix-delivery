const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Order Creation Steps
Given('the P2P delivery platform is running', async function() {
  // This is handled by the hooks that start the servers
  // Just verify we can reach the frontend
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');
});

Given('there is a registered customer account', async function() {
  // Create test customer via API
  const timestamp = Date.now();
  const customerData = {
    name: 'Test Customer',
    email: `customer_${timestamp}@test.com`,
    password: 'test123',
    phone: `+1${timestamp.toString().slice(-10)}`,
    role: 'customer'
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

Given('I am logged in as a customer', async function() {
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

When('I click the "Create New Order" button', async function() {
  const createOrderButton = this.page.locator('button:has-text("Create New Order")');
  await createOrderButton.waitFor({ state: 'visible', timeout: 5000 });
  await createOrderButton.click();
});

Then('I should see the order creation form', async function() {
  // Wait for the order form to appear
  await this.page.waitForSelector('h2:has-text("Create New Delivery Order")', { timeout: 5000 });

  // Verify form elements are present
  const titleInput = this.page.locator('input[placeholder="Order Title *"]');
  await expect(titleInput).toBeVisible();

  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await expect(publishButton).toBeVisible();
});

When('I fill in the order details:', async function(dataTable) {
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

When('I set the pickup location to:', async function(dataTable) {
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

When('I set the delivery location to:', async function(dataTable) {
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

When('I submit the order', async function() {
  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();

  // Wait for submission to complete
  await this.page.waitForTimeout(3000);
});

Then('I should see a success message', async function() {
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

Then('the order should appear in my orders list', async function() {
  // Check if we're back to the orders list
  await this.page.waitForSelector('h2:has-text("My Orders")', { timeout: 5000 });

  // Look for the order we just created
  const orderElements = this.page.locator('[class*="order"]').all();
  expect(orderElements.length).to.be.greaterThan(0);
});

Then('the order should have status {string}', async function(expectedStatus) {
  // Find the most recent order and check its status
  const statusElements = this.page.locator('[class*="status"], [class*="Status"]');
  const statusTexts = await statusElements.allTextContents();

  const hasExpectedStatus = statusTexts.some(text =>
    text.toLowerCase().includes(expectedStatus.toLowerCase())
  );

  expect(hasExpectedStatus).to.be.true;
});

When('I try to submit an empty order form', async function() {
  const publishButton = this.page.locator('button:has-text("Publish Order")');
  await publishButton.click();

  // Wait for validation to show
  await this.page.waitForTimeout(2000);
});

Then('I should see validation errors for required fields:', async function(dataTable) {
  const requiredFields = dataTable.raw().flat();

  // Check for error messages - the app shows errors in a specific format
  const errorElement = this.page.locator('.error-matrix, [class*="error"]');
  const errorText = await errorElement.textContent();

  // Verify that error mentions missing required fields
  expect(errorText).to.include('Please fill all required fields');
});

When('I fill in valid order details', async function() {
  // Fill minimal valid order details
  await this.page.fill('input[placeholder="Order Title *"]', 'Test Order');
  await this.page.fill('input[placeholder="Enter price"]', '10.00');
});

When('I set pickup location in {string}', async function(country) {
  const countryInputs = this.page.locator('input[placeholder="Country"]');
  await countryInputs.first().fill(country);
  await countryInputs.first().press('Tab'); // Trigger validation
});

When('I set delivery location in {string}', async function(country) {
  const countryInputs = this.page.locator('input[placeholder="Country"]');
  await countryInputs.nth(1).fill(country);
  await countryInputs.nth(1).press('Tab'); // Trigger validation
});

Then('I should see an error {string}', async function(expectedError) {
  const errorElement = this.page.locator('.error-matrix, [class*="error"]');
  await errorElement.waitFor({ state: 'visible', timeout: 5000 });
  const errorText = await errorElement.textContent();
  expect(errorText).to.include(expectedError);
});

When('I click on the pickup location map', async function() {
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

Then('I should be able to select a location on the map', async function() {
  // Check if coordinates are displayed or location marker appears
  const coordinateDisplay = this.page.locator('text=/\\d+\\.\\d+, \\d+\\.\\d+/');
  await expect(coordinateDisplay.first()).toBeVisible({ timeout: 5000 });
});

Then('the coordinates should be populated automatically', async function() {
  // Verify coordinates appear in the success message or coordinate display
  const coordinateText = this.page.locator('text=/✅ Map location selected/');
  await expect(coordinateText).toBeVisible({ timeout: 5000 });
});

Then('reverse geocoding should fill the address fields', async function() {
  // Check if address fields are populated after map click
  const countryInputs = this.page.locator('input[placeholder="Country"]');
  const countryValue = await countryInputs.first().inputValue();

  // Should have some value after reverse geocoding
  expect(countryValue.length).to.be.greaterThan(0);
});
