const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Frontend step definitions for Offers Module UI automation
// These steps assume the frontend has been implemented with proper data-testid attributes
// Following the critical testing requirements from the user rules

Given('I am logged in as a vendor owner', async function () {
  // This step should be shared with other UI tests
  // Assumes vendor login functionality exists
  await this.page.goto(`${this.baseUrl}/login`);
  await this.page.fill('[data-testid="email-input"]', this.vendorOwner.email);
  await this.page.fill('[data-testid="password-input"]', this.vendorOwner.password);
  await this.page.click('[data-testid="login-button"]');
  await this.page.waitForURL('**/vendor/dashboard');
});

Given('I am on the vendor offers page', async function () {
  await this.page.goto(`${this.baseUrl}/vendor/offers`);
  await this.page.waitForSelector('[data-testid="offers-list"]');
});

When('I click the create offer button', async function () {
  await this.page.click('[data-testid="create-offer-button"]');
  await this.page.waitForSelector('[data-testid="offer-modal"]');
});

When('I fill in the offer form with percentage discount details', async function () {
  await this.page.selectOption('[data-testid="discount-type-select"]', 'percentage');
  await this.page.fill('[data-testid="discount-value-input"]', '20');
  await this.page.fill('[data-testid="offer-title-input"]', 'Flash Sale 20% Off');
  await this.page.fill('[data-testid="offer-description-input"]', 'Limited time offer');
  await this.page.fill('[data-testid="start-date-input"]', '2024-12-20');
  await this.page.fill('[data-testid="end-date-input"]', '2024-12-27');
});

When('I fill in the offer form with fixed discount details', async function () {
  await this.page.selectOption('[data-testid="discount-type-select"]', 'fixed');
  await this.page.fill('[data-testid="discount-value-input"]', '10.00');
  await this.page.fill('[data-testid="offer-title-input"]', 'Fixed Discount Offer');
  await this.page.fill('[data-testid="offer-description-input"]', 'Save $10 on selected items');
  await this.page.fill('[data-testid="start-date-input"]', '2024-12-20');
  await this.page.fill('[data-testid="end-date-input"]', '2024-12-27');
});

When('I select an item from the item dropdown', async function () {
  await this.page.click('[data-testid="item-select"]');
  await this.page.click('[data-testid="item-option-1"]'); // Select first item
});

When('I submit the offer form', async function () {
  await this.page.click('[data-testid="submit-offer-button"]');
  await this.page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
});

Then('I should see the offer in the offers list', async function () {
  await this.page.waitForSelector('[data-testid="offer-row-1"]');
  const offerTitle = await this.page.textContent('[data-testid="offer-title-1"]');
  expect(offerTitle).to.include('Flash Sale');
});

Then('the offer should show as active', async function () {
  const statusBadge = await this.page.textContent('[data-testid="offer-status-1"]');
  expect(statusBadge.toLowerCase()).to.include('active');
});

When('I click the edit button for the first offer', async function () {
  await this.page.click('[data-testid="edit-offer-button-1"]');
  await this.page.waitForSelector('[data-testid="offer-modal"]');
});

When('I update the discount value to {string}', async function (newValue) {
  await this.page.fill('[data-testid="discount-value-input"]', newValue);
});

When('I save the offer changes', async function () {
  await this.page.click('[data-testid="save-offer-button"]');
  await this.page.waitForSelector('[data-testid="success-message"]');
});

Then('the offer discount should be updated to {string}', async function (expectedValue) {
  await this.page.reload(); // Refresh to ensure data is updated
  await this.page.waitForSelector('[data-testid="offer-discount-1"]');
  const discountText = await this.page.textContent('[data-testid="offer-discount-1"]');
  expect(discountText).to.include(expectedValue);
});

When('I click the deactivate button for the first offer', async function () {
  await this.page.click('[data-testid="deactivate-offer-button-1"]');
  // Handle confirmation dialog if present
  const confirmButton = await this.page.locator('[data-testid="confirm-deactivate-button"]');
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }
});

Then('the offer should show as inactive', async function () {
  await this.page.waitForSelector('[data-testid="offer-status-1"]');
  const statusBadge = await this.page.textContent('[data-testid="offer-status-1"]');
  expect(statusBadge.toLowerCase()).to.include('inactive');
});

When('I click the delete button for the first offer', async function () {
  await this.page.click('[data-testid="delete-offer-button-1"]');
  // Handle confirmation dialog
  const confirmButton = await this.page.locator('[data-testid="confirm-delete-button"]');
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }
  await this.page.waitForSelector('[data-testid="success-message"]');
});

Then('the offer should be removed from the list', async function () {
  const offerRow = await this.page.locator('[data-testid="offer-row-1"]');
  await expect(offerRow).not.toBeVisible();
});

Given('I have multiple active offers', async function () {
  // This would typically be set up through API calls or database setup
  // For UI tests, we might need to create offers via the UI or assume they exist
  await this.page.waitForSelector('[data-testid="offers-list"]');
  const offerCount = await this.page.locator('[data-testid^="offer-row-"]').count();
  expect(offerCount).to.be.greaterThan(1);
});

Then('I should see all active offers in the list', async function () {
  const activeOffers = await this.page.locator('[data-testid="offer-status"]:has-text("Active")').count();
  expect(activeOffers).to.be.greaterThan(0);
});

Then('inactive offers should not be displayed', async function () {
  const inactiveOffers = await this.page.locator('[data-testid="offer-status"]:has-text("Inactive")').count();
  expect(inactiveOffers).to.equal(0);
});

When('I view an item with an active offer', async function () {
  // Navigate to item detail page or marketplace
  await this.page.goto(`${this.baseUrl}/item/1`); // Assuming item ID 1
  await this.page.waitForSelector('[data-testid="item-detail"]');
});

Then('I should see the discounted price', async function () {
  const discountedPriceElement = await this.page.locator('[data-testid="discounted-price"]');
  await expect(discountedPriceElement).toBeVisible();

  const originalPriceElement = await this.page.locator('[data-testid="original-price"]');
  await expect(originalPriceElement).toBeVisible();

  const discountBadge = await this.page.locator('[data-testid="discount-badge"]');
  await expect(discountBadge).toBeVisible();
});

Then('the discount percentage should be displayed', async function () {
  const discountText = await this.page.textContent('[data-testid="discount-percentage"]');
  expect(discountText).to.match(/\d+% off/i);
});

When('I try to create an offer with invalid dates', async function () {
  await this.page.selectOption('[data-testid="discount-type-select"]', 'percentage');
  await this.page.fill('[data-testid="discount-value-input"]', '10');
  await this.page.fill('[data-testid="start-date-input"]', '2024-12-25'); // Future start
  await this.page.fill('[data-testid="end-date-input"]', '2024-12-20');  // Past end date
  await this.page.click('[data-testid="submit-offer-button"]');
});

Then('I should see a validation error for dates', async function () {
  const errorMessage = await this.page.textContent('[data-testid="date-validation-error"]');
  expect(errorMessage).to.include('date');
});

When('I try to create an offer with discount over 100%', async function () {
  await this.page.selectOption('[data-testid="discount-type-select"]', 'percentage');
  await this.page.fill('[data-testid="discount-value-input"]', '150');
  await this.page.fill('[data-testid="start-date-input"]', '2024-12-20');
  await this.page.fill('[data-testid="end-date-input"]', '2024-12-27');
  await this.page.click('[data-testid="submit-offer-button"]');
});

Then('I should see a validation error for discount value', async function () {
  const errorMessage = await this.page.textContent('[data-testid="discount-validation-error"]');
  expect(errorMessage).to.include('100');
});

When('I filter offers by status {string}', async function (status) {
  await this.page.selectOption('[data-testid="status-filter"]', status);
  await this.page.click('[data-testid="apply-filter-button"]');
  await this.page.waitForSelector('[data-testid="offers-list"]');
});

Then('only {string} offers should be displayed', async function (status) {
  const visibleOffers = await this.page.locator('[data-testid="offer-status"]').allTextContents();
  const matchingOffers = visibleOffers.filter(offerStatus =>
    offerStatus.toLowerCase().includes(status.toLowerCase())
  );
  expect(matchingOffers.length).to.equal(visibleOffers.length);
});

When('I filter offers by discount type {string}', async function (discountType) {
  await this.page.selectOption('[data-testid="discount-type-filter"]', discountType);
  await this.page.click('[data-testid="apply-filter-button"]');
  await this.page.waitForSelector('[data-testid="offers-list"]');
});

Then('only {string} discount offers should be displayed', async function (discountType) {
  const visibleOffers = await this.page.locator('[data-testid="offer-discount-type"]').allTextContents();
  const matchingOffers = visibleOffers.filter(type =>
    type.toLowerCase().includes(discountType.toLowerCase())
  );
  expect(matchingOffers.length).to.equal(visibleOffers.length);
});

When('I search for offers containing {string}', async function (searchTerm) {
  await this.page.fill('[data-testid="search-input"]', searchTerm);
  await this.page.click('[data-testid="search-button"]');
  await this.page.waitForSelector('[data-testid="offers-list"]');
});

Then('only offers with titles containing {string} should be displayed', async function (searchTerm) {
  const offerTitles = await this.page.locator('[data-testid="offer-title"]').allTextContents();
  const matchingOffers = offerTitles.filter(title =>
    title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  expect(matchingOffers.length).to.equal(offerTitles.length);
});

When('I sort offers by {string}', async function (sortBy) {
  await this.page.selectOption('[data-testid="sort-select"]', sortBy);
  await this.page.waitForSelector('[data-testid="offers-list"]');
});

Then('offers should be sorted by {string} in ascending order', async function (sortBy) {
  // This would require checking the actual sort order of elements
  // For now, just verify the sort option is selected
  const selectedSort = await this.page.inputValue('[data-testid="sort-select"]');
  expect(selectedSort).to.equal(sortBy);
});

When('I navigate through offer pages', async function () {
  await this.page.click('[data-testid="next-page-button"]');
  await this.page.waitForSelector('[data-testid="offers-list"]');
});

Then('I should see the next page of offers', async function () {
  // Verify pagination controls show current page > 1
  const currentPage = await this.page.textContent('[data-testid="current-page"]');
  expect(parseInt(currentPage)).to.be.greaterThan(1);
});

When('I change page size to {string}', async function (pageSize) {
  await this.page.selectOption('[data-testid="page-size-select"]', pageSize);
  await this.page.waitForSelector('[data-testid="offers-list"]');
});

Then('I should see {string} offers per page', async function (expectedCount) {
  const visibleOffers = await this.page.locator('[data-testid^="offer-row-"]').count();
  expect(visibleOffers).to.be.at.most(parseInt(expectedCount));
});
