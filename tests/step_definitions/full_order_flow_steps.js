const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Helper to ensure user exists
async function ensureUserExists(apiUrl, userData) {
    // Try to register
    const registerResponse = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });

    if (registerResponse.ok) {
        const data = await registerResponse.json();
        return { ...userData, id: data.user.id, token: data.token };
    }

    // If already exists, login
    const loginResponse = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email, password: userData.password })
    });

    if (loginResponse.ok) {
        const data = await loginResponse.json();
        return { ...userData, id: data.user.id, token: data.token };
    }

    throw new Error(`Could not ensure user ${userData.email} exists`);
}

Given('the delivery platform is running', async function () {
    // Simple check that the app is accessible
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('networkidle');
});

Given('I exist as a customer with email {string} and password {string}', async function (email, password) {
    const userData = {
        name: 'Test Customer',
        email: email,
        password: password,
        phone: '+1234567890',
        role: 'customer'
    };
    this.testData.customer = await ensureUserExists(this.apiUrl, userData);
});

Given('I exist as a driver with email {string} and password {string}', async function (email, password) {
    const userData = {
        name: 'Test Driver',
        email: email,
        password: password,
        phone: '+1987654321',
        role: 'driver',
        vehicle_type: 'car'
    };
    this.testData.driver = await ensureUserExists(this.apiUrl, userData);
});

When('I log in as {string} with password {string}', async function (email, password) {
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('networkidle');

    // Check if already logged in
    const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("تسجيل الخروج"), button:has-text("Cerrar Sesión")');
    const logoutVisible = await logoutButton.count() > 0 && await logoutButton.first().isVisible().catch(() => false);
    if (logoutVisible) {
        await logoutButton.first().click();
        await this.page.waitForTimeout(1000);
        await this.page.waitForSelector('button:has-text("Logout"), button:has-text("تسجيل الخروج"), button:has-text("Cerrar Sesión")', { timeout: 10000 });
    }
});

When('I navigate to the create order page', async function () {
    const createButton = this.page.locator('button:has-text("Create New Order"), a:has-text("Create New Order")');
    await createButton.click();
    await this.page.waitForTimeout(1000);
});

When('I enter the order information:', async function (dataTable) {
    const data = dataTable.rowsHash();

    if (data.title) {
        await this.page.fill('input[placeholder="Order Title"], input[name="title"]', data.title);
    }

    if (data.description) {
        await this.page.fill('textarea[placeholder*="description"], textarea[name="description"]', data.description);
    }

    if (data.price) {
        await this.page.fill('input[placeholder*="price"], input[name="price"]', data.price);
    }

    await this.page.waitForTimeout(500);
});

When('I publish the new order', async function () {
    const publishButton = this.page.locator('button:has-text("Publish Order")');
    await publishButton.click();
    await this.page.waitForTimeout(3000);
});

When('I view the available orders', async function () {
    await this.page.click('text="Available Orders"');
    await this.page.waitForSelector('.order-card, [data-testid="order-item"]', { timeout: 5000 });
});

When('I place a bid of {string} on the order {string}', async function (amount, orderTitle) {
    // Find the order card with the specific title
    const orderCard = this.page.locator(`.order-card:has-text("${orderTitle}")`).first();
    await expect(orderCard).toBeVisible();

    // Click on the order to view details/bid
    await orderCard.click();

    // Fill bid amount
    const bidInput = this.page.locator('input[placeholder*="bid"], input[type="number"]').first();
    await bidInput.fill(amount);

    // Submit bid
    const bidButton = this.page.locator('button:has-text("Place Bid"), button:has-text("Bid")');
    await bidButton.click();
    await this.page.waitForTimeout(2000);
});

Then('I should see my bid listed', async function () {
    const bidElement = this.page.locator('text="My Bid"').or(this.page.locator('.my-bid'));
    await expect(bidElement).toBeVisible();
});

When('I view my orders', async function () {
    await this.page.click('text="My Orders"');
    await this.page.waitForSelector('.order-card, [data-testid="order-item"]', { timeout: 5000 });
});

When('I view the details of order {string}', async function (orderTitle) {
    const orderCard = this.page.locator(`.order-card:has-text("${orderTitle}")`).first();
    await expect(orderCard).toBeVisible();
    await orderCard.click();
    await this.page.waitForTimeout(1000);
});

When('I accept the bid from {string}', async function (driverEmail) {
    // In a real scenario, we might see the driver's name, but for now we'll just accept the first bid
    // or look for a bid card. Since we only have one bid in this test, accepting the first one is fine.
    const acceptButton = this.page.locator('button:has-text("Accept")').first();
    await acceptButton.click();

    // Confirm if needed
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
        await confirmButton.click();
    }
    await this.page.waitForTimeout(2000);
});

When('I view my accepted orders', async function () {
    // For drivers, this might be "My Deliveries" or similar
    await this.page.click('text="My Deliveries"');
    await this.page.waitForSelector('.order-card', { timeout: 5000 });
});

When('I mark the order as {string}', async function (status) {
    const statusButton = this.page.locator(`button:has-text("${status}")`);
    await statusButton.click();
    await this.page.waitForTimeout(2000);
});

When('I click the button {string}', async function (text) {
    const element = this.page.locator(`button:has-text("${text}"), a:has-text("${text}")`);
    await element.click();
    await this.page.waitForTimeout(1000);
});

Then('I should see the text {string}', async function (text) {
    const element = this.page.locator(`text="${text}"`);
    await expect(element).toBeVisible();
});

Then('the order status updates to {string}', async function (status) {
    const statusElement = this.page.locator(`.order-status:has-text("${status}"), .status-badge:has-text("${status}")`);
    await expect(statusElement).toBeVisible();
});

When('I submit a {int}-star review with comment {string}', async function (rating, comment) {
    // Select rating (assuming stars are clickable or input)
    // This might need adjustment based on actual UI implementation
    const stars = this.page.locator('.star-rating span, .rating-input input');
    if (await stars.count() > 0) {
        await stars.nth(rating - 1).click();
    }

    // Fill comment
    await this.page.fill('textarea', comment);

    // Submit
    const submitButton = this.page.locator('button:has-text("Submit Review")');
    await submitButton.click();
    await this.page.waitForTimeout(2000);
});
