const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

Given('I visit the login page for persistence test', async function () {
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('networkidle');
});

Given('the P2P delivery platform is ready for persistence test', async function () {
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('networkidle');
});

Given('I have a registered customer for persistence test', async function () {
    const timestamp = Date.now();
    const customerData = {
        name: 'Test Customer',
        email: `customer_${timestamp}@test.com`,
        password: 'test123456',
        phone: `+1${timestamp.toString().slice(-10)}`,
        primary_role: 'customer',
        country: 'USA',
        city: 'New York',
        area: 'Manhattan'
    };

    const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Registration failed: ${response.status} ${text}`);
    }
    expect(response.ok).to.be.true;
    const result = await response.json();
    this.testData = this.testData || {};
    this.testData.customer = { ...customerData, id: result.user.id, token: result.token };
});

When('I perform a customer login for persistence check', async function () {
    if (!this.testData.customer) {
        throw new Error('Customer data missing');
    }
    await this.page.fill('input[placeholder="Email"]', this.testData.customer.email);
    await this.page.fill('input[placeholder="Password"]', 'test123456');
    await this.page.click('button:has-text("Sign In")');
    await this.page.waitForSelector('button:has-text("Logout")', { timeout: 10000 });
});

Then('I verify successful persistence login', async function () {
    await this.page.waitForSelector('button:has-text("Logout")', { timeout: 10000 });
    const logoutButton = await this.page.locator('button:has-text("Logout")');
    expect(await logoutButton.isVisible()).to.be.true;
});

Then('I check dashboard for persistence', async function () {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('button:has-text("Create New Order")', { timeout: 10000 });
    await this.page.waitForSelector('text="My Orders"', { timeout: 10000 });
});

When('I reload the page for persistence', async function () {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
});



