const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// UI Verification Steps
Given('I am on the Matrix Delivery homepage', async function() {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');
});

Then('I should see the version footer with text {string}', async function(expectedText) {
  const footer = this.page.locator('footer');
  await footer.waitFor({ state: 'visible', timeout: 5000 });

  const footerText = await footer.textContent();
  expect(footerText).to.include(expectedText);
});

Then('the footer should contain commit hash {string}', async function(commitHash) {
  const footer = this.page.locator('footer');
  await footer.waitFor({ state: 'visible', timeout: 5000 });

  const footerText = await footer.textContent();
  expect(footerText).to.include(commitHash);
});

Then('the footer should display today\'s date', async function() {
  const footer = this.page.locator('footer');
  await footer.waitFor({ state: 'visible', timeout: 5000 });

  const footerText = await footer.textContent();
  const today = new Date().toLocaleDateString();

  // Check if footer contains today's date
  expect(footerText).to.include(today);
});

Then('I should be redirected to the dashboard', async function() {
  // Check if we're redirected to the dashboard (authentication components disappear)
  await this.page.waitForSelector('button:has-text("Logout")', { timeout: 10000 });
  const logoutButton = await this.page.locator('button:has-text("Logout")');
  expect(await logoutButton.isVisible()).to.be.true;
});
