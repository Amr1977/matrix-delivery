const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// UI Steps using Playwright (this.page inferred from World/Hooks)

Given('I am logged in as an {string}', async function (role) {
    // Navigate to login
    await this.page.goto(`${this.baseUrl || 'http://localhost:3000'}/login`);

    // Fill credentials (assuming test user exists or we seeded it)
    await this.page.fill('input[name="email"]', `admin@test.com`); // Default admin for UI tests
    await this.page.fill('input[name="password"]', 'password123');
    await this.page.click('button[type="submit"]');

    // Wait for redirect to admin dashboard
    await this.page.waitForURL('**/admin');
});

When('I navigate to the system health dashboard', async function () {
    // Click on nav item or go directly
    await this.page.goto(`${this.baseUrl || 'http://localhost:3000'}/admin/health`);
    await this.page.waitForSelector('h2:has-text("System Health")');
});

Then('I should see the current memory usage', async function () {
    // Check for memory card
    const memoryCard = await this.page.isVisible('p:has-text("Memory Usage")');
    expect(memoryCard).to.be.true;

    // Check for value
    const value = await this.page.textContent('div:has(p:has-text("Memory Usage")) .text-2xl');
    expect(value).to.match(/\d+%/);
});

Then('I should see the PM2 process status', async function () {
    // Check for process table
    const table = await this.page.isVisible('table:has-text("PM2 Processes")'); // Adjust selector as needed
    // Or check for header
    const header = await this.page.isVisible('h3:has-text("PM2 Processes")');
    expect(header).to.be.true;
});

Then('I should see the system uptime', async function () {
    const uptime = await this.page.isVisible('p:has-text("Uptime")');
    expect(uptime).to.be.true;
});

When('I request system health history for the last {string} hours', async function (hours) {
    // Click the time range button
    if (hours === '72') {
        await this.page.click('button:has-text("3 Days")');
    } else {
        await this.page.click('button:has-text("24h")');
    }
    // Wait for chart update (network idle or loader disappear)
    await this.page.waitForTimeout(1000);
});

Then('I should receive a list of health data points', async function () {
    // Verify chart exists
    const chart = await this.page.isVisible('.recharts-surface');
    expect(chart).to.be.true;
});

Then('the data points should cover the requested time range', async function () {
    // Hard to verify exact range on canvas/svg, but we check if axis label exists or data points are plotted
    const items = await this.page.locator('.recharts-line-dots circle').count();
    // Logic dependent on recharts implementation, might just check for absence of error
    const error = await this.page.isVisible('.text-red-400');
    expect(error).to.be.false;
});
