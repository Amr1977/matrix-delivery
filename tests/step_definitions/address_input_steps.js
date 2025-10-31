const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Address input validation steps
When('I click on {string}', async function(buttonText) {
  const button = this.page.locator(`button:has-text("${buttonText}")`);
  await button.click();
  await this.page.waitForTimeout(500);
});

When('I open the pickup location details', async function() {
  // Click on the pickup location section or map button
  const pickupSection = this.page.locator('h4:has-text("Pickup Location")').locator('..');
  const mapButton = pickupSection.locator('button:has-text("Select Location on Map")').or(
    pickupSection.locator('button:has-text("Update Location on Map")')
  );

  if (await mapButton.isVisible()) {
    await mapButton.click();
    await this.page.waitForTimeout(500);
  }
});

When('I open the delivery location details', async function() {
  // Click on the delivery location section or map button
  const deliverySection = this.page.locator('h4:has-text("Delivery Location")').locator('..');
  const mapButton = deliverySection.locator('button:has-text("Select Location on Map")').or(
    deliverySection.locator('button:has-text("Update Location on Map")')
  );

  if (await mapButton.isVisible()) {
    await mapButton.click();
    await this.page.waitForTimeout(500);
  }
});

When('I fill in the pickup address fields:', async function(dataTable) {
  const addressData = dataTable.rowsHash();

  // Fill in each address field
  for (const [field, value] of Object.entries(addressData)) {
    const fieldSelector = this.getAddressFieldSelector('pickup', field);
    await this.page.fill(fieldSelector, value);
    await this.page.waitForTimeout(100); // Allow input to process
  }

  // Store the entered data for verification
  this.testData.pickupAddress = addressData;
});

When('I fill in the delivery address fields:', async function(dataTable) {
  const addressData = dataTable.rowsHash();

  // Fill in each address field
  for (const [field, value] of Object.entries(addressData)) {
    const fieldSelector = this.getAddressFieldSelector('delivery', field);
    await this.page.fill(fieldSelector, value);
    await this.page.waitForTimeout(100); // Allow input to process
  }

  // Store the entered data for verification
  this.testData.deliveryAddress = addressData;
});

When('I enter a long street address {string}', async function(streetAddress) {
  const streetField = this.page.locator('input[placeholder="Street name and number"]');
  await streetField.fill(streetAddress);
  await this.page.waitForTimeout(200);
  this.testData.longStreetAddress = streetAddress;
});

When('I enter a long person name {string}', async function(personName) {
  const personField = this.page.locator('input[placeholder="Person to contact at this location"]');
  await personField.fill(personName);
  await this.page.waitForTimeout(200);
  this.testData.longPersonName = personName;
});

When('I fill in address fields with special characters:', async function(dataTable) {
  const specialCharData = dataTable.rowsHash();

  for (const [field, value] of Object.entries(specialCharData)) {
    const fieldSelector = this.getAddressFieldSelector('pickup', field);
    await this.page.fill(fieldSelector, value);
    await this.page.waitForTimeout(100);
  }

  this.testData.specialCharsData = specialCharData;
});

When('I fill in pickup address fields', async function() {
  const testData = {
    Country: 'Test Country',
    City: 'Test City',
    Area: 'Test Area',
    Street: 'Test Street',
    'Building Number': '123',
    Floor: '5',
    Apartment: '12B',
    'Person Name': 'Test Person'
  };

  for (const [field, value] of Object.entries(testData)) {
    const fieldSelector = this.getAddressFieldSelector('pickup', field);
    await this.page.fill(fieldSelector, value);
    await this.page.waitForTimeout(100);
  }

  this.testData.preserveTestData = testData;
});

When('I navigate away and back to the form', async function() {
  // Navigate to orders list and back (simulating navigation)
  const ordersLink = this.page.locator('h2:has-text("My Orders")').or(
    this.page.locator('button:has-text("Cancel")')
  );

  if (await ordersLink.isVisible()) {
    await ordersLink.click();
    await this.page.waitForTimeout(500);

    // Go back to create order form
    const createOrderButton = this.page.locator('button:has-text("Create New Order")');
    await createOrderButton.click();
    await this.page.waitForTimeout(500);
  }
});

When('I attempt to submit the order without filling required address fields', async function() {
  const submitButton = this.page.locator('button:has-text("Publish Order")');
  await submitButton.click();
  await this.page.waitForTimeout(1000);
});

Then('all pickup address fields should contain the entered values', async function() {
  for (const [field, expectedValue] of Object.entries(this.testData.pickupAddress)) {
    const fieldSelector = this.getAddressFieldSelector('pickup', field);
    const actualValue = await this.page.inputValue(fieldSelector);
    expect(actualValue).to.equal(expectedValue, `Field ${field} should contain "${expectedValue}" but got "${actualValue}"`);
  }
});

Then('all delivery address fields should contain the entered values', async function() {
  for (const [field, expectedValue] of Object.entries(this.testData.deliveryAddress)) {
    const fieldSelector = this.getAddressFieldSelector('delivery', field);
    const actualValue = await this.page.inputValue(fieldSelector);
    expect(actualValue).to.equal(expectedValue, `Field ${field} should contain "${expectedValue}" but got "${actualValue}"`);
  }
});

Then('no field should be truncated to first letter only', async function() {
  // Check that no field contains only the first letter of its expected value
  const allAddressData = { ...this.testData.pickupAddress, ...this.testData.deliveryAddress };

  for (const [field, expectedValue] of Object.entries(allAddressData)) {
    if (expectedValue.length > 1) {
      const fieldSelector = this.getAddressFieldSelector('pickup', field);
      const actualValue = await this.page.inputValue(fieldSelector);

      expect(actualValue.length).to.be.greaterThan(1,
        `Field ${field} was truncated to first letter only: expected "${expectedValue}", got "${actualValue}"`);

      expect(actualValue).to.equal(expectedValue,
        `Field ${field} should contain full text: expected "${expectedValue}", got "${actualValue}"`);
    }
  }
});

Then('the street field should contain the full long text', async function() {
  const streetField = this.page.locator('input[placeholder="Street name and number"]');
  const actualValue = await streetField.inputValue();
  expect(actualValue).to.equal(this.testData.longStreetAddress);
  expect(actualValue.length).to.be.greaterThan(10, 'Street field should contain long text');
});

Then('the person name field should contain the full long text', async function() {
  const personField = this.page.locator('input[placeholder="Person to contact at this location"]');
  const actualValue = await personField.inputValue();
  expect(actualValue).to.equal(this.testData.longPersonName);
  expect(actualValue.length).to.be.greaterThan(10, 'Person name field should contain long text');
});

Then('all fields should accept and display special characters correctly', async function() {
  for (const [field, expectedValue] of Object.entries(this.testData.specialCharsData)) {
    const fieldSelector = this.getAddressFieldSelector('pickup', field);
    const actualValue = await this.page.inputValue(fieldSelector);
    expect(actualValue).to.equal(expectedValue, `Special characters not handled correctly in ${field}`);
  }
});

Then('I should see validation errors for empty required fields', async function() {
  // Look for error messages or validation indicators
  const errorMessages = this.page.locator('.error, [class*="error"], text=/required|empty|fill/i');
  const errorCount = await errorMessages.count();

  // Should have at least some validation errors for required fields
  expect(errorCount).to.be.greaterThan(0, 'Should show validation errors for empty required fields');
});

Then('the order should not be created', async function() {
  // Verify we're still on the create order form
  const createForm = this.page.locator('h2:has-text("Create New Delivery Order")');
  await expect(createForm).toBeVisible();

  // Verify no success message
  const successMessage = this.page.locator('text=/Order.*created|success/i');
  await expect(successMessage).toHaveCount(0);
});

Then('all previously entered address values should be preserved', async function() {
  for (const [field, expectedValue] of Object.entries(this.testData.preserveTestData)) {
    const fieldSelector = this.getAddressFieldSelector('pickup', field);
    const actualValue = await this.page.inputValue(fieldSelector);
    expect(actualValue).to.equal(expectedValue, `Field ${field} value was not preserved after navigation`);
  }
});

// Helper method to get field selectors based on field type
Given.prototype.getAddressFieldSelector = function(locationType, fieldName) {
  const fieldSelectors = {
    'Country': 'input[placeholder="Country (e.g., Iraq, USA, UK)"]',
    'City': 'input[placeholder="City"]',
    'Area': 'input[placeholder="Area/District"]',
    'Street': 'input[placeholder="Street name and number"]',
    'Building Number': 'input[placeholder="Building number"]',
    'Floor': 'input[placeholder="Floor (optional)"]',
    'Apartment': 'input[placeholder="Apartment (optional)"]',
    'Person Name': 'input[placeholder="Person to contact at this location"]'
  };

  return fieldSelectors[fieldName] || `input[placeholder*="${fieldName}"]`;
};
